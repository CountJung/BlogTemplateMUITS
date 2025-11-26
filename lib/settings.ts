import fs from 'fs';
import path from 'path';

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
  try {
    if (!fs.existsSync(SETTINGS_FILE)) {
      return defaultSettings;
    }
    const data = fs.readFileSync(SETTINGS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading settings:', error);
    return defaultSettings;
  }
}

export function updateSystemSettings(settings: Partial<SystemSettings>): SystemSettings {
  const currentSettings = getSystemSettings();
  const newSettings = { ...currentSettings, ...settings };
  
  try {
    // Ensure data directory exists
    const dir = path.dirname(SETTINGS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(newSettings, null, 2));
    return newSettings;
  } catch (error) {
    console.error('Error writing settings:', error);
    throw error;
  }
}
