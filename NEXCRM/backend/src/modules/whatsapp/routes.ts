import { Router } from 'express';
import { authenticate, tenantIsolation } from '../../middleware/auth';
import { sendMessage, getHistory } from './controllers/whatsappController';

const router = Router();

router.use(authenticate, tenantIsolation);

router.post('/send', sendMessage);
router.get('/history', getHistory);

export default router;
