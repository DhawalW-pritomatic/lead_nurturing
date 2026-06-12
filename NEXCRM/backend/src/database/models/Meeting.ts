import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../../config/database';

export type MeetingStatus = 'scheduled' | 'completed' | 'cancelled' | 'no_show' | 'rescheduled';
export type MeetingType = 'call' | 'video' | 'in_person' | 'other';

interface MeetingAttributes {
  id: string;
  tenant_id: string;
  lead_id?: string;
  assigned_to?: string;
  created_by: string;
  title: string;
  description?: string;
  scheduled_at: Date;
  duration_minutes: number;
  status: MeetingStatus;
  meeting_type: MeetingType;
  location?: string;
  notes?: string;
  created_at?: Date;
  updated_at?: Date;
}

interface MeetingCreationAttributes extends Optional<MeetingAttributes,
  'id' | 'lead_id' | 'assigned_to' | 'description' | 'duration_minutes' | 'status' | 'meeting_type' | 'location' | 'notes'
> {}

class Meeting extends Model<MeetingAttributes, MeetingCreationAttributes>
  implements MeetingAttributes {
  public id!: string;
  public tenant_id!: string;
  public lead_id!: string;
  public assigned_to!: string;
  public created_by!: string;
  public title!: string;
  public description!: string;
  public scheduled_at!: Date;
  public duration_minutes!: number;
  public status!: MeetingStatus;
  public meeting_type!: MeetingType;
  public location!: string;
  public notes!: string;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

Meeting.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tenant_id: { type: DataTypes.UUID, allowNull: false },
  lead_id: { type: DataTypes.UUID },
  assigned_to: { type: DataTypes.UUID },
  created_by: { type: DataTypes.UUID, allowNull: false },
  title: { type: DataTypes.STRING(255), allowNull: false },
  description: { type: DataTypes.TEXT },
  scheduled_at: { type: DataTypes.DATE, allowNull: false },
  duration_minutes: { type: DataTypes.INTEGER, defaultValue: 30 },
  status: {
    type: DataTypes.ENUM('scheduled', 'completed', 'cancelled', 'no_show', 'rescheduled'),
    defaultValue: 'scheduled',
  },
  meeting_type: {
    type: DataTypes.ENUM('call', 'video', 'in_person', 'other'),
    defaultValue: 'call',
  },
  location: { type: DataTypes.STRING(500) },
  notes: { type: DataTypes.TEXT },
}, {
  sequelize,
  modelName: 'Meeting',
  tableName: 'meetings',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['tenant_id'] },
    { fields: ['lead_id'] },
    { fields: ['assigned_to'] },
    { fields: ['scheduled_at'] },
  ],
});

export { Meeting };
export default Meeting;
