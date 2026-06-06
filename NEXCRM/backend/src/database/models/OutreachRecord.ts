import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../../config/database';

interface OutreachRecordAttributes {
  id: string;
  tenant_id: string;
  lead_id: string;
  sequence_id?: string;
  sequence_enrollment_id?: string;
  template_id?: string;
  channel: string;
  sent_at?: Date;
  status: string;
  failure_reason?: string;
  sequence_step?: number;
  subject_line?: string;
  body_preview?: string;
  rep_id?: string;
  tracking_id: string;
  opened_at?: Date;
  clicked_at?: Date;
  created_at?: Date;
  updated_at?: Date;
}

interface OutreachRecordCreationAttributes extends Optional<OutreachRecordAttributes, 'id' | 'sequence_id' | 'sequence_enrollment_id' | 'template_id' | 'sent_at' | 'status' | 'failure_reason' | 'sequence_step' | 'subject_line' | 'body_preview' | 'rep_id' | 'tracking_id' | 'opened_at' | 'clicked_at'> {}

class OutreachRecord extends Model<OutreachRecordAttributes, OutreachRecordCreationAttributes> implements OutreachRecordAttributes {
  public id!: string;
  public tenant_id!: string;
  public lead_id!: string;
  public sequence_id!: string;
  public sequence_enrollment_id!: string;
  public template_id!: string;
  public channel!: string;
  public sent_at!: Date;
  public status!: string;
  public failure_reason!: string;
  public sequence_step!: number;
  public subject_line!: string;
  public body_preview!: string;
  public rep_id!: string;
  public tracking_id!: string;
  public opened_at!: Date;
  public clicked_at!: Date;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

OutreachRecord.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenant_id: { type: DataTypes.UUID, allowNull: false },
    lead_id: { type: DataTypes.UUID, allowNull: false },
    sequence_id: { type: DataTypes.UUID },
    sequence_enrollment_id: { type: DataTypes.UUID },
    template_id: { type: DataTypes.UUID },
    channel: { type: DataTypes.STRING(20), allowNull: false },
    sent_at: { type: DataTypes.DATE },
    status: { type: DataTypes.ENUM('pending', 'sent', 'delivered', 'opened', 'clicked', 'failed', 'bounced'), defaultValue: 'pending' },
    failure_reason: { type: DataTypes.STRING(255) },
    sequence_step: { type: DataTypes.INTEGER },
    subject_line: { type: DataTypes.STRING(500) },
    body_preview: { type: DataTypes.TEXT },
    rep_id: { type: DataTypes.UUID },
    tracking_id: { type: DataTypes.STRING(100), defaultValue: DataTypes.UUIDV4 },
    opened_at: { type: DataTypes.DATE },
    clicked_at: { type: DataTypes.DATE },
  },
  {
    sequelize,
    tableName: 'outreach_records',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['tenant_id', 'lead_id'] },
      { fields: ['tenant_id', 'sequence_id'] },
      { fields: ['sequence_enrollment_id'] },
      { fields: ['tracking_id'] },
      { fields: ['tenant_id', 'status'] },
    ],
  }
);

export default OutreachRecord;
