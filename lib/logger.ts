import fs from 'fs';
import path from 'path';
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import type { NextApiRequest } from 'next';

const LOG_DIR = path.join(process.cwd(), 'logs');

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR);
}

const transport = new DailyRotateFile({
  filename: path.join(LOG_DIR, 'app-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: false,
  maxSize: '20m',
  // maxFiles: '14d' // We will handle deletion with a custom scheduler as requested
});

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`)
  ),
  transports: [
    transport
    // new winston.transports.Console() // Removed to avoid duplicate logs since we call originalLog
  ]
});

// Function to override console methods
export const initLogger = () => {
  // Only run on server
  if (typeof window === 'undefined') {
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    console.log = (...args) => {
      const msg = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ');
      logger.info(msg);
      originalLog.apply(console, args);
    };

    console.error = (...args) => {
      const msg = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ');
      logger.error(msg);
      originalError.apply(console, args);
    };

    console.warn = (...args) => {
      const msg = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ');
      logger.warn(msg);
      originalWarn.apply(console, args);
    };
  }
};

function safeJsonStringify(value: unknown): string {
  const seen = new WeakSet<object>();
  try {
    return JSON.stringify(value, (_key, v) => {
      if (typeof v === 'bigint') return v.toString();
      if (typeof v === 'object' && v !== null) {
        if (seen.has(v as object)) return '[Circular]';
        seen.add(v as object);
      }
      return v;
    });
  } catch {
    return String(value);
  }
}

export function getClientIp(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  const realIp = req.headers['x-real-ip'];

  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }

  if (typeof realIp === 'string') {
    return realIp;
  }

  return req.socket.remoteAddress || '127.0.0.1';
}

export type ActionLog = {
  action: string;
  outcome: 'success' | 'denied' | 'error';
  actor?: {
    email?: string;
    name?: string | null;
    role?: string;
  };
  target?: {
    type: string;
    id?: string;
  };
  ip?: string;
  userAgent?: string;
  meta?: Record<string, unknown>;
  error?: string;
};

export function logAction(entry: ActionLog) {
  logger.info(safeJsonStringify(entry));
}

export default logger;
