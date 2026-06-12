import twilio from 'twilio';
import { Lead, TenantPhoneConfig, WhatsAppMessage, User } from '../../../database/models';
import { emitToTenant } from '../../../utils/sseEmitter';

export class WhatsAppService {
  async send(tenantId: string, leadId: string, repId: string, body: string, templateId?: string): Promise<WhatsAppMessage> {
    const cfg = await TenantPhoneConfig.findOne({ where: { tenant_id: tenantId } });
    if (!cfg) throw new Error('Phone not configured. Add Twilio credentials in Settings → Phone & Call Configuration.');
    if (!cfg.whatsapp_enabled) throw new Error('WhatsApp is disabled for this tenant.');
    if (!cfg.whatsapp_phone_number) throw new Error('WhatsApp phone number not configured.');

    const lead = await Lead.findOne({ where: { id: leadId, tenant_id: tenantId } });
    if (!lead) throw new Error('Lead not found.');
    if (lead.whatsapp_opted_out) throw new Error('This lead has opted out of WhatsApp messages.');
    if (!lead.phone) throw new Error('Lead has no phone number on file.');

    const msg = await WhatsAppMessage.create({
      tenant_id: tenantId,
      lead_id: leadId,
      rep_id: repId,
      direction: 'outbound',
      from_number: cfg.whatsapp_phone_number,
      to_number: lead.phone,
      body,
      status: 'queued',
      template_id: templateId,
    });

    try {
      const client = twilio(cfg.twilio_account_sid, cfg.twilio_auth_token);
      const twilioMsg = await client.messages.create({
        from: `whatsapp:${cfg.whatsapp_phone_number}`,
        to: `whatsapp:${lead.phone}`,
        body,
      });

      await msg.update({ twilio_message_sid: twilioMsg.sid, status: 'sent' });
      await lead.update({ whatsapp_opted_in: true, last_activity_at: new Date() });

      emitToTenant(tenantId, 'whatsapp_sent', { lead_id: leadId, message_sid: twilioMsg.sid });
    } catch (err: any) {
      await msg.update({ status: 'failed' });
      throw new Error(`Twilio error: ${err.message}`);
    }

    return msg.reload({
      include: [{ model: Lead, as: 'lead', attributes: ['id', 'first_name', 'last_name', 'phone'] }],
    });
  }

  async getHistory(tenantId: string, leadId?: string): Promise<WhatsAppMessage[]> {
    const where: any = { tenant_id: tenantId };
    if (leadId) where.lead_id = leadId;

    return WhatsAppMessage.findAll({
      where,
      include: [
        { model: Lead, as: 'lead', attributes: ['id', 'first_name', 'last_name', 'phone'] },
        { model: User, as: 'rep', attributes: ['id', 'first_name', 'last_name'] },
      ],
      order: [['created_at', 'DESC']],
      limit: 200,
    });
  }

  async handleInbound(fromNumber: string, toNumber: string, body: string, messageSid: string): Promise<void> {
    const cleanFrom = fromNumber.replace('whatsapp:', '');
    const cleanTo = toNumber.replace('whatsapp:', '');

    const cfg = await TenantPhoneConfig.findOne({ where: { whatsapp_phone_number: cleanTo } });
    if (!cfg) return;

    const lead = await Lead.findOne({ where: { tenant_id: cfg.tenant_id, phone: cleanFrom } });

    const OPT_OUT = ['stop', 'unsubscribe', 'optout', 'opt out', 'opt-out', 'cancel', 'quit'];
    const isOptOut = OPT_OUT.some((k) => body.toLowerCase().trim().startsWith(k));

    if (isOptOut && lead) {
      await lead.update({ whatsapp_opted_out: true, whatsapp_opted_in: false });
    }

    await WhatsAppMessage.create({
      tenant_id: cfg.tenant_id,
      lead_id: lead?.id,
      direction: 'inbound',
      from_number: cleanFrom,
      to_number: cleanTo,
      body,
      status: 'received',
      twilio_message_sid: messageSid,
      is_opt_out: isOptOut,
    });

    emitToTenant(cfg.tenant_id, 'whatsapp_received', {
      lead_id: lead?.id,
      body,
      from: cleanFrom,
      is_opt_out: isOptOut,
    });
  }
}
