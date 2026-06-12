import { Response } from 'express';
import { AuthRequest } from '../../../middleware/auth';
import { CallbackService } from '../services/callbackService';

const callbackService = new CallbackService();

export const schedule = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user!.tenant_id;
    const repId = req.user!.id;
    const { lead_id, scheduled_at, notes } = req.body;
    const cb = await callbackService.schedule(tenantId, lead_id, repId, new Date(scheduled_at), notes);
    res.status(201).json(cb);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const getAll = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user!.tenant_id;
    const cbs = await callbackService.getAll(tenantId, req.query);
    res.json(cbs);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const getUpcoming = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user!.tenant_id;
    const cbs = await callbackService.getUpcoming(tenantId);
    res.json(cbs);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const update = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user!.tenant_id;
    const { id } = req.params;
    const cb = await callbackService.update(tenantId, id, req.body);
    res.json(cb);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};
