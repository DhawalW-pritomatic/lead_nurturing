import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../../config/database';

interface EngagementEventAttributes {
  id: string;
  tenant_id: string;
  lead_id: string;
  event_type: string;
  channel: string;
  metadata: object;
  score_delta: number;
  created_at?: Date;
}

interface EngagementEventCreationAttributes extends Optional<EngagementEventAttributes, 'id' | 'metadata' | 'score_delta'> {}

class EngagementEvent extends Model<EngagementEventAttributes, EngagementEventCreationAttributes> implements EngagementEventAttributes {
  public id!: string;
  public tenant_id!: string;
  public lead_id!: string;
  public event_type!: string;
  public channel!: string;
  public metadata!: object;
  public score_delta!: number;
  public readonly created_at!: Date;
}

EngagementEvent.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenant_id: { type: DataTypes.UUID, allowNull: false },
    lead_id: { type: DataTypes.UUID, allowNull: false },
    event_type: { type: DataTypes.STRING(50), allowNull: false },
    channel: { type: DataTypes.STRING(20), allowNull: false },
    metadata: { type: DataTypes.JSONB, defaultValue: {} },
    score_delta: { type: DataTypes.INTEGER, defaultValue: 0 },
  },
  {
    sequelize,
    tableName: 'engagement_events',
    timestamps: true,
    underscored: true,
    updatedAt: false,
    indexes: [
      { fields: ['tenant_id', 'lead_id'] },
      { fields: ['tenant_id', 'event_type'] },
      { fields: ['created_at'] },
    ],
  }
);

export default EngagementEvent;
