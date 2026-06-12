import { Op } from 'sequelize';
import { Sequence, SequenceEnrollment, Lead, Template, Tenant, NurturingSettings } from '../../../database/models';
import { OutreachService } from '../../outreach/services/outreachService';
import { NotificationService } from '../../notifications/services/notificationService';
import { AppError } from '../../../middleware/errorHandler';

const outreachService = new OutreachService();
const notificationService = new NotificationService();

interface SequenceStep {
  step_number: number;
  action: 'email' | 'wait' | 'task';
  template_id?: string;
  delay_value: number;
  delay_unit: 'minutes' | 'hours' | 'days' | 'weeks';
  condition?: string;
}

export class SequenceService {
  /**
   * CORE AUTOMATION: Process all pending sequence steps
   * Called by cron job every 15 minutes
   */
  async processPendingSteps(): Promise<any> {
    console.log('[SequenceService] Starting to process pending steps...');
    
    try {
      // Find all active enrollments where it's time to execute the next step
      const now = new Date();
      const pendingEnrollments = await SequenceEnrollment.findAll({
        where: {
          status: 'active',
          next_step_at: { [Op.lte]: now },
        },
        include: [
          {
            model: Sequence,
            as: 'sequence',
            where: { status: 'active' },
            include: [{ model: Tenant, as: 'tenant', where: { is_active: true } }],
          },
          {
            model: Lead,
            as: 'lead',
            where: { opted_out: false, email_status: { [Op.ne]: 'invalid' } },
          },
        ],
        limit: 100, // Process max 100 at a time to prevent overload
      });

      console.log(`[SequenceService] Found ${pendingEnrollments.length} pending enrollments`);

      const results = {
        processed: 0,
        sent: 0,
        failed: 0,
        completed: 0,
        skipped: 0,
        errors: [] as any[],
      };

      for (const enrollment of pendingEnrollments) {
        try {
          const result = await this.processEnrollmentStep(enrollment);
          results.processed++;
          
          if (result.sent) results.sent++;
          if (result.failed) results.failed++;
          if (result.completed) results.completed++;
          if (result.skipped) results.skipped++;
        } catch (error: any) {
          results.failed++;
          results.errors.push({
            enrollment_id: enrollment.id,
            lead_id: enrollment.lead_id,
            error: error.message,
          });
          console.error(`[SequenceService] Error processing enrollment ${enrollment.id}:`, error.message);
        }
      }

      console.log('[SequenceService] Processing complete:', results);
      return results;
    } catch (error: any) {
      console.error('[SequenceService] Fatal error in processPendingSteps:', error.message);
      throw error;
    }
  }

  /**
   * Process a single enrollment step
   */
  private async processEnrollmentStep(enrollment: any): Promise<any> {
    const sequence = enrollment.sequence;
    const lead = enrollment.lead;
    const steps: SequenceStep[] = sequence.steps || [];
    
    // Check if there's a next step
    if (enrollment.current_step >= steps.length) {
      // Sequence complete
      await SequenceEnrollment.update(
        {
          status: 'completed',
          completed_at: new Date(),
        },
        { where: { id: enrollment.id } }
      );
      
      await notificationService.create({
        tenant_id: enrollment.tenant_id,
        user_id: lead.assigned_rep_id || lead.enrolled_by,
        type: 'sequence_completed',
        title: 'Sequence Completed',
        message: `Lead ${lead.first_name} ${lead.last_name} completed sequence: ${sequence.name}`,
        metadata: { lead_id: lead.id, sequence_id: sequence.id }
      });
      
      return { completed: true };
    }

    const currentStep = steps[enrollment.current_step];

    // Check nurturing settings for global pause
    const nurturingSettings = await NurturingSettings.findOne({
      where: { tenant_id: enrollment.tenant_id },
    });

    if (nurturingSettings?.global_pause) {
      console.log(`[SequenceService] Skipping - global pause active for tenant ${enrollment.tenant_id}`);
      return { skipped: true, reason: 'global_pause' };
    }

    // Check allowed send days
    if (nurturingSettings?.allowed_send_days?.length) {
      const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
      if (!nurturingSettings.allowed_send_days.includes(today)) {
        // Reschedule to tomorrow at the same time
        const tomorrow = new Date(enrollment.next_step_at);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        await SequenceEnrollment.update(
          { next_step_at: tomorrow },
          { where: { id: enrollment.id } }
        );
        
        console.log(`[SequenceService] Skipping - ${today} not an allowed send day, rescheduled to ${tomorrow}`);
        return { skipped: true, reason: 'not_allowed_day' };
      }
    }

    // Check business hours
    if (nurturingSettings?.daily_send_window_start && nurturingSettings?.daily_send_window_end) {
      const now = new Date();
      const currentHour = now.getHours();
      const [startHour] = nurturingSettings.daily_send_window_start.split(':').map(Number);
      const [endHour] = nurturingSettings.daily_send_window_end.split(':').map(Number);

      if (currentHour < startHour || currentHour >= endHour) {
        // Reschedule to start of next business hours
        const nextSend = new Date();
        if (currentHour >= endHour) {
          nextSend.setDate(nextSend.getDate() + 1);
        }
        nextSend.setHours(startHour, 0, 0, 0);

        await SequenceEnrollment.update(
          { next_step_at: nextSend },
          { where: { id: enrollment.id } }
        );

        console.log(`[SequenceService] Outside business hours, rescheduled to ${nextSend}`);
        return { skipped: true, reason: 'outside_business_hours' };
      }
    }

    // Execute step based on action type
    switch (currentStep.action) {
      case 'email':
        return await this.executeEmailStep(enrollment, currentStep, lead, sequence);
      
      case 'wait':
        return await this.executeWaitStep(enrollment, currentStep);
      
      case 'task':
        return await this.executeTaskStep(enrollment, currentStep, lead);
      
      default:
        throw new Error(`Unknown step action: ${currentStep.action}`);
    }
  }

