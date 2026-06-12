import { Router } from 'express';
import { authenticate, tenantIsolation } from '../../middleware/auth';
import { schedule, getAll, getUpcoming, update } from './controllers/callbackController';

const router = Router();

router.use(authenticate, tenantIsolation);

router.post('/', schedule);
router.get('/upcoming', getUpcoming);
router.get('/', getAll);
router.patch('/:id', update);

export default router;
