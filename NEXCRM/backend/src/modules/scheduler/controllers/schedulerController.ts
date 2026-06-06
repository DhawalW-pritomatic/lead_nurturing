import { Response } from 'express';
import { AuthRequest } from '../../../middleware/auth';
import { SchedulerService } from '../services/schedulerService';

const schedulerService = new SchedulerService();

export class SchedulerController {
  async getSchedules(req: AuthRequest, res: Response): Promise<void> {
    try {
      const schedules = await schedulerService.getSchedules(req.user!.tenant_id);
      res.json(schedules);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async createSchedule(req: AuthRequest, res: Response): Promise<void> {
    try {
      const schedule = await schedulerService.createSchedule(req.user!.tenant_id, req.user!.id, req.body);
      res.status(201).json(schedule);
    } catch (error: any) {
      res.status(error.statusCode || 400).json({ error: error.message });
    }
  }

  async updateSchedule(req: AuthRequest, res: Response): Promise<void> {
    try {
      const schedule = await schedulerService.updateSchedule(req.user!.tenant_id, req.params.id, req.body);
      res.json(schedule);
    } catch (error: any) {
      res.status(error.statusCode || 400).json({ error: error.message });
    }
  }

  async deleteSchedule(req: AuthRequest, res: Response): Promise<void> {
    try {
      await schedulerService.deleteSchedule(req.user!.tenant_id, req.params.id);
      res.json({ message: 'Schedule deleted.' });
    } catch (error: any) {
      res.status(error.statusCode || 400).json({ error: error.message });
    }
  }

  async toggleSchedule(req: AuthRequest, res: Response): Promise<void> {
    try {
      const schedule = await schedulerService.toggleSchedule(req.user!.tenant_id, req.params.id);
      res.json(schedule);
    } catch (error: any) {
      res.status(error.statusCode || 400).json({ error: error.message });
    }
  }

  async runNow(req: AuthRequest, res: Response): Promise<void> {
    try {
      const result = await schedulerService.executeScheduleManually(req.user!.tenant_id, req.params.id);
      res.json(result);
    } catch (error: any) {
      res.status(error.statusCode || 400).json({ error: error.message });
    }
  }
}
