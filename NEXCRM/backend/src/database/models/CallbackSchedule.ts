import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../../config/database';

type CallbackStatus = 'pending' | 'completed' | 'missed' | 'rescheduled';

interface CallbackScheduleAttributes {
  id: string;
  tenant_id: string;
  lead_id: string;
  rep_id?: string;
  call_record_id?: string;
  scheduled_at: Date;
  notes?: string;
  status: CallbackStatus;
  reminder_sent: boolean;
  created_at?: Date;
  updated_at?: Date;
}

interface CallbackScheduleCreationAttributes extends Optional<CallbackScheduleAttributes,
  'id' | 'rep_id' | 'call_record_id' | 'notes' | 'status' | 'reminder_sent'
> {}

class CallbackSchedule extends Model<CallbackScheduleAttributes, CallbackScheduleCreationAttributes>
  implements CallbackScheduleAttributes {
  public id!: string;
  public tenant_id!: string;
  public lead_id!: string;
  public rep_id!: string;
  public call_record_id!: string;
  public scheduled_at!: Date;
  public notes!: string;
  public status!: CallbackStatus;
  public reminder_sent!: boolean;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

CallbackSchedule.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tenant_id: { type: DataTypes.UUID, allowNull: false },
  lead_id: { type: DataTypes.UUID, allowNull: false },
  rep_id: { type: DataTypes.UUID },
  call_record_id: { type: DataTypes.UUID },
  scheduled_at: { type: DataTypes.DATE, allowNull: false },
  notes: { type: DataTypes.TEXT },
  status: { type: DataTypes.ENUM('pending', 'completed', 'missed', 'rescheduled'), defaultValue: 'pending' },
  reminder_sent: { type: DataTypes.BOOLEAN, defaultValue: false },
}, {
  sequelize,
  modelName: 'CallbackSchedule',
  tableName: 'callback_schedules',
  timestamps: true,
  underscored: true,
  indexes: [{ fields: ['tenant_id'] }, { fields: ['lead_id'] }, { fields: ['scheduled_at'] }],
});

export { CallbackSchedule };
export default CallbackSchedule;
