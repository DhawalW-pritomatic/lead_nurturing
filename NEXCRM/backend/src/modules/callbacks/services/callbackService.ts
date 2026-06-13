import { Op } from 'sequelize';
import { CallbackSchedule, Lead, User, Notification, TenantPhoneConfig } from '../../../database/models';
import { emitToTenant } from '../../../utils/sseEmitter';

export class CallbackService {
  async schedule(tenantId: string, leadId: string, repId: string, scheduledAt: Date, notes?: string): Promise<CallbackSchedule> {
    return CallbackSchedule.create({
      tenant_id: tenantId,
      lead_id: leadId,
      rep_id: repId,
      scheduled_at: scheduledAt,
      notes,
    });
  }

  async getAll(tenantId: string, query: any): Promise<CallbackSchedule[]> {
    const where: any = { tenant_id: tenantId };
    if (query.status) where.status = query.status;
    if (query.lead_id) where.lead_id = query.lead_id;

    return CallbackSchedule.findAll({
      where,
      include: [
        { model: Lead, as: 'lead', attributes: ['id', 'first_name', 'last_name', 'phone', 'lead_type'] },
        { model: User, as: 'rep', attributes: ['id', 'first_name', 'last_name'] },
      ],
      order: [['scheduled_at', 'ASC']],
    });
  }

  async getUpcoming(tenantId: string): Promise<CallbackSchedule[]> {
    const in24h = new Date(Date.now() + 24 * 60 * 60 * 1000);
    return CallbackSchedule.findAll({
      where: {
        tenant_id: tenantId,
        status: 'pending',
        scheduled_at: { [Op.lte]: in24h },
      },
      include: [
        { model: Lead, as: 'lead', attributes: ['id', 'first_name', 'last_name', 'phone'] },
      ],
      order: [['scheduled_at', 'ASC']],
    });
  }

  async update(tenantId: string, id: string, data: any): Promise<CallbackSchedule> {
    const cb = await CallbackSchedule.findOne({ where: { id, tenant_id: tenantId } });
    if (!cb) throw new Error('Callback not found.');
    await cb.update(data);
    return cb.reload();
  }

  async sendUpcomingReminders(): Promise<number> {
    const in60min = new Date(Date.now() + 60 * 60 * 1000);
    const callbacks = await CallbackSchedule.findAll({
      where: {
        status: 'pending',
        reminder_sent: false,
        scheduled_at: { [Op.lte]: in60min },
      },
      include: [
        { model: Lead, as: 'lead', attributes: ['id', 'first_name', 'last_name', 'tenant_id'] },
      ],
    });

    for (const cb of callbacks) {
      const lead = (cb as any).lead;
      if (!cb.rep_id || !lead) continue;

      await Notification.create({
        tenant_id: cb.tenant_id,
        user_id: cb.rep_id,
        type: 'callback_reminder',
        title: 'Callback Reminder',
        message: `You have a callback scheduled with ${lead.first_name} ${lead.last_name} soon.`,
        metadata: { callback_id: cb.id, lead_id: lead.id },
        is_read: false,
      } as any);

      await cb.update({ reminder_sent: true });
      emitToTenant(cb.tenant_id, 'callback_reminder', { callback_id: cb.id, lead_id: lead.id });
    }

    return callbacks.length;
  }

  async processMissedAndSla(): Promise<void> {
    const now = new Date();

    // Mark overdue pending callbacks as missed
    await CallbackSchedule.update(
      { status: 'missed' },
      { where: { status: 'pending', scheduled_at: { [Op.lt]: now } } }
    );

    // SLA breach: WARM leads not contacted within SLA window
    const configs = await TenantPhoneConfig.findAll();
    for (const cfg of configs) {
      const slaLeads = await Lead.findAll({
        where: {
          tenant_id: cfg.tenant_id,
          lead_type: 'WARM',
          sla_breach_at: { [Op.lt]: now, [Op.ne]: null as any },
        },
      });

      for (const lead of slaLeads) {
        await Notification.create({
          tenant_id: cfg.tenant_id,
          user_id: lead.assigned_rep_id,
          type: 'sla_breach',
          title: 'SLA Breach',
          message: `WARM lead ${lead.first_name} ${lead.last_name} has not been contacted within the SLA window.`,
          metadata: { lead_id: lead.id },
          is_read: false,
        } as any);

        await lead.update({ sla_breach_at: null as any });
        emitToTenant(cfg.tenant_id, 'sla_breach', { lead_id: lead.id, lead_name: `${lead.first_name} ${lead.last_name}` });
      }
    }
  }
}
