import { Op } from 'sequelize';
import { EmailSchedule, Template, Lead, NurturingSettings, Tenant } from '../../../database/models';
import { OutreachService } from '../../outreach/services/outreachService';
import { NotificationService } from '../../notifications/services/notificationService';
import { AppError } from '../../../middleware/errorHandler';
import { SequenceAutomationService } from '../../sequences/services/sequenceAutomationService';

const outreachService = new OutreachService();
const notificationService = new NotificationService();
const sequenceAutomationService = new SequenceAutomationService();

export class SchedulerService {
  async getSchedules(tenantId: string): Promise<any[]> {
    return EmailSchedule.findAll({
      where: { tenant_id: tenantId },
      include: [{ model: Template, as: 'template', attributes: ['id', 'name', 'category', 'subject'] }],
      order: [['day_offset', 'ASC']],
    });
  }

  async createSchedule(tenantId: string, userId: string, data: any): Promise<any> {
    const template = await Template.findOne({ where: { id: data.template_id, tenant_id: tenantId } });
    if (!template) throw new AppError('Template not found.', 404);

    return EmailSchedule.create({
      tenant_id: tenantId,
      name: data.name,
      template_id: data.template_id,
      sequence_id: data.sequence_id || null,
      day_offset: data.day_offset,
      target_lead_type: data.target_lead_type || null,
      target_lead_status: data.target_lead_status || null,
      is_active: true,
      created_by: userId,
    });
  }

  async updateSchedule(tenantId: string, scheduleId: string, data: any): Promise<any> {
    const schedule = await EmailSchedule.findOne({ where: { id: scheduleId, tenant_id: tenantId } });
    if (!schedule) throw new AppError('Schedule not found.', 404);

    const updateFields: any = {};
    if (data.name !== undefined) updateFields.name = data.name;
    if (data.template_id !== undefined) updateFields.template_id = data.template_id;
    if (data.day_offset !== undefined) updateFields.day_offset = data.day_offset;
    if (data.target_lead_type !== undefined) updateFields.target_lead_type = data.target_lead_type;
    if (data.target_lead_status !== undefined) updateFields.target_lead_status = data.target_lead_status;

    await EmailSchedule.update(updateFields, { where: { id: scheduleId, tenant_id: tenantId } });
    return EmailSchedule.findByPk(scheduleId, {
      include: [{ model: Template, as: 'template', attributes: ['id', 'name', 'category', 'subject'] }],
    });
  }

  async deleteSchedule(tenantId: string, scheduleId: string): Promise<void> {
    const result = await EmailSchedule.destroy({ where: { id: scheduleId, tenant_id: tenantId } });
    if (!result) throw new AppError('Schedule not found.', 404);
  }

  async toggleSchedule(tenantId: string, scheduleId: string): Promise<any> {
    const schedule = await EmailSchedule.findOne({ where: { id: scheduleId, tenant_id: tenantId } });
    if (!schedule) throw new AppError('Schedule not found.', 404);

    await EmailSchedule.update({ is_active: !schedule.is_active }, { where: { id: scheduleId } });
    return EmailSchedule.findByPk(scheduleId, {
      include: [{ model: Template, as: 'template', attributes: ['id', 'name', 'category', 'subject'] }],
    });
  }

  /**
   * Execute a single schedule manually (for testing or admin override)
   */
  async executeScheduleManually(tenantId: string, scheduleId: string): Promise<any> {
    const schedule = await EmailSchedule.findOne({ where: { id: scheduleId, tenant_id: tenantId } });
    if (!schedule) throw new AppError('Schedule not found.', 404);
    return this.executeSchedule(schedule);
  }

  /**
   * Main scheduler execution: finds leads created exactly `day_offset` days ago
   * and sends the designated template to them.
   */
  async executeSchedule(schedule: any): Promise<any> {
    const tenantId = schedule.tenant_id;

    // Check nurturing settings for pause
    const nurturingSettings = await NurturingSettings.findOne({ where: { tenant_id: tenantId } });
    if (nurturingSettings?.global_pause) {
      return { schedule_id: schedule.id, skipped: true, reason: 'Global pause is active' };
    }

    // Check if today is an allowed send day
    if (nurturingSettings?.allowed_send_days?.length) {
      const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
      if (!nurturingSettings.allowed_send_days.includes(today)) {
        return { schedule_id: schedule.id, skipped: true, reason: `Today (${today}) is not an allowed send day` };
      }
    }

    // Find leads created exactly day_offset days ago
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() - schedule.day_offset);
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

    const where: any = {
      tenant_id: tenantId,
      created_at: { [Op.between]: [startOfDay, endOfDay] },
      opted_out: false,
      email_status: { [Op.ne]: 'invalid' },
    };

    if (schedule.target_lead_type) where.lead_type = schedule.target_lead_type;
    if (schedule.target_lead_status) where.status = schedule.target_lead_status;

    const leads = await Lead.findAll({ where });

    // Filter out dummy/test emails
    const realLeads = leads.filter(lead =>
      !lead.email.endsWith('@example.com') &&
      !lead.email.endsWith('@example.org') &&
      !lead.email.endsWith('@test.com')
    );

    let sent = 0;
    let failed = 0;
    const results: any[] = [];

    for (const lead of realLeads) {
      try {
        const result = await outreachService.sendEmail(
          tenantId,
          lead.id,
          schedule.template_id,
          lead.assigned_rep_id || lead.enrolled_by
        );
        if (result.success) {
          sent++;
          await notificationService.notifyMailSent(tenantId, lead.email, schedule.name);
        } else {
          failed++;
          await notificationService.notifyMailFailed(tenantId, lead.email, result.error);
        }
        results.push({ lead_id: lead.id, email: lead.email, ...result });
      } catch (error: any) {
        failed++;
        await notificationService.notifyMailFailed(tenantId, lead.email, error.message);
        results.push({ lead_id: lead.id, email: lead.email, success: false, error: error.message });
      }
    }

    // Update last_run_at
    await EmailSchedule.update({ last_run_at: new Date() }, { where: { id: schedule.id } });

    // Notification
    if (sent > 0) {
      await notificationService.notifySchedulerTriggered(tenantId, schedule.name, sent);
    }

    return {
      schedule_id: schedule.id,
      schedule_name: schedule.name,
      leads_found: leads.length,
      real_leads: realLeads.length,
      dummy_skipped: leads.length - realLeads.length,
      sent,
      failed,
      results,
    };
  }

  /**
   * Run all active schedules across all tenants.
   * Called by cron job.
   */
  async runAllSchedules(): Promise<any> {
    const sequenceResult = await sequenceAutomationService.processDueEnrollments();

    const schedules = await EmailSchedule.findAll({
      where: { is_active: true },
      include: [{ model: Tenant, as: 'tenant', where: { is_active: true } }],
    });

    const results: any[] = [];
    for (const schedule of schedules) {
      try {
        const result = await this.executeSchedule(schedule);
        results.push(result);
      } catch (error: any) {
        results.push({ schedule_id: schedule.id, error: error.message });
      }
    }

    console.log(`[Scheduler] Sequence automation processed:`, sequenceResult);
    console.log(`[Scheduler] Executed ${schedules.length} schedules. Results:`, JSON.stringify(results.map(r => ({ id: r.schedule_id, sent: r.sent, failed: r.failed }))));
    return { sequence_automation: sequenceResult, schedules: results };
  }
}
