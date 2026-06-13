import { Router } from 'express';
import { authenticate, tenantIsolation } from '../../middleware/auth';
import { logCall, logDisposition, getHistory, getStats } from './controllers/callController';

const router = Router();

router.use(authenticate, tenantIsolation);

router.post('/log', logCall);
router.patch('/:id/disposition', logDisposition);
router.get('/stats', getStats);
router.get('/', getHistory);

export default router;
