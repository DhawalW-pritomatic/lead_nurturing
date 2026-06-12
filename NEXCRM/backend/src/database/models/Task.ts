import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../../config/database';

export type TaskType = 'call' | 'email' | 'meeting' | 'follow_up' | 'other';
export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskStatus = 'open' | 'in_progress' | 'completed' | 'cancelled';

interface TaskAttributes {
  id: string;
  tenant_id: string;
  lead_id?: string;
  created_by_user_id: string;
  assigned_to_user_id?: string;
  title: string;
  description?: string;
  task_type: TaskType;
  priority: TaskPriority;
  status: TaskStatus;
  is_auto_generated: boolean;
  trigger_event?: string;
  due_date?: Date;
  completed_at?: Date;
  created_at?: Date;
  updated_at?: Date;
}

interface TaskCreationAttributes extends Optional<TaskAttributes,
  'id' | 'lead_id' | 'assigned_to_user_id' | 'description' |
  'due_date' | 'completed_at' | 'is_auto_generated' | 'trigger_event'> {}

class Task extends Model<TaskAttributes, TaskCreationAttributes> implements TaskAttributes {
  public id!: string;
  public tenant_id!: string;
  public lead_id!: string;
  public created_by_user_id!: string;
  public assigned_to_user_id!: string;
  public title!: string;
  public description!: string;
  public task_type!: TaskType;
  public priority!: TaskPriority;
  public status!: TaskStatus;
  public is_auto_generated!: boolean;
  public trigger_event!: string;
  public due_date!: Date;
  public completed_at!: Date;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

Task.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenant_id: { type: DataTypes.UUID, allowNull: false },
    lead_id: { type: DataTypes.UUID, allowNull: true },
    created_by_user_id: { type: DataTypes.UUID, allowNull: false },
    assigned_to_user_id: { type: DataTypes.UUID, allowNull: true },
    title: { type: DataTypes.STRING(255), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    task_type: {
      type: DataTypes.ENUM('call', 'email', 'meeting', 'follow_up', 'other'),
      defaultValue: 'follow_up',
    },
    priority: {
      type: DataTypes.ENUM('low', 'medium', 'high'),
      defaultValue: 'medium',
    },
    status: {
      type: DataTypes.ENUM('open', 'in_progress', 'completed', 'cancelled'),
      defaultValue: 'open',
    },
    is_auto_generated: { type: DataTypes.BOOLEAN, defaultValue: false },
    trigger_event: { type: DataTypes.STRING(100), allowNull: true },
    due_date: { type: DataTypes.DATE, allowNull: true },
    completed_at: { type: DataTypes.DATE, allowNull: true },
  },
  {
    sequelize,
    tableName: 'tasks',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['tenant_id'] },
      { fields: ['tenant_id', 'assigned_to_user_id'] },
      { fields: ['tenant_id', 'lead_id'] },
      { fields: ['tenant_id', 'status'] },
      { fields: ['tenant_id', 'due_date'] },
    ],
  }
);

export default Task;
