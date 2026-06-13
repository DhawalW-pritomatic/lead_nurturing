import Tenant from './Tenant';
import User from './User';
import Lead from './Lead';
import ApplicationType from './ApplicationType';
import EngagementEvent from './EngagementEvent';
import OutreachRecord from './OutreachRecord';
import Template from './Template';
import Sequence from './Sequence';
import SequenceEnrollment from './SequenceEnrollment';
import RoutingRule from './RoutingRule';
import ScoringProfile from './ScoringProfile';
import AssetProject from './AssetProject';
import AssetFolder from './AssetFolder';
import Asset from './Asset';
import AuditLog from './AuditLog';
import NurturingSettings from './NurturingSettings';
import Notification from './Notification';
import EmailSchedule from './EmailSchedule';
import LeadQuery from './LeadQuery';
<<<<<<< Updated upstream
=======
import TenantPhoneConfig from './TenantPhoneConfig';
import CallRecord from './CallRecord';
import CallbackSchedule from './CallbackSchedule';
import Task from './Task';
import WhatsAppMessage from './WhatsAppMessage';
import Meeting from './Meeting';
import RoutingLog from './RoutingLog';
>>>>>>> Stashed changes

// Tenant associations
Tenant.hasMany(User, { foreignKey: 'tenant_id', as: 'users' });
Tenant.hasMany(Lead, { foreignKey: 'tenant_id', as: 'leads' });
Tenant.hasMany(ApplicationType, { foreignKey: 'tenant_id', as: 'applicationTypes' });
Tenant.hasMany(Template, { foreignKey: 'tenant_id', as: 'templates' });
Tenant.hasMany(Sequence, { foreignKey: 'tenant_id', as: 'sequences' });
Tenant.hasMany(RoutingRule, { foreignKey: 'tenant_id', as: 'routingRules' });
Tenant.hasMany(ScoringProfile, { foreignKey: 'tenant_id', as: 'scoringProfiles' });
Tenant.hasMany(AssetProject, { foreignKey: 'tenant_id', as: 'assetProjects' });
Tenant.hasOne(NurturingSettings, { foreignKey: 'tenant_id', as: 'nurturingSettings' });

// User associations
User.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });
User.hasMany(Lead, { foreignKey: 'assigned_rep_id', as: 'assignedLeads' });
User.hasMany(Lead, { foreignKey: 'enrolled_by', as: 'enrolledLeads' });

// Lead associations
Lead.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });
Lead.belongsTo(User, { foreignKey: 'assigned_rep_id', as: 'assignedRep' });
Lead.belongsTo(User, { foreignKey: 'enrolled_by', as: 'enrolledByUser' });
Lead.belongsTo(ApplicationType, { foreignKey: 'application_type_id', as: 'applicationType' });
Lead.hasMany(EngagementEvent, { foreignKey: 'lead_id', as: 'engagementEvents' });
Lead.hasMany(OutreachRecord, { foreignKey: 'lead_id', as: 'outreachRecords' });
Lead.hasMany(SequenceEnrollment, { foreignKey: 'lead_id', as: 'sequenceEnrollments' });
Lead.hasMany(LeadQuery, { foreignKey: 'lead_id', as: 'queries' });

// ApplicationType
ApplicationType.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });
ApplicationType.hasMany(Lead, { foreignKey: 'application_type_id', as: 'leads' });

// EngagementEvent
EngagementEvent.belongsTo(Lead, { foreignKey: 'lead_id', as: 'lead' });

// OutreachRecord
OutreachRecord.belongsTo(Lead, { foreignKey: 'lead_id', as: 'lead' });
OutreachRecord.belongsTo(Template, { foreignKey: 'template_id', as: 'template' });
OutreachRecord.belongsTo(User, { foreignKey: 'rep_id', as: 'rep' });
OutreachRecord.belongsTo(Sequence, { foreignKey: 'sequence_id', as: 'sequence' });
OutreachRecord.belongsTo(SequenceEnrollment, { foreignKey: 'sequence_enrollment_id', as: 'enrollment' });
OutreachRecord.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });

