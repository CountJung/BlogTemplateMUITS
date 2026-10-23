import path from 'path';
import { ViewTracker, ViewRecord } from '../types/blog';
import { atomicWriteJson, readJsonFile, withStoreLock } from './storage';

const viewsFilePath = path.join(process.cwd(), 'data', 'views', 'views.json');
function getViewTracker(): ViewTracker {
  const tracker = readJsonFile<ViewTracker>(viewsFilePath, () => ({}));
  if (!tracker || typeof tracker !== 'object' || Array.isArray(tracker)) throw new Error('Invalid views database');
  return tracker;
}
export function getPostViewRecords(postId: string): ViewRecord[] {
  const tracker = getViewTracker();
  return Object.prototype.hasOwnProperty.call(tracker, postId) ? tracker[postId] : [];
}
function matchesRecent(records: ViewRecord[], ip: string, userId?: string): boolean {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  return records.some(record => Date.parse(record.timestamp) >= cutoff && ((!!userId && record.userId === userId) || record.ip === ip));
}
export function hasViewed(postId: string, ip: string, userId?: string): boolean {
  return matchesRecent(getPostViewRecords(postId), ip, userId);
}
export function addViewRecord(postId: string, ip: string, userId?: string): { success: boolean; error?: string } {
  try {
    return withStoreLock(() => {
      const tracker = getViewTracker();
      const records = Object.prototype.hasOwnProperty.call(tracker, postId) ? tracker[postId] : [];
      if (matchesRecent(records, ip, userId)) return { success: false, error: 'Already viewed' };
      const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
      const record: ViewRecord = { postId, ip, ...(userId ? { userId } : {}), timestamp: new Date().toISOString() };
      Object.defineProperty(tracker, postId, { value: [...records.filter(item => Date.parse(item.timestamp) >= cutoff), record], enumerable: true, writable: true, configurable: true });
      atomicWriteJson(viewsFilePath, tracker);
      return { success: true };
    });
  } catch (error) { console.error('Error adding view record:', error); return { success: false, error: 'Failed to add view record' }; }
}
export function getUniqueViewCount(postId: string): number {
  return new Set(getPostViewRecords(postId).map(record => record.ip)).size;
}
export function cleanupOldRecords(): void {
  withStoreLock(() => {
    const tracker = getViewTracker();
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    for (const id of Object.keys(tracker)) {
      tracker[id] = tracker[id].filter(record => Date.parse(record.timestamp) >= cutoff);
      if (!tracker[id].length) delete tracker[id];
    }
    atomicWriteJson(viewsFilePath, tracker);
  });
}
