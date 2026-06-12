import { Response } from 'express';
import { Op } from 'sequelize';
import { AuthRequest } from '../../../middleware/auth';
import { Meeting, CallbackSchedule, Task, Lead, User } from '../../../database/models';

export class MeetingController {
  async getAll(req: AuthRequest, res: Response): Promise<void> {
    try {
      const meetings = await Meeting.findAll({
        where: { tenant_id: req.user!.tenant_id },
        include: [
          { model: Lead, as: 'lead', attributes: ['id', 'first_name', 'last_name', 'email'] },
          { model: User, as: 'assignedRep', attributes: ['id', 'first_name', 'last_name', 'email'] },
        ],
        order: [['scheduled_at', 'ASC']],
      });
      res.json(meetings);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const meeting = await Meeting.create({
        tenant_id: req.user!.tenant_id,
        created_by: req.user!.id,
        title: req.body.title,
        lead_id: req.body.lead_id || undefined,
        assigned_to: req.body.assigned_to || undefined,
        description: req.body.description,
        scheduled_at: req.body.scheduled_at,
        duration_minutes: req.body.duration_minutes || 30,
        meeting_type: req.body.meeting_type || 'call',
        location: req.body.location,
        notes: req.body.notes,
      });
      const full = await Meeting.findByPk(meeting.id, {
        include: [
          { model: Lead, as: 'lead', attributes: ['id', 'first_name', 'last_name', 'email'] },
          { model: User, as: 'assignedRep', attributes: ['id', 'first_name', 'last_name', 'email'] },
        ],
      });
      res.status(201).json(full);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const [updated] = await Meeting.update(req.body, {
        where: { id: req.params.id, tenant_id: req.user!.tenant_id },
      });
      if (!updated) { res.status(404).json({ error: 'Meeting not found.' }); return; }
      const meeting = await Meeting.findByPk(req.params.id, {
        include: [
          { model: Lead, as: 'lead', attributes: ['id', 'first_name', 'last_name', 'email'] },
          { model: User, as: 'assignedRep', attributes: ['id', 'first_name', 'last_name', 'email'] },
        ],
      });
      res.json(meeting);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async delete(req: AuthRequest, res: Response): Promise<void> {
    try {
      const deleted = await Meeting.destroy({
        where: { id: req.params.id, tenant_id: req.user!.tenant_id },
      });
      if (!deleted) { res.status(404).json({ error: 'Meeting not found.' }); return; }
      res.json({ message: 'Meeting deleted.' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async updateStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      const [updated] = await Meeting.update(
        { status: req.body.status, notes: req.body.notes },
        { where: { id: req.params.id, tenant_id: req.user!.tenant_id } },
      );
      if (!updated) { res.status(404).json({ error: 'Meeting not found.' }); return; }
      const meeting = await Meeting.findByPk(req.params.id);
      res.json(meeting);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async getCalendar(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { start, end } = req.query;
      if (!start || !end) {
        res.status(400).json({ error: 'start and end query params are required (ISO 8601).' });
        return;
      }
      const startDate = new Date(start as string);
      const endDate = new Date(end as string);
      const tenantId = req.user!.tenant_id;

      const [meetings, callbacks, tasks] = await Promise.all([
        Meeting.findAll({
          where: {
            tenant_id: tenantId,
            scheduled_at: { [Op.between]: [startDate, endDate] },
          },
          include: [
            { model: Lead, as: 'lead', attributes: ['id', 'first_name', 'last_name', 'email'] },
            { model: User, as: 'assignedRep', attributes: ['id', 'first_name', 'last_name', 'email'] },
          ],
          order: [['scheduled_at', 'ASC']],
        }),
        CallbackSchedule.findAll({
          where: {
            tenant_id: tenantId,
            scheduled_at: { [Op.between]: [startDate, endDate] },
          },
          include: [
            { model: Lead, as: 'lead', attributes: ['id', 'first_name', 'last_name', 'email'] },
            { model: User, as: 'rep', attributes: ['id', 'first_name', 'last_name', 'email'] },
          ],
          order: [['scheduled_at', 'ASC']],
        }),
        Task.findAll({
          where: {
            tenant_id: tenantId,
            due_date: { [Op.between]: [startDate, endDate] },
            status: { [Op.in]: ['todo', 'in_progress'] },
          },
          include: [
            { model: Lead, as: 'lead', attributes: ['id', 'first_name', 'last_name', 'email'] },
            { model: User, as: 'assignee', attributes: ['id', 'first_name', 'last_name', 'email'] },
          ],
          order: [['due_date', 'ASC']],
        }),
      ]);

      res.json({ meetings, callbacks, tasks });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
