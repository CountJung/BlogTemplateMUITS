import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import fs from 'fs';
import path from 'path';

const LOG_DIR = path.join(process.cwd(), 'logs');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req });

  if (!session || !(session as any).isAdmin) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  if (req.method === 'GET') {
    try {
      if (!fs.existsSync(LOG_DIR)) {
        return res.status(200).json({ files: [] });
      }

      const files = fs.readdirSync(LOG_DIR)
        .filter(file => file.endsWith('.log') || file.endsWith('.log.gz'))
        .map(file => {
          const filePath = path.join(LOG_DIR, file);
          const stats = fs.statSync(filePath);
          return {
            name: file,
            size: stats.size,
            mtime: stats.mtime,
          };
        })
        .sort((a, b) => b.mtime.getTime() - a.mtime.getTime()); // Sort by newest first

      res.status(200).json({ files });
    } catch (error) {
      console.error('Error reading log directory:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
