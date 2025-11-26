import type { NextApiRequest, NextApiResponse } from 'next';
import { getSystemSettings, updateSystemSettings } from '../../../lib/settings';
import { initScheduler } from '../../../lib/scheduler';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const settings = getSystemSettings();
    res.status(200).json(settings);
  } else if (req.method === 'POST') {
    try {
      const { logRetentionDays, scheduler } = req.body;
      
      // Basic validation
      if (typeof logRetentionDays !== 'number' || logRetentionDays < 1) {
        return res.status(400).json({ message: 'Invalid logRetentionDays' });
      }
      
      if (!scheduler || typeof scheduler !== 'object') {
        return res.status(400).json({ message: 'Invalid scheduler settings' });
      }

      const { hour, minute, second } = scheduler;
      if (typeof hour !== 'number' || hour < 0 || hour > 23) {
         return res.status(400).json({ message: 'Invalid hour' });
      }
      if (typeof minute !== 'number' || minute < 0 || minute > 59) {
         return res.status(400).json({ message: 'Invalid minute' });
      }
      if (typeof second !== 'number' || second < 0 || second > 59) {
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
