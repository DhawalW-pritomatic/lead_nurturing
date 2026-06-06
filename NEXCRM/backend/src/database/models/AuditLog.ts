import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../../config/database';

interface AuditLogAttributes {
  id: string;
  tenant_id: string;
  actor_id: string;
  action_type: string;
  entity_type: string;
  entity_id?: string;
  old_value?: object;
  new_value?: object;
  ip_address?: string;
  created_at?: Date;
}

interface AuditLogCreationAttributes extends Optional<AuditLogAttributes, 'id' | 'entity_id' | 'old_value' | 'new_value' | 'ip_address'> {}

class AuditLog extends Model<AuditLogAttributes, AuditLogCreationAttributes> implements AuditLogAttributes {
  public id!: string;
  public tenant_id!: string;
  public actor_id!: string;
  public action_type!: string;
  public entity_type!: string;
  public entity_id!: string;
  public old_value!: object;
  public new_value!: object;
  public ip_address!: string;
  public readonly created_at!: Date;
}

AuditLog.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenant_id: { type: DataTypes.UUID, allowNull: false },
    actor_id: { type: DataTypes.UUID, allowNull: false },
    action_type: { type: DataTypes.STRING(50), allowNull: false },
    entity_type: { type: DataTypes.STRING(50), allowNull: false },
    entity_id: { type: DataTypes.UUID },
    old_value: { type: DataTypes.JSONB },
    new_value: { type: DataTypes.JSONB },
    ip_address: { type: DataTypes.STRING(45) },
  },
  {
    sequelize,
    tableName: 'audit_logs',
    timestamps: true,
    underscored: true,
    updatedAt: false,
    indexes: [
      { fields: ['tenant_id', 'actor_id'] },
      { fields: ['tenant_id', 'entity_type'] },
      { fields: ['created_at'] },
    ],
  }
);

export default AuditLog;
