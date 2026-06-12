import { Response } from 'express';
import { AuthRequest } from '../../../middleware/auth';
import { Sequence, SequenceEnrollment, Lead, ApplicationType, Tenant } from '../../../database/models';
import { SequenceAutomationService } from '../services/sequenceAutomationService';
import { SequenceAnalyticsService } from '../services/sequenceAnalyticsService';

const automationService = new SequenceAutomationService();
const analyticsService = new SequenceAnalyticsService();

export class SequenceController {
  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const sequence = await Sequence.create({
        tenant_id: req.user!.tenant_id,
        application_type_id: req.body.application_type_id,
        name: req.body.name,
        trigger_type: req.body.trigger_type,
        lead_type_target: req.body.lead_type_target,
        steps: req.body.steps || [],
        cold_followup_template_ids: req.body.cold_followup_template_ids || [],
        cold_followup_until_days: req.body.cold_followup_until_days || 30,
        status: req.body.status || 'draft',
        created_by: req.user!.id,
      });
      res.status(201).json(sequence);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async getAll(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { status, trigger_type } = req.query;
      const where: any = {};
      if (req.user!.role !== 'super_admin') {
        where.tenant_id = req.user!.tenant_id;
      }
      if (status) where.status = status;
      if (trigger_type) where.trigger_type = trigger_type;
      if (req.query.application_type_id) where.application_type_id = req.query.application_type_id;

      const includes: any[] = [
        { model: SequenceEnrollment, as: 'enrollments', attributes: ['id', 'status'] },
        { model: ApplicationType, as: 'applicationType', attributes: ['id', 'name', 'vertical'] },
      ];
      if (req.user!.role === 'super_admin') {
        includes.push({ model: Tenant, as: 'tenant', attributes: ['id', 'name'] });
      }

      const sequences = await Sequence.findAll({
        where,
        include: includes,
        order: [['created_at', 'DESC']],
      });
      res.json(sequences);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const where: any = { id: req.params.id };
      if (req.user!.role !== 'super_admin') {
        where.tenant_id = req.user!.tenant_id;
      }
      const includes: any[] = [
        { model: SequenceEnrollment, as: 'enrollments', include: [{ model: Lead, as: 'lead', attributes: ['id', 'first_name', 'last_name', 'email', 'lead_type'] }] },
        { model: ApplicationType, as: 'applicationType', attributes: ['id', 'name', 'vertical'] },
      ];
      if (req.user!.role === 'super_admin') {
        includes.push({ model: Tenant, as: 'tenant', attributes: ['id', 'name'] });
      }
      const sequence = await Sequence.findOne({
        where,
        include: includes,
      });
      if (!sequence) { res.status(404).json({ error: 'Sequence not found.' }); return; }
      res.json(sequence);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const [updated] = await Sequence.update(req.body, { where: { id: req.params.id, tenant_id: req.user!.tenant_id } });
      if (!updated) { res.status(404).json({ error: 'Sequence not found.' }); return; }
      const sequence = await Sequence.findByPk(req.params.id);
      res.json(sequence);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async delete(req: AuthRequest, res: Response): Promise<void> {
    try {
      const deleted = await Sequence.destroy({ where: { id: req.params.id, tenant_id: req.user!.tenant_id } });
      if (!deleted) { res.status(404).json({ error: 'Sequence not found.' }); return; }
      res.json({ message: 'Sequence deleted.' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async enrollLead(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { lead_id, sequence_id } = req.body;
      const enrollment = await automationService.startLeadWithHistory(
        req.user!.tenant_id,
        req.user!.id,
        lead_id,
        sequence_id,
        Boolean(req.body.force_restart)
      );
      res.status(201).json(enrollment);
      // Trigger step-0 immediately — scoped to this enrollment only, non-blocking
      setImmediate(() => {
        automationService.processSingleEnrollment(enrollment.id).catch((err: any) =>
          console.error('[Sequence] Post-enroll step-0 error:', err.message)
        );
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async startForLead(req: AuthRequest, res: Response): Promise<void> {
    try {
      const enrollment = await automationService.startLeadWithHistory(
        req.user!.tenant_id,
        req.user!.id,
        req.body.lead_id,
        req.body.sequence_id,
        Boolean(req.body.force_restart)
      );
      res.status(201).json(enrollment);
      // Trigger step-0 immediately — scoped to this enrollment only, non-blocking
      setImmediate(() => {
        automationService.processSingleEnrollment(enrollment.id).catch((err: any) =>
          console.error('[Sequence] Post-start step-0 error:', err.message)
        );
      });
    } catch (error: any) {
      res.status(error.statusCode || 400).json({ error: error.message });
    }
  }

  async getEnrollments(req: AuthRequest, res: Response): Promise<void> {
    try {
      const where: any = {};
      if (req.user!.role !== 'super_admin') {
        where.tenant_id = req.user!.tenant_id;
      }
      if (req.query.sequence_id) where.sequence_id = req.query.sequence_id;
      if (req.query.status) where.status = req.query.status;

      const includes: any[] = [
        { model: Lead, as: 'lead', attributes: ['id', 'first_name', 'last_name', 'email', 'score', 'lead_type'] },
        { model: Sequence, as: 'sequence', attributes: ['id', 'name', 'trigger_type'] },
      ];
      if (req.user!.role === 'super_admin') {
        includes.push({ model: Tenant, as: 'tenant', attributes: ['id', 'name'] });
      }

      const enrollments = await SequenceEnrollment.findAll({
        where,
        include: includes,
        order: [['created_at', 'DESC']],
      });
      res.json(enrollments);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async pauseEnrollment(req: AuthRequest, res: Response): Promise<void> {
    try {
      await SequenceEnrollment.update(
        { status: 'paused' },
        { where: { id: req.params.id, tenant_id: req.user!.tenant_id } }
      );
      res.json({ message: 'Enrollment paused.' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async resumeEnrollment(req: AuthRequest, res: Response): Promise<void> {
    try {
      await SequenceEnrollment.update(
        { status: 'active', next_step_at: new Date() },
        { where: { id: req.params.id, tenant_id: req.user!.tenant_id } }
      );
      res.json({ message: 'Enrollment resumed.' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async getAnalytics(req: AuthRequest, res: Response): Promise<void> {
    try {
      const analytics = await analyticsService.getSequenceAnalytics(
        req.user!.tenant_id,
        req.params.id,
        req.query.start_date as string | undefined,
        req.query.end_date as string | undefined
      );
      res.json(analytics);
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ error: error.message });
    }
  }

  async getAnalyticsOverview(req: AuthRequest, res: Response): Promise<void> {
    try {
      const analytics = await analyticsService.getOverviewAnalytics(
        req.user!.tenant_id,
        req.query.start_date as string | undefined,
        req.query.end_date as string | undefined
      );
      res.json(analytics);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async clone(req: AuthRequest, res: Response): Promise<void> {
    try {
      const original = await Sequence.findOne({ where: { id: req.params.id, tenant_id: req.user!.tenant_id } });
      if (!original) { res.status(404).json({ error: 'Sequence not found.' }); return; }
      const cloned = await Sequence.create({
        tenant_id: req.user!.tenant_id,
        application_type_id: (original as any).application_type_id,
        name: `${(original as any).name} (Copy)`,
        trigger_type: (original as any).trigger_type,
        lead_type_target: (original as any).lead_type_target,
        steps: (original as any).steps,
        cold_followup_template_ids: (original as any).cold_followup_template_ids,
        cold_followup_until_days: (original as any).cold_followup_until_days,
        status: 'draft',
        created_by: req.user!.id,
      });
      res.status(201).json(cloned);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async unenrollLead(req: AuthRequest, res: Response): Promise<void> {
    try {
      const enrollment = await SequenceEnrollment.findOne({ where: { id: req.params.id, tenant_id: req.user!.tenant_id } });
      if (!enrollment) { res.status(404).json({ error: 'Enrollment not found.' }); return; }
      await SequenceEnrollment.update(
        { status: 'exited', exit_reason: 'manual_unenroll', completed_at: new Date() },
        { where: { id: req.params.id, tenant_id: req.user!.tenant_id } }
      );
      res.json({ message: 'Lead unenrolled.' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}
