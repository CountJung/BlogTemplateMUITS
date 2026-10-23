import { atomicWriteText, withStoreLock } from '../../../lib/storage';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { getUserPermissions } from '../../../lib/admin';
import { isAllowedMutation } from '../../../lib/request-security';
import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

const ENV_PATH = path.join(process.cwd(), '.env');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    if (!isAllowedMutation(req)) return res.status(403).json({ message: 'Forbidden origin' });
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.email) return res.status(401).json({ message: '로그인이 필요합니다.' });
    if (!getUserPermissions(session.user.email).canDelete) return res.status(403).json({ message: '관리자 권한이 필요합니다.' });
  }
  if (req.method === 'GET') {
    try {
      let language = 'ko';
      if (fs.existsSync(ENV_PATH)) {
        const envContent = fs.readFileSync(ENV_PATH, 'utf8');
        const match = envContent.match(/NEXT_PUBLIC_LANGUAGE=(ko|en)/);
        if (match) {
          language = match[1];
        }
      }
      res.status(200).json({ language });
    } catch (error) {
      console.error('Error reading env file:', error);
      res.status(500).json({ error: 'Failed to read settings' });
    }
  } else if (req.method === 'POST') {
    try {
      const { language } = req.body || {};
      if (language !== 'ko' && language !== 'en') {
        return res.status(400).json({ error: 'Invalid language' });
      }

      withStoreLock(() => {
        let envContent = '';
        if (fs.existsSync(ENV_PATH)) {
          envContent = fs.readFileSync(ENV_PATH, 'utf8');
        }

        if (envContent.includes('NEXT_PUBLIC_LANGUAGE=')) {
          envContent = envContent.replace(/NEXT_PUBLIC_LANGUAGE=(ko|en)/, `NEXT_PUBLIC_LANGUAGE=${language}`);
        } else {
          envContent += `\nNEXT_PUBLIC_LANGUAGE=${language}\n`;
        }

        atomicWriteText(ENV_PATH, envContent);
      });
      res.status(200).json({ success: true, language });
    } catch (error) {
      console.error('Error writing env file:', error);
      res.status(500).json({ error: 'Failed to save settings' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
