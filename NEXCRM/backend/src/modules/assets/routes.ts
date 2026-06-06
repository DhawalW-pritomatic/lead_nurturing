import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { AssetController } from './controllers/assetController';
import { authenticate, authorize, tenantIsolation } from '../../middleware/auth';

const router = Router();
const controller = new AssetController();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../../uploads/assets');
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.docx', '.pptx', '.jpg', '.jpeg', '.png', '.gif'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error(`File type ${ext} not allowed`));
  },
});

router.use(authenticate, tenantIsolation);

// Projects
router.get('/projects', controller.getProjects.bind(controller));
router.post('/projects', authorize('tenant_admin', 'super_admin'), controller.createProject.bind(controller));
router.put('/projects/:id', authorize('tenant_admin', 'super_admin'), controller.updateProject.bind(controller));
router.delete('/projects/:id', authorize('tenant_admin', 'super_admin'), controller.deleteProject.bind(controller));

// Folders
router.get('/folders', controller.getFolders.bind(controller));
router.post('/folders', authorize('tenant_admin', 'sales_manager', 'super_admin'), controller.createFolder.bind(controller));
router.put('/folders/:id', authorize('tenant_admin', 'sales_manager', 'super_admin'), controller.updateFolder.bind(controller));
router.delete('/folders/:id', authorize('tenant_admin', 'super_admin'), controller.deleteFolder.bind(controller));

// Files
router.get('/', controller.getAssets.bind(controller));
router.post('/upload', authorize('tenant_admin', 'sales_manager', 'super_admin'), upload.single('file'), controller.uploadAsset.bind(controller));
router.get('/:id/download', controller.downloadAsset.bind(controller));
router.delete('/:id', authorize('tenant_admin', 'super_admin'), controller.deleteAsset.bind(controller));

export default router;
