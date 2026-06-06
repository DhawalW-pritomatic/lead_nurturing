import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../../config/database';

interface NotificationAttributes {
  id: string;
  tenant_id: string;
  user_id?: string;
  type: string;
  title: string;
  message: string;
  metadata: object;
  is_read: boolean;
  created_at?: Date;
  updated_at?: Date;
}

interface NotificationCreationAttributes extends Optional<NotificationAttributes, 'id' | 'user_id' | 'metadata' | 'is_read'> {}

class Notification extends Model<NotificationAttributes, NotificationCreationAttributes> implements NotificationAttributes {
  public id!: string;
  public tenant_id!: string;
  public user_id!: string;
  public type!: string;
  public title!: string;
  public message!: string;
  public metadata!: object;
  public is_read!: boolean;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

Notification.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenant_id: { type: DataTypes.UUID, allowNull: false },
    user_id: { type: DataTypes.UUID },
    type: {
      type: DataTypes.STRING(50),
      allowNull: false,
      // Types: lead_added, lead_converted, lead_lost, mail_sent, mail_failed, mail_opened, mail_clicked,
      // bulk_import_complete, sequence_started, sequence_completed, scheduler_triggered, lead_assigned, lead_opted_out
    },
    title: { type: DataTypes.STRING(255), allowNull: false },
    message: { type: DataTypes.TEXT, allowNull: false },
    metadata: { type: DataTypes.JSONB, defaultValue: {} },
    is_read: { type: DataTypes.BOOLEAN, defaultValue: false },
  },
  {
    sequelize,
    tableName: 'notifications',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['tenant_id', 'is_read'] },
      { fields: ['tenant_id', 'user_id'] },
      { fields: ['tenant_id', 'type'] },
      { fields: ['created_at'] },
    ],
  }
);

export default Notification;
