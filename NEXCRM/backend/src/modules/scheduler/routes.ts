import { Router } from 'express';
import { SchedulerController } from './controllers/schedulerController';
import { authenticate, authorize, tenantIsolation } from '../../middleware/auth';

const router = Router();
const controller = new SchedulerController();

router.use(authenticate, tenantIsolation);

router.get('/', controller.getSchedules.bind(controller));
router.post('/', authorize('tenant_admin', 'super_admin'), controller.createSchedule.bind(controller));
router.put('/:id', authorize('tenant_admin', 'super_admin'), controller.updateSchedule.bind(controller));
router.delete('/:id', authorize('tenant_admin', 'super_admin'), controller.deleteSchedule.bind(controller));
router.patch('/:id/toggle', authorize('tenant_admin', 'super_admin'), controller.toggleSchedule.bind(controller));
router.post('/:id/run', authorize('tenant_admin', 'super_admin'), controller.runNow.bind(controller));

export default router;
