/**
 * audit.js — Persistent audit trail for enterprise compliance.
 * Tracks all mutations, access, and system events.
 */
const db = require('./db');

let auditTableReady = false;

function ensureTable(database) {
  if (auditTableReady) return;
  try {
    database.exec(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        action TEXT NOT NULL,
        entity TEXT,
        entityId TEXT,
        user TEXT,
        ip TEXT,
        requestId TEXT,
        details TEXT,
        severity TEXT DEFAULT 'info'
      );
      CREATE INDEX IF NOT EXISTS ix_audit_ts ON audit_log(timestamp);
      CREATE INDEX IF NOT EXISTS ix_audit_action ON audit_log(action);
      CREATE INDEX IF NOT EXISTS ix_audit_user ON audit_log(user);
    `);
    auditTableReady = true;
  } catch (e) {
    // Table might already exist
    auditTableReady = true;
  }
}

function log(database, action, details = {}) {
  try {
    ensureTable(database);
    const stmt = database.prepare(`INSERT INTO audit_log (timestamp, action, entity, entityId, user, ip, requestId, details, severity) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    stmt.run(
      new Date().toISOString(),
      action,
      details.entity || null,
      details.entityId || null,
      details.user || 'system',
      details.ip || null,
      details.requestId || null,
      JSON.stringify(details),
      details.severity || 'info'
    );
  } catch (e) {
    console.error('[audit] Failed to log:', e.message);
  }
}

function query(database, filters = {}) {
  ensureTable(database);
  let sql = 'SELECT * FROM audit_log WHERE 1=1';
  const params = [];
  if (filters.action) { sql += ' AND action=?'; params.push(filters.action); }
  if (filters.user) { sql += ' AND user=?'; params.push(filters.user); }
  if (filters.entity) { sql += ' AND entity=?'; params.push(filters.entity); }
  if (filters.since) { sql += ' AND timestamp >= ?'; params.push(filters.since); }
  sql += ' ORDER BY timestamp DESC';
  const limit = Math.min(parseInt(filters.limit || '100', 10), 1000);
  sql += ' LIMIT ?';
  params.push(limit);
  return database.prepare(sql).all(...params);
}

module.exports = { log, query, ensureTable };