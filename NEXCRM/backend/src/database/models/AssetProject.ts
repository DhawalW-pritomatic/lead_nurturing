import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../../config/database';

interface AssetProjectAttributes {
  id: string;
  tenant_id: string;
  name: string;
  icon?: string;
  description?: string;
  application_type_id?: string;
  created_at?: Date;
  updated_at?: Date;
}

interface AssetProjectCreationAttributes extends Optional<AssetProjectAttributes, 'id' | 'icon' | 'description' | 'application_type_id'> {}

class AssetProject extends Model<AssetProjectAttributes, AssetProjectCreationAttributes> implements AssetProjectAttributes {
  public id!: string;
  public tenant_id!: string;
  public name!: string;
  public icon!: string;
  public description!: string;
  public application_type_id!: string;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

AssetProject.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenant_id: { type: DataTypes.UUID, allowNull: false },
    name: { type: DataTypes.STRING(255), allowNull: false },
    icon: { type: DataTypes.STRING(50) },
    description: { type: DataTypes.TEXT },
    application_type_id: { type: DataTypes.UUID },
  },
  { sequelize, tableName: 'asset_projects', timestamps: true, underscored: true }
);

export default AssetProject;
