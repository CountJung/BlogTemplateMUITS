import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import mime from 'mime-types';
import { pipeline } from 'stream/promises';
import { resolveUpload } from '../../../lib/uploads';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
  }
  const parts = req.query.path;
  if (!Array.isArray(parts)) return res.status(400).json({ message: '파일 경로가 필요합니다.' });
  try {
    const file = resolveUpload(parts.join('/'));
    if (!file) return res.status(404).json({ message: '파일을 찾을 수 없습니다.' });
    const mimeType = mime.lookup(file) || 'application/octet-stream';
    const inline = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(mimeType) && req.query.download !== 'true';
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', fs.statSync(file).size);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox; frame-ancestors 'none'");
    res.setHeader('Cache-Control', 'public, max-age=3600');
    const name = encodeURIComponent(path.basename(file)).replace(/['()*]/g, c => `%${c.charCodeAt(0).toString(16)}`);
    res.setHeader('Content-Disposition', `${inline ? 'inline' : 'attachment'}; filename="download"; filename*=UTF-8''${name}`);
    await pipeline(fs.createReadStream(file), res);
  } catch (error) {
    console.error('File serving error:', error);
    if (!res.headersSent) return res.status(500).json({ message: '파일 서빙 중 오류가 발생했습니다.' });
    res.destroy();
  }
}
