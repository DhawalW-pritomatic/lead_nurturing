import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../../config/database';

export type CallDirection = 'inbound' | 'outbound';
export type CallStatus = 'initiated' | 'ringing' | 'in-progress' | 'completed' | 'no-answer' | 'busy' | 'failed' | 'canceled';
export type CallDisposition = 'Answered' | 'Busy' | 'Interested' | 'Not Interested' | 'No Answer' | 'Callback Scheduled' | 'Left Voicemail' | 'Wrong Number';

interface CallRecordAttributes {
  id: string;
  tenant_id: string;
  lead_id?: string;
  rep_id?: string;
  direction: CallDirection;
  twilio_call_sid?: string;
  from_number?: string;
  to_number?: string;
  status: CallStatus;
  disposition?: CallDisposition;
  duration_seconds?: number;
  recording_url?: string;
  notes?: string;
  scheduled_at?: Date;
  started_at?: Date;
  ended_at?: Date;
  created_at?: Date;
  updated_at?: Date;
}

interface CallRecordCreationAttributes extends Optional<CallRecordAttributes,
  'id' | 'lead_id' | 'rep_id' | 'twilio_call_sid' | 'from_number' | 'to_number' |
  'disposition' | 'duration_seconds' | 'recording_url' | 'notes' | 'scheduled_at' |
  'started_at' | 'ended_at'
> {}

class CallRecord extends Model<CallRecordAttributes, CallRecordCreationAttributes>
  implements CallRecordAttributes {
  public id!: string;
  public tenant_id!: string;
  public lead_id!: string;
  public rep_id!: string;
  public direction!: CallDirection;
  public twilio_call_sid!: string;
  public from_number!: string;
  public to_number!: string;
  public status!: CallStatus;
  public disposition!: CallDisposition;
  public duration_seconds!: number;
  public recording_url!: string;
  public notes!: string;
  public scheduled_at!: Date;
  public started_at!: Date;
  public ended_at!: Date;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

CallRecord.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tenant_id: { type: DataTypes.UUID, allowNull: false },
  lead_id: { type: DataTypes.UUID },
  rep_id: { type: DataTypes.UUID },
  direction: { type: DataTypes.ENUM('inbound', 'outbound'), allowNull: false },
  twilio_call_sid: { type: DataTypes.STRING(50), unique: true },
  from_number: { type: DataTypes.STRING(30) },
  to_number: { type: DataTypes.STRING(30) },
  status: {
    type: DataTypes.ENUM('initiated', 'ringing', 'in-progress', 'completed', 'no-answer', 'busy', 'failed', 'canceled'),
    defaultValue: 'initiated',
  },
  disposition: {
    type: DataTypes.ENUM('Answered', 'Busy', 'Interested', 'Not Interested', 'No Answer', 'Callback Scheduled', 'Left Voicemail', 'Wrong Number'),
  },
  duration_seconds: { type: DataTypes.INTEGER },
  recording_url: { type: DataTypes.STRING(500) },
  notes: { type: DataTypes.TEXT },
  scheduled_at: { type: DataTypes.DATE },
  started_at: { type: DataTypes.DATE },
  ended_at: { type: DataTypes.DATE },
}, {
  sequelize,
  modelName: 'CallRecord',
  tableName: 'call_records',
  timestamps: true,
  underscored: true,
  indexes: [{ fields: ['tenant_id'] }, { fields: ['lead_id'] }, { fields: ['rep_id'] }],
});

export { CallRecord };
export default CallRecord;
