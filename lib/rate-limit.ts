import { createHash } from 'crypto';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getClientIp } from './client-ip';

type Bucket = { count: number; expires: number };
export function createRateLimiter(now = Date.now, maxEntries = 10000) {
  const buckets = new Map<string, Bucket>();
  return (key: string, limit: number, windowMs: number) => {
    const time = now();
    // Bound memory without discarding live buckets, which would let rotating clients reset limits.
    for (const [id, bucket] of buckets) if (bucket.expires <= time) buckets.delete(id);
    let bucket = buckets.get(key);
    if (!bucket) {
      if (buckets.size >= maxEntries) return { allowed: false, retryAfter: Math.max(1, Math.ceil(windowMs / 1000)) };
      bucket = { count: 0, expires: time + windowMs }; buckets.set(key, bucket);
    }
    const allowed = bucket.count < limit;
    if (allowed) bucket.count++;
    return { allowed, retryAfter: Math.max(1, Math.ceil((bucket.expires - time) / 1000)) };
  };
}
const shared = globalThis as typeof globalThis & { __blogRequestLimiter?: ReturnType<typeof createRateLimiter> };
const consume = shared.__blogRequestLimiter ||= createRateLimiter();
const defaults = { VIEW: 240, FILE: 240, COMMENT_READ: 240, COMMENT_WRITE: 30, UPLOAD: 60, POST_WRITE: 60 };
function configured(value: string | undefined, fallback: number, maximum: number): number {
  return value && /^\d+$/.test(value) && Number(value) >= 1 && Number(value) <= maximum ? Number(value) : fallback;
}
export function allowRequest(req: NextApiRequest, res: NextApiResponse, scope: keyof typeof defaults, actor?: string): boolean {
  const identity = createHash('sha256').update(actor || getClientIp(req)).digest('hex');
  const windowMs = configured(process.env.RATE_LIMIT_WINDOW_MS, 60000, 3600000);
  const limit = configured(process.env[`RATE_LIMIT_${scope}_MAX`], defaults[scope], 100000);
  const result = consume(`${scope}:${actor ? 'account' : 'ip'}:${identity}`, limit, windowMs);
  if (result.allowed) return true;
  res.setHeader('Retry-After', String(result.retryAfter));
  res.setHeader('Cache-Control', 'private, no-store');
  res.status(429).json({ success: false, message: 'Too many requests. Please retry later.' });
  return false;
}
