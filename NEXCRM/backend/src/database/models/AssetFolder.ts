import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../../config/database';

interface AssetFolderAttributes {
  id: string;
  tenant_id: string;
  project_id: string;
  name: string;
  parent_folder_id?: string;
  sort_order: number;
  created_at?: Date;
  updated_at?: Date;
}

interface AssetFolderCreationAttributes extends Optional<AssetFolderAttributes, 'id' | 'parent_folder_id' | 'sort_order'> {}

class AssetFolder extends Model<AssetFolderAttributes, AssetFolderCreationAttributes> implements AssetFolderAttributes {
  public id!: string;
  public tenant_id!: string;
  public project_id!: string;
  public name!: string;
  public parent_folder_id!: string;
  public sort_order!: number;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

AssetFolder.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenant_id: { type: DataTypes.UUID, allowNull: false },
    project_id: { type: DataTypes.UUID, allowNull: false },
    name: { type: DataTypes.STRING(255), allowNull: false },
    parent_folder_id: { type: DataTypes.UUID },
    sort_order: { type: DataTypes.INTEGER, defaultValue: 0 },
  },
  { sequelize, tableName: 'asset_folders', timestamps: true, underscored: true }
);

export default AssetFolder;
