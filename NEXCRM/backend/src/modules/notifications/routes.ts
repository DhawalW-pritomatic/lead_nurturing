import { Router } from 'express';
import { NotificationController } from './controllers/notificationController';
import { authenticate, tenantIsolation } from '../../middleware/auth';

const router = Router();
const controller = new NotificationController();

router.use(authenticate, tenantIsolation);

router.get('/', controller.getAll.bind(controller));
router.get('/unread-count', controller.getUnreadCount.bind(controller));
router.patch('/:id/read', controller.markAsRead.bind(controller));
router.patch('/read-all', controller.markAllAsRead.bind(controller));

export default router;
