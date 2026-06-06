import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../../config/database';

interface EmailScheduleAttributes {
  id: string;
  tenant_id: string;
  name: string;
  sequence_id?: string;
  template_id: string;
  day_offset: number;
  target_lead_type?: string;
  target_lead_status?: string;
  is_active: boolean;
  last_run_at?: Date;
  created_by: string;
  created_at?: Date;
  updated_at?: Date;
}

interface EmailScheduleCreationAttributes extends Optional<EmailScheduleAttributes, 'id' | 'sequence_id' | 'target_lead_type' | 'target_lead_status' | 'is_active' | 'last_run_at'> {}

class EmailSchedule extends Model<EmailScheduleAttributes, EmailScheduleCreationAttributes> implements EmailScheduleAttributes {
  public id!: string;
  public tenant_id!: string;
  public name!: string;
  public sequence_id!: string;
  public template_id!: string;
  public day_offset!: number;
  public target_lead_type!: string;
  public target_lead_status!: string;
  public is_active!: boolean;
  public last_run_at!: Date;
  public created_by!: string;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

EmailSchedule.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenant_id: { type: DataTypes.UUID, allowNull: false },
    name: { type: DataTypes.STRING(255), allowNull: false },
    sequence_id: { type: DataTypes.UUID },
    template_id: { type: DataTypes.UUID, allowNull: false },
    day_offset: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    target_lead_type: { type: DataTypes.STRING(20) },
    target_lead_status: { type: DataTypes.STRING(30) },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    last_run_at: { type: DataTypes.DATE },
    created_by: { type: DataTypes.UUID, allowNull: false },
  },
  {
    sequelize,
    tableName: 'email_schedules',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['tenant_id', 'is_active'] },
      { fields: ['tenant_id', 'day_offset'] },
    ],
  }
);

export default EmailSchedule;
