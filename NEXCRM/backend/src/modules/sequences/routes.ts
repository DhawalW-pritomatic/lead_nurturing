import { Router } from 'express';
import { SequenceController } from './controllers/sequenceController';
import { authenticate, authorize, tenantIsolation } from '../../middleware/auth';

const router = Router();
const controller = new SequenceController();

router.use(authenticate, tenantIsolation);

router.get('/', controller.getAll.bind(controller));
router.get('/analytics/overview', controller.getAnalyticsOverview.bind(controller));
router.post('/', authorize('tenant_admin', 'sales_manager', 'super_admin'), controller.create.bind(controller));
router.get('/enrollments', controller.getEnrollments.bind(controller));
router.post('/start', authorize('tenant_admin', 'sales_manager', 'super_admin'), controller.startForLead.bind(controller));
router.post('/enroll', authorize('tenant_admin', 'sales_manager', 'super_admin'), controller.enrollLead.bind(controller));
router.get('/:id/analytics', controller.getAnalytics.bind(controller));
router.get('/:id', controller.getById.bind(controller));
router.put('/:id', authorize('tenant_admin', 'sales_manager', 'super_admin'), controller.update.bind(controller));
router.delete('/:id', authorize('tenant_admin', 'super_admin'), controller.delete.bind(controller));
router.patch('/enrollments/:id/pause', controller.pauseEnrollment.bind(controller));
router.patch('/enrollments/:id/resume', controller.resumeEnrollment.bind(controller));

export default router;
