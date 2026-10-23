import { isIP } from 'net';
import type { NextApiRequest } from 'next';

function normalize(value: string): string {
  const ip = value.trim().toLowerCase();
  return ip.startsWith('::ffff:') && isIP(ip.slice(7)) === 4 ? ip.slice(7) : ip;
}

// Forwarded headers are trusted only behind an explicitly configured chain.
export function getClientIp(req: NextApiRequest): string {
  const peer = normalize(req.socket?.remoteAddress || '');
  const fallback = isIP(peer) ? peer : 'unknown';
  const hopsText = process.env.TRUST_PROXY_HOPS || '0';
  if (!/^[1-5]$/.test(hopsText)) return fallback;
  const trusted = new Set((process.env.TRUSTED_PROXY_IPS || '').split(',').map(normalize).filter(ip => isIP(ip)));
  if (!trusted.has(peer)) return fallback;
  const header = req.headers['x-forwarded-for'];
  if (typeof header !== 'string' || header.length > 1024) return fallback;
  const chain = header.split(',').map(normalize).concat(peer);
  const hops = Number(hopsText);
  if (chain.length > 21 || chain.length <= hops || chain.some(ip => !isIP(ip))) return fallback;
  for (let i = chain.length - hops; i < chain.length; i++) if (!trusted.has(chain[i])) return fallback;
  return chain[chain.length - hops - 1];
}
