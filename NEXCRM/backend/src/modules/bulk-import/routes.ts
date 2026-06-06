import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { BulkImportController } from './controllers/bulkImportController';
import { authenticate, tenantIsolation } from '../../middleware/auth';

const router = Router();
const controller = new BulkImportController();

const upload = multer({
  dest: path.join(__dirname, '../../../uploads/csv'),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB for bulk imports
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
});

router.use(authenticate);

// Multi-tenant import (super_admin only) - reads tenant from CSV column
router.post(
  '/multi-tenant',
  upload.single('file'),
  controller.importCSV.bind(controller)
);

// Single-tenant import (tenant_admin, sales_manager)
router.post(
  '/tenant',
  tenantIsolation,
  upload.single('file'),
  controller.importCSVForTenant.bind(controller)
);

export default router;
