import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../../config/database';

interface TenantPhoneConfigAttributes {
  id: string;
  tenant_id: string;
  twilio_account_sid?: string;
  twilio_auth_token?: string;
  twilio_phone_number?: string;
  whatsapp_phone_number?: string;
  voice_enabled: boolean;
  whatsapp_enabled: boolean;
  call_recording_enabled: boolean;
  call_window_start: string;
  call_window_end: string;
  max_call_attempts_before_fail: number;
  sla_warm_contact_hours: number;
  created_at?: Date;
  updated_at?: Date;
}

interface TenantPhoneConfigCreationAttributes extends Optional<TenantPhoneConfigAttributes,
  'id' | 'twilio_account_sid' | 'twilio_auth_token' | 'twilio_phone_number' |
  'whatsapp_phone_number' | 'voice_enabled' | 'whatsapp_enabled' | 'call_recording_enabled' |
  'call_window_start' | 'call_window_end' | 'max_call_attempts_before_fail' | 'sla_warm_contact_hours'
> {}

class TenantPhoneConfig extends Model<TenantPhoneConfigAttributes, TenantPhoneConfigCreationAttributes>
  implements TenantPhoneConfigAttributes {
  public id!: string;
  public tenant_id!: string;
  public twilio_account_sid!: string;
  public twilio_auth_token!: string;
  public twilio_phone_number!: string;
  public whatsapp_phone_number!: string;
  public voice_enabled!: boolean;
  public whatsapp_enabled!: boolean;
  public call_recording_enabled!: boolean;
  public call_window_start!: string;
  public call_window_end!: string;
  public max_call_attempts_before_fail!: number;
  public sla_warm_contact_hours!: number;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

TenantPhoneConfig.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tenant_id: { type: DataTypes.UUID, allowNull: false, unique: true },
  twilio_account_sid: { type: DataTypes.STRING(50) },
  twilio_auth_token: { type: DataTypes.STRING(100) },
  twilio_phone_number: { type: DataTypes.STRING(20), unique: true },
  whatsapp_phone_number: { type: DataTypes.STRING(20) },
  voice_enabled: { type: DataTypes.BOOLEAN, defaultValue: false },
  whatsapp_enabled: { type: DataTypes.BOOLEAN, defaultValue: false },
  call_recording_enabled: { type: DataTypes.BOOLEAN, defaultValue: false },
  call_window_start: { type: DataTypes.STRING(5), defaultValue: '09:00' },
  call_window_end: { type: DataTypes.STRING(5), defaultValue: '18:00' },
  max_call_attempts_before_fail: { type: DataTypes.INTEGER, defaultValue: 6 },
  sla_warm_contact_hours: { type: DataTypes.INTEGER, defaultValue: 24 },
}, {
  sequelize,
  modelName: 'TenantPhoneConfig',
  tableName: 'tenant_phone_configs',
  timestamps: true,
  underscored: true,
});

export { TenantPhoneConfig };
export default TenantPhoneConfig;
