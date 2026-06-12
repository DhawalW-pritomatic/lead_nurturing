import { Response } from 'express';
import { AuthRequest } from '../../../middleware/auth';
import { LeadService } from '../services/leadService';

const leadService = new LeadService();

export class LeadController {
  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const lead = await leadService.createLead(req.user!.tenant_id, req.user!.id, req.body);
      res.status(201).json(lead);
    } catch (error: any) {
      res.status(error.statusCode || 400).json({ error: error.message });
    }
  }

  async getAll(req: AuthRequest, res: Response): Promise<void> {
    try {
      const result = await leadService.getLeads(req.user!.tenant_id, req.user!.id, req.user!.role, req.query);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const lead = await leadService.getLeadById(req.user!.tenant_id, req.params.id, req.user!.role);
      res.json(lead);
    } catch (error: any) {
      res.status(error.statusCode || 404).json({ error: error.message });
    }
  }

  async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const lead = await leadService.updateLead(req.user!.tenant_id, req.params.id, req.body, req.user!.id, req.user!.role);
      res.json(lead);
    } catch (error: any) {
      res.status(error.statusCode || 400).json({ error: error.message });
    }
  }

  async delete(req: AuthRequest, res: Response): Promise<void> {
    try {
      await leadService.deleteLead(req.user!.tenant_id, req.params.id);
      res.json({ message: 'Lead deleted successfully.' });
    } catch (error: any) {
      res.status(error.statusCode || 404).json({ error: error.message });
    }
  }

  async bulkImport(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'CSV file is required.' });
        return;
      }
      const result = await leadService.bulkImport(req.user!.tenant_id, req.user!.id, req.file.path);
      res.json(result);
    } catch (error: any) {
      res.status(error.statusCode || 400).json({ error: error.message });
    }
  }

  async getTimeline(req: AuthRequest, res: Response): Promise<void> {
    try {
      const timeline = await leadService.getLeadTimeline(req.user!.tenant_id, req.params.id, req.user!.role);
      res.json(timeline);
    } catch (error: any) {
      res.status(error.statusCode || 404).json({ error: error.message });
    }
  }

  async updateStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      const lead = await leadService.updateLeadStatus(req.user!.tenant_id, req.params.id, req.body.status, req.user!.id, req.user!.role);
      res.json(lead);
    } catch (error: any) {
      res.status(error.statusCode || 400).json({ error: error.message });
    }
  }

  async assignRep(req: AuthRequest, res: Response): Promise<void> {
    try {
      const lead = await leadService.assignRep(req.user!.tenant_id, req.params.id, req.body.rep_id, req.user!.id);
      res.json(lead);
    } catch (error: any) {
      res.status(error.statusCode || 400).json({ error: error.message });
    }
  }

  async getStats(req: AuthRequest, res: Response): Promise<void> {
    try {
      const stats = await leadService.getLeadStats(req.user!.tenant_id, req.user!.id, req.user!.role);
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getKanban(req: AuthRequest, res: Response): Promise<void> {
    try {
      const result = await leadService.getKanbanData(req.user!.tenant_id, req.user!.id, req.user!.role, req.query);
      res.json(result);
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ error: error.message });
    }
  }
}
