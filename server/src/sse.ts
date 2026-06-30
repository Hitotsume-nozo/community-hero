import { Response } from 'express';

type Client = { id: string; res: Response };
const clients: Client[] = [];

export function addClient(id: string, res: Response): void {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();
  res.write(`event: hello\ndata: ${JSON.stringify({ ok: true })}\n\n`);
  clients.push({ id, res });
}

export function removeClient(id: string): void {
  const i = clients.findIndex((c) => c.id === id);
  if (i >= 0) clients.splice(i, 1);
}

export function broadcast(event: string, payload: unknown): void {
  const data = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const c of clients) {
    try { c.res.write(data); } catch { /* dropped client */ }
  }
}

// keep-alive ping so proxies don't close idle connections
setInterval(() => broadcast('ping', { t: Date.now() }), 25000).unref?.();
