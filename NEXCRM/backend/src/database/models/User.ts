import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../../config/database';

interface UserAttributes {
  id: string;
  tenant_id: string;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  role: string;
  phone?: string;
  territory?: string;
  rep_tags: string[];
  connected_gmail?: string;
  is_active: boolean;
  mfa_enabled: boolean;
  mfa_secret?: string;
  failed_login_attempts: number;
  locked_until?: Date;
  last_login?: Date;
  created_at?: Date;
  updated_at?: Date;
}

interface UserCreationAttributes extends Optional<UserAttributes, 'id' | 'phone' | 'territory' | 'rep_tags' | 'connected_gmail' | 'is_active' | 'mfa_enabled' | 'mfa_secret' | 'failed_login_attempts' | 'locked_until' | 'last_login'> {}

class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public id!: string;
  public tenant_id!: string;
  public email!: string;
  public password_hash!: string;
  public first_name!: string;
  public last_name!: string;
  public role!: string;
  public phone!: string;
  public territory!: string;
  public rep_tags!: string[];
  public connected_gmail!: string;
  public is_active!: boolean;
  public mfa_enabled!: boolean;
  public mfa_secret!: string;
  public failed_login_attempts!: number;
  public locked_until!: Date;
  public last_login!: Date;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

User.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenant_id: { type: DataTypes.UUID, allowNull: false },
    email: { type: DataTypes.STRING(255), allowNull: false },
    password_hash: { type: DataTypes.STRING(255), allowNull: false },
    first_name: { type: DataTypes.STRING(100), allowNull: false },
    last_name: { type: DataTypes.STRING(100), allowNull: false },
    role: { type: DataTypes.ENUM('super_admin', 'tenant_admin', 'sales_manager', 'senior_sales_rep', 'sales_rep', 'read_only_analyst'), allowNull: false },
    phone: { type: DataTypes.STRING(20) },
    territory: { type: DataTypes.STRING(100) },
    rep_tags: { type: DataTypes.ARRAY(DataTypes.STRING), defaultValue: [] },
    connected_gmail: { type: DataTypes.STRING(255) },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    mfa_enabled: { type: DataTypes.BOOLEAN, defaultValue: false },
    mfa_secret: { type: DataTypes.STRING(255) },
    failed_login_attempts: { type: DataTypes.INTEGER, defaultValue: 0 },
    locked_until: { type: DataTypes.DATE },
    last_login: { type: DataTypes.DATE },
  },
  {
    sequelize,
    tableName: 'users',
    timestamps: true,
    underscored: true,
    indexes: [{ unique: true, fields: ['email', 'tenant_id'] }],
  }
);

export default User;
