import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';
import { getUserPermissions } from '../../../../lib/admin';
import fs from 'fs';
import path from 'path';

const LOG_DIR = path.join(process.cwd(), 'logs');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session?.user?.email || !getUserPermissions(session.user.email).canDelete) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const { filename } = req.query;

  if (typeof filename !== 'string') {
    return res.status(400).json({ message: 'Invalid filename' });
  }

  // Prevent directory traversal
  const safeFilename = path.basename(filename);
  const filePath = path.join(LOG_DIR, safeFilename);

  if (req.method === 'GET') {
    try {
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: 'File not found' });
      }

      const content = fs.readFileSync(filePath, 'utf8');
      res.status(200).json({ content });
    } catch (error) {
      console.error('Error reading log file:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