// Template
Template.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });
Template.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
Template.belongsTo(ApplicationType, { foreignKey: 'application_type_id', as: 'applicationType' });
ApplicationType.hasMany(Template, { foreignKey: 'application_type_id', as: 'templates' });

// Sequence
Sequence.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });
Sequence.belongsTo(ApplicationType, { foreignKey: 'application_type_id', as: 'applicationType' });
Sequence.hasMany(SequenceEnrollment, { foreignKey: 'sequence_id', as: 'enrollments' });
ApplicationType.hasMany(Sequence, { foreignKey: 'application_type_id', as: 'sequences' });

// SequenceEnrollment
SequenceEnrollment.belongsTo(Lead, { foreignKey: 'lead_id', as: 'lead' });
SequenceEnrollment.belongsTo(Sequence, { foreignKey: 'sequence_id', as: 'sequence' });
SequenceEnrollment.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });
SequenceEnrollment.hasMany(OutreachRecord, { foreignKey: 'sequence_enrollment_id', as: 'outreachRecords' });

// Asset Library
AssetProject.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });
AssetProject.hasMany(AssetFolder, { foreignKey: 'project_id', as: 'folders' });
AssetFolder.belongsTo(AssetProject, { foreignKey: 'project_id', as: 'project' });
AssetFolder.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });
AssetFolder.hasMany(Asset, { foreignKey: 'folder_id', as: 'assets' });
AssetFolder.hasMany(AssetFolder, { foreignKey: 'parent_folder_id', as: 'subfolders' });
Asset.belongsTo(AssetFolder, { foreignKey: 'folder_id', as: 'folder' });
Asset.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });

// NurturingSettings
NurturingSettings.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });

// Scoring
ScoringProfile.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });

// Notification
Notification.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });
Notification.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
Tenant.hasMany(Notification, { foreignKey: 'tenant_id', as: 'notifications' });

// EmailSchedule
EmailSchedule.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });
EmailSchedule.belongsTo(Template, { foreignKey: 'template_id', as: 'template' });
EmailSchedule.belongsTo(Sequence, { foreignKey: 'sequence_id', as: 'sequence' });
Tenant.hasMany(EmailSchedule, { foreignKey: 'tenant_id', as: 'emailSchedules' });

// LeadQuery
LeadQuery.belongsTo(Lead, { foreignKey: 'lead_id', as: 'lead' });
LeadQuery.belongsTo(User, { foreignKey: 'owner_user_id', as: 'owner' });
LeadQuery.belongsTo(User, { foreignKey: 'answered_by_user_id', as: 'answeredBy' });
Tenant.hasMany(LeadQuery, { foreignKey: 'tenant_id', as: 'leadQueries' });

// Routing
RoutingRule.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });
RoutingRule.hasMany(RoutingLog, { foreignKey: 'rule_id', as: 'logs' });

// RoutingLog
RoutingLog.belongsTo(RoutingRule, { foreignKey: 'rule_id', as: 'rule' });
RoutingLog.belongsTo(Lead, { foreignKey: 'lead_id', as: 'lead' });
RoutingLog.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });

// AuditLog
AuditLog.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });
AuditLog.belongsTo(User, { foreignKey: 'actor_id', as: 'actor' });

export {
  Tenant,
  User,
  Lead,
  ApplicationType,
  EngagementEvent,
  OutreachRecord,
  Template,
  Sequence,
  SequenceEnrollment,
  RoutingRule,
  ScoringProfile,
  AssetProject,
  AssetFolder,
  Asset,
  AuditLog,
  NurturingSettings,
  Notification,
  EmailSchedule,
  LeadQuery,
<<<<<<< Updated upstream
=======
  TenantPhoneConfig,
  CallRecord,
  CallbackSchedule,
  Task,
  WhatsAppMessage,
  Meeting,
  RoutingLog,
>>>>>>> Stashed changes
};
