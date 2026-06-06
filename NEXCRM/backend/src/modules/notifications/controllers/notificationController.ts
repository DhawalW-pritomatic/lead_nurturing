import { Response } from 'express';
import { AuthRequest } from '../../../middleware/auth';
import { NotificationService } from '../services/notificationService';

const notificationService = new NotificationService();

export class NotificationController {
  async getAll(req: AuthRequest, res: Response): Promise<void> {
    try {
      const result = await notificationService.getAll(
        req.user!.tenant_id,
        { ...req.query, user_id: req.user!.id },
        req.user!.role,
      );
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getUnreadCount(req: AuthRequest, res: Response): Promise<void> {
    try {
      const count = await notificationService.getUnreadCount(
        req.user!.tenant_id,
        req.user!.id,
        req.user!.role,
      );
      res.json({ unread_count: count });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async markAsRead(req: AuthRequest, res: Response): Promise<void> {
    try {
      await notificationService.markAsRead(
        req.user!.tenant_id,
        req.params.id,
        req.user!.role,
      );
      res.json({ message: 'Notification marked as read.' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async markAllAsRead(req: AuthRequest, res: Response): Promise<void> {
    try {
      await notificationService.markAllAsRead(
        req.user!.tenant_id,
        req.user!.id,
        req.user!.role,
      );
      res.json({ message: 'All notifications marked as read.' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
