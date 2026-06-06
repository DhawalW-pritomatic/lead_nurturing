import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../../config/database';

interface NurturingSettingsAttributes {
  id: string;
  tenant_id: string;
  cold_outreach_interval_days: number;
  warm_sequence_interval_days: number;
  stale_reengagement_interval_days: number;
  max_cold_attempts: number;
  daily_send_window_start: string;
  daily_send_window_end: string;
  allowed_send_days: string[];
  blackout_dates: string[];
  global_pause: boolean;
  global_pause_until?: Date;
  max_messages_per_week: number;
  created_at?: Date;
  updated_at?: Date;
}

interface NurturingSettingsCreationAttributes extends Optional<NurturingSettingsAttributes, 'id' | 'cold_outreach_interval_days' | 'warm_sequence_interval_days' | 'stale_reengagement_interval_days' | 'max_cold_attempts' | 'daily_send_window_start' | 'daily_send_window_end' | 'allowed_send_days' | 'blackout_dates' | 'global_pause' | 'global_pause_until' | 'max_messages_per_week'> {}

class NurturingSettings extends Model<NurturingSettingsAttributes, NurturingSettingsCreationAttributes> implements NurturingSettingsAttributes {
  public id!: string;
  public tenant_id!: string;
  public cold_outreach_interval_days!: number;
  public warm_sequence_interval_days!: number;
  public stale_reengagement_interval_days!: number;
  public max_cold_attempts!: number;
  public daily_send_window_start!: string;
  public daily_send_window_end!: string;
  public allowed_send_days!: string[];
  public blackout_dates!: string[];
  public global_pause!: boolean;
  public global_pause_until!: Date;
  public max_messages_per_week!: number;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

NurturingSettings.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenant_id: { type: DataTypes.UUID, allowNull: false, unique: true },
    cold_outreach_interval_days: { type: DataTypes.INTEGER, defaultValue: 5 },
    warm_sequence_interval_days: { type: DataTypes.INTEGER, defaultValue: 2 },
    stale_reengagement_interval_days: { type: DataTypes.INTEGER, defaultValue: 14 },
    max_cold_attempts: { type: DataTypes.INTEGER, defaultValue: 6 },
    daily_send_window_start: { type: DataTypes.STRING(5), defaultValue: '09:00' },
    daily_send_window_end: { type: DataTypes.STRING(5), defaultValue: '18:00' },
    allowed_send_days: { type: DataTypes.ARRAY(DataTypes.STRING), defaultValue: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] },
    blackout_dates: { type: DataTypes.ARRAY(DataTypes.STRING), defaultValue: [] },
    global_pause: { type: DataTypes.BOOLEAN, defaultValue: false },
    global_pause_until: { type: DataTypes.DATE },
    max_messages_per_week: { type: DataTypes.INTEGER, defaultValue: 3 },
  },
  { sequelize, tableName: 'nurturing_settings', timestamps: true, underscored: true }
);

export default NurturingSettings;
