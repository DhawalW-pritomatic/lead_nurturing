import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest } from '../../../middleware/auth';
import { OutreachService } from '../services/outreachService';
import { addSseClient, removeSseClient } from '../../../utils/sseEmitter';
import { config } from '../../../config';

const outreachService = new OutreachService();

export class OutreachController {
  async sendEmail(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { lead_id, template_id, asset_ids } = req.body;
      const result = await outreachService.sendEmail(
        req.user!.tenant_id,
        lead_id,
        template_id,
        req.user!.id,
        undefined,
        undefined,
        asset_ids  // optional array of S3Asset IDs to attach
      );
      res.json(result);
    } catch (error: any) {
      res.status(error.statusCode || 400).json({ error: error.message });
    }
  }

  async getHistory(req: AuthRequest, res: Response): Promise<void> {
    try {
      const result = await outreachService.getOutreachHistory(req.user!.tenant_id, req.query, req.user!.role);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getStats(req: AuthRequest, res: Response): Promise<void> {
    try {
      const stats = await outreachService.getOutreachStats(req.user!.tenant_id, req.user!.role);
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // SSE stream — EventSource can't send Authorization headers, so token comes as query param
  streamEvents(req: Request, res: Response): void {
    const token = req.query.token as string;
    if (!token) { res.status(401).end(); return; }

    let tenantId: string;
    try {
      const decoded = jwt.verify(token, config.jwt.secret) as any;
      tenantId = decoded.tenant_id;
    } catch {
      res.status(401).end();
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // disable nginx buffering if behind proxy
    res.flushHeaders();

    res.write('event: connected\ndata: {}\n\n');
    (res as any).flush?.();

    addSseClient(tenantId, res);
    req.on('close', () => removeSseClient(tenantId, res));
  }
}
