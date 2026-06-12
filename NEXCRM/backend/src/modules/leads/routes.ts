import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { LeadController } from './controllers/leadController';
import { authenticate, authorize, tenantIsolation } from '../../middleware/auth';

const router = Router();
const controller = new LeadController();

const upload = multer({
  dest: path.join(__dirname, '../../../uploads/csv'),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
});

router.use(authenticate, tenantIsolation);

router.get('/stats', controller.getStats.bind(controller));
router.get('/kanban', controller.getKanban.bind(controller));
router.get('/', controller.getAll.bind(controller));
router.post('/', controller.create.bind(controller));
router.get('/:id', controller.getById.bind(controller));
router.put('/:id', controller.update.bind(controller));
router.delete('/:id', authorize('tenant_admin', 'sales_manager', 'super_admin'), controller.delete.bind(controller));
router.patch('/:id/status', controller.updateStatus.bind(controller));
router.patch('/:id/assign', authorize('tenant_admin', 'sales_manager', 'super_admin'), controller.assignRep.bind(controller));
router.get('/:id/timeline', controller.getTimeline.bind(controller));
router.post('/import', authorize('tenant_admin', 'sales_manager', 'super_admin'), upload.single('file'), controller.bulkImport.bind(controller));

export default router;
