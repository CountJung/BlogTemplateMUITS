import path from 'path';
import { atomicWriteJson, readJsonFile, withStoreLock } from './storage';

const SETTINGS_FILE = path.join(process.cwd(), 'data', 'settings.json');

export interface SchedulerSettings {
  hour: number;
  minute: number;
  second: number;
}

export interface SystemSettings {
  logRetentionDays: number;
  scheduler: SchedulerSettings;
}

export const defaultSettings: SystemSettings = {
  logRetentionDays: 10,
  scheduler: {
    hour: 1,
    minute: 0,
    second: 0
  }
};

export function getSystemSettings(): SystemSettings {
  return readJsonFile<SystemSettings>(SETTINGS_FILE, () => structuredClone(defaultSettings));
}

export function updateSystemSettings(settings: Partial<SystemSettings>): SystemSettings {
  return withStoreLock(() => {
    const newSettings = { ...getSystemSettings(), ...settings };
    atomicWriteJson(SETTINGS_FILE, newSettings);
    return newSettings;
  });
}
