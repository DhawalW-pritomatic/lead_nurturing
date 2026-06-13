import { Response } from 'express';
import { AuthRequest } from '../../../middleware/auth';
import { CallService } from '../services/callService';

const callService = new CallService();

export const logCall = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { lead_id, direction, disposition, notes, duration_seconds, scheduled_at } = req.body;
    const tenantId = req.user!.tenant_id;
    const repId = req.user!.id;
    const record = await callService.logCall(tenantId, repId, lead_id, {
      direction,
      disposition,
      notes,
      duration_seconds,
      scheduled_at: scheduled_at ? new Date(scheduled_at) : undefined,
    });
    res.status(201).json(record);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const logDisposition = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { disposition, notes, scheduled_at } = req.body;
    const tenantId = req.user!.tenant_id;
    const repId = req.user!.id;
    const record = await callService.logDisposition(
      tenantId, id, repId, disposition, notes,
      scheduled_at ? new Date(scheduled_at) : undefined,
    );
    res.json(record);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const getHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user!.tenant_id;
    const result = await callService.getCallHistory(tenantId, req.query);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const getStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user!.tenant_id;
    const stats = await callService.getCallStats(tenantId);
    res.json(stats);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};
