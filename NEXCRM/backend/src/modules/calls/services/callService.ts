import { Op } from 'sequelize';
import {
  Lead, User, TenantPhoneConfig, CallRecord, CallbackSchedule,
  EngagementEvent, Notification,
} from '../../../database/models';
import { CallDisposition } from '../../../database/models/CallRecord';
import { emitToTenant } from '../../../utils/sseEmitter';

export class CallService {
  /**
   * Manually log a call (no Twilio). Rep fills in direction + disposition after the call.
   * Applies temperature upgrade and FAILED threshold automatically.
   */
  async logCall(
    tenantId: string,
    repId: string,
    leadId: string,
    data: {
      direction: 'inbound' | 'outbound';
      disposition: CallDisposition;
      notes?: string;
      duration_seconds?: number;
      scheduled_at?: Date;
    },
  ): Promise<CallRecord> {
    const lead = await Lead.findOne({ where: { id: leadId, tenant_id: tenantId } });
    if (!lead) throw new Error('Lead not found.');

    const record = await CallRecord.create({
      tenant_id: tenantId,
      lead_id: leadId,
      rep_id: repId,
      direction: data.direction,
      status: 'completed',
      disposition: data.disposition,
      notes: data.notes,
      duration_seconds: data.duration_seconds,
      ended_at: new Date(),
    });

    await this.applyDispositionLogic(tenantId, lead, repId, record.id, data.direction, data.disposition, data.notes, data.scheduled_at);

    return record.reload({
      include: [
        { model: Lead, as: 'lead', attributes: ['id', 'first_name', 'last_name', 'phone', 'lead_type'] },
        { model: User, as: 'rep', attributes: ['id', 'first_name', 'last_name'] },
      ],
    });
  }

  async logDisposition(
    tenantId: string, callId: string, repId: string,
    disposition: CallDisposition, notes?: string, scheduledAt?: Date,
  ): Promise<CallRecord> {
    const record = await CallRecord.findOne({ where: { id: callId, tenant_id: tenantId } });
    if (!record) throw new Error('Call record not found.');

    await record.update({ disposition, notes: notes ?? record.notes });

    const lead = await Lead.findByPk(record.lead_id);
    if (lead) {
      await this.applyDispositionLogic(tenantId, lead, repId, callId, record.direction, disposition, notes, scheduledAt);
    }

    return record.reload();
  }

  async getCallHistory(tenantId: string, query: any): Promise<any> {
    const where: any = { tenant_id: tenantId };
    if (query.lead_id) where.lead_id = query.lead_id;
    if (query.rep_id) where.rep_id = query.rep_id;
    if (query.direction) where.direction = query.direction;

    const page = parseInt(query.page || '1');
    const limit = parseInt(query.limit || '50');
    const offset = (page - 1) * limit;

    const { rows, count } = await CallRecord.findAndCountAll({
      where,
      include: [
        { model: Lead, as: 'lead', attributes: ['id', 'first_name', 'last_name', 'email', 'phone'] },
        { model: User, as: 'rep', attributes: ['id', 'first_name', 'last_name'] },
      ],
      order: [['created_at', 'DESC']],
      limit,
      offset,
    });

    return { records: rows, total: count, page, limit };
  }

  async getCallStats(tenantId: string): Promise<any> {
    const base: any = { tenant_id: tenantId };
    const [total, completed, noAnswer, interested, notInterested, callbackScheduled] = await Promise.all([
      CallRecord.count({ where: base }),
      CallRecord.count({ where: { ...base, status: 'completed' } }),
      CallRecord.count({ where: { ...base, disposition: 'No Answer' } }),
      CallRecord.count({ where: { ...base, disposition: 'Interested' } }),
      CallRecord.count({ where: { ...base, disposition: 'Not Interested' } }),
      CallRecord.count({ where: { ...base, disposition: 'Callback Scheduled' } }),
    ]);
    return { total, completed, no_answer: noAnswer, interested, not_interested: notInterested, callback_scheduled: callbackScheduled };
  }

  private async applyDispositionLogic(
    tenantId: string,
    lead: Lead,
    repId: string,
    callId: string,
    direction: 'inbound' | 'outbound',
    disposition: CallDisposition,
    notes?: string,
    scheduledAt?: Date,
  ): Promise<void> {
    const cfg = await TenantPhoneConfig.findOne({ where: { tenant_id: tenantId } });
    const threshold = cfg?.max_call_attempts_before_fail ?? 6;
    const slaHours = cfg?.sla_warm_contact_hours ?? 24;

    // Temperature upgrade on inbound calls
    if (direction === 'inbound') {
      const oldType = lead.lead_type;
      let newType: string | null = null;

      if (lead.lead_type === 'COLD') {
        newType = 'WARM';
      } else if (lead.lead_type === 'WARM') {
        newType = 'HOT';
      }

      if (newType) {
        const slaBreachAt = newType === 'WARM'
          ? new Date(Date.now() + slaHours * 60 * 60 * 1000)
          : undefined;

        await lead.update({
          lead_type: newType,
          last_call_at: new Date(),
          last_activity_at: new Date(),
          ...(slaBreachAt ? { sla_breach_at: slaBreachAt } : {}),
        });

        emitToTenant(tenantId, 'lead_temperature_changed', {
          lead_id: lead.id,
          lead_name: `${lead.first_name} ${lead.last_name}`,
          from: oldType,
          to: newType,
        });
      } else {
        await lead.update({ last_call_at: new Date(), last_activity_at: new Date() });
      }
    } else {
      await lead.update({ last_call_at: new Date(), last_activity_at: new Date() });
    }

    // FAILED threshold on unsuccessful outbound attempts
    if (direction === 'outbound' && (disposition === 'Not Interested' || disposition === 'No Answer')) {
      const newCount = (lead.call_attempt_count || 0) + 1;
      await lead.update({ call_attempt_count: newCount });

      if (newCount >= threshold && lead.lead_type !== 'FAILED') {
        await lead.update({ lead_type: 'FAILED', status: 'FAILED', failed_at: new Date() });

        await Notification.create({
          tenant_id: tenantId,
          user_id: repId,
          type: 'lead_failed_calls',
          title: 'Call Threshold Reached',
          message: `${lead.first_name} ${lead.last_name} marked FAILED after ${newCount} unsuccessful call attempts.`,
          metadata: { lead_id: lead.id, call_attempt_count: newCount },
          is_read: false,
        } as any);

        emitToTenant(tenantId, 'lead_failed', {
          lead_id: lead.id,
          lead_name: `${lead.first_name} ${lead.last_name}`,
          call_attempt_count: newCount,
        });
      }
    }

    // Engagement score on interested
    if (disposition === 'Interested') {
      await EngagementEvent.create({
        tenant_id: tenantId,
        lead_id: lead.id,
        event_type: 'call_interested',
        channel: 'call',
        metadata: { call_record_id: callId },
        score_delta: 20,
      });
    }

    // Schedule callback
    if (disposition === 'Callback Scheduled' && scheduledAt) {
      await CallbackSchedule.create({
        tenant_id: tenantId,
        lead_id: lead.id,
        rep_id: repId,
        call_record_id: callId,
        scheduled_at: scheduledAt,
        notes,
      });
    }
  }
}
