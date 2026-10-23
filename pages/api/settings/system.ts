import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { getUserPermissions } from '../../../lib/admin';
import { isAllowedMutation } from '../../../lib/request-security';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getSystemSettings, updateSystemSettings } from '../../../lib/settings';
import { initScheduler } from '../../../lib/scheduler';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    if (!isAllowedMutation(req)) return res.status(403).json({ message: 'Forbidden origin' });
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.email) return res.status(401).json({ message: '로그인이 필요합니다.' });
    if (!getUserPermissions(session.user.email).canDelete) return res.status(403).json({ message: '관리자 권한이 필요합니다.' });
  }
  if (req.method === 'GET') {
    const settings = getSystemSettings();
    res.status(200).json(settings);
  } else if (req.method === 'POST') {
    try {
      const { logRetentionDays, scheduler } = req.body || {};
      
      // Basic validation
      if (!Number.isSafeInteger(logRetentionDays) || logRetentionDays < 1 || logRetentionDays > 3650) {
        return res.status(400).json({ message: 'Invalid logRetentionDays' });
      }
      
      if (!scheduler || typeof scheduler !== 'object') {
        return res.status(400).json({ message: 'Invalid scheduler settings' });
      }

      const { hour, minute, second } = scheduler;
      if (!Number.isSafeInteger(hour) || hour < 0 || hour > 23) {
         return res.status(400).json({ message: 'Invalid hour' });
      }
      if (!Number.isSafeInteger(minute) || minute < 0 || minute > 59) {
         return res.status(400).json({ message: 'Invalid minute' });
      }
      if (!Number.isSafeInteger(second) || second < 0 || second > 59) {
         return res.status(400).json({ message: 'Invalid second' });
      }

      const newSettings = updateSystemSettings({ 
        logRetentionDays, 
        scheduler: { hour, minute, second } 
      });
      
      // Re-initialize scheduler with new settings
      // Note: This works if the API and the scheduler are running in the same process (e.g. custom server or next start)
      try {
        initScheduler();
      } catch (e) {
        console.error('Failed to re-initialize scheduler:', e);
        // We don't fail the request, but we log the error
      }

      res.status(200).json(newSettings);
    } catch (error) {
      console.error('Error updating settings:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
