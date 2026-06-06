import { Router } from 'express';
import { UserController } from './controllers/userController';
import { authenticate, authorize, tenantIsolation } from '../../middleware/auth';

const router = Router();
const controller = new UserController();

router.use(authenticate, tenantIsolation);

router.get('/', controller.getAll.bind(controller));
router.post('/', authorize('tenant_admin', 'super_admin'), controller.create.bind(controller));
router.get('/performance', authorize('tenant_admin', 'sales_manager', 'super_admin'), controller.getRepPerformance.bind(controller));
router.get('/:id', controller.getById.bind(controller));
router.put('/:id', authorize('tenant_admin', 'super_admin'), controller.update.bind(controller));
router.delete('/:id', authorize('tenant_admin', 'super_admin'), controller.delete.bind(controller));

export default router;
