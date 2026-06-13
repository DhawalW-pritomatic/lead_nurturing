import { Response } from 'express';
import { AuthRequest } from '../../../middleware/auth';
import { AdminService } from '../services/adminService';
import { GmailPollerService } from '../../tracking/services/gmailPollerService';

const gmailPoller = new GmailPollerService();

const adminService = new AdminService();

export class AdminController {
  async getPlatformAnalytics(req: AuthRequest, res: Response): Promise<void> {
    try {
      const analytics = await adminService.getPlatformAnalytics();
      res.json(analytics);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getAllTenants(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenants = await adminService.getAllTenants();
      res.json(tenants);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getTenantById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenant = await adminService.getTenantById(req.params.id);
      res.json(tenant);
    } catch (error: any) {
      res.status(error.statusCode || 404).json({ error: error.message });
    }
  }

  async createTenant(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenant = await adminService.createTenant(req.body, req.user!.id);
      res.status(201).json(tenant);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async updateTenant(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenant = await adminService.updateTenant(req.params.id, req.body);
      res.json(tenant);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async deleteTenant(req: AuthRequest, res: Response): Promise<void> {
    try {
      await adminService.deleteTenant(req.params.id);
      res.json({ message: 'Tenant deleted successfully.' });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ error: error.message });
    }
  }

  async toggleTenantStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenant = await adminService.toggleTenantStatus(req.params.id);
      res.json(tenant);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async getAllUsers(req: AuthRequest, res: Response): Promise<void> {
    try {
      const users = await adminService.getAllUsers();
      res.json(users);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getTenantUsers(req: AuthRequest, res: Response): Promise<void> {
    try {
      const users = await adminService.getTenantUsers(req.params.tenantId);
      res.json(users);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getLeadStats(req: AuthRequest, res: Response): Promise<void> {
    try {
      const stats = await adminService.getLeadStats();
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getSystemHealth(req: AuthRequest, res: Response): Promise<void> {
    try {
      const health = await adminService.getSystemHealth();
      res.json(health);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async triggerGmailPoll(req: AuthRequest, res: Response): Promise<void> {
    try {
      const result = await gmailPoller.poll();
      res.json({ message: 'Poll complete', ...result });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getTenantLeads(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { tenantId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const leadType = req.query.lead_type as string | undefined;

      const result = await adminService.getTenantLeads(tenantId, page, limit, leadType);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
