/**
 * logger.js — Structured JSON logging for enterprise production.
 */
const config = require('./config');

const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const currentLevel = LEVELS[config.logLevel] || LEVELS.info;

function formatEntry(level, message, meta = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta,
  };
  if (config.jsonLogs) {
    return JSON.stringify(entry);
  }
  const prefix = `[${entry.timestamp}] [${level.toUpperCase()}]`;
  const metaStr = Object.keys(meta).length ? ' ' + JSON.stringify(meta) : '';
  return `${prefix} ${message}${metaStr}`;
}

function log(level, message, meta) {
  if (LEVELS[level] < currentLevel) return;
  const line = formatEntry(level, message, meta);
  if (level === 'error') {
    process.stderr.write(line + '\n');
  } else {
    process.stdout.write(line + '\n');
  }
}

module.exports = {
  debug: (msg, meta) => log('debug', msg, meta),
  info: (msg, meta) => log('info', msg, meta),
  warn: (msg, meta) => log('warn', msg, meta),
  error: (msg, meta) => log('error', msg, meta),
  child: (baseMeta) => ({
    debug: (msg, meta) => log('debug', msg, { ...baseMeta, ...meta }),
    info: (msg, meta) => log('info', msg, { ...baseMeta, ...meta }),
    warn: (msg, meta) => log('warn', msg, { ...baseMeta, ...meta }),
    error: (msg, meta) => log('error', msg, { ...baseMeta, ...meta }),
  }),
};