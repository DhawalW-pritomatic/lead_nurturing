import { Op } from 'sequelize';
import fs from 'fs';
import csvParser from 'csv-parser';
import { Lead, User, ApplicationType, EngagementEvent, OutreachRecord, SequenceEnrollment, Tenant } from '../../../database/models';
import { AppError } from '../../../middleware/errorHandler';
import sequelize from '../../../config/database';
import { NotificationService } from '../../notifications/services/notificationService';

const notificationService = new NotificationService();

export class LeadService {
  async createLead(tenantId: string, enrolledBy: string, data: any): Promise<any> {
    // Duplicate check
    if (data.email) {
      const existing = await Lead.findOne({ where: { tenant_id: tenantId, email: data.email } });
      if (existing) {
        throw new AppError('Lead with this email already exists in your tenant.', 409);
      }
    }

    const lead = await Lead.create({
      tenant_id: tenantId,
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
      phone: data.phone,
      company: data.company,
      city: data.city,
      source: data.source || 'Manual Entry',
      application_type_id: data.application_type_id || null,
      status: 'NEW',
      lead_type: 'COLD',
      score: 0,
      assigned_rep_id: data.assigned_rep_id,
      enrolled_by: enrolledBy,
      gdpr_consent: data.gdpr_consent || false,
      notes: data.notes,
      custom_fields: data.custom_fields || {},
    });

    // Notification
    await notificationService.notifyLeadAdded(tenantId, `${data.first_name} ${data.last_name}`, data.source || 'Manual Entry', enrolledBy);

    return lead;
  }

  async getLeads(tenantId: string, userId: string, role: string, query: any): Promise<any> {
    const { page = 1, limit = 50, search, status, lead_type, source, application_type_id, assigned_rep_id, sort_by = 'created_at', sort_order = 'DESC', score_min, score_max } = query;

    // Super_admin: cross-tenant visibility. All other roles: scoped to their tenant.
    const where: any = {};
    if (role !== 'super_admin') {
      where.tenant_id = tenantId;
    }

    // Role-based filtering: reps see only their leads
    if (role === 'sales_rep') {
      where.assigned_rep_id = userId;
    } else if (role === 'senior_sales_rep') {
      where[Op.or] = [{ assigned_rep_id: userId }, { lead_type: 'HOT' }];
    }

    if (search) {
      where[Op.or] = [
        { first_name: { [Op.iLike]: `%${search}%` } },
        { last_name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { phone: { [Op.iLike]: `%${search}%` } },
        { company: { [Op.iLike]: `%${search}%` } },
      ];
    }

    if (status) {
      const statuses = Array.isArray(status) ? status : status.split(',');
      where.status = { [Op.in]: statuses };
    }
    if (lead_type) {
      const types = Array.isArray(lead_type) ? lead_type : lead_type.split(',');
      where.lead_type = { [Op.in]: types };
    }
    if (source) where.source = source;
    if (application_type_id) where.application_type_id = application_type_id;
    if (assigned_rep_id) where.assigned_rep_id = assigned_rep_id;
    if (score_min) where.score = { ...where.score, [Op.gte]: parseInt(score_min) };
    if (score_max) where.score = { ...where.score, [Op.lte]: parseInt(score_max) };

    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    const includes: any[] = [
      { model: User, as: 'assignedRep', attributes: ['id', 'first_name', 'last_name', 'email'] },
      { model: User, as: 'enrolledByUser', attributes: ['id', 'first_name', 'last_name'] },
      { model: ApplicationType, as: 'applicationType', attributes: ['id', 'name'] },
    ];
    if (role === 'super_admin') {
      includes.push({ model: Tenant, as: 'tenant', attributes: ['id', 'name'] });
    }

    const { rows, count } = await Lead.findAndCountAll({
      where,
      include: includes,
      order: [[sort_by, sort_order.toUpperCase()]],
      limit: parseInt(limit as string),
      offset,
    });

    return { leads: rows, total: count, page: parseInt(page as string), limit: parseInt(limit as string), total_pages: Math.ceil(count / parseInt(limit as string)) };
  }

  async getLeadById(tenantId: string, leadId: string, role: string = ''): Promise<any> {
    // Super_admin can fetch leads from any tenant.
    const where: any = { id: leadId };
    if (role !== 'super_admin') {
      where.tenant_id = tenantId;
    }

    const includes: any[] = [
      { model: User, as: 'assignedRep', attributes: ['id', 'first_name', 'last_name', 'email', 'phone'] },
      { model: User, as: 'enrolledByUser', attributes: ['id', 'first_name', 'last_name'] },
      { model: ApplicationType, as: 'applicationType' },
      { model: EngagementEvent, as: 'engagementEvents', limit: 50, order: [['created_at', 'DESC']] },
      { model: OutreachRecord, as: 'outreachRecords', limit: 20, order: [['created_at', 'DESC']] },
      { model: SequenceEnrollment, as: 'sequenceEnrollments' },
    ];
    if (role === 'super_admin') {
      includes.push({ model: Tenant, as: 'tenant', attributes: ['id', 'name'] });
    }

    const lead = await Lead.findOne({
      where,
      include: includes,
    });
    if (!lead) throw new AppError('Lead not found.', 404);
    return lead;
  }

  async updateLead(tenantId: string, leadId: string, data: any, userId: string, role: string): Promise<any> {
    const lead = await Lead.findOne({ where: { id: leadId, tenant_id: tenantId } });
    if (!lead) throw new AppError('Lead not found.', 404);

    // Check permissions: reps can only update their own leads
    if (role === 'sales_rep' && lead.assigned_rep_id !== userId) {
      throw new AppError('Not authorized to update this lead.', 403);
    }

    const allowedFields = ['first_name', 'last_name', 'email', 'phone', 'company', 'city', 'source', 'notes', 'custom_fields', 'application_type_id'];
    const updateData: any = {};
    for (const field of allowedFields) {
      if (data[field] !== undefined) updateData[field] = data[field];
    }

    await Lead.update(updateData, { where: { id: leadId, tenant_id: tenantId } });
    return this.getLeadById(tenantId, leadId);
  }

  async deleteLead(tenantId: string, leadId: string): Promise<void> {
    const result = await Lead.destroy({ where: { id: leadId, tenant_id: tenantId } });
    if (!result) throw new AppError('Lead not found.', 404);
  }

  async updateLeadStatus(tenantId: string, leadId: string, newStatus: string, userId: string, role: string): Promise<any> {
    const lead = await Lead.findOne({ where: { id: leadId, tenant_id: tenantId } });
    if (!lead) throw new AppError('Lead not found.', 404);

    const validTransitions: Record<string, string[]> = {
      NEW: ['ACTIVE', 'OPTED_OUT'],
      ACTIVE: ['ENGAGED', 'STALE', 'OPTED_OUT', 'LOST', 'CONVERTED'],
      ENGAGED: ['MEETING_SCHEDULED', 'ACTIVE', 'STALE', 'OPTED_OUT', 'LOST', 'CONVERTED'],
      MEETING_SCHEDULED: ['PROPOSAL_SENT', 'NEGOTIATION', 'LOST', 'OPTED_OUT', 'CONVERTED'],
      PROPOSAL_SENT: ['NEGOTIATION', 'LOST', 'OPTED_OUT', 'CONVERTED'],
      NEGOTIATION: ['CONVERTED', 'LOST', 'OPTED_OUT'],
      STALE: ['ACTIVE', 'OPTED_OUT', 'LOST'],
      LOST: ['ACTIVE'],
    };

    const currentStatus = lead.status;
    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      throw new AppError(`Cannot transition from ${currentStatus} to ${newStatus}.`, 400);
    }

    // Manager-only override checks
    if (['STALE', 'LOST'].includes(currentStatus) && newStatus === 'ACTIVE') {
      if (!['tenant_admin', 'sales_manager', 'super_admin'].includes(role)) {
        throw new AppError('Only managers can reactivate stale/lost leads.', 403);
      }
    }

    const updateData: any = { status: newStatus };
    if (newStatus === 'CONVERTED') {
      updateData.lead_type = 'CONVERTED';
      updateData.converted_at = new Date();
    } else if (newStatus === 'LOST') {
      updateData.lead_type = 'LOST';
    } else if (newStatus === 'OPTED_OUT') {
      updateData.opted_out = true;
    }

    await Lead.update(updateData, { where: { id: leadId, tenant_id: tenantId } });

    // Notifications for important status changes
    if (newStatus === 'CONVERTED') {
      await notificationService.notifyLeadConverted(tenantId, `${lead.first_name} ${lead.last_name}`);
    }

    return this.getLeadById(tenantId, leadId);
  }

