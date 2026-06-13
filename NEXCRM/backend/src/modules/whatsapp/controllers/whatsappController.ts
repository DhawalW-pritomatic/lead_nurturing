import { Response } from 'express';
import { AuthRequest } from '../../../middleware/auth';
import { WhatsAppService } from '../services/whatsappService';

const whatsappService = new WhatsAppService();

export const sendMessage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user!.tenant_id;
    const repId = req.user!.id;
    const { lead_id, body, template_id } = req.body;
    const msg = await whatsappService.send(tenantId, lead_id, repId, body, template_id);
    res.json(msg);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const getHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user!.tenant_id;
    const leadId = req.query.lead_id as string | undefined;
    const msgs = await whatsappService.getHistory(tenantId, leadId);
    res.json(msgs);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};
