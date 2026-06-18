import { createHash } from 'crypto';
import path from 'path';
import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3, S3_BUCKET } from '../../../config/s3';
import S3Asset from '../../../database/models/S3Asset';

export class S3AssetService {
  computeHash(buffer: Buffer): string {
    return createHash('sha256').update(buffer).digest('hex');
  }

  buildS3Key(tenantId: string, hash: string, ext: string): string {
    return `uploads/tenants/${tenantId}/${hash}${ext}`;
  }

  async checkDuplicate(tenantId: string, hash: string): Promise<S3Asset | null> {
    return S3Asset.findOne({
      where: { tenant_id: tenantId, content_hash: hash, is_active: true },
    });
  }

  async uploadToS3(buffer: Buffer, s3Key: string, mimeType: string): Promise<void> {
    await s3.send(
      new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: s3Key,
        Body: buffer,
        ContentType: mimeType,
      })
    );
  }

  // Presigned URL valid for 15 minutes — frontend uses this to download directly from S3
  async getPresignedUrl(s3Key: string, expiresIn = 900): Promise<string> {
    const cmd = new GetObjectCommand({ Bucket: S3_BUCKET, Key: s3Key });
    return getSignedUrl(s3, cmd, { expiresIn });
  }

  async deleteFromS3(s3Key: string): Promise<void> {
    await s3.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: s3Key }));
  }
}

export const s3AssetService = new S3AssetService();
