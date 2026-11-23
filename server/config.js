/**
 * config.js — Environment-based configuration with validation.
 * Centralizes all configuration for the enterprise production tool.
 */
const path = require('path');
const ROOT = path.join(__dirname, '..');

const config = {
  // Server
  port: parseInt(process.env.PORT || '4173', 10),
  host: process.env.HOST || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'production',

  // Database
  dbFile: process.env.NSPECTOR_DB || '/tmp/nspector.db',
  dataDir: process.env.NSPECTOR_DATA || path.join(ROOT, 'data'),

  // AMAYA
  amayaDir: process.env.AMAYA_DIR || path.join(ROOT, 'vendor', 'amaya'),

  // Security
  corsOrigins: (process.env.CORS_ORIGINS || '*').split(',').map(s => s.trim()),
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  apiRateLimitMax: parseInt(process.env.API_RATE_LIMIT_MAX || '30', 10),

  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',
  jsonLogs: process.env.JSON_LOGS !== 'false',

  // Features
  enableMetrics: process.env.ENABLE_METRICS !== 'false',
  enableAuditLog: process.env.ENABLE_AUDIT_LOG !== 'false',
  maxRequestSize: process.env.MAX_REQUEST_SIZE || '2mb',

  // Version
  version: require('../package.json').version,
  appName: require('../package.json').productName || 'AMAYA × NSpector',
};

// Validate required config
function validate() {
  const errors = [];
  if (isNaN(config.port) || config.port < 1 || config.port > 65535) {
    errors.push('PORT must be a valid port number (1-65535)');
  }
  if (!config.dataDir) errors.push('NSPECTOR_DATA is required');
  if (!config.amayaDir) errors.push('AMAYA_DIR is required');
  if (errors.length) {
    console.error('[config] Configuration errors:');
    errors.forEach(e => console.error('  - ' + e));
    process.exit(1);
  }
}

validate();

module.exports = config;