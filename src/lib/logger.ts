/**
 * Centralized Logger for SCM Kaos Kami
 * Persists critical errors beyond console.error which disappears in serverless.
 * 
 * Usage:
 *   import { logger } from '@/lib/logger';
 *   logger.error('ORDER_CREATE', error, { orderId, userId });
 *   logger.warn('LOW_STOCK', { productId, currentStock });
 *   logger.info('BOT_ACTION', { action, chatId });
 */

type LogLevel = 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  category: string;
  message: string;
  data?: Record<string, any>;
  timestamp: string;
  source: string;
}

// In-memory buffer — survives within a single serverless invocation
const LOG_BUFFER: LogEntry[] = [];
const MAX_BUFFER_SIZE = 100;

function createEntry(level: LogLevel, category: string, msgOrErr: string | Error, data?: Record<string, any>): LogEntry {
  const message = msgOrErr instanceof Error
    ? `${msgOrErr.message}\n${msgOrErr.stack}`
    : msgOrErr;

  return {
    level,
    category,
    message,
    data,
    timestamp: new Date().toISOString(),
    source: typeof window === 'undefined' ? 'server' : 'client',
  };
}

function addToBuffer(entry: LogEntry) {
  LOG_BUFFER.push(entry);
  if (LOG_BUFFER.length > MAX_BUFFER_SIZE) LOG_BUFFER.shift();
}

export const logger = {
  info(category: string, messageOrData: string | Record<string, any>, data?: Record<string, any>) {
    const msg = typeof messageOrData === 'string' ? messageOrData : JSON.stringify(messageOrData);
    const extra = typeof messageOrData === 'object' ? messageOrData : data;
    const entry = createEntry('info', category, msg, extra);
    addToBuffer(entry);
    console.log(`[INFO][${category}] ${msg}`, extra || '');
  },

  warn(category: string, messageOrData: string | Record<string, any>, data?: Record<string, any>) {
    const msg = typeof messageOrData === 'string' ? messageOrData : JSON.stringify(messageOrData);
    const extra = typeof messageOrData === 'object' ? messageOrData : data;
    const entry = createEntry('warn', category, msg, extra);
    addToBuffer(entry);
    console.warn(`[WARN][${category}] ${msg}`, extra || '');
  },

  error(category: string, error: string | Error, data?: Record<string, any>) {
    const entry = createEntry('error', category, error, data);
    addToBuffer(entry);
    console.error(`[ERROR][${category}]`, error, data || '');
    // Future: Sentry.captureException(error) or DB insert
  },

  getRecentLogs(limit: number = 50): LogEntry[] {
    return LOG_BUFFER.slice(-limit);
  },

  getRecentErrors(limit: number = 20): LogEntry[] {
    return LOG_BUFFER.filter(e => e.level === 'error').slice(-limit);
  },
};

// Backward-compatible exports
export function logError(error: any, context: string) { logger.error(context, error); }
export function logInfo(message: string, context: string) { logger.info(context, message); }
