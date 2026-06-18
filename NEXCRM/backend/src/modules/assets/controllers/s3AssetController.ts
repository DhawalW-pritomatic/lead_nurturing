import path from 'path';
import { Request, Response } from 'express';
import { AuthRequest } from '../../../middleware/auth';
import S3Asset from '../../../database/models/S3Asset';
import { s3AssetService } from '../services/s3AssetService';

export class S3AssetController {
  // Public endpoint — no auth. Streams the file directly from S3 to the client
  // so the download never expires, never shows an ngrok warning, and never
  // exposes a raw S3 presigned URL to the browser.
  async serveAsset(req: Request, res: Response): Promise<void> {
    try {
      const asset = await S3Asset.findOne({
        where: { id: req.params.id, is_active: true },
      });
      if (!asset) {
        res.status(404).send('Asset not found or has been removed.');
        return;
      }

      const { GetObjectCommand } = await import('@aws-sdk/client-s3');
      const { s3, S3_BUCKET } = await import('../../../config/s3');
      const { Readable } = await import('stream');

      const command = new GetObjectCommand({ Bucket: S3_BUCKET, Key: asset.s3_key });
      const s3Response = await s3.send(command);

      res.setHeader('Content-Type', asset.mime_type);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${encodeURIComponent(asset.original_name)}"`
      );
      if (s3Response.ContentLength) {
        res.setHeader('Content-Length', String(s3Response.ContentLength));
      }

      // SDK v3 Body is a web ReadableStream in some envs — convert to Node stream
      const body = s3Response.Body;
      if (body instanceof Readable) {
        body.pipe(res);
      } else {
        // Web ReadableStream → Node Readable
        Readable.fromWeb(body as any).pipe(res);
      }
    } catch (error: any) {
      console.error('[ServeAsset] Error:', error.message);
      res.status(500).send('Failed to serve asset.');
    }
  }

  async uploadAsset(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'File is required.' });
        return;
      }

      const tenantId = req.user!.tenant_id;
      const buffer = req.file.buffer;
      const ext = path.extname(req.file.originalname).toLowerCase();
      const hash = s3AssetService.computeHash(buffer);

      // Tenant-scoped deduplication: same file content = same hash
      const existing = await s3AssetService.checkDuplicate(tenantId, hash);
      if (existing) {
        const presignedUrl = await s3AssetService.getPresignedUrl(existing.s3_key);
        res.status(200).json({
          asset: existing,
          presigned_url: presignedUrl,
          duplicate: true,
          message: 'File already exists in your library. Reusing existing asset.',
        });
        return;
      }

      const s3Key = s3AssetService.buildS3Key(tenantId, hash, ext);

      // Check for a soft-deleted record with the same hash — restore it instead of
      // creating a new row (avoids unique constraint violation on s3_key)
      const deletedRecord = await S3Asset.findOne({
        where: { tenant_id: tenantId, content_hash: hash, is_active: false },
      });

      await s3AssetService.uploadToS3(buffer, s3Key, req.file.mimetype);

      let asset: S3Asset;
      if (deletedRecord) {
        await S3Asset.update(
          {
            is_active: true,
            original_name: req.file.originalname,
            folder_id: req.body.folder_id || null,
            uploaded_by: req.user!.id,
            total_downloads: 0,
          },
          { where: { id: deletedRecord.id } }
        );
        asset = (await S3Asset.findByPk(deletedRecord.id))!;
      } else {
        asset = await S3Asset.create({
          tenant_id: tenantId,
          folder_id: req.body.folder_id || null,
          original_name: req.file.originalname,
          s3_key: s3Key,
          content_hash: hash,
          mime_type: req.file.mimetype,
          size_bytes: req.file.size,
          uploaded_by: req.user!.id,
        });
      }

      const presignedUrl = await s3AssetService.getPresignedUrl(s3Key);
      res.status(201).json({ asset, presigned_url: presignedUrl, duplicate: false });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async getAssets(req: AuthRequest, res: Response): Promise<void> {
    try {
      const where: any = { is_active: true };
      if (req.user!.role !== 'super_admin') where.tenant_id = req.user!.tenant_id;
      if (req.query.folder_id) where.folder_id = req.query.folder_id;

      const assets = await S3Asset.findAll({ where, order: [['created_at', 'DESC']] });

      // Generate presigned URLs in parallel
      const result = await Promise.all(
        assets.map(async (a) => ({
          ...a.toJSON(),
          presigned_url: await s3AssetService.getPresignedUrl(a.s3_key),
        }))
      );

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // Returns a fresh 15-min presigned URL for a single asset + increments download count
  async getPresignedUrl(req: AuthRequest, res: Response): Promise<void> {
    try {
      const where: any = { id: req.params.id, is_active: true };
      if (req.user!.role !== 'super_admin') where.tenant_id = req.user!.tenant_id;

      const asset = await S3Asset.findOne({ where });
      if (!asset) {
        res.status(404).json({ error: 'Asset not found.' });
        return;
      }

      await S3Asset.update(
        { total_downloads: asset.total_downloads + 1 },
        { where: { id: asset.id } }
      );

      const presignedUrl = await s3AssetService.getPresignedUrl(asset.s3_key);
      res.json({ presigned_url: presignedUrl, expires_in: 900 });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async deleteAsset(req: AuthRequest, res: Response): Promise<void> {
    try {
      const asset = await S3Asset.findOne({
        where: { id: req.params.id, tenant_id: req.user!.tenant_id },
      });
      if (!asset) {
        res.status(404).json({ error: 'Asset not found.' });
        return;
      }

      // Soft delete — S3 object is retained (other tenants may share it via assign)
      await S3Asset.update({ is_active: false }, { where: { id: asset.id } });
      res.json({ message: 'Asset removed from library.' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
