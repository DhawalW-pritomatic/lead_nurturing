import { Op } from 'sequelize';
import { Lead, OutreachRecord, Sequence, SequenceEnrollment, Template } from '../../../database/models';
import { AppError } from '../../../middleware/errorHandler';
import { OutreachService } from '../../outreach/services/outreachService';

const outreachService = new OutreachService();

type SequenceTrack = 'new' | 'post_purchase' | 'all';

interface ParsedStep {
  index: number;
  day_offset: number;
  template_id?: string;
  template_category?: string;
  track: SequenceTrack;
}

export class SequenceAutomationService {
  private parseSteps(rawSteps: any[]): ParsedStep[] {
    return (rawSteps || [])
      .map((step: any, index: number) => {
        const day_offset = Number(step.day_offset ?? step.dayOffset ?? step.day ?? 0);
        const template_id = step.template_id ?? step.templateId;
        const template_category = step.template_category ?? step.templateCategory;
        const trackRaw = String(step.track ?? step.segment ?? step.stage ?? 'all').toLowerCase();
        const track: SequenceTrack = trackRaw === 'new' || trackRaw === 'post_purchase' ? (trackRaw as SequenceTrack) : 'all';

        return {
          index,
          day_offset: Number.isFinite(day_offset) ? day_offset : 0,
          template_id,
          template_category,
          track,
        };
      })
      .filter((step: ParsedStep) => Boolean(step.template_id || step.template_category))
      .sort((a: ParsedStep, b: ParsedStep) => a.day_offset - b.day_offset || a.index - b.index);
  }

  private resolveTrack(lead: any): SequenceTrack {
    const isConverted = lead.status === 'CONVERTED' || lead.lead_type === 'CONVERTED' || Boolean(lead.converted_at);
    return isConverted ? 'post_purchase' : 'new';
  }

  private daysSince(date?: Date): number {
    if (!date) return 0;
    const diff = Date.now() - new Date(date).getTime();
    return Math.max(0, Math.floor(diff / (24 * 60 * 60 * 1000)));
  }

  async startLeadWithHistory(tenantId: string, userId: string, leadId: string, sequenceId: string, forceRestart = false): Promise<any> {
    const [lead, sequence] = await Promise.all([
      Lead.findOne({ where: { id: leadId, tenant_id: tenantId } }),
      Sequence.findOne({ where: { id: sequenceId, tenant_id: tenantId } }),
    ]);

    if (!lead) throw new AppError('Lead not found.', 404);
    if (!sequence) throw new AppError('Sequence not found.', 404);

    if (sequence.application_type_id && lead.application_type_id !== sequence.application_type_id) {
      throw new AppError('Lead project/application type does not match this sequence.', 400);
    }

    const existing = await SequenceEnrollment.findOne({
      where: {
        tenant_id: tenantId,
        lead_id: leadId,
        sequence_id: sequenceId,
        status: { [Op.in]: ['active', 'paused'] },
      },
    });

    if (existing && !forceRestart) {
      return existing;
    }

    if (existing && forceRestart) {
      await SequenceEnrollment.update(
        { status: 'exited', exit_reason: 'restarted', completed_at: new Date() },
        { where: { id: existing.id } }
      );
    }

    const track = this.resolveTrack(lead);
    const steps = this.parseSteps(sequence.steps as any[]);
    const eligibleSteps = steps.filter((step: ParsedStep) => step.track === 'all' || step.track === track);

    const createdDaysAgo = this.daysSince(lead.created_at);
    let currentStep = 0;
    let startOffset = track === 'new' ? createdDaysAgo : 0;

    if (eligibleSteps.length > 0) {
      const nextIndex = eligibleSteps.findIndex((step: ParsedStep) => step.day_offset >= startOffset);
      if (nextIndex >= 0) {
        currentStep = nextIndex;
      } else {
        // All steps are "in the past" based on lead age — always start from step 0
        // so the full sequence (including day-0 welcome email) still runs
        currentStep = 0;
        startOffset = 0;
      }
    }

    return SequenceEnrollment.create({
      tenant_id: tenantId,
      lead_id: leadId,
      sequence_id: sequenceId,
      automation_mode: 'history_aware',
      current_day_offset: startOffset,
      current_step: currentStep,
      started_at: new Date(),
      next_step_at: new Date(),
      status: 'active',
      metadata: {
        started_by: userId,
        track,
        start_offset_day: startOffset,
        cold_loop_index: 0,
      },
    });
  }

