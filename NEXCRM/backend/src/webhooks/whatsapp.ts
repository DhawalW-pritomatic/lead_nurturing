import { Router, Request, Response } from 'express';
import { WhatsAppService } from '../modules/whatsapp/services/whatsappService';

const router = Router();
const waService = new WhatsAppService();

// Inbound WhatsApp message from Twilio
router.post('/inbound', async (req: Request, res: Response) => {
  try {
    const { From, To, Body, MessageSid } = req.body;
    await waService.handleInbound(From, To, Body || '', MessageSid);
  } catch (_) {
    // Non-critical
  }
  // Twilio expects a 200 or TwiML response
  res.set('Content-Type', 'text/xml');
  res.send('<Response></Response>');
});

export default router;
