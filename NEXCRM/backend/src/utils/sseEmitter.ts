import { Response } from 'express';

// tenantId -> set of open SSE response streams
const clients = new Map<string, Set<Response>>();

export function addSseClient(tenantId: string, res: Response): void {
  if (!clients.has(tenantId)) clients.set(tenantId, new Set());
  clients.get(tenantId)!.add(res);
}

export function removeSseClient(tenantId: string, res: Response): void {
  clients.get(tenantId)?.delete(res);
}

export function emitToTenant(tenantId: string, event: string, data: object): void {
  const tenantClients = clients.get(tenantId);
  if (!tenantClients || tenantClients.size === 0) return;
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  tenantClients.forEach((res) => {
    try {
      res.write(payload);
      // Force immediate flush — prevents buffering by compression middleware or Node internals
      (res as any).flush?.();
    } catch { /* client disconnected */ }
  });
}