  private async sendSequenceStep(enrollment: any, lead: any, sequence: any, step: ParsedStep): Promise<{ success: boolean; error?: string }> {
    let resolvedTemplateId = step.template_id;

    if (resolvedTemplateId) {
      const explicitTemplate = await Template.findOne({
        where: {
          id: resolvedTemplateId,
          tenant_id: enrollment.tenant_id,
          is_active: true,
        },
      });

      if (!explicitTemplate) {
        return { success: false, error: `Template for step ${step.index + 1} not found.` };
      }

      if (lead.application_type_id && explicitTemplate.application_type_id && explicitTemplate.application_type_id !== lead.application_type_id) {
        return { success: false, error: `Template for step ${step.index + 1} does not match lead application type.` };
      }
    }

    if (!resolvedTemplateId && step.template_category) {
      const appScopedWhere: any = {
        tenant_id: enrollment.tenant_id,
        category: step.template_category,
        is_active: true,
      };
      if (lead.application_type_id) {
        appScopedWhere.application_type_id = lead.application_type_id;
      }

      const template = await Template.findOne({
        where: appScopedWhere,
        order: [['updated_at', 'DESC']],
      });

      resolvedTemplateId = template?.id;
    }

    if (!resolvedTemplateId) {
      return { success: false, error: `No template found for step ${step.index + 1}.` };
    }

    const result = await outreachService.sendEmail(
      enrollment.tenant_id,
      lead.id,
      resolvedTemplateId,
      lead.assigned_rep_id || lead.enrolled_by,
      step.index,
      { sequence_id: sequence.id, sequence_enrollment_id: enrollment.id }
    );

    return { success: !!result.success, error: result.error };
  }

