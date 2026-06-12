import { Router } from 'express';
import { TaskController } from './controllers/taskController';
import { authenticate, tenantIsolation } from '../../middleware/auth';

const router = Router();
const controller = new TaskController();

router.use(authenticate, tenantIsolation);

// Stats and availability (before /:id to avoid param clash)
router.get('/stats', controller.getStats.bind(controller));
router.get('/availability/today', controller.getTodayAvailability.bind(controller));
router.post('/availability', controller.setAvailability.bind(controller));

// Task CRUD
router.get('/', controller.getAll.bind(controller));
router.post('/', controller.create.bind(controller));
router.get('/:id', controller.getById.bind(controller));
router.put('/:id', controller.update.bind(controller));
router.patch('/:id/complete', controller.complete.bind(controller));
router.delete('/:id', controller.delete.bind(controller));

export default router;
