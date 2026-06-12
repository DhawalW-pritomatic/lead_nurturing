import { Lead, LeadQuery, OutreachRecord, EngagementEvent, User, Tenant } from '../../../database/models';
import { Op } from 'sequelize';
import { ScoringService } from '../../scoring/services/scoringService';
import { NotificationService } from '../../notifications/services/notificationService';
import { TaskService } from '../../tasks/services/taskService';

const taskService = new TaskService();
import { config } from '../../../config';
import { v4 as uuidv4 } from 'uuid';
import nodemailer from 'nodemailer';

const scoringService = new ScoringService();
const notificationService = new NotificationService();

export class TrackingService {
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

  private generateTrackingId(): string {
    return uuidv4();
  }

  private getFirstStringValue(payload: any, keys: string[]): string {
    for (const key of keys) {
      const value = payload?.[key];
      if (typeof value === 'string' && value.trim()) return value.trim();
    }
    return '';
  }

  private stripHtmlTags(html: string): string {
    return html
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/\r/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  private extractLeadReplyText(rawText: string): string {
    if (!rawText) return '';

    const text = rawText.replace(/\r/g, '').trim();
    if (!text) return '';

    const lines = text.split('\n');
    const stopPatterns = [
      /^On .+ wrote:$/i,
      /^From:\s.+$/i,
      /^Sent:\s.+$/i,
      /^Subject:\s.+$/i,
      /^To:\s.+$/i,
      /^-{2,}\s*Original Message\s*-{2,}$/i,
      /^>+/,
    ];

    const replyLines: string[] = [];
    for (const line of lines) {
      const trimmed = line.trim();
      if (stopPatterns.some((pattern) => pattern.test(trimmed))) {
        break;
      }
      replyLines.push(line);
    }

    return replyLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  }

  private extractInboundBody(data: any): string {
    const directText = this.getFirstStringValue(data, [
      'stripped-text',
      'strippedText',
      'stripped_text',
      'text',
      'textBody',
      'TextBody',
      'body',
      'plain',
      'plainText',
      'message',
    ]);

    if (directText) return directText;

    const nestedPayload = data?.payload || data?.event || data?.message || {};
    const nestedText = this.getFirstStringValue(nestedPayload, [
      'stripped-text',
      'strippedText',
      'stripped_text',
      'text',
      'textBody',
      'TextBody',
      'body',
      'plain',
      'plainText',
    ]);
    if (nestedText) return nestedText;

    const html = this.getFirstStringValue(data, ['html', 'HtmlBody'])
      || this.getFirstStringValue(nestedPayload, ['html', 'HtmlBody']);
    if (html) return this.stripHtmlTags(html);

    return '';
  }
  async recordOpen(trackingId: string): Promise<void> {
    const record = await OutreachRecord.findOne({ where: { tracking_id: trackingId } });
    if (!record) return;

    // Only count first open
    if (!record.opened_at) {
      await OutreachRecord.update({ status: 'opened', opened_at: new Date() }, { where: { id: record.id } });

      // Log engagement event
      await EngagementEvent.create({
        tenant_id: record.tenant_id,
        lead_id: record.lead_id,
        event_type: 'email_opened',
        channel: 'email',
        metadata: { outreach_id: record.id, tracking_id: trackingId },
        score_delta: 5,
      });

      // Update score
      await scoringService.updateScore(record.tenant_id, record.lead_id, 'email_opened', 5);

      // Notification
      const lead = await Lead.findByPk(record.lead_id);
      if (lead) {
        await notificationService.notifyMailOpened(record.tenant_id, lead.email);
      }
    }
  }

  async recordClick(trackingId: string): Promise<string> {
    const record = await OutreachRecord.findOne({ where: { tracking_id: trackingId } });
    if (!record) return '/';

    await OutreachRecord.update({ status: 'clicked', clicked_at: new Date() }, { where: { id: record.id } });

    await EngagementEvent.create({
      tenant_id: record.tenant_id,
      lead_id: record.lead_id,
      event_type: 'email_cta_clicked',
      channel: 'email',
      metadata: { outreach_id: record.id, tracking_id: trackingId },
      score_delta: 15,
    });

    await scoringService.updateScore(record.tenant_id, record.lead_id, 'email_cta_clicked', 15);

    // Notification
    const lead = await Lead.findByPk(record.lead_id);
    if (lead) {
      await notificationService.notifyMailClicked(record.tenant_id, lead.email);
    }

    return '/'; // In production, resolve to actual CTA destination URL
  }

  async handleUnsubscribe(leadId: string, tenantId: string): Promise<void> {
    await Lead.update(
      { opted_out: true, status: 'OPTED_OUT' },
      { where: { id: leadId, tenant_id: tenantId } }
    );

    await EngagementEvent.create({
      tenant_id: tenantId,
      lead_id: leadId,
      event_type: 'unsubscribed',
      channel: 'email',
      metadata: {},
      score_delta: 0,
    });

    // Notification
    const lead = await Lead.findByPk(leadId);
    if (lead) {
      await notificationService.notifyLeadOptedOut(tenantId, lead.email);
    }
  }

  async recordWebsiteVisit(tenantId: string, leadId: string, pageUrl: string, isHighIntent: boolean): Promise<void> {
    const delta = isHighIntent ? 20 : 10;

    await EngagementEvent.create({
      tenant_id: tenantId,
      lead_id: leadId,
      event_type: isHighIntent ? 'website_visit_high_intent' : 'website_visit',
      channel: 'web',
      metadata: { page_url: pageUrl },
      score_delta: delta,
    });

    await scoringService.updateScore(tenantId, leadId, isHighIntent ? 'website_visit_high_intent' : 'website_visit', delta);
  }

  async recordAssetDownload(tenantId: string, leadId: string, assetId: string): Promise<void> {
    await EngagementEvent.create({
      tenant_id: tenantId,
      lead_id: leadId,
      event_type: 'asset_downloaded',
      channel: 'web',
      metadata: { asset_id: assetId },
      score_delta: 20,
    });

    await scoringService.updateScore(tenantId, leadId, 'asset_downloaded', 20);
  }

  async createInboundQuery(tenantId: string, data: any): Promise<any> {
    let lead = null;

    if (data.lead_id) {
      lead = await Lead.findOne({ where: { id: data.lead_id, tenant_id: tenantId } });
    } else if (data.lead_email) {
      lead = await Lead.findOne({ where: { email: data.lead_email, tenant_id: tenantId } });
    }

    if (!lead) {
      throw new Error('Lead not found for inbound query.');
    }

    const inboundBody = String(data.body || '').trim();
    const parsedLeadReply = this.extractLeadReplyText(inboundBody) || inboundBody;

    const query = await LeadQuery.create({
      tenant_id: tenantId,
      lead_id: lead.id,
      source: data.source || 'email',
      subject: data.subject || null,
      body: parsedLeadReply || '(no body)',
      status: 'pending',
      owner_user_id: data.owner_user_id || lead.assigned_rep_id || null,
      metadata: {
        ...(data.metadata || {}),
        lead_reply_text: parsedLeadReply || '(no body)',
        raw_body: inboundBody || null,
      },
    });

    await EngagementEvent.create({
      tenant_id: tenantId,
      lead_id: lead.id,
      event_type: 'inbound_query_received',
      channel: 'email',
      metadata: { query_id: query.id, source: query.source },
      score_delta: 12,
    });

    await scoringService.updateScore(tenantId, lead.id, 'inbound_query_received', 12);

    // Auto-create a reply task for the owning rep
    const ownerUserId = (query as any).owner_user_id || lead.assigned_rep_id || lead.enrolled_by;
    taskService.autoCreateForInboundQuery(tenantId, lead, ownerUserId).catch(e =>
      console.error('[AutoTask] Inbound query task failed:', e)
    );

    return query;
  }

  async ingestPublicInboundEmail(data: any): Promise<any> {
    const sender = String(data.from_email || data.sender || data.lead_email || '').trim().toLowerCase();
    if (!sender) throw new Error('from_email is required.');

    let tenantId = data.tenant_id;

    if (!tenantId && data.tenant_subdomain) {
      const tenant = await Tenant.findOne({ where: { subdomain: String(data.tenant_subdomain).trim() } });
      tenantId = tenant?.id;
    }

    let lead = null;
    if (tenantId) {
      lead = await Lead.findOne({ where: { tenant_id: tenantId, email: sender } });
    } else {
      lead = await Lead.findOne({ where: { email: sender } });
      tenantId = lead?.tenant_id;
    }

    if (!lead || !tenantId) {
      throw new Error('Lead not found for inbound email sender.');
    }

    const extractedBody = this.extractInboundBody(data);
    const parsedLeadReply = this.extractLeadReplyText(extractedBody) || extractedBody;

    return this.createInboundQuery(tenantId, {
      lead_id: lead.id,
      lead_email: sender,
      source: 'email',
      subject: data.subject || null,
      body: parsedLeadReply || '(no body)',
      owner_user_id: data.owner_user_id || lead.assigned_rep_id || null,
      metadata: {
        provider: data.provider || 'webhook',
        message_id: data.message_id || null,
        raw_headers: data.headers || null,
        lead_reply_text: parsedLeadReply || '(no body)',
        raw_inbound_text: extractedBody || null,
      },
    });
  }

  async answerQuery(tenantId: string, queryId: string, answeredByUserId: string, answerText?: string): Promise<any> {
    const query = await LeadQuery.findOne({ 
      where: { id: queryId, tenant_id: tenantId },
      include: [{ model: Lead, as: 'lead' }]
    });
    if (!query) throw new Error('Query not found.');

    const normalizedAnswer = typeof answerText === 'string' ? answerText.trim() : '';
    const existingMetadata = (query.get('metadata') || {}) as Record<string, any>;
    
    // Send email reply to customer
    let emailSent = false;
    let outreachRecordId = null;
    
    if (normalizedAnswer && query.lead) {
      try {
        const lead = query.lead as any;
        const user = await User.findByPk(answeredByUserId);
        const tenant = await Tenant.findByPk(tenantId);
        
        // Create reply email subject
        const replySubject = query.subject?.startsWith('Re:') 
          ? query.subject 
          : `Re: ${query.subject || 'Your Query'}`;
        
        // Send email using nodemailer
        const trackingId = this.generateTrackingId();
        const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <p>Hi ${lead.first_name || 'there'},</p>
              <p>${normalizedAnswer.replace(/\n/g, '<br>')}</p>
              <br>
              <p>Best regards,<br>
              ${user?.first_name || ''} ${user?.last_name || ''}<br>
              ${tenant?.name || 'Our Team'}</p>
            </div>
            <img src="${config.baseUrl}/track/open/${trackingId}" width="1" height="1" alt="" />
          `;
        
        await this.transporter.sendMail({
          from: config.smtp.from,
          to: lead.email,
          subject: replySubject,
          html: emailHtml,
          text: normalizedAnswer,
        });
        emailSent = true;
        
        // Create outreach record to track the reply
        const outreachRecord = await OutreachRecord.create({
          tenant_id: tenantId,
          lead_id: query.lead_id,
          user_id: answeredByUserId,
          subject: replySubject,
          body: normalizedAnswer,
          status: 'sent',
          tracking_id: trackingId,
          sent_at: new Date(),
          metadata: {
            is_query_reply: true,
            query_id: queryId,
            replied_to_message_id: existingMetadata.message_id,
          }
        });
        
        outreachRecordId = outreachRecord.id;
      } catch (emailError: any) {
        console.error('[ANSWER_QUERY] Failed to send email reply:', emailError.message);
        // Continue anyway - we'll mark it answered but note email failed
      }
    }
    
    const updatePayload: Record<string, any> = {
      status: 'answered',
      answered_by_user_id: answeredByUserId,
      answered_at: new Date(),
    };

    if (normalizedAnswer) {
      updatePayload.metadata = {
        ...existingMetadata,
        answer_text: normalizedAnswer,
        email_sent: emailSent,
        outreach_record_id: outreachRecordId,
      };
    }

    await LeadQuery.update(
      updatePayload,
      { where: { id: queryId, tenant_id: tenantId } }
    );

    await EngagementEvent.create({
      tenant_id: tenantId,
      lead_id: query.lead_id,
      event_type: 'query_answered_by_team',
      channel: 'email',
      metadata: { 
        query_id: query.id, 
        answered_by_user_id: answeredByUserId,
        email_sent: emailSent,
      },
      score_delta: 8,
    });

    await scoringService.updateScore(tenantId, query.lead_id, 'query_answered_by_team', 8);

    return LeadQuery.findOne({
      where: { id: queryId, tenant_id: tenantId },
      include: [
        { model: User, as: 'owner', attributes: ['id', 'first_name', 'last_name', 'role'] },
        { model: User, as: 'answeredBy', attributes: ['id', 'first_name', 'last_name', 'role'] },
      ],
    });
  }

  async getQueryHistory(tenantId: string, query: any, role: string = '', userId?: string): Promise<any> {
    const where: any = { tenant_id: tenantId };
    if (query.status) where.status = query.status;
    if (query.lead_id) where.lead_id = query.lead_id;
    if (['sales_rep', 'senior_sales_rep'].includes(role) && userId) {
      where.owner_user_id = userId;
    }

    const page = parseInt(query.page || '1');
    const limit = parseInt(query.limit || '50');
    const offset = (page - 1) * limit;

    const { rows, count } = await LeadQuery.findAndCountAll({
      where,
      include: [
        { model: Lead, as: 'lead', attributes: ['id', 'first_name', 'last_name', 'email'] },
        { model: User, as: 'owner', attributes: ['id', 'first_name', 'last_name', 'role'] },
        { model: User, as: 'answeredBy', attributes: ['id', 'first_name', 'last_name', 'role'] },
      ],
      order: [['created_at', 'DESC']],
      limit,
      offset,
    });

    return {
      total: count,
      page,
      limit,
      rows,
    };
  }

  async getQueryStats(tenantId: string, role: string = '', userId?: string): Promise<any> {
    const base: any = { tenant_id: tenantId };
    if (['sales_rep', 'senior_sales_rep'].includes(role) && userId) {
      base.owner_user_id = userId;
    }
    const [total, fromEmail, pending, answered, answeredBySales, answeredByAdmins] = await Promise.all([
      LeadQuery.count({ where: { ...base } }),
      LeadQuery.count({ where: { ...base, source: 'email' } }),
      LeadQuery.count({ where: { ...base, status: 'pending' } }),
      LeadQuery.count({ where: { ...base, status: 'answered' } }),
      LeadQuery.count({
        where: { ...base, status: 'answered' },
        include: [{ model: User, as: 'answeredBy', where: { role: { [Op.in]: ['sales_rep', 'senior_sales_rep', 'sales_manager'] } }, attributes: [] }],
      }),
      LeadQuery.count({
        where: { ...base, status: 'answered' },
        include: [{ model: User, as: 'answeredBy', where: { role: { [Op.in]: ['tenant_admin', 'super_admin'] } }, attributes: [] }],
      }),
    ]);

    return {
      total,
      inbound_email_queries: fromEmail,
      pending,
      answered,
      answered_by_sales: answeredBySales,
      answered_by_admins: answeredByAdmins,
    };
  }
}
