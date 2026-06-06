import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../../config/database';

interface LeadAttributes {
  id: string;
  tenant_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  company?: string;
  city?: string;
  source: string;
  application_type_id?: string;
  status: string;
  lead_type: string;
  score: number;
  assigned_rep_id?: string;
  enrolled_by: string;
  gdpr_consent: boolean;
  opted_out: boolean;
  email_status: string;
  notes?: string;
  custom_fields: object;
  last_activity_at?: Date;
  converted_at?: Date;
  created_at?: Date;
  updated_at?: Date;
}

interface LeadCreationAttributes extends Optional<LeadAttributes, 'id' | 'phone' | 'company' | 'city' | 'application_type_id' | 'status' | 'lead_type' | 'score' | 'assigned_rep_id' | 'gdpr_consent' | 'opted_out' | 'email_status' | 'notes' | 'custom_fields' | 'last_activity_at' | 'converted_at'> {}

class Lead extends Model<LeadAttributes, LeadCreationAttributes> implements LeadAttributes {
  public id!: string;
  public tenant_id!: string;
  public first_name!: string;
  public last_name!: string;
  public email!: string;
  public phone!: string;
  public company!: string;
  public city!: string;
  public source!: string;
  public application_type_id!: string;
  public status!: string;
  public lead_type!: string;
  public score!: number;
  public assigned_rep_id!: string;
  public enrolled_by!: string;
  public gdpr_consent!: boolean;
  public opted_out!: boolean;
  public email_status!: string;
  public notes!: string;
  public custom_fields!: object;
  public last_activity_at!: Date;
  public converted_at!: Date;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

Lead.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenant_id: { type: DataTypes.UUID, allowNull: false },
    first_name: { type: DataTypes.STRING(100), allowNull: false },
    last_name: { type: DataTypes.STRING(100), allowNull: false },
    email: { type: DataTypes.STRING(255), allowNull: false },
    phone: { type: DataTypes.STRING(20) },
    company: { type: DataTypes.STRING(255) },
    city: { type: DataTypes.STRING(100) },
    source: { type: DataTypes.STRING(50), allowNull: false },
    application_type_id: { type: DataTypes.UUID },
    status: { type: DataTypes.ENUM('NEW', 'ACTIVE', 'ENGAGED', 'MEETING_SCHEDULED', 'PROPOSAL_SENT', 'NEGOTIATION', 'CONVERTED', 'LOST', 'OPTED_OUT', 'STALE'), defaultValue: 'NEW' },
    lead_type: { type: DataTypes.ENUM('COLD', 'WARM', 'HOT', 'STALE', 'CONVERTED', 'LOST'), defaultValue: 'COLD' },
    score: { type: DataTypes.INTEGER, defaultValue: 0 },
    assigned_rep_id: { type: DataTypes.UUID },
    enrolled_by: { type: DataTypes.UUID, allowNull: false },
    gdpr_consent: { type: DataTypes.BOOLEAN, defaultValue: false },
    opted_out: { type: DataTypes.BOOLEAN, defaultValue: false },
    email_status: { type: DataTypes.STRING(20), defaultValue: 'valid' },
    notes: { type: DataTypes.TEXT },
    custom_fields: { type: DataTypes.JSONB, defaultValue: {} },
    last_activity_at: { type: DataTypes.DATE },
    converted_at: { type: DataTypes.DATE },
  },
  {
    sequelize,
    tableName: 'leads',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['tenant_id'] },
      { fields: ['tenant_id', 'email'] },
      { fields: ['tenant_id', 'lead_type'] },
      { fields: ['tenant_id', 'status'] },
      { fields: ['tenant_id', 'score'] },
      { fields: ['tenant_id', 'assigned_rep_id'] },
    ],
  }
);

export default Lead;
