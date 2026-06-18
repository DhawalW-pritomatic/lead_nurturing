import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../../config/database';

interface S3AssetAttributes {
  id: string;
  tenant_id: string;
  folder_id: string | null;
  original_name: string;
  s3_key: string;
  content_hash: string;
  mime_type: string;
  size_bytes: number;
  uploaded_by: string;
  is_active: boolean;
  total_downloads: number;
  created_at?: Date;
  updated_at?: Date;
}

interface S3AssetCreationAttributes
  extends Optional<S3AssetAttributes, 'id' | 'folder_id' | 'is_active' | 'total_downloads'> {}

class S3Asset
  extends Model<S3AssetAttributes, S3AssetCreationAttributes>
  implements S3AssetAttributes
{
  public id!: string;
  public tenant_id!: string;
  public folder_id!: string | null;
  public original_name!: string;
  public s3_key!: string;
  public content_hash!: string;
  public mime_type!: string;
  public size_bytes!: number;
  public uploaded_by!: string;
  public is_active!: boolean;
  public total_downloads!: number;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

S3Asset.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenant_id: { type: DataTypes.UUID, allowNull: false },
    folder_id: { type: DataTypes.UUID, allowNull: true },
    original_name: { type: DataTypes.STRING(255), allowNull: false },
    // S3 object key: tenants/{tenant_id}/{sha256}.{ext}
    s3_key: { type: DataTypes.STRING(500), allowNull: false, unique: true },
    // SHA-256 of file bytes — used for tenant-scoped deduplication
    content_hash: { type: DataTypes.STRING(64), allowNull: false },
    mime_type: { type: DataTypes.STRING(100), allowNull: false },
    size_bytes: { type: DataTypes.BIGINT, allowNull: false },
    uploaded_by: { type: DataTypes.UUID, allowNull: false },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    total_downloads: { type: DataTypes.INTEGER, defaultValue: 0 },
  },
  {
    sequelize,
    tableName: 's3_assets',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['tenant_id'] },
      // Fast dedup lookup: same tenant + same hash → skip upload
      { fields: ['tenant_id', 'content_hash'] },
    ],
  }
);

export default S3Asset;
