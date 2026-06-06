import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../../config/database';

interface LeadQueryAttributes {
  id: string;
  tenant_id: string;
  lead_id: string;
  source: string;
  subject?: string;
  body: string;
  status: string;
  owner_user_id?: string;
  answered_by_user_id?: string;
  answered_at?: Date;
  metadata: object;
  created_at?: Date;
  updated_at?: Date;
}

interface LeadQueryCreationAttributes extends Optional<LeadQueryAttributes, 'id' | 'source' | 'subject' | 'status' | 'owner_user_id' | 'answered_by_user_id' | 'answered_at' | 'metadata'> {}

class LeadQuery extends Model<LeadQueryAttributes, LeadQueryCreationAttributes> implements LeadQueryAttributes {
  public id!: string;
  public tenant_id!: string;
  public lead_id!: string;
  public source!: string;
  public subject!: string;
  public body!: string;
  public status!: string;
  public owner_user_id!: string;
  public answered_by_user_id!: string;
  public answered_at!: Date;
  public metadata!: object;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

LeadQuery.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenant_id: { type: DataTypes.UUID, allowNull: false },
    lead_id: { type: DataTypes.UUID, allowNull: false },
    source: { type: DataTypes.STRING(20), defaultValue: 'email' },
    subject: { type: DataTypes.STRING(255) },
    body: { type: DataTypes.TEXT, allowNull: false },
    status: { type: DataTypes.ENUM('pending', 'answered'), defaultValue: 'pending' },
    owner_user_id: { type: DataTypes.UUID },
    answered_by_user_id: { type: DataTypes.UUID },
    answered_at: { type: DataTypes.DATE },
    metadata: { type: DataTypes.JSONB, defaultValue: {} },
  },
  {
    sequelize,
    tableName: 'lead_queries',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['tenant_id', 'lead_id'] },
      { fields: ['tenant_id', 'status'] },
      { fields: ['owner_user_id'] },
      { fields: ['answered_by_user_id'] },
    ],
  }
);

export default LeadQuery;
