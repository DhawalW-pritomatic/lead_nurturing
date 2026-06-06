import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../../config/database';

interface AssetAttributes {
  id: string;
  tenant_id: string;
  folder_id: string;
  filename: string;
  original_name: string;
  file_path: string;
  mime_type: string;
  size_bytes: number;
  uploaded_by: string;
  version: number;
  is_active: boolean;
  total_sends: number;
  total_downloads: number;
  created_at?: Date;
  updated_at?: Date;
}

interface AssetCreationAttributes extends Optional<AssetAttributes, 'id' | 'version' | 'is_active' | 'total_sends' | 'total_downloads'> {}

class Asset extends Model<AssetAttributes, AssetCreationAttributes> implements AssetAttributes {
  public id!: string;
  public tenant_id!: string;
  public folder_id!: string;
  public filename!: string;
  public original_name!: string;
  public file_path!: string;
  public mime_type!: string;
  public size_bytes!: number;
  public uploaded_by!: string;
  public version!: number;
  public is_active!: boolean;
  public total_sends!: number;
  public total_downloads!: number;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

Asset.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenant_id: { type: DataTypes.UUID, allowNull: false },
    folder_id: { type: DataTypes.UUID, allowNull: false },
    filename: { type: DataTypes.STRING(255), allowNull: false },
    original_name: { type: DataTypes.STRING(255), allowNull: false },
    file_path: { type: DataTypes.STRING(500), allowNull: false },
    mime_type: { type: DataTypes.STRING(100), allowNull: false },
    size_bytes: { type: DataTypes.BIGINT, allowNull: false },
    uploaded_by: { type: DataTypes.UUID, allowNull: false },
    version: { type: DataTypes.INTEGER, defaultValue: 1 },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    total_sends: { type: DataTypes.INTEGER, defaultValue: 0 },
    total_downloads: { type: DataTypes.INTEGER, defaultValue: 0 },
  },
  {
    sequelize,
    tableName: 'assets',
    timestamps: true,
    underscored: true,
    indexes: [{ fields: ['tenant_id', 'folder_id'] }],
  }
);

export default Asset;
