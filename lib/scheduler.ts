import cron from 'node-cron';
import fs from 'fs';
import path from 'path';
import { getSystemSettings } from './settings';

const LOG_DIR = path.join(process.cwd(), 'logs');

let currentTask: ReturnType<typeof cron.schedule> | null = null;

export const initScheduler = () => {
  const settings = getSystemSettings();
  const { scheduler } = settings;

  // Generate cron expression from settings
  // Logic:
  // If hour > 0: Run every X hours at minute M and second S
  // Else if minute > 0: Run every X minutes at second S
  // Else if second > 0: Run every X seconds
  // Default: Run every hour (0 * * * *) if all are 0 (or fallback)
  
  let cronExpression = '0 * * * *'; // Default
  
  const { hour, minute, second } = scheduler;

  if (hour > 0) {
    cronExpression = `${second} ${minute} */${hour} * * *`;
  } else if (minute > 0) {
    cronExpression = `${second} */${minute} * * * *`;
  } else if (second > 0) {
    cronExpression = `*/${second} * * * * *`;
  } else {
    // If all are 0, maybe default to hourly? Or daily at 00:00:00?
    // Let's stick to hourly default if user inputs 0,0,0 which is weird.
    // Or maybe 0 0 0 * * * (Daily at midnight)
    cronExpression = '0 0 0 * * *';
  }

  if (currentTask) {
    currentTask.stop();
    console.log('Stopped existing scheduler task.');
  }

  console.log(`Initializing scheduler with cron: "${cronExpression}" (Settings: H=${hour}, M=${minute}, S=${second})`);

  // Schedule task
  currentTask = cron.schedule(cronExpression, () => {
    console.log('Running log cleanup scheduler...');
    
    if (!fs.existsSync(LOG_DIR)) {
      return;
    }

    // Read settings again to get the latest retention days
    const currentSettings = getSystemSettings();
    const retentionMs = currentSettings.logRetentionDays * 24 * 60 * 60 * 1000;

    fs.readdir(LOG_DIR, (err, files) => {
      if (err) {
        console.error('Error reading log directory:', err);
        return;
      }

      const now = Date.now();

      files.forEach(file => {
        const filePath = path.join(LOG_DIR, file);
        
        // Only process log files
        if (!file.endsWith('.log') && !file.endsWith('.log.gz')) {
            return;
        }

        fs.stat(filePath, (err, stats) => {
          if (err) {
            console.error(`Error getting stats for file ${file}:`, err);
            return;
          }

          if (now - stats.mtimeMs > retentionMs) {
            fs.unlink(filePath, (err) => {
              if (err) {
                console.error(`Error deleting file ${file}:`, err);
              } else {
                console.log(`Deleted old log file: ${file}`);
              }
            });
          }
        });
      });
    });
  });
  
  console.log('Log cleanup scheduler initialized.');
};