  /**
   * Execute an email step
   */
  private async executeEmailStep(
    enrollment: any,
    step: SequenceStep,
    lead: any,
    sequence: any
  ): Promise<any> {
    if (!step.template_id) {
      throw new Error('Email step requires template_id');
    }

    try {
      // Send email
      const result = await outreachService.sendEmail(
        enrollment.tenant_id,
        lead.id,
        step.template_id,
        lead.assigned_rep_id || lead.enrolled_by,
        step.step_number, // Pass sequence step number for tracking
        undefined, // No assets for automated sequences
        { sequence_id: sequence.id, sequence_enrollment_id: enrollment.id } // Sequence context
      );

      if (result.success) {
        // Calculate next step time
        const nextStepAt = this.calculateNextStepTime(
          step.delay_value,
          step.delay_unit
        );

        // Move to next step
        await SequenceEnrollment.update(
          {
            current_step: enrollment.current_step + 1,
            next_step_at: nextStepAt,
          },
          { where: { id: enrollment.id } }
        );

        console.log(`[SequenceService] Email sent to ${lead.email}, next step at ${nextStepAt}`);
        return { sent: true, next_step_at: nextStepAt };
      } else {
        // Email failed, mark enrollment as failed
        await SequenceEnrollment.update(
          {
            status: 'exited',
            exit_reason: `Email failed: ${result.error}`,
          },
          { where: { id: enrollment.id } }
        );

        await notificationService.create({
          tenant_id: enrollment.tenant_id,
          user_id: lead.assigned_rep_id || lead.enrolled_by,
          type: 'sequence_failed',
          title: 'Sequence Failed',
          message: `Sequence "${sequence.name}" failed for ${lead.first_name} ${lead.last_name}: ${result.error}`,
          metadata: { lead_id: lead.id, sequence_id: sequence.id }
        });

        return { failed: true, error: result.error };
      }
    } catch (error: any) {
      console.error(`[SequenceService] Email step error:`, error.message);
      throw error;
    }
  }

  /**
   * Execute a wait step
   */
  private async executeWaitStep(enrollment: any, step: SequenceStep): Promise<any> {
    const nextStepAt = this.calculateNextStepTime(step.delay_value, step.delay_unit);

    await SequenceEnrollment.update(
      {
        current_step: enrollment.current_step + 1,
        next_step_at: nextStepAt,
      },
      { where: { id: enrollment.id } }
    );

    console.log(`[SequenceService] Wait step executed, next step at ${nextStepAt}`);
    return { sent: false, next_step_at: nextStepAt };
  }

