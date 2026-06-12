import { Request, Response } from 'express';
import { AuthRequest } from '../../../middleware/auth';
import { TrackingService } from '../services/trackingService';
import { config } from '../../../config';

const trackingService = new TrackingService();

export class TrackingController {
  // Open tracking pixel
  async trackOpen(req: Request, res: Response): Promise<void> {
    try {
      await trackingService.recordOpen(req.params.trackingId);
      // Return 1x1 transparent pixel
      const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
      res.set({ 'Content-Type': 'image/gif', 'Content-Length': pixel.length.toString(), 'Cache-Control': 'no-cache' });
      res.end(pixel);
    } catch {
      const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
      res.set('Content-Type', 'image/gif');
      res.end(pixel);
    }
  }

  // Click tracking redirect
  async trackClick(req: Request, res: Response): Promise<void> {
    try {
      const url = await trackingService.recordClick(req.params.trackingId);
      res.redirect(url || '/');
    } catch {
      res.redirect('/');
    }
  }

  // Unsubscribe
  async unsubscribe(req: Request, res: Response): Promise<void> {
    try {
      await trackingService.handleUnsubscribe(req.params.leadId, req.query.tenant as string);
      res.send('<html><body><h2>You have been unsubscribed.</h2><p>You will no longer receive automated emails from us.</p></body></html>');
    } catch {
      res.send('<html><body><h2>Unsubscribe processed.</h2></body></html>');
    }
  }

  async createInboundQuery(req: AuthRequest, res: Response): Promise<void> {
    try {
      const query = await trackingService.createInboundQuery(req.user!.tenant_id, req.body);
      res.status(201).json(query);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async ingestInboundEmailWebhook(req: Request, res: Response): Promise<void> {
    try {
      const secret = req.headers['x-inbound-secret'];
      if (!secret || String(secret) !== config.inboundWebhookSecret) {
        res.status(401).json({ error: 'Invalid inbound webhook secret.' });
        return;
      }

      const query = await trackingService.ingestPublicInboundEmail(req.body || {});
      res.status(201).json({ message: 'Inbound email ingested.', query_id: query.id });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async answerQuery(req: AuthRequest, res: Response): Promise<void> {
    try {
      const answerText =
        req.body?.answer_text || req.body?.answer_body || req.body?.answer || req.body?.response;
      const result = await trackingService.answerQuery(req.user!.tenant_id, req.params.id, req.user!.id, answerText);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async getQueryHistory(req: AuthRequest, res: Response): Promise<void> {
    try {
      const history = await trackingService.getQueryHistory(req.user!.tenant_id, req.query, req.user!.role, req.user!.id);
      res.json(history);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getQueryStats(req: AuthRequest, res: Response): Promise<void> {
    try {
      const stats = await trackingService.getQueryStats(req.user!.tenant_id, req.user!.role, req.user!.id);
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