  async assignRep(tenantId: string, leadId: string, repId: string, assignedBy: string): Promise<any> {
    const lead = await Lead.findOne({ where: { id: leadId, tenant_id: tenantId } });
    if (!lead) throw new AppError('Lead not found.', 404);

    const rep = await User.findOne({ where: { id: repId, tenant_id: tenantId, is_active: true } });
    if (!rep) throw new AppError('Rep not found.', 404);

    await Lead.update({ assigned_rep_id: repId }, { where: { id: leadId, tenant_id: tenantId } });

    // Notification
    await notificationService.notifyLeadAssigned(tenantId, `${lead.first_name} ${lead.last_name}`, `${rep.first_name} ${rep.last_name}`, repId);

    return this.getLeadById(tenantId, leadId);
  }

  async bulkImport(tenantId: string, userId: string, filePath: string): Promise<any> {
    const leads: any[] = [];
    const errors: any[] = [];

    return new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csvParser())
        .on('data', (row: any) => {
          if (!row.first_name || !row.last_name || !row.email) {
            errors.push({ row, error: 'Missing required fields (first_name, last_name, email)' });
          } else {
            leads.push({
              tenant_id: tenantId,
              first_name: row.first_name?.trim(),
              last_name: row.last_name?.trim(),
              email: row.email?.trim().toLowerCase(),
              phone: row.phone?.trim(),
              company: row.company?.trim(),
              city: row.city?.trim(),
              source: row.source?.trim() || 'CSV Import',
              status: 'NEW',
              lead_type: 'COLD',
              score: 0,
              enrolled_by: userId,
              gdpr_consent: row.consent === 'true' || row.consent === 'yes',
              custom_fields: {},
            });
          }
        })
        .on('end', async () => {
          try {
            // Remove duplicate emails within import
            const uniqueLeads = leads.filter((lead, index, self) =>
              index === self.findIndex(l => l.email === lead.email)
            );

            // Check against existing leads
            const existingEmails = await Lead.findAll({
              where: { tenant_id: tenantId, email: { [Op.in]: uniqueLeads.map(l => l.email) } },
              attributes: ['email'],
            });
            const existingSet = new Set(existingEmails.map((l: any) => l.email));
            const newLeads = uniqueLeads.filter(l => !existingSet.has(l.email));
            const duplicates = uniqueLeads.filter(l => existingSet.has(l.email));

            let created = 0;
            if (newLeads.length > 0) {
              await Lead.bulkCreate(newLeads);
              created = newLeads.length;
            }

            // Cleanup uploaded file
            fs.unlink(filePath, () => {});

            resolve({
              total_in_file: leads.length + errors.length,
              valid: leads.length,
              created,
              duplicates_skipped: duplicates.length,
              errors: errors.length,
              error_details: errors.slice(0, 10),
            });
          } catch (err) {
            reject(err);
          }
        })
        .on('error', reject);
    });
  }

  async getLeadTimeline(tenantId: string, leadId: string, role: string = ''): Promise<any> {
    const eventWhere: any = { lead_id: leadId };
    const outreachWhere: any = { lead_id: leadId };
    if (role !== 'super_admin') {
      eventWhere.tenant_id = tenantId;
      outreachWhere.tenant_id = tenantId;
    }
    const events = await EngagementEvent.findAll({
      where: eventWhere,
      order: [['created_at', 'DESC']],
      limit: 100,
    });
    const outreach = await OutreachRecord.findAll({
      where: outreachWhere,
      order: [['created_at', 'DESC']],
      limit: 50,
    });
    return { events, outreach };
  }

  async getLeadStats(tenantId: string, userId: string, role: string): Promise<any> {
    const where: any = {};
    if (role !== 'super_admin') {
      where.tenant_id = tenantId;
    }
    if (role === 'sales_rep') where.assigned_rep_id = userId;

    const [total, byType, byStatus, bySource, recentLeads] = await Promise.all([
      Lead.count({ where }),
      Lead.findAll({
        where,
        attributes: ['lead_type', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
        group: ['lead_type'],
        raw: true,
      }),
      Lead.findAll({
        where,
        attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
        group: ['status'],
        raw: true,
      }),
      Lead.findAll({
        where,
        attributes: ['source', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
        group: ['source'],
        raw: true,
      }),
      Lead.count({ where: { ...where, created_at: { [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } }),
    ]);

    return { total, by_type: byType, by_status: byStatus, by_source: bySource, new_this_week: recentLeads };
  }
}
