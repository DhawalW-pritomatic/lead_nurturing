import { Router } from 'express';
import { RoutingController } from './controllers/routingController';
import { authenticate, authorize, tenantIsolation } from '../../middleware/auth';

const router = Router();
const controller = new RoutingController();

router.use(authenticate, tenantIsolation);

router.get('/', controller.getAll.bind(controller));
router.get('/logs', controller.getLogs.bind(controller));
router.post('/simulate', controller.simulate.bind(controller));
router.post('/', authorize('tenant_admin', 'super_admin'), controller.create.bind(controller));
router.put('/reorder', authorize('tenant_admin', 'super_admin'), controller.reorder.bind(controller));
router.get('/:id', controller.getById.bind(controller));
router.put('/:id', authorize('tenant_admin', 'super_admin'), controller.update.bind(controller));
router.delete('/:id', authorize('tenant_admin', 'super_admin'), controller.delete.bind(controller));
router.patch('/:id/toggle', authorize('tenant_admin', 'super_admin'), controller.toggle.bind(controller));
router.post('/:id/clone', authorize('tenant_admin', 'super_admin'), controller.clone.bind(controller));
router.post('/run/:leadId', authorize('tenant_admin', 'super_admin', 'sales_manager'), controller.run.bind(controller));

export default router;
