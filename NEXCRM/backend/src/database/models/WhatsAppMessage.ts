import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../../config/database';

export type WaMsgDirection = 'inbound' | 'outbound';
export type WaMsgStatus = 'queued' | 'sent' | 'delivered' | 'read' | 'failed' | 'received';

interface WhatsAppMessageAttributes {
  id: string;
  tenant_id: string;
  lead_id?: string;
  rep_id?: string;
  direction: WaMsgDirection;
  from_number: string;
  to_number: string;
  body: string;
  media_url?: string;
  status: WaMsgStatus;
  twilio_message_sid?: string;
  template_id?: string;
  is_opt_out?: boolean;
  created_at?: Date;
  updated_at?: Date;
}

interface WhatsAppMessageCreationAttributes extends Optional<WhatsAppMessageAttributes,
  'id' | 'lead_id' | 'rep_id' | 'media_url' | 'twilio_message_sid' | 'template_id' | 'is_opt_out'
> {}

class WhatsAppMessage extends Model<WhatsAppMessageAttributes, WhatsAppMessageCreationAttributes>
  implements WhatsAppMessageAttributes {
  public id!: string;
  public tenant_id!: string;
  public lead_id!: string;
  public rep_id!: string;
  public direction!: WaMsgDirection;
  public from_number!: string;
  public to_number!: string;
  public body!: string;
  public media_url!: string;
  public status!: WaMsgStatus;
  public twilio_message_sid!: string;
  public template_id!: string;
  public is_opt_out!: boolean;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

WhatsAppMessage.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tenant_id: { type: DataTypes.UUID, allowNull: false },
  lead_id: { type: DataTypes.UUID },
  rep_id: { type: DataTypes.UUID },
  direction: { type: DataTypes.ENUM('inbound', 'outbound'), allowNull: false },
  from_number: { type: DataTypes.STRING(30), allowNull: false },
  to_number: { type: DataTypes.STRING(30), allowNull: false },
  body: { type: DataTypes.TEXT, allowNull: false },
  media_url: { type: DataTypes.STRING(500) },
  status: {
    type: DataTypes.ENUM('queued', 'sent', 'delivered', 'read', 'failed', 'received'),
    defaultValue: 'queued',
  },
  twilio_message_sid: { type: DataTypes.STRING(50) },
  template_id: { type: DataTypes.UUID },
  is_opt_out: { type: DataTypes.BOOLEAN, defaultValue: false },
}, {
  sequelize,
  modelName: 'WhatsAppMessage',
  tableName: 'whatsapp_messages',
  timestamps: true,
  underscored: true,
  indexes: [{ fields: ['tenant_id'] }, { fields: ['lead_id'] }],
});

export { WhatsAppMessage };
export default WhatsAppMessage;