  private async runColdRoundRobin(enrollment: any, lead: any, sequence: any): Promise<{ completed: boolean; sent: boolean }> {
    const templates: string[] = Array.isArray(sequence.cold_followup_template_ids) ? sequence.cold_followup_template_ids : [];
    if (!templates.length) {
      await SequenceEnrollment.update(
        { status: 'completed', completed_at: new Date(), exit_reason: 'sequence_completed_no_cold_followup' },
        { where: { id: enrollment.id } }
      );
      return { completed: true, sent: false };
    }

    const daysActive = this.daysSince(enrollment.started_at);
    if (daysActive >= sequence.cold_followup_until_days) {
      await SequenceEnrollment.update(
        { status: 'completed', completed_at: new Date(), exit_reason: `cold_followup_window_${sequence.cold_followup_until_days}_days` },
        { where: { id: enrollment.id } }
      );
      return { completed: true, sent: false };
    }

    const metadata: any = enrollment.metadata || {};
    const index = Number(metadata.cold_loop_index || 0);
    const templateId = templates[index % templates.length];

    const result = await outreachService.sendEmail(
      enrollment.tenant_id,
      lead.id,
      templateId,
      lead.assigned_rep_id || lead.enrolled_by,
      1000 + (index % templates.length),
      { sequence_id: sequence.id, sequence_enrollment_id: enrollment.id }
    );

    const nextMetadata = {
      ...metadata,
      cold_loop_index: index + 1,
      cold_loop_last_sent_at: new Date().toISOString(),
    };

    if (!result.success) {
      await SequenceEnrollment.update(
        { metadata: nextMetadata, next_step_at: new Date(Date.now() + 60 * 60 * 1000) },
        { where: { id: enrollment.id } }
      );
      return { completed: false, sent: false };
    }

    await SequenceEnrollment.update(
      {
        metadata: nextMetadata,
        next_step_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
      { where: { id: enrollment.id } }
    );

    return { completed: false, sent: true };
  }

  private async processEnrollment(enrollment: any): Promise<{ sent: boolean; failed: boolean; completed: boolean }> {
    const lead = enrollment.lead;
    const sequence = enrollment.sequence;

    if (!lead || !sequence) return { sent: false, failed: true, completed: false };

    if (lead.opted_out || lead.email_status === 'invalid') {
      await SequenceEnrollment.update(
        { status: 'exited', completed_at: new Date(), exit_reason: lead.opted_out ? 'lead_opted_out' : 'invalid_email' },
        { where: { id: enrollment.id } }
      );
      return { sent: false, failed: false, completed: true };
    }

    const steps = this.parseSteps(sequence.steps as any[]);
    const metadata: any = enrollment.metadata || {};
    const track = this.resolveTrack(lead);
    const trackChanged = metadata.track !== track;

    const eligibleSteps = steps.filter((step: ParsedStep) => step.track === 'all' || step.track === track);
    let currentStep = trackChanged ? 0 : Number(enrollment.current_step || 0);
    const sentStepIndexes = new Set<number>();

    const sentRecords = await OutreachRecord.findAll({
      where: {
        tenant_id: enrollment.tenant_id,
        sequence_enrollment_id: enrollment.id,
        status: { [Op.in]: ['sent', 'opened', 'clicked'] },
      },
      attributes: ['sequence_step'],
    });

    for (const record of sentRecords as any[]) {
      if (record.sequence_step !== null && record.sequence_step !== undefined && record.sequence_step < 1000) {
        sentStepIndexes.add(record.sequence_step);
      }
    }

    while (currentStep < eligibleSteps.length && sentStepIndexes.has(eligibleSteps[currentStep].index)) {
      currentStep++;
    }

    if (currentStep < eligibleSteps.length) {
      const step = eligibleSteps[currentStep];
      const result = await this.sendSequenceStep(enrollment, lead, sequence, step);

      if (!result.success) {
        await SequenceEnrollment.update(
          {
            current_step: currentStep,
            metadata: { ...metadata, track },
            next_step_at: new Date(Date.now() + 60 * 60 * 1000),
          },
          { where: { id: enrollment.id } }
        );
        return { sent: false, failed: true, completed: false };
      }

      const nextStep = eligibleSteps[currentStep + 1];
      const daysGap = nextStep ? Math.max(1, nextStep.day_offset - step.day_offset) : 1;
      await SequenceEnrollment.update(
        {
          current_step: currentStep + 1,
          current_day_offset: step.day_offset,
          metadata: { ...metadata, track, last_step_index: step.index },
          next_step_at: new Date(Date.now() + daysGap * 24 * 60 * 60 * 1000),
        },
        { where: { id: enrollment.id } }
      );
      return { sent: true, failed: false, completed: false };
    }

    const isCold = lead.lead_type === 'COLD' && lead.status !== 'CONVERTED';
    if (isCold) {
      const loopResult = await this.runColdRoundRobin(enrollment, lead, sequence);
      return { sent: loopResult.sent, failed: false, completed: loopResult.completed };
    }

    await SequenceEnrollment.update(
      { status: 'completed', completed_at: new Date(), exit_reason: 'all_steps_completed' },
      { where: { id: enrollment.id } }
    );
    return { sent: false, failed: false, completed: true };
  }

  /**
   * Process a single enrollment immediately after manual enrolment.
   * Scoped to one row — safe to call concurrently without batch contention.
   */
  async processSingleEnrollment(enrollmentId: string): Promise<void> {
    const enrollment = await SequenceEnrollment.findOne({
      where: { id: enrollmentId, status: 'active', next_step_at: { [Op.lte]: new Date() } },
      include: [
        { model: Lead, as: 'lead' },
        { model: Sequence, as: 'sequence' },
      ],
    });
    if (!enrollment) return;
    await this.processEnrollment(enrollment);
  }

  async processDueEnrollments(): Promise<{ processed: number; sent: number; failed: number; completed: number }> {
    const dueEnrollments = await SequenceEnrollment.findAll({
      where: {
        status: 'active',
        next_step_at: { [Op.lte]: new Date() },
      },
      include: [
        { model: Lead, as: 'lead' },
        { model: Sequence, as: 'sequence' },
      ],
      order: [['next_step_at', 'ASC']],
    });

    let processed = 0;
    let sent = 0;
    let failed = 0;
    let completed = 0;

    for (const enrollment of dueEnrollments as any[]) {
      processed++;
      try {
        const result = await this.processEnrollment(enrollment);
        if (result.sent) sent++;
        if (result.failed) failed++;
        if (result.completed) completed++;
      } catch (err: any) {
        failed++;
        console.error(`[SequenceAutomation] Error processing enrollment ${enrollment.id}:`, err.message);
      }
    }

    return { processed, sent, failed, completed };
  }
}
