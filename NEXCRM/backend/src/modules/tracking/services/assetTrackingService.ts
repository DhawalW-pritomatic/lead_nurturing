import { config } from '../../../config';
import S3Asset from '../../../database/models/S3Asset';
import AssetDownloadToken from '../../../database/models/AssetDownloadToken';
import EngagementEvent from '../../../database/models/EngagementEvent';
import Lead from '../../../database/models/Lead';
import { s3AssetService } from '../../assets/services/s3AssetService';

export class AssetTrackingService {
  /**
   * Called when building an email — creates one token per asset per lead.
   * Returns the tracking URL to embed in the email body.
   */
  async generateToken(params: {
    tenantId: string;
    s3AssetId: string;
    leadId: string;
    outreachRecordId?: string;
  }): Promise<string> {
    const token = await AssetDownloadToken.create({
      tenant_id: params.tenantId,
      s3_asset_id: params.s3AssetId,
      lead_id: params.leadId,
      outreach_record_id: params.outreachRecordId || null,
    });

    return `${config.baseUrl}/track/asset/${token.id}`;
  }

  /**
   * Called when a lead clicks a download link in an email.
   * 1. Resolves token → S3 asset
   * 2. Generates a fresh 15-min presigned URL
   * 3. Logs engagement event (asset_downloaded, score +20)
   * 4. Returns the presigned URL for a 302 redirect
   */
  async resolveToken(tokenId: string): Promise<string> {
    const token = await AssetDownloadToken.findByPk(tokenId);
    if (!token) throw new Error('Invalid or expired download link.');

    const asset = await S3Asset.findOne({
      where: { id: token.s3_asset_id, is_active: true },
    });
    if (!asset) throw new Error('Asset no longer available.');

    // Generate fresh presigned URL right now — expires in 15 min
    const presignedUrl = await s3AssetService.getPresignedUrl(asset.s3_key);

    // Update token stats
    await AssetDownloadToken.update(
      {
        download_count: token.download_count + 1,
        last_downloaded_at: new Date(),
      },
      { where: { id: token.id } }
    );

    // Update S3Asset download counter
    await S3Asset.update(
      { total_downloads: asset.total_downloads + 1 },
      { where: { id: asset.id } }
    );

    // Log engagement event so the rep sees it in the lead timeline
    await EngagementEvent.create({
      tenant_id: token.tenant_id,
      lead_id: token.lead_id,
      event_type: 'asset_downloaded',
      channel: 'email',
      score_delta: 20,
      metadata: {
        s3_asset_id: asset.id,
        asset_name: asset.original_name,
        token_id: token.id,
        outreach_record_id: token.outreach_record_id,
        download_count: token.download_count + 1,
      },
    });

    // Update lead score
    await Lead.increment('score', {
      by: 20,
      where: { id: token.lead_id },
    });

    return presignedUrl;
  }

  /**
   * Returns all download tokens for a given outreach record —
   * used by the frontend to show per-asset download stats on a sent email.
   */
  async getTokensByOutreachRecord(outreachRecordId: string) {
    return AssetDownloadToken.findAll({
      where: { outreach_record_id: outreachRecordId },
      include: [{ model: S3Asset, as: 'asset', attributes: ['id', 'original_name', 'mime_type', 'size_bytes'] }],
    });
  }
}

export const assetTrackingService = new AssetTrackingService();