  /**
   * Execute a task step (create notification for rep)
   */
  private async executeTaskStep(
    enrollment: any,
    step: SequenceStep,
    lead: any
  ): Promise<any> {
    await notificationService.create({
      tenant_id: enrollment.tenant_id,
      user_id: lead.assigned_rep_id || lead.enrolled_by,
      type: 'task_created',
      title: 'Follow-up Task',
      message: `Follow up with ${lead.first_name} ${lead.last_name}`,
      metadata: { lead_id: lead.id, sequence_id: enrollment.sequence_id }
    });

    const nextStepAt = this.calculateNextStepTime(step.delay_value, step.delay_unit);

    await SequenceEnrollment.update(
      {
        current_step: enrollment.current_step + 1,
        next_step_at: nextStepAt,
      },
      { where: { id: enrollment.id } }
    );

    return { sent: false, task_created: true, next_step_at: nextStepAt };
  }

  /**
   * Calculate when the next step should execute
   */
  private calculateNextStepTime(value: number, unit: string): Date {
    const now = new Date();
    
    switch (unit) {
      case 'minutes':
        now.setMinutes(now.getMinutes() + value);
        break;
      case 'hours':
        now.setHours(now.getHours() + value);
        break;
      case 'days':
        now.setDate(now.getDate() + value);
        break;
      case 'weeks':
        now.setDate(now.getDate() + value * 7);
        break;
      default:
        throw new Error(`Invalid delay unit: ${unit}`);
    }
    
    return now;
  }

  /**
   * AUTO-ENROLLMENT: Check for leads that should be enrolled in sequences
   * Called by cron job hourly
   */
  async autoEnrollLeads(): Promise<any> {
    console.log('[SequenceService] Checking for auto-enrollments...');

    try {
      // Get all active sequences with triggers
      const sequences = await Sequence.findAll({
        where: {
          status: 'active',
          trigger_type: { [Op.in]: ['lead_created', 'status_change', 'score_threshold'] },
        },
        include: [{ model: Tenant, as: 'tenant', where: { is_active: true } }],
      });

      const results = {
        sequences_checked: sequences.length,
        leads_enrolled: 0,
        errors: [] as any[],
      };

      for (const sequence of sequences) {
        try {
          const enrolled = await this.checkAndEnrollByTrigger(sequence);
          results.leads_enrolled += enrolled;
        } catch (error: any) {
          results.errors.push({
            sequence_id: sequence.id,
            error: error.message,
          });
        }
      }

      console.log('[SequenceService] Auto-enrollment complete:', results);
      return results;
    } catch (error: any) {
      console.error('[SequenceService] Auto-enrollment error:', error.message);
      throw error;
    }
  }

  /**
   * Check and enroll leads based on sequence trigger
   */
  private async checkAndEnrollByTrigger(sequence: any): Promise<number> {
    const where: any = {
      tenant_id: sequence.tenant_id,
      opted_out: false,
      email_status: { [Op.ne]: 'invalid' },
    };

    // Apply lead type filter if specified
    if (sequence.lead_type_target) {
      where.lead_type = sequence.lead_type_target;
    }

    let leads: any[] = [];

    switch (sequence.trigger_type) {
      case 'lead_created':
        // Enroll leads created in the last hour
        const oneHourAgo = new Date();
        oneHourAgo.setHours(oneHourAgo.getHours() - 1);
        where.created_at = { [Op.gte]: oneHourAgo };
        leads = await Lead.findAll({ where });
        break;

      case 'status_change':
        // Catch leads whose lead_type was recently updated (within last 2 hours).
        // The cron runs every 15 min so this window safely covers any temperature change.
        where.updated_at = { [Op.gte]: new Date(Date.now() - 2 * 60 * 60 * 1000) };
        leads = await Lead.findAll({ where });
        break;

      case 'score_threshold':
        // Enroll leads above certain score
        where.total_score = { [Op.gte]: 50 };
        leads = await Lead.findAll({ where });
        break;
    }

    let enrolled = 0;

    for (const lead of leads) {
      // Check if already enrolled
      const existing = await SequenceEnrollment.findOne({
        where: {
          lead_id: lead.id,
          sequence_id: sequence.id,
          status: { [Op.in]: ['active', 'paused'] },
        },
      });

      if (!existing) {
        await this.enrollLead(sequence.tenant_id, lead.id, sequence.id);
        enrolled++;
      }
    }

    if (enrolled > 0) {
      console.log(`[SequenceService] Auto-enrolled ${enrolled} leads in sequence "${sequence.name}"`);
    }

    return enrolled;
  }

