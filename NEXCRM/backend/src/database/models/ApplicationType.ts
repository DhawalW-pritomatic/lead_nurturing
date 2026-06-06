import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../../config/database';

interface ApplicationTypeAttributes {
  id: string;
  tenant_id: string;
  name: string;
  vertical: string;
  custom_fields_schema: object;
  scoring_profile_id?: string;
  is_active: boolean;
  created_at?: Date;
  updated_at?: Date;
}

interface ApplicationTypeCreationAttributes extends Optional<ApplicationTypeAttributes, 'id' | 'custom_fields_schema' | 'scoring_profile_id' | 'is_active'> {}

class ApplicationType extends Model<ApplicationTypeAttributes, ApplicationTypeCreationAttributes> implements ApplicationTypeAttributes {
  public id!: string;
  public tenant_id!: string;
  public name!: string;
  public vertical!: string;
  public custom_fields_schema!: object;
  public scoring_profile_id!: string;
  public is_active!: boolean;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

ApplicationType.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenant_id: { type: DataTypes.UUID, allowNull: false },
    name: { type: DataTypes.STRING(255), allowNull: false },
    vertical: { type: DataTypes.STRING(50), allowNull: false },
    custom_fields_schema: { type: DataTypes.JSONB, defaultValue: {} },
    scoring_profile_id: { type: DataTypes.UUID },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  },
  { sequelize, tableName: 'application_types', timestamps: true, underscored: true }
);

export default ApplicationType;
