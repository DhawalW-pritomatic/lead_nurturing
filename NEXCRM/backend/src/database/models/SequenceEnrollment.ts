import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../../config/database';

interface SequenceEnrollmentAttributes {
  id: string;
  tenant_id: string;
  lead_id: string;
  sequence_id: string;
  automation_mode: string;
  current_day_offset: number;
  current_step: number;
  started_at: Date;
  next_step_at?: Date;
  status: string;
  metadata: object;
  completed_at?: Date;
  exit_reason?: string;
  created_at?: Date;
  updated_at?: Date;
}

interface SequenceEnrollmentCreationAttributes extends Optional<SequenceEnrollmentAttributes, 'id' | 'automation_mode' | 'current_day_offset' | 'current_step' | 'next_step_at' | 'status' | 'metadata' | 'completed_at' | 'exit_reason'> {}

class SequenceEnrollment extends Model<SequenceEnrollmentAttributes, SequenceEnrollmentCreationAttributes> implements SequenceEnrollmentAttributes {
  public id!: string;
  public tenant_id!: string;
  public lead_id!: string;
  public sequence_id!: string;
  public automation_mode!: string;
  public current_day_offset!: number;
  public current_step!: number;
  public started_at!: Date;
  public next_step_at!: Date;
  public status!: string;
  public metadata!: object;
  public completed_at!: Date;
  public exit_reason!: string;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

SequenceEnrollment.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenant_id: { type: DataTypes.UUID, allowNull: false },
    lead_id: { type: DataTypes.UUID, allowNull: false },
    sequence_id: { type: DataTypes.UUID, allowNull: false },
    automation_mode: { type: DataTypes.ENUM('manual', 'history_aware', 'auto'), defaultValue: 'history_aware' },
    current_day_offset: { type: DataTypes.INTEGER, defaultValue: 0 },
    current_step: { type: DataTypes.INTEGER, defaultValue: 0 },
    started_at: { type: DataTypes.DATE, allowNull: false },
    next_step_at: { type: DataTypes.DATE },
    status: { type: DataTypes.ENUM('active', 'paused', 'completed', 'exited'), defaultValue: 'active' },
    metadata: { type: DataTypes.JSONB, defaultValue: {} },
    completed_at: { type: DataTypes.DATE },
    exit_reason: { type: DataTypes.STRING(255) },
  },
  {
    sequelize,
    tableName: 'sequence_enrollments',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['tenant_id', 'lead_id'] },
      { fields: ['status', 'next_step_at'] },
    ],
  }
);

export default SequenceEnrollment;