  /**
   * Manually enroll a lead in a sequence
   */
  async enrollLead(tenantId: string, leadId: string, sequenceId: string): Promise<any> {
    const lead = await Lead.findOne({ where: { id: leadId, tenant_id: tenantId } });
    if (!lead) throw new AppError('Lead not found', 404);

    const sequence = await Sequence.findOne({ where: { id: sequenceId, tenant_id: tenantId } });
    if (!sequence) throw new AppError('Sequence not found', 404);

    if (sequence.status !== 'active') {
      throw new AppError('Sequence is not active', 400);
    }

    // Check if already enrolled
    const existing = await SequenceEnrollment.findOne({
      where: {
        lead_id: leadId,
        sequence_id: sequenceId,
        status: { [Op.in]: ['active', 'paused'] },
      },
    });

    if (existing) {
      throw new AppError('Lead is already enrolled in this sequence', 400);
    }

    const steps = (sequence.steps || []) as SequenceStep[];
    if (steps.length === 0) {
      throw new AppError('Sequence has no steps', 400);
    }

    // Calculate when first step should execute
    const firstStep = steps[0];
    const nextStepAt = this.calculateNextStepTime(
      firstStep.delay_value || 0,
      firstStep.delay_unit || 'minutes'
    );

    const enrollment = await SequenceEnrollment.create({
      tenant_id: tenantId,
      lead_id: leadId,
      sequence_id: sequenceId,
      current_step: 0,
      started_at: new Date(),
      next_step_at: nextStepAt,
      status: 'active',
    });

    await notificationService.create({
      tenant_id: tenantId,
      user_id: lead.assigned_rep_id || lead.enrolled_by,
      type: 'sequence_enrolled',
      title: 'Lead Enrolled in Sequence',
      message: `${lead.first_name} ${lead.last_name} enrolled in sequence: ${sequence.name}`,
      metadata: { lead_id: leadId, sequence_id: sequenceId }
    });

    console.log(`[SequenceService] Lead ${leadId} enrolled in sequence ${sequenceId}, first step at ${nextStepAt}`);

    return enrollment;
  }

  /**
   * Pause an enrollment
   */
  async pauseEnrollment(tenantId: string, enrollmentId: string): Promise<void> {
    const enrollment = await SequenceEnrollment.findOne({
      where: { id: enrollmentId, tenant_id: tenantId },
    });

    if (!enrollment) throw new AppError('Enrollment not found', 404);

    await SequenceEnrollment.update(
      { status: 'paused' },
      { where: { id: enrollmentId } }
    );
  }

  /**
   * Resume an enrollment
   */
  async resumeEnrollment(tenantId: string, enrollmentId: string): Promise<void> {
    const enrollment = await SequenceEnrollment.findOne({
      where: { id: enrollmentId, tenant_id: tenantId },
    });

    if (!enrollment) throw new AppError('Enrollment not found', 404);

    await SequenceEnrollment.update(
      { status: 'active' },
      { where: { id: enrollmentId } }
    );
  }

  /**
   * Exit an enrollment
   */
  async exitEnrollment(
    tenantId: string,
    enrollmentId: string,
    reason: string
  ): Promise<void> {
    const enrollment = await SequenceEnrollment.findOne({
      where: { id: enrollmentId, tenant_id: tenantId },
    });

    if (!enrollment) throw new AppError('Enrollment not found', 404);

    await SequenceEnrollment.update(
      {
        status: 'exited',
        exit_reason: reason,
      },
      { where: { id: enrollmentId } }
    );
  }

  /**
   * Get enrollment statistics
   */
  async getEnrollmentStats(tenantId: string, sequenceId: string): Promise<any> {
    const [total, active, completed, exited] = await Promise.all([
      SequenceEnrollment.count({
        where: { tenant_id: tenantId, sequence_id: sequenceId },
      }),
      SequenceEnrollment.count({
        where: { tenant_id: tenantId, sequence_id: sequenceId, status: 'active' },
      }),
      SequenceEnrollment.count({
        where: { tenant_id: tenantId, sequence_id: sequenceId, status: 'completed' },
      }),
      SequenceEnrollment.count({
        where: { tenant_id: tenantId, sequence_id: sequenceId, status: 'exited' },
      }),
    ]);

    return {
      total,
      active,
      completed,
      exited,
      completion_rate: total > 0 ? ((completed / total) * 100).toFixed(2) : '0.00',
    };
  }
}
