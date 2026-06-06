import { Response } from 'express';
import { AuthRequest } from '../../../middleware/auth';
import { OutreachService } from '../services/outreachService';

const outreachService = new OutreachService();

export class OutreachController {
  async sendEmail(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { lead_id, template_id } = req.body;
      const result = await outreachService.sendEmail(req.user!.tenant_id, lead_id, template_id, req.user!.id);
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
}
