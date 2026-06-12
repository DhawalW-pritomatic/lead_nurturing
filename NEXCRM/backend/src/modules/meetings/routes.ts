import { Router } from 'express';
import { MeetingController } from './controllers/meetingController';
import { authenticate, tenantIsolation } from '../../middleware/auth';

const router = Router();
const controller = new MeetingController();

router.use(authenticate, tenantIsolation);

router.get('/', controller.getAll.bind(controller));
router.post('/', controller.create.bind(controller));
router.put('/:id', controller.update.bind(controller));
router.delete('/:id', controller.delete.bind(controller));
router.patch('/:id/status', controller.updateStatus.bind(controller));

export default router;
