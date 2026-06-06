import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../../config/database';

interface TemplateAttributes {
  id: string;
  tenant_id: string;
  application_type_id?: string;
  name: string;
  channel: string;
  subject?: string;
  body: string;
  variables: string[];
  category: string;
  is_active: boolean;
  created_by: string;
  created_at?: Date;
  updated_at?: Date;
}

interface TemplateCreationAttributes extends Optional<TemplateAttributes, 'id' | 'application_type_id' | 'subject' | 'variables' | 'category' | 'is_active'> {}

class Template extends Model<TemplateAttributes, TemplateCreationAttributes> implements TemplateAttributes {
  public id!: string;
  public tenant_id!: string;
  public application_type_id!: string;
  public name!: string;
  public channel!: string;
  public subject!: string;
  public body!: string;
  public variables!: string[];
  public category!: string;
  public is_active!: boolean;
  public created_by!: string;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

Template.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenant_id: { type: DataTypes.UUID, allowNull: false },
    application_type_id: { type: DataTypes.UUID },
    name: { type: DataTypes.STRING(255), allowNull: false },
    channel: { type: DataTypes.ENUM('email', 'whatsapp', 'sms'), defaultValue: 'email' },
    subject: { type: DataTypes.STRING(500) },
    body: { type: DataTypes.TEXT, allowNull: false },
    variables: { type: DataTypes.ARRAY(DataTypes.STRING), defaultValue: [] },
    category: { type: DataTypes.STRING(50), defaultValue: 'general' },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    created_by: { type: DataTypes.UUID, allowNull: false },
  },
  {
    sequelize,
    tableName: 'templates',
    timestamps: true,
    underscored: true,
    indexes: [{ fields: ['tenant_id', 'category'] }, { fields: ['tenant_id', 'application_type_id'] }],
  }
);

export default Template;
