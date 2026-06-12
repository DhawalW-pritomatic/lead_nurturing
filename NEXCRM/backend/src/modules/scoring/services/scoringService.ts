import { Lead, ScoringProfile, EngagementEvent } from '../../../database/models';
import { Op } from 'sequelize';
import sequelize from '../../../config/database';
import { TaskService } from '../../tasks/services/taskService';

const taskService = new TaskService();

export class ScoringService {
  private defaultWeights: Record<string, number> = {
    email_opened: 5,
    email_cta_clicked: 15,
    website_visit: 10,
    website_visit_high_intent: 20,
    asset_downloaded: 20,
    whatsapp_replied: 20,
    whatsapp_link_clicked: 15,
    call_booked: 40,
    form_resubmitted: 25,
    inbound_query_received: 12,
    query_answered_by_team: 8,
    no_activity_7_days: -10,
    no_activity_30_days: -30,
  };

  private defaultThresholds = {
    cold: { min: 0, max: 39 },
    warm: { min: 40, max: 79 },
    hot: { min: 80, max: 200 },
  };

  async getWeights(tenantId: string): Promise<Record<string, number>> {
    const profile = await ScoringProfile.findOne({ where: { tenant_id: tenantId, is_active: true } });
    if (profile) return profile.event_weights as Record<string, number>;
    return this.defaultWeights;
  }

  async getThresholds(tenantId: string): Promise<any> {
    const profile = await ScoringProfile.findOne({ where: { tenant_id: tenantId, is_active: true } });
    if (profile) return profile.type_thresholds;
    return this.defaultThresholds;
  }

  async updateScore(tenantId: string, leadId: string, eventType: string, scoreDelta: number): Promise<void> {
    const lead = await Lead.findOne({ where: { id: leadId, tenant_id: tenantId } });
    if (!lead) return;

    // Get tenant-specific weights
    const weights = await this.getWeights(tenantId);
    const delta = weights[eventType] !== undefined ? weights[eventType] : scoreDelta;

    const newScore = Math.max(0, Math.min(200, lead.score + delta));
    const thresholds = await this.getThresholds(tenantId);

    let newType = lead.lead_type;
    if (newScore >= thresholds.hot.min) newType = 'HOT';
    else if (newScore >= thresholds.warm.min) newType = 'WARM';
    else newType = 'COLD';

    // Don't downgrade converted/lost leads
    if (['CONVERTED', 'LOST'].includes(lead.lead_type)) return;

    const updateData: any = { score: newScore, last_activity_at: new Date() };
    if (newType !== lead.lead_type) {
      updateData.lead_type = newType;
    }

    await Lead.update(updateData, { where: { id: leadId, tenant_id: tenantId } });

    // Auto-create a call task the first time a lead crosses the HOT threshold
    if (newType === 'HOT' && lead.lead_type !== 'HOT') {
      taskService.autoCreateForHotLead(tenantId, lead).catch(e =>
        console.error('[AutoTask] HOT lead task failed:', e)
      );
    }
  }

  async applyScoreDecay(tenantId: string): Promise<number> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // 30-day decay: -30 points + mark as STALE
    const staleLeads = await Lead.findAll({
      where: {
        tenant_id: tenantId,
        lead_type: { [Op.notIn]: ['CONVERTED', 'LOST', 'STALE'] },
        last_activity_at: { [Op.lt]: thirtyDaysAgo },
        opted_out: false,
      },
    });

    for (const lead of staleLeads) {
      await Lead.update(
        { score: Math.max(0, lead.score - 30), lead_type: 'STALE', status: 'STALE' },
        { where: { id: lead.id } }
      );
      // Auto-create a re-engagement task for each newly stale lead
      taskService.autoCreateForStaleLead(tenantId, lead).catch(e =>
        console.error('[AutoTask] STALE lead task failed:', e)
      );
    }

    // 7-day decay: -10 points
    const inactiveLeads = await Lead.findAll({
      where: {
        tenant_id: tenantId,
        lead_type: { [Op.notIn]: ['CONVERTED', 'LOST', 'STALE'] },
        last_activity_at: { [Op.between]: [thirtyDaysAgo, sevenDaysAgo] },
        opted_out: false,
      },
    });

    for (const lead of inactiveLeads) {
      await Lead.update(
        { score: Math.max(0, lead.score - 10) },
        { where: { id: lead.id } }
      );
    }

    return staleLeads.length + inactiveLeads.length;
  }

  async getScoreHistory(tenantId: string, leadId: string): Promise<any> {
    const events = await EngagementEvent.findAll({
      where: { tenant_id: tenantId, lead_id: leadId },
      attributes: ['event_type', 'score_delta', 'created_at'],
      order: [['created_at', 'ASC']],
    });

    let runningScore = 0;
    return events.map((event: any) => {
      runningScore += event.score_delta;
      return { event_type: event.event_type, score_delta: event.score_delta, total_score: runningScore, timestamp: event.created_at };
    });
  }
}
