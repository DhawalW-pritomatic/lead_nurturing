import { Router } from 'express';
import { OutreachController } from './controllers/outreachController';
import { authenticate, tenantIsolation } from '../../middleware/auth';

const router = Router();
const controller = new OutreachController();

router.use(authenticate, tenantIsolation);

router.post('/send', controller.sendEmail.bind(controller));
router.get('/history', controller.getHistory.bind(controller));
router.get('/stats', controller.getStats.bind(controller));

export default router;
