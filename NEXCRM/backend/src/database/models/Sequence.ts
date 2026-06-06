import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../../config/database';

interface SequenceAttributes {
  id: string;
  tenant_id: string;
  application_type_id?: string;
  name: string;
  trigger_type: string;
  lead_type_target?: string;
  steps: object[];
  cold_followup_template_ids: string[];
  cold_followup_until_days: number;
  status: string;
  created_by: string;
  created_at?: Date;
  updated_at?: Date;
}

interface SequenceCreationAttributes extends Optional<SequenceAttributes, 'id' | 'application_type_id' | 'lead_type_target' | 'steps' | 'cold_followup_template_ids' | 'cold_followup_until_days' | 'status'> {}

class Sequence extends Model<SequenceAttributes, SequenceCreationAttributes> implements SequenceAttributes {
  public id!: string;
  public tenant_id!: string;
  public application_type_id!: string;
  public name!: string;
  public trigger_type!: string;
  public lead_type_target!: string;
  public steps!: object[];
  public cold_followup_template_ids!: string[];
  public cold_followup_until_days!: number;
  public status!: string;
  public created_by!: string;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

Sequence.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenant_id: { type: DataTypes.UUID, allowNull: false },
    application_type_id: { type: DataTypes.UUID },
    name: { type: DataTypes.STRING(255), allowNull: false },
    trigger_type: { type: DataTypes.STRING(50), allowNull: false },
    lead_type_target: { type: DataTypes.STRING(20) },
    steps: { type: DataTypes.JSONB, defaultValue: [] },
    cold_followup_template_ids: { type: DataTypes.ARRAY(DataTypes.UUID), defaultValue: [] },
    cold_followup_until_days: { type: DataTypes.INTEGER, defaultValue: 30 },
    status: { type: DataTypes.ENUM('draft', 'active', 'archived'), defaultValue: 'draft' },
    created_by: { type: DataTypes.UUID, allowNull: false },
  },
  { sequelize, tableName: 'sequences', timestamps: true, underscored: true }
);

export default Sequence;
