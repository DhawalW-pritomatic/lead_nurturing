import nodemailer from 'nodemailer';
import { Op } from 'sequelize';
import { config } from '../../../config';
import { Lead, Template, OutreachRecord, User, Tenant } from '../../../database/models';
import { AppError } from '../../../middleware/errorHandler';
import { v4 as uuidv4 } from 'uuid';
import { NotificationService } from '../../notifications/services/notificationService';
import S3Asset from '../.././../database/models/S3Asset';
import { assetTrackingService } from '../../tracking/services/assetTrackingService';

const notificationService = new NotificationService();

export class OutreachService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: false,
      auth: {
        user: config.smtp.user,
        pass: config.smtp.pass,
      },
    });
  }

  async sendEmail(
    tenantId: string,
    leadId: string,
    templateId: string,
    repId?: string,
    sequenceStep?: number,
    sequenceContext?: { sequence_id?: string; sequence_enrollment_id?: string },
    assetIds?: string[]
  ): Promise<any> {
    const lead = await Lead.findOne({ where: { id: leadId, tenant_id: tenantId } });
    if (!lead) throw new AppError('Lead not found.', 404);
    if (lead.opted_out) throw new AppError('Lead has opted out.', 400);
    if (lead.email_status === 'invalid') throw new AppError('Lead email is invalid.', 400);

    // Skip dummy/example emails — only send to real addresses
    if (lead.email.endsWith('@example.com') || lead.email.endsWith('@example.org') || lead.email.endsWith('@test.com')) {
      throw new AppError('Cannot send to dummy/test email addresses. Only real emails are supported.', 400);
    }

    const template = await Template.findOne({ where: { id: templateId, tenant_id: tenantId } });
    if (!template) throw new AppError('Template not found.', 404);

    const rep = repId ? await User.findByPk(repId) : null;
    const tenant = await Tenant.findByPk(tenantId);

    // Resolve template variables
    const trackingId = uuidv4();
    const variables: Record<string, string> = {
      'lead.first_name': lead.first_name,
      'lead.last_name': lead.last_name,
      'lead.company': lead.company || '',
      'lead.city': lead.city || '',
      'rep.name': rep ? `${rep.first_name} ${rep.last_name}` : '',
      'rep.phone': rep?.phone || '',
      'rep.email': rep?.email || '',
      'company.name': tenant?.name || '',
      'enrollment.date': lead.created_at?.toLocaleDateString() || '',
      'tracking.cta_url': `${config.baseUrl}/track/click/${trackingId}`,
    };

    let subject = template.subject || '';
    let body = template.body;
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      subject = subject.replace(regex, value);
      body = body.replace(regex, value);
    }

    // Add tracking pixel — must NOT use display:none; Gmail's proxy skips hidden images
    const pixelUrl = `${config.baseUrl}/track/open/${trackingId}`;
    body += `<img src="${pixelUrl}" width="1" height="1" border="0" style="width:1px;height:1px;border:0;margin:0;padding:0;" />`;

    // Add unsubscribe link
    const unsubUrl = `${config.baseUrl}/track/unsubscribe/${leadId}?tenant=${tenantId}`;
    body += `<br/><p style="font-size:11px;color:#999;margin-top:20px;">If you no longer wish to receive these emails, <a href="${unsubUrl}">unsubscribe here</a>.</p>`;

    // Create outreach record first so we can link tokens to it
    const record = await OutreachRecord.create({
      tenant_id: tenantId,
      lead_id: leadId,
      sequence_id: sequenceContext?.sequence_id,
      sequence_enrollment_id: sequenceContext?.sequence_enrollment_id,
      template_id: templateId,
      channel: 'email',
      status: 'pending',
      sequence_step: sequenceStep,
      subject_line: subject,
      body_preview: body.substring(0, 500),
      rep_id: repId,
      tracking_id: trackingId,
    });

    // If assets are attached, generate a tracking token per asset and append a download section
    if (assetIds && assetIds.length > 0) {
      const assets = await S3Asset.findAll({
        where: { id: assetIds, tenant_id: tenantId, is_active: true },
        attributes: ['id', 'original_name', 'mime_type', 'size_bytes'],
      });

      if (assets.length > 0) {
        const downloadRows = await Promise.all(
          assets.map(async (asset) => {
            const downloadUrl = await assetTrackingService.generateToken({
              tenantId,
              s3AssetId: asset.id,
              leadId,
              outreachRecordId: record.id,
            });
            const sizeKb = Math.round((asset as any).size_bytes / 1024);
            return `
              <tr>
                <td style="padding:8px 0;border-bottom:1px solid #eee;">
                  <span style="font-size:14px;">📎 ${(asset as any).original_name}</span>
                  <span style="font-size:12px;color:#999;margin-left:8px;">(${sizeKb} KB)</span>
                </td>
                <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;">
                  <a href="${downloadUrl}"
                     style="background:#0066cc;color:#fff;padding:6px 14px;border-radius:4px;text-decoration:none;font-size:13px;">
                    Download
                  </a>
                </td>
              </tr>`;
          })
        );

        body += `
          <div style="margin-top:24px;padding:16px;background:#f9f9f9;border:1px solid #e0e0e0;border-radius:6px;font-family:sans-serif;">
            <p style="margin:0 0 12px;font-weight:bold;font-size:14px;color:#333;">Attached Files</p>
            <table style="width:100%;border-collapse:collapse;">
              ${downloadRows.join('')}
            </table>
          </div>`;
      }
    }

    try {
      const fromName = (config.smtp.from.match(/^([^<]+)/) || [''])[0].trim().replace(/^["']|["']$/g, '');
      const fromAddress = config.smtp.user || config.smtp.from;
      const from = fromName && config.smtp.user ? `${fromName} <${config.smtp.user}>` : fromAddress;

      await this.transporter.sendMail({
        from,
        to: lead.email,
        subject,
        html: body,
      });

      await OutreachRecord.update({ status: 'sent', sent_at: new Date() }, { where: { id: record.id } });
      // Update lead status to ACTIVE if NEW
      if (lead.status === 'NEW') {
        await Lead.update({ status: 'ACTIVE' }, { where: { id: leadId } });
      }
      // Notification
      await notificationService.notifyMailSent(tenantId, lead.email, template.name, repId);
      return { success: true, outreach_id: record.id, tracking_id: trackingId };
    } catch (error: any) {
      await OutreachRecord.update({ status: 'failed', failure_reason: error.message }, { where: { id: record.id } });
      // Notification
      await notificationService.notifyMailFailed(tenantId, lead.email, error.message, repId);
      return { success: false, error: error.message, outreach_id: record.id };
    }
  }

  async sendWelcomeEmail(tenantId: string, leadId: string): Promise<any> {
    // Find welcome template for the tenant
    const template = await Template.findOne({
      where: { tenant_id: tenantId, category: 'welcome', is_active: true },
    });
    if (!template) return { success: false, error: 'No welcome template configured.' };

    const lead = await Lead.findOne({ where: { id: leadId, tenant_id: tenantId } });
    if (!lead) return { success: false, error: 'Lead not found.' };

    return this.sendEmail(tenantId, leadId, template.id, lead.assigned_rep_id || lead.enrolled_by);
  }

  async getOutreachHistory(tenantId: string, query: any, role: string = ''): Promise<any> {
    const { page = 1, limit = 50, lead_id, status, channel } = query;
    const where: any = {};
    if (role !== 'super_admin') {
      where.tenant_id = tenantId;
    }
    if (lead_id) where.lead_id = lead_id;
    if (status) where.status = status;
    if (channel) where.channel = channel;

    const includes: any[] = [
      { model: Lead, as: 'lead', attributes: ['id', 'first_name', 'last_name', 'email'] },
      { model: Template, as: 'template', attributes: ['id', 'name', 'category'] },
    ];
    if (role === 'super_admin') {
      includes.push({ model: Tenant, as: 'tenant', attributes: ['id', 'name'] });
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { rows, count } = await OutreachRecord.findAndCountAll({
      where,
      include: includes,
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset,
    });

    return { records: rows, total: count, page: parseInt(page), limit: parseInt(limit) };
  }

  async getOutreachStats(tenantId: string, role: string = ''): Promise<any> {
    const base: any = {};
    if (role !== 'super_admin') {
      base.tenant_id = tenantId;
    }
    const [total, sent, opened, clicked, failed] = await Promise.all([
      OutreachRecord.count({ where: { ...base } }),
      OutreachRecord.count({ where: { ...base, status: 'sent' } }),
      // opened_at being set means the email was opened, regardless of whether they also clicked
      OutreachRecord.count({ where: { ...base, opened_at: { [Op.ne]: null } } }),
      OutreachRecord.count({ where: { ...base, status: 'clicked' } }),
      OutreachRecord.count({ where: { ...base, status: 'failed' } }),
    ]);

    return {
      total,
      sent,
      opened,
      clicked,
      failed,
      open_rate: total > 0 ? ((opened / total) * 100).toFixed(1) : '0',
      click_rate: total > 0 ? ((clicked / total) * 100).toFixed(1) : '0',
    };
  }
}
