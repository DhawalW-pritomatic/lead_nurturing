import { Router, Request, Response } from 'express';

const router = Router();

// Placeholder routes — no longer used since we switched to manual call logging
router.post('/voice/inbound', (_req: Request, res: Response) => {
  res.set('Content-Type', 'text/xml');
  res.send('<Response><Say>This number is not in service.</Say></Response>');
});

router.post('/voice/bridge', (_req: Request, res: Response) => {
  res.sendStatus(204);
});

router.post('/voice/status', (_req: Request, res: Response) => {
  res.sendStatus(204);
});

export default router;
