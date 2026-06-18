import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../../config/database';

interface AssetDownloadTokenAttributes {
  id: string;           // UUID — this IS the token embedded in the email link
  tenant_id: string;
  s3_asset_id: string;
  lead_id: string;
  outreach_record_id: string | null;  // which email this was sent in (for analytics)
  download_count: number;
  last_downloaded_at: Date | null;
  created_at?: Date;
  updated_at?: Date;
}

interface AssetDownloadTokenCreationAttributes
  extends Optional<AssetDownloadTokenAttributes, 'id' | 'outreach_record_id' | 'download_count' | 'last_downloaded_at'> {}

class AssetDownloadToken
  extends Model<AssetDownloadTokenAttributes, AssetDownloadTokenCreationAttributes>
  implements AssetDownloadTokenAttributes
{
  public id!: string;
  public tenant_id!: string;
  public s3_asset_id!: string;
  public lead_id!: string;
  public outreach_record_id!: string | null;
  public download_count!: number;
  public last_downloaded_at!: Date | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

AssetDownloadToken.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenant_id: { type: DataTypes.UUID, allowNull: false },
    s3_asset_id: { type: DataTypes.UUID, allowNull: false },
    lead_id: { type: DataTypes.UUID, allowNull: false },
    outreach_record_id: { type: DataTypes.UUID, allowNull: true },
    download_count: { type: DataTypes.INTEGER, defaultValue: 0 },
    last_downloaded_at: { type: DataTypes.DATE, allowNull: true },
  },
  {
    sequelize,
    tableName: 'asset_download_tokens',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['lead_id'] },
      { fields: ['s3_asset_id'] },
      { fields: ['tenant_id', 'lead_id'] },
    ],
  }
);

export default AssetDownloadToken;
