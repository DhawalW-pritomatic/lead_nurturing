import { Response } from 'express';
import { AuthRequest } from '../../../middleware/auth';
import { TaskService } from '../services/taskService';

const taskService = new TaskService();

export const getAll = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user!.tenant_id;
    const result = await taskService.getAll(tenantId, req.query);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const create = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user!.tenant_id;
    const userId = req.user!.id;
    const task = await taskService.create(tenantId, userId, req.body);
    res.status(201).json(task);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const update = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user!.tenant_id;
    const { id } = req.params;
    const task = await taskService.update(tenantId, id, req.body);
    res.json(task);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const remove = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user!.tenant_id;
    const { id } = req.params;
    await taskService.delete(tenantId, id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};
