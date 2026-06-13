import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../../config/database';

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'cancelled';

interface TaskAttributes {
  id: string;
  tenant_id: string;
  title: string;
  description?: string;
  priority: TaskPriority;
  status: TaskStatus;
  lead_id?: string;
  assigned_to?: string;
  created_by: string;
  due_date?: Date;
  reminder_at?: Date;
  completed_at?: Date;
  created_at?: Date;
  updated_at?: Date;
}

interface TaskCreationAttributes extends Optional<TaskAttributes,
  'id' | 'description' | 'priority' | 'status' | 'lead_id' | 'assigned_to' |
  'due_date' | 'reminder_at' | 'completed_at'
> {}

class Task extends Model<TaskAttributes, TaskCreationAttributes> implements TaskAttributes {
  public id!: string;
  public tenant_id!: string;
  public title!: string;
  public description!: string;
  public priority!: TaskPriority;
  public status!: TaskStatus;
  public lead_id!: string;
  public assigned_to!: string;
  public created_by!: string;
  public due_date!: Date;
  public reminder_at!: Date;
  public completed_at!: Date;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

Task.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tenant_id: { type: DataTypes.UUID, allowNull: false },
  title: { type: DataTypes.STRING(255), allowNull: false },
  description: { type: DataTypes.TEXT },
  priority: { type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'), defaultValue: 'medium' },
  status: { type: DataTypes.ENUM('todo', 'in_progress', 'done', 'cancelled'), defaultValue: 'todo' },
  lead_id: { type: DataTypes.UUID },
  assigned_to: { type: DataTypes.UUID },
  created_by: { type: DataTypes.UUID, allowNull: false },
  due_date: { type: DataTypes.DATE },
  reminder_at: { type: DataTypes.DATE },
  completed_at: { type: DataTypes.DATE },
}, {
  sequelize,
  modelName: 'Task',
  tableName: 'tasks',
  timestamps: true,
  underscored: true,
  indexes: [{ fields: ['tenant_id'] }, { fields: ['lead_id'] }, { fields: ['assigned_to'] }],
});

export { Task };
export default Task;
