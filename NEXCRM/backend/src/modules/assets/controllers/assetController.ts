import { Response } from 'express';
import { AuthRequest } from '../../../middleware/auth';
import { AssetProject, AssetFolder, Asset, Tenant } from '../../../database/models';
import fs from 'fs';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const archiver: (format: string, options?: any) => import('archiver').Archiver = require('archiver');

export class AssetController {
  // Projects
  async createProject(req: AuthRequest, res: Response): Promise<void> {
    try {
      const project = await AssetProject.create({
        tenant_id: req.user!.tenant_id,
        name: req.body.name,
        icon: req.body.icon,
        description: req.body.description,
        application_type_id: req.body.application_type_id,
      });
      res.status(201).json(project);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async getProjects(req: AuthRequest, res: Response): Promise<void> {
    try {
      const where: any = {};
      if (req.user!.role !== 'super_admin') {
        where.tenant_id = req.user!.tenant_id;
      }
      const include: any[] = [
        { model: AssetFolder, as: 'folders', include: [{ model: Asset, as: 'assets' }] },
      ];
      if (req.user!.role === 'super_admin') {
        include.push({ model: Tenant, as: 'tenant', attributes: ['id', 'name'] });
      }
      const projects = await AssetProject.findAll({
        where,
        include,
        order: [['name', 'ASC']],
      });
      res.json(projects);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async updateProject(req: AuthRequest, res: Response): Promise<void> {
    try {
      await AssetProject.update(req.body, { where: { id: req.params.id, tenant_id: req.user!.tenant_id } });
      const project = await AssetProject.findByPk(req.params.id);
      res.json(project);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async deleteProject(req: AuthRequest, res: Response): Promise<void> {
    try {
      await AssetProject.destroy({ where: { id: req.params.id, tenant_id: req.user!.tenant_id } });
      res.json({ message: 'Project deleted.' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async assignProject(req: AuthRequest, res: Response): Promise<void> {
    try {
      const sourceProject = await AssetProject.findByPk(req.params.id, {
        include: [{ model: AssetFolder, as: 'folders', include: [{ model: Asset, as: 'assets' }] }],
      }) as any;

      if (!sourceProject) {
        res.status(404).json({ error: 'Project not found.' });
        return;
      }

      const targetTenantId = req.body.tenant_id;
      if (!targetTenantId) {
        res.status(400).json({ error: 'target tenant_id is required.' });
        return;
      }

      const targetTenant = await Tenant.findByPk(targetTenantId);
      if (!targetTenant) {
        res.status(404).json({ error: 'Target tenant not found.' });
        return;
      }

      const newProject = await AssetProject.create({
        tenant_id: targetTenantId,
        name: sourceProject.name,
        icon: sourceProject.icon,
        description: sourceProject.description,
        application_type_id: sourceProject.application_type_id,
      });

      const folders = sourceProject.folders || [];
      for (const folder of folders) {
        const newFolder = await AssetFolder.create({
          tenant_id: targetTenantId,
          project_id: newProject.id,
          name: folder.name,
          sort_order: folder.sort_order,
        });

        const assets = folder.assets || [];
        for (const asset of assets) {
          if (asset.is_active) {
            await Asset.create({
              tenant_id: targetTenantId,
              folder_id: newFolder.id,
              filename: asset.filename,
              original_name: asset.original_name,
              file_path: asset.file_path,
              mime_type: asset.mime_type,
              size_bytes: asset.size_bytes,
              uploaded_by: req.user!.id,
            });
          }
        }
      }

      res.status(201).json({ message: 'Template assigned successfully.', project: newProject });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  // Folders
  async createFolder(req: AuthRequest, res: Response): Promise<void> {
    try {
      const folder = await AssetFolder.create({
        tenant_id: req.user!.tenant_id,
        project_id: req.body.project_id,
        name: req.body.name,
        parent_folder_id: req.body.parent_folder_id,
      });
      res.status(201).json(folder);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async getFolders(req: AuthRequest, res: Response): Promise<void> {
    try {
      const where: any = {};
      if (req.user!.role !== 'super_admin') {
        where.tenant_id = req.user!.tenant_id;
      }
      if (req.query.project_id) where.project_id = req.query.project_id;

      const folders = await AssetFolder.findAll({
        where,
        include: [{ model: Asset, as: 'assets' }],
        order: [['sort_order', 'ASC']],
      });
      res.json(folders);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async updateFolder(req: AuthRequest, res: Response): Promise<void> {
    try {
      await AssetFolder.update(req.body, { where: { id: req.params.id, tenant_id: req.user!.tenant_id } });
      const folder = await AssetFolder.findByPk(req.params.id);
      res.json(folder);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async deleteFolder(req: AuthRequest, res: Response): Promise<void> {
    try {
      await AssetFolder.destroy({ where: { id: req.params.id, tenant_id: req.user!.tenant_id } });
      res.json({ message: 'Folder deleted.' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async exportFolder(req: AuthRequest, res: Response): Promise<void> {
    try {
      const folderId = req.params.id;
      const where: any = { folder_id: folderId, is_active: true };
      if (req.user!.role !== 'super_admin') {
        where.tenant_id = req.user!.tenant_id;
      }

      const assets = await Asset.findAll({ where });
      if (!assets.length) {
        res.status(404).json({ error: 'No assets in this folder.' });
        return;
      }

      const folder = await AssetFolder.findByPk(folderId);
      const zipName = `${(folder?.name || 'export').replace(/[^a-z0-9_-]/gi, '_')}.zip`;

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${zipName}"`);

      const archive = archiver('zip', { zlib: { level: 6 } });
      archive.on('error', (err: Error) => {
        if (!res.headersSent) res.status(500).json({ error: err.message });
      });
      archive.pipe(res);

      for (const asset of assets) {
        if (fs.existsSync(asset.file_path)) {
          archive.file(asset.file_path, { name: asset.original_name });
        }
      }

      await archive.finalize();
    } catch (error: any) {
      if (!res.headersSent) res.status(500).json({ error: error.message });
    }
  }

  // Assets (files)
  async uploadAsset(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'File is required.' });
        return;
      }

      const asset = await Asset.create({
        tenant_id: req.user!.tenant_id,
        folder_id: req.body.folder_id,
        filename: req.file.filename,
        original_name: req.file.originalname,
        file_path: req.file.path,
        mime_type: req.file.mimetype,
        size_bytes: req.file.size,
        uploaded_by: req.user!.id,
      });
      res.status(201).json(asset);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async getAssets(req: AuthRequest, res: Response): Promise<void> {
    try {
      const where: any = { is_active: true };
      if (req.user!.role !== 'super_admin') {
        where.tenant_id = req.user!.tenant_id;
      }
      if (req.query.folder_id) where.folder_id = req.query.folder_id;

      const assets = await Asset.findAll({ where, order: [['created_at', 'DESC']] });
      res.json(assets);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async downloadAsset(req: AuthRequest, res: Response): Promise<void> {
    try {
      const asset = await Asset.findOne({ where: { id: req.params.id, tenant_id: req.user!.tenant_id } });
      if (!asset) { res.status(404).json({ error: 'Asset not found.' }); return; }

      await Asset.update({ total_downloads: asset.total_downloads + 1 }, { where: { id: asset.id } });

      res.download(asset.file_path, asset.original_name);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async deleteAsset(req: AuthRequest, res: Response): Promise<void> {
    try {
      const asset = await Asset.findOne({ where: { id: req.params.id, tenant_id: req.user!.tenant_id } });
      if (!asset) { res.status(404).json({ error: 'Asset not found.' }); return; }

      await Asset.update({ is_active: false }, { where: { id: asset.id } });
      res.json({ message: 'Asset deleted.' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
