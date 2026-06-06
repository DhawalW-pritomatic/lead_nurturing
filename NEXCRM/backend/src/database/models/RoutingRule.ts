import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../../config/database';

interface RoutingRuleAttributes {
  id: string;
  tenant_id: string;
  name: string;
  condition_expression: object;
  action_config: object;
  priority: number;
  is_active: boolean;
  created_at?: Date;
  updated_at?: Date;
}

interface RoutingRuleCreationAttributes extends Optional<RoutingRuleAttributes, 'id' | 'is_active'> {}

class RoutingRule extends Model<RoutingRuleAttributes, RoutingRuleCreationAttributes> implements RoutingRuleAttributes {
  public id!: string;
  public tenant_id!: string;
  public name!: string;
  public condition_expression!: object;
  public action_config!: object;
  public priority!: number;
  public is_active!: boolean;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

RoutingRule.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenant_id: { type: DataTypes.UUID, allowNull: false },
    name: { type: DataTypes.STRING(255), allowNull: false },
    condition_expression: { type: DataTypes.JSONB, allowNull: false },
    action_config: { type: DataTypes.JSONB, allowNull: false },
    priority: { type: DataTypes.INTEGER, allowNull: false },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  },
  {
    sequelize,
    tableName: 'routing_rules',
    timestamps: true,
    underscored: true,
    indexes: [{ fields: ['tenant_id', 'priority'] }],
  }
);

export default RoutingRule;
