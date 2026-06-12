import { Response } from 'express';
import { AuthRequest } from '../../../middleware/auth';
import { TaskService } from '../services/taskService';

const taskService = new TaskService();

export class TaskController {
  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const task = await taskService.createTask(req.user!.tenant_id, req.user!.id, req.body);
      res.status(201).json(task);
    } catch (error: any) {
      res.status(error.statusCode || 400).json({ error: error.message });
    }
  }

  async getAll(req: AuthRequest, res: Response): Promise<void> {
    try {
      const result = await taskService.getTasks(req.user!.tenant_id, req.user!.id, req.user!.role, req.query);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getStats(req: AuthRequest, res: Response): Promise<void> {
    try {
      const stats = await taskService.getStats(req.user!.tenant_id, req.user!.id, req.user!.role);
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const task = await taskService.getTaskById(req.user!.tenant_id, req.params.id);
      res.json(task);
    } catch (error: any) {
      res.status(error.statusCode || 404).json({ error: error.message });
    }
  }

  async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const task = await taskService.updateTask(req.user!.tenant_id, req.params.id, req.body);
      res.json(task);
    } catch (error: any) {
      res.status(error.statusCode || 400).json({ error: error.message });
    }
  }

  async complete(req: AuthRequest, res: Response): Promise<void> {
    try {
      const task = await taskService.completeTask(req.user!.tenant_id, req.params.id);
      res.json(task);
    } catch (error: any) {
      res.status(error.statusCode || 400).json({ error: error.message });
    }
  }

  async delete(req: AuthRequest, res: Response): Promise<void> {
    try {
      await taskService.deleteTask(req.user!.tenant_id, req.params.id);
      res.json({ message: 'Task deleted.' });
    } catch (error: any) {
      res.status(error.statusCode || 404).json({ error: error.message });
    }
  }

  async getTodayAvailability(req: AuthRequest, res: Response): Promise<void> {
    try {
      const data = await taskService.getTodayAvailability(req.user!.tenant_id);
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async setAvailability(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { status, notes } = req.body;
      if (!status) { res.status(400).json({ error: 'status is required.' }); return; }
      const record = await taskService.setAvailability(req.user!.tenant_id, req.user!.id, status, notes);
      res.json(record);
    } catch (error: any) {
      res.status(error.statusCode || 400).json({ error: error.message });
    }
  }
}
