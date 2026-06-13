import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../../config/database';

interface RoutingLogAttributes {
  id: string;
  tenant_id: string;
  rule_id: string;
  lead_id: string;
  action_taken: string;
  triggered_by: string;
  created_at?: Date;
  updated_at?: Date;
}

interface RoutingLogCreationAttributes extends Optional<RoutingLogAttributes, 'id' | 'triggered_by'> {}

class RoutingLog extends Model<RoutingLogAttributes, RoutingLogCreationAttributes> implements RoutingLogAttributes {
  public id!: string;
  public tenant_id!: string;
  public rule_id!: string;
  public lead_id!: string;
  public action_taken!: string;
  public triggered_by!: string;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

RoutingLog.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenant_id: { type: DataTypes.UUID, allowNull: false },
    rule_id: { type: DataTypes.UUID, allowNull: false },
    lead_id: { type: DataTypes.UUID, allowNull: false },
    action_taken: { type: DataTypes.STRING(500), allowNull: false },
    triggered_by: { type: DataTypes.STRING(50), defaultValue: 'system' },
  },
  {
    sequelize,
    modelName: 'RoutingLog',
    tableName: 'routing_logs',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['tenant_id'] },
      { fields: ['rule_id'] },
      { fields: ['lead_id'] },
    ],
  }
);

export { RoutingLog };
export default RoutingLog;
