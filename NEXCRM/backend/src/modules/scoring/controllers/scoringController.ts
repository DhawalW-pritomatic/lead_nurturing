import { Response } from 'express';
import { AuthRequest } from '../../../middleware/auth';
import { ScoringService } from '../services/scoringService';

const scoringService = new ScoringService();

export class ScoringController {
  async getWeights(req: AuthRequest, res: Response): Promise<void> {
    try {
      const weights = await scoringService.getWeights(req.user!.tenant_id);
      res.json(weights);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getThresholds(req: AuthRequest, res: Response): Promise<void> {
    try {
      const thresholds = await scoringService.getThresholds(req.user!.tenant_id);
      res.json(thresholds);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getScoreHistory(req: AuthRequest, res: Response): Promise<void> {
    try {
      const history = await scoringService.getScoreHistory(req.user!.tenant_id, req.params.leadId);
      res.json(history);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async runDecay(req: AuthRequest, res: Response): Promise<void> {
    try {
      const affected = await scoringService.applyScoreDecay(req.user!.tenant_id);
      res.json({ message: 'Score decay applied.', affected_leads: affected });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
