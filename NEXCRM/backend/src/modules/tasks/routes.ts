import { Router } from 'express';
import { authenticate, tenantIsolation } from '../../middleware/auth';
import { getAll, create, update, remove } from './controllers/taskController';

const router = Router();

router.use(authenticate, tenantIsolation);

router.get('/', getAll);
router.post('/', create);
router.patch('/:id', update);
router.delete('/:id', remove);

export default router;
