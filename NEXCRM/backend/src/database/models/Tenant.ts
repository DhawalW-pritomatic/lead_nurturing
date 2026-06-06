import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../../config/database';

interface TenantAttributes {
  id: string;
  name: string;
  subdomain: string;
  vertical_type: string;
  plan_tier: string;
  is_active: boolean;
  settings: object;
  branding: object;
  created_at?: Date;
  updated_at?: Date;
}

interface TenantCreationAttributes extends Optional<TenantAttributes, 'id' | 'settings' | 'branding' | 'is_active'> {}

class Tenant extends Model<TenantAttributes, TenantCreationAttributes> implements TenantAttributes {
  public id!: string;
  public name!: string;
  public subdomain!: string;
  public vertical_type!: string;
  public plan_tier!: string;
  public is_active!: boolean;
  public settings!: object;
  public branding!: object;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

Tenant.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING(255), allowNull: false },
    subdomain: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    vertical_type: { type: DataTypes.STRING(50), allowNull: false },
    plan_tier: { type: DataTypes.STRING(50), defaultValue: 'standard' },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    settings: { type: DataTypes.JSONB, defaultValue: {} },
    branding: { type: DataTypes.JSONB, defaultValue: {} },
  },
  { sequelize, tableName: 'tenants', timestamps: true, underscored: true }
);

export default Tenant;
