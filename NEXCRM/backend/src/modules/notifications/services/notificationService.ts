import { Op } from 'sequelize';
import { Notification, Tenant } from '../../../database/models';

export class NotificationService {
  async create(data: {
    tenant_id: string;
    user_id?: string;
    type: string;
    title: string;
    message: string;
    metadata?: object;
  }): Promise<any> {
    return Notification.create({
      tenant_id: data.tenant_id,
      user_id: data.user_id,
      type: data.type,
      title: data.title,
      message: data.message,
      metadata: data.metadata || {},
    });
  }

  async getAll(tenantId: string, query: any, role: string = ''): Promise<any> {
    const { page = 1, limit = 50, type, is_read, user_id } = query;
    const isSuperAdmin = role === 'super_admin';
    const isRep = ['sales_rep', 'senior_sales_rep'].includes(role);
    const where: any = {};
    if (!isSuperAdmin) where.tenant_id = tenantId;
    if (type) where.type = type;
    if (is_read !== undefined) where.is_read = is_read === 'true';
    if (user_id && !isSuperAdmin) {
      if (isRep) {
        where.user_id = user_id;
      } else {
        where[Op.or] = [{ user_id }, { user_id: null }];
      }
    }
    if (query.tenant_id && isSuperAdmin) where.tenant_id = query.tenant_id;

    const include: any[] = [];
    if (isSuperAdmin) {
      include.push({ model: Tenant, as: 'tenant', attributes: ['id', 'name'] });
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { rows, count } = await Notification.findAndCountAll({
      where,
      include,
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset,
    });

    return { notifications: rows, total: count, page: parseInt(page), limit: parseInt(limit) };
  }

  async markAsRead(tenantId: string, notificationId: string, role: string = ''): Promise<void> {
    const where: any = { id: notificationId };
    if (role !== 'super_admin') where.tenant_id = tenantId;
    await Notification.update({ is_read: true }, { where });
  }

  async markAllAsRead(tenantId: string, userId?: string, role: string = ''): Promise<void> {
    const isSuperAdmin = role === 'super_admin';
    const isRep = ['sales_rep', 'senior_sales_rep'].includes(role);
    const where: any = { is_read: false };
    if (!isSuperAdmin) where.tenant_id = tenantId;
    if (userId && !isSuperAdmin) {
      if (isRep) {
        where.user_id = userId;
      } else {
        where[Op.or] = [{ user_id: userId }, { user_id: null }];
      }
    }
    await Notification.update({ is_read: true }, { where });
  }

  async getUnreadCount(tenantId: string, userId?: string, role: string = ''): Promise<number> {
    const isSuperAdmin = role === 'super_admin';
    const isRep = ['sales_rep', 'senior_sales_rep'].includes(role);
    const where: any = { is_read: false };
    if (!isSuperAdmin) where.tenant_id = tenantId;
    if (userId && !isSuperAdmin) {
      if (isRep) {
        where.user_id = userId;
      } else {
        where[Op.or] = [{ user_id: userId }, { user_id: null }];
      }
    }
    return Notification.count({ where });
  }

  // Convenience methods for common notification types
  async notifyLeadAdded(tenantId: string, leadName: string, source: string, userId?: string): Promise<void> {
    await this.create({
      tenant_id: tenantId,
      user_id: userId,
      type: 'lead_added',
      title: 'New Lead Added',
      message: `Lead "${leadName}" was added from ${source}.`,
      metadata: { lead_name: leadName, source },
    });
  }

  async notifyMailSent(tenantId: string, leadEmail: string, templateName: string, userId?: string): Promise<void> {
    await this.create({
      tenant_id: tenantId,
      user_id: userId,
      type: 'mail_sent',
      title: 'Email Sent',
      message: `Email "${templateName}" sent to ${leadEmail}.`,
      metadata: { lead_email: leadEmail, template_name: templateName },
    });
  }

  async notifyMailFailed(tenantId: string, leadEmail: string, reason: string, userId?: string): Promise<void> {
    await this.create({
      tenant_id: tenantId,
      user_id: userId,
      type: 'mail_failed',
      title: 'Email Failed',
      message: `Failed to send email to ${leadEmail}: ${reason}`,
      metadata: { lead_email: leadEmail, reason },
    });
  }

  async notifyMailOpened(tenantId: string, leadEmail: string): Promise<void> {
    await this.create({
      tenant_id: tenantId,
      type: 'mail_opened',
      title: 'Email Opened',
      message: `${leadEmail} opened an email.`,
      metadata: { lead_email: leadEmail },
    });
  }

  async notifyMailClicked(tenantId: string, leadEmail: string): Promise<void> {
    await this.create({
      tenant_id: tenantId,
      type: 'mail_clicked',
      title: 'Link Clicked',
      message: `${leadEmail} clicked a link in the email.`,
      metadata: { lead_email: leadEmail },
    });
  }

  async notifyBulkImportComplete(tenantId: string, created: number, errors: number, userId?: string): Promise<void> {
    await this.create({
      tenant_id: tenantId,
      user_id: userId,
      type: 'bulk_import_complete',
      title: 'Bulk Import Complete',
      message: `CSV import finished: ${created} leads created, ${errors} errors.`,
      metadata: { created, errors },
    });
  }

  async notifySequenceStarted(tenantId: string, leadName: string, sequenceName: string): Promise<void> {
    await this.create({
      tenant_id: tenantId,
      type: 'sequence_started',
      title: 'Sequence Started',
      message: `"${leadName}" enrolled in sequence "${sequenceName}".`,
      metadata: { lead_name: leadName, sequence_name: sequenceName },
    });
  }

  async notifySequenceCompleted(tenantId: string, leadName: string, sequenceName: string): Promise<void> {
    await this.create({
      tenant_id: tenantId,
      type: 'sequence_completed',
      title: 'Sequence Completed',
      message: `"${leadName}" completed sequence "${sequenceName}".`,
      metadata: { lead_name: leadName, sequence_name: sequenceName },
    });
  }

  async notifySchedulerTriggered(tenantId: string, scheduleName: string, count: number): Promise<void> {
    await this.create({
      tenant_id: tenantId,
      type: 'scheduler_triggered',
      title: 'Scheduler Executed',
      message: `Schedule "${scheduleName}" sent ${count} emails automatically.`,
      metadata: { schedule_name: scheduleName, emails_sent: count },
    });
  }

  async notifyLeadAssigned(tenantId: string, leadName: string, repName: string, userId?: string): Promise<void> {
    await this.create({
      tenant_id: tenantId,
      user_id: userId,
      type: 'lead_assigned',
      title: 'Lead Assigned',
      message: `Lead "${leadName}" has been assigned to ${repName}.`,
      metadata: { lead_name: leadName, rep_name: repName },
    });
  }

  async notifyLeadConverted(tenantId: string, leadName: string): Promise<void> {
    await this.create({
      tenant_id: tenantId,
      type: 'lead_converted',
      title: 'Lead Converted!',
      message: `Congratulations! Lead "${leadName}" has been converted.`,
      metadata: { lead_name: leadName },
    });
  }

  async notifyLeadOptedOut(tenantId: string, leadEmail: string): Promise<void> {
    await this.create({
      tenant_id: tenantId,
      type: 'lead_opted_out',
      title: 'Lead Opted Out',
      message: `${leadEmail} has opted out of communications.`,
      metadata: { lead_email: leadEmail },
    });
  }
}
