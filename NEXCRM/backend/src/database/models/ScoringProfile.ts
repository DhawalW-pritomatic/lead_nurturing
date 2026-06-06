import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../../config/database';

interface ScoringProfileAttributes {
  id: string;
  tenant_id: string;
  name: string;
  event_weights: object;
  type_thresholds: object;
  version: number;
  is_active: boolean;
  created_at?: Date;
  updated_at?: Date;
}

interface ScoringProfileCreationAttributes extends Optional<ScoringProfileAttributes, 'id' | 'version' | 'is_active'> {}

class ScoringProfile extends Model<ScoringProfileAttributes, ScoringProfileCreationAttributes> implements ScoringProfileAttributes {
  public id!: string;
  public tenant_id!: string;
  public name!: string;
  public event_weights!: object;
  public type_thresholds!: object;
  public version!: number;
  public is_active!: boolean;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

ScoringProfile.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenant_id: { type: DataTypes.UUID, allowNull: false },
    name: { type: DataTypes.STRING(255), allowNull: false },
    event_weights: { type: DataTypes.JSONB, allowNull: false },
    type_thresholds: { type: DataTypes.JSONB, allowNull: false },
    version: { type: DataTypes.INTEGER, defaultValue: 1 },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  },
  { sequelize, tableName: 'scoring_profiles', timestamps: true, underscored: true }
);

export default ScoringProfile;
