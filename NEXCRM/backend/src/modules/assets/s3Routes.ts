import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { S3AssetController } from './controllers/s3AssetController';
import { authenticate, authorize, tenantIsolation } from '../../middleware/auth';

const router = Router();
const controller = new S3AssetController();

// memoryStorage: file buffer goes straight to S3, nothing written to disk
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.pdf', '.docx', '.pptx', '.jpg', '.jpeg', '.png', '.gif'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error(`File type ${ext} not allowed`));
  },
});

// Public — no auth. Generates a fresh presigned URL on every click so email links never expire.
router.get('/serve/:id', controller.serveAsset.bind(controller));

router.use(authenticate, tenantIsolation);

router.get('/', controller.getAssets.bind(controller));
router.post(
  '/upload',
  authorize('tenant_admin', 'sales_manager', 'super_admin'),
  upload.single('file'),
  controller.uploadAsset.bind(controller)
);
// Fresh presigned URL on demand (also increments download count)
router.get('/:id/url', controller.getPresignedUrl.bind(controller));
router.delete(
  '/:id',
  authorize('tenant_admin', 'super_admin'),
  controller.deleteAsset.bind(controller)
);

export default router;
