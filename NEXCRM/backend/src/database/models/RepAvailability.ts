import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../../config/database';

export type AvailabilityStatus = 'available' | 'on_leave' | 'half_day_am' | 'half_day_pm';

interface RepAvailabilityAttributes {
  id: string;
  tenant_id: string;
  user_id: string;
  date: string; // YYYY-MM-DD stored as DATEONLY
  status: AvailabilityStatus;
  notes?: string;
  created_at?: Date;
  updated_at?: Date;
}

interface RepAvailabilityCreationAttributes extends Optional<RepAvailabilityAttributes, 'id' | 'notes'> {}

class RepAvailability extends Model<RepAvailabilityAttributes, RepAvailabilityCreationAttributes>
  implements RepAvailabilityAttributes {
  public id!: string;
  public tenant_id!: string;
  public user_id!: string;
  public date!: string;
  public status!: AvailabilityStatus;
  public notes!: string;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

RepAvailability.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenant_id: { type: DataTypes.UUID, allowNull: false },
    user_id: { type: DataTypes.UUID, allowNull: false },
    date: { type: DataTypes.DATEONLY, allowNull: false },
    status: {
      type: DataTypes.ENUM('available', 'on_leave', 'half_day_am', 'half_day_pm'),
      defaultValue: 'available',
    },
    notes: { type: DataTypes.STRING(500), allowNull: true },
  },
  {
    sequelize,
    tableName: 'rep_availability',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['tenant_id', 'date'] },
      { fields: ['tenant_id', 'user_id', 'date'], unique: true },
    ],
  }
);

export default RepAvailability;
