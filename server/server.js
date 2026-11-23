/**
 * server.js — unified REST API + WebSocket live sync for the combo suite.
 *
 * Enterprise production version with:
 * - Security headers, rate limiting, compression
 * - Structured JSON logging with request IDs
 * - Input validation and sanitization
 * - Graceful shutdown and health checks
 * - Audit logging for mutations
 * - Metrics endpoint
 */
const config = require('./config');
const logger = require('./logger');
const zlib = require('zlib');

const fs = require('fs');
const path = require('path');
const http = require('http');
const express = require('express');
const cors = require('cors');
const { WebSocketServer } = require('ws');
const dbm = require('./db');
const sync = require('./sync');
const core = require('./core');
const amaya = require('./amaya');
const auth = require('./auth');
const cache = require('./cache');
const audit = require('./audit');

const ROOT = path.join(__dirname, '..');
const WEB = path.join(ROOT, 'web');
const DATA = config.dataDir;
const DBFILE = config.dbFile;
const AMAYA_DIR = config.amayaDir;

// ---------- Security: Rate Limiter ----------
const rateLimitStore = new Map();
function rateLimit(windowMs, max) {
  return (req, res, next) => {
    const key = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    let entry = rateLimitStore.get(key);
    if (!entry || now - entry.start > windowMs) {
      entry = { start: now, count: 0 };
      rateLimitStore.set(key, entry);
    }
    entry.count++;
    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - entry.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil((entry.start + windowMs) / 1000));
    if (entry.count > max) {
      logger.warn('Rate limit exceeded', { ip: key, path: req.path });
      return res.status(429).json({
        error: 'Too many requests',
        retryAfter: Math.ceil((entry.start + windowMs - now) / 1000),
      });
    }
    next();
  };
}

// Cleanup rate limit store periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore) {
    if (now - entry.start > config.rateLimitWindowMs * 2) {
      rateLimitStore.delete(key);
    }
  }
}, 60000);

// ---------- Security: Headers ----------
function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (config.nodeEnv === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
}

// ---------- Request ID & Logging ----------
function requestId(req, res, next) {
  const id = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  req.requestId = id;
  res.setHeader('X-Request-ID', id);
  next();
}

function requestLogger(req, res, next) {
  const start = Date.now();
  const log = logger.child({ requestId: req.requestId });
  req.log = log;

  res.on('finish', () => {
    const duration = Date.now() - start;
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
    log[level]('request', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
    });
  });
  next();
}

// ---------- Input Validation ----------
function sanitizeInput(str) {
  if (typeof str !== 'string') return str;
  return str.trim().replace(/[<>]/g, '');
}

function validateSerial(req, res, next) {
  const serial = req.params.serial || req.query.q || '';
  if (serial && !/^[A-Za-z0-9\-_]{1,64}$/.test(serial)) {
    return res.status(400).json({ error: 'Invalid serial format', requestId: req.requestId });
  }
  next();
}

// ---------- Compression ----------
function compressionMiddleware(req, res, next) {
  const acceptEncoding = req.headers['accept-encoding'] || '';
  if (!acceptEncoding.includes('gzip')) return next();

  const originalSend = res.send.bind(res);
  const originalJson = res.json.bind(res);

  res.send = function (body) {
    if (typeof body === 'string' && body.length > 1024) {
      const gzipped = zlib.gzipSync(body);
      res.setHeader('Content-Encoding', 'gzip');
      res.setHeader('Content-Length', gzipped.length);
      return originalSend(gzipped);
    }
    return originalSend(body);
  };

  res.json = function (obj) {
    const body = JSON.stringify(obj);
    if (body.length > 1024) {
      const gzipped = zlib.gzipSync(body);
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Encoding', 'gzip');
      res.setHeader('Content-Length', gzipped.length);
      return originalSend(gzipped);
    }
    return originalJson(obj);
  };

  next();
}

// ---------- CORS ----------
const corsOptions = {
  origin: config.corsOrigins.includes('*') ? '*' : config.corsOrigins,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  exposedHeaders: ['X-Request-ID', 'X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  credentials: true,
  maxAge: 86400,
};

// ---------- Express App ----------
const db = (() => {
  try {
    const d = dbm.open(DBFILE);
    logger.info('Database opened', { file: DBFILE });
    return d;
  } catch (e) {
    logger.error('Failed to open database', { error: e.message, file: DBFILE });
    process.exit(1);
  }
})();

const app = express();
app.use(securityHeaders);
app.use(requestId);
app.use(requestLogger);
app.use(cors(corsOptions));
app.use(compressionMiddleware);
app.use(express.json({ limit: config.maxRequestSize }));
app.use('/api', rateLimit(config.rateLimitWindowMs, config.rateLimitMax));

// ---------- AMAYA Control Center ----------
let amayaReady = false;
try {
  amaya.load(AMAYA_DIR);
  amayaReady = amaya.stats().ready;
  logger.info('AMAYA loaded', { dir: AMAYA_DIR, ready: amayaReady, assets: amaya.stats().assets });
} catch (e) {
  logger.error('AMAYA load failed', { error: e.message, dir: AMAYA_DIR });
}

app.use('/amaya-imei-control-center', express.static(AMAYA_DIR, {
  index: 'index.html',
  extensions: ['html'],
  setHeaders(res, file) {
    if (/\.html$/i.test(file)) res.setHeader('Cache-Control', 'no-cache');
    if (/\.json$/i.test(file)) res.setHeader('Cache-Control', 'no-cache');
    if (/\.(js|css|woff2|png|jpg|svg|ico)$/i.test(file)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
  },
}));

// ---------- Merged Shell ----------
app.use(express.static(WEB, {
  setHeaders(res, file) {
    if (/\.(html|js|css)$/i.test(file)) {
      res.setHeader('Cache-Control', 'no-cache');
    }
    if (/\.(woff2|png|jpg|svg|ico)$/i.test(file)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
  },
}));

// ---------- WebSocket ----------
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });
const clients = new Set();

function broadcast(msg) {
  const s = JSON.stringify(msg);
  for (const c of clients) {
    if (c.readyState === 1) {
      try { c.send(s); } catch (e) { /* ignore */ }
    }
  }
}

wss.on('connection', ws => {
  clients.add(ws);
  ws.send(JSON.stringify({ type: 'hello', stats: dbm.stats(db), clients: clients.size }));
  ws.on('close', () => clients.delete(ws));
  ws.on('error', () => clients.delete(ws));
  ws.on('message', m => {
    try {
      const d = JSON.parse(m);
      if (d.type === 'ping') ws.send(JSON.stringify({ type: 'pong', t: Date.now() }));
    } catch (e) { /* ignore */ }
  });
});

// ---------- Helpers ----------
const q = (sql, ...a) => db.prepare(sql).all(...a);
const one = (sql, ...a) => db.prepare(sql).get(...a);

function withEvidence(f) {
  if (!f) return f;
  let ev = [], acts = [];
  try { ev = JSON.parse(f.evidence || '[]'); } catch (e) {}
  try { acts = JSON.parse(f.next_actions || '[]'); } catch (e) {}
  if (!acts.length && f.next_action) acts = [f.next_action];
  return Object.assign({}, f, { evidence: ev, next_actions: acts });
}

function inspectSerial(serial) {
  const R = require('./reason');
  const dispatches = q(`SELECT * FROM dispatches WHERE serial=? ORDER BY dt, id`, serial);
  const returns = q(`SELECT * FROM returns WHERE serial=?`, serial);
  const findings = db.prepare('SELECT * FROM findings WHERE serial=?').all(serial).map(withEvidence);

  const book = R.buildPriceBook(db);
  const l = R.luhn(serial);
  const t = R.tac(serial);
  const tacFamilies = t
    ? q(`SELECT family, COUNT(DISTINCT serial) n FROM dispatches WHERE SUBSTR(serial,1,8)=? GROUP BY family ORDER BY n DESC`, t)
    : [];

  let diagnosis = null;
  if (dispatches.length > 1) {
    diagnosis = R.diagnoseDuplicate(dispatches, book);
  } else if (returns.length) {
    const r = returns[0];
    const lock = /lock/i.test(r.reason);
    const diff = /different/i.test(r.reason);
    diagnosis = {
      family: dispatches[0] ? dispatches[0].family : r.family,
      diagnosis: lock
        ? 'The unit came back locked. Either a previous owner account is still attached (FRP), an operator network lock is active, or the mainboard was replaced and written with the wrong serial.'
        : diff
        ? 'The serial on the unit does not match the paperwork, so it cannot be matched to an invoice and must not re-enter stock.'
        : `The unit came back with "${r.reason}". It is not a duplicate serial, so this is a product fault rather than a custody problem.`,
      confidence: lock || diff ? 'high' : 'medium',
      evidence: [
        { label: 'Dispatch trail', detail: `Only ${dispatches.length} dispatch record — the serial is not duplicated.`, weight: 'good' },
        { label: 'Check digit', detail: l === true ? 'Valid, so not a clone or corruption.' : 'Not a 15-digit IMEI, so not applicable.', weight: 'good' },
        { label: 'Logged reason', detail: r.reason, weight: 'bad' },
        { label: 'Consequence', detail: 'Cannot be sold as new until resolved.', weight: 'bad' },
      ],
      nextActions: lock ? [
        'Dial *#06# and compare with the box and the invoice — all three must match.',
        'If it asks for a previous account, only the original owner can release it. Do not attempt a repair.',
        'If one model dominates this list, raise a batch claim with the supplier.',
      ] : diff ? [
        'Photograph the unit and the box label side by side.',
        'Segregate permanently as bad-bin.',
        'Raise a warranty claim rather than writing the unit off.',
      ] : [
        'Raise a warranty claim with the supplier against this serial.',
        'Check whether other units from the same batch show the same fault.',
        'Restock only after repair is confirmed, never straight back into sellable stock.',
      ],
      valueAtRisk: r.price || 0,
    };
  }

  const related = dispatches.length
    ? q(`SELECT COUNT(*) n FROM dispatches WHERE party_key IN (SELECT party_key FROM dispatches WHERE serial=?) AND serial<>?`, serial, serial)[0].n
    : 0;

  return {
    serial, serialKind: R.serialKind(serial), luhn: l, tac: t, tacFamilies,
    dispatches, returns, findings, diagnosis,
    price: book.get(dispatches[0] ? dispatches[0].family : '') || null,
    relatedCount: related,
  };
}

// ---------- API: Authentication ----------
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required', requestId: req.requestId });
  }
  const result = auth.login(username, password);
  if (!result) {
    logger.warn('Login failed', { username, ip: req.ip, requestId: req.requestId });
    return res.status(401).json({ error: 'Invalid credentials', requestId: req.requestId });
  }
  audit.log(db, 'login', { user: username, ip: req.ip, requestId: req.requestId });
  res.json(result);
});

app.post('/api/auth/register', (req, res) => {
  const { username, password, role } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required', requestId: req.requestId });
  }
  const result = auth.register(username, password, role || 'viewer');
  if (result.error) {
    return res.status(400).json({ error: result.error, requestId: req.requestId });
  }
  audit.log(db, 'register', { user: username, role: role || 'viewer', ip: req.ip, requestId: req.requestId });
  res.json(result);
});

app.get('/api/auth/me', auth.authenticate, (req, res) => {
  res.json({ user: req.user });
});

// ---------- API: Health & Stats ----------
app.get('/api/health', (req, res) => {
  const stats = dbm.stats(db);
  res.json({
    ok: true,
    ts: Date.now(),
    version: config.version,
    environment: config.nodeEnv,
    uptime: process.uptime(),
    amaya: amayaReady,
    database: { connected: true, dispatches: stats.dispatches },
    memory: process.memoryUsage(),
  });
});

app.get('/api/stats', (req, res) => {
  const s = dbm.stats(db);
  s.liveClients = clients.size;
  res.json(s);
});

// ---------- API: Overview ----------
app.get('/api/overview', (req, res) => {
  const stats = dbm.stats(db);
  const cod = q(`SELECT ym, COUNT(*) n, SUM(amount) amt, SUM(CASE WHEN is_cod=1 THEN amount ELSE 0 END) cod_amt, SUM(CASE WHEN is_cod=1 THEN 1 ELSE 0 END) cod_n FROM deposits WHERE ym IS NOT NULL GROUP BY ym ORDER BY ym`);
  const dispatch = q(`SELECT substr(dt,1,7) ym, COUNT(*) units FROM dispatches WHERE dt IS NOT NULL GROUP BY ym ORDER BY ym`);
  const dispatchByFamily = q(`SELECT family, COUNT(*) units, COUNT(DISTINCT serial) serials FROM dispatches GROUP BY family ORDER BY units DESC LIMIT 40`);
  const classes = q(`SELECT cls, COUNT(*) units FROM dispatches GROUP BY cls`);
  const dupTop = q(`SELECT d.party_key, d.name, d.units, d.cross_dup, (SELECT COUNT(DISTINCT serial) FROM dispatches x WHERE x.party_key=d.party_key) serials FROM dealers d WHERE d.cross_dup > 0 ORDER BY d.cross_dup DESC LIMIT 25`);
  res.json({ stats, cod, dispatch, dispatchByFamily, classes, dupTop });
});

// ---------- API: Duplicates ----------
app.get('/api/duplicates', (req, res) => {
  const dealer = (req.query.dealer || '').toString().trim();
  const limit = Math.min(parseInt(req.query.limit || '100', 10), 1000);
  const offset = parseInt(req.query.offset || '0', 10);
  const kind = (req.query.kind || 'cross').toString();

  let sql = `SELECT serial, COUNT(*) n, COUNT(DISTINCT party_key) dealers, GROUP_CONCAT(DISTINCT party) parties, GROUP_CONCAT(DISTINCT wing) wings, MIN(sku) sku, MIN(family) family, MIN(dt) first_dt, MAX(dt) last_dt, COUNT(DISTINCT dt) dates FROM dispatches GROUP BY serial HAVING n > 1`;
  const params = [];
  if (kind === 'cross') sql += ' AND dealers > 1';
  if (kind === 'multi') sql += ' AND dealers >= 3';
  sql += ' ORDER BY dealers DESC, n DESC, last_dt DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);
  let rows = q(sql, ...params);

  if (dealer) {
    const k = core.nrm(dealer);
    const filt = rows.filter(r => String(r.parties).split(',').some(p => core.nrm(p) === k));
    const full = q(`SELECT serial, COUNT(*) n, COUNT(DISTINCT party_key) dealers, GROUP_CONCAT(DISTINCT party) parties, GROUP_CONCAT(DISTINCT wing) wings, MIN(sku) sku, MIN(family) family, MIN(dt) first_dt, MAX(dt) last_dt FROM dispatches GROUP BY serial HAVING n > 1 AND dealers > 1`);
    rows = filt;
    const totalForDealer = full.filter(r => String(r.parties).split(',').some(p => core.nrm(p) === k)).length;
    rows.totalForDealer = totalForDealer;
  }
  res.json({ rows, kind, dealer });
});

// ---------- API: IMEI Lookup ----------
app.get('/api/imei/:serial', validateSerial, (req, res) => {
  const s = req.params.serial.trim();
  const recs = q(`SELECT * FROM dispatches WHERE serial=? ORDER BY dt, id`, s);
  const ret = q(`SELECT * FROM returns WHERE serial=?`, s);
  const finding = q(`SELECT * FROM findings WHERE serial=?`, s);
  res.json({ serial: s, found: recs.length > 0, dispatches: recs, returns: ret, findings: finding });
});

// ---------- API: Dealers ----------
app.get('/api/dealers', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit || '200', 10), 2000);
  const search = (req.query.q || '').toString().trim();
  let rows = q(`SELECT d.*, COALESCE((SELECT SUM(amount) FROM deposits p WHERE p.store_key IN (SELECT party_key FROM dealers z WHERE z.name=d.name)),0) paid FROM dealers d ORDER BY d.units DESC LIMIT ?`, limit);
  if (search) {
    const k = core.nrm(search);
    rows = rows.filter(r => core.nrm(r.name).includes(k) || core.nrm(r.aliases || '').includes(k));
  }
  res.json({ rows, total: one('SELECT COUNT(*) c FROM dealers').c });
});

app.get('/api/dealers/:key', (req, res) => {
  const k = req.params.key;
  const d = one('SELECT * FROM dealers WHERE party_key=?', k);
  if (!d) return res.status(404).json({ error: 'Dealer not found', requestId: req.requestId });
  const serials = q(`SELECT serial, sku, family, date, dt, wing, party FROM dispatches WHERE party_key=? ORDER BY dt DESC LIMIT 500`, k);
  const dups = q(`SELECT serial, COUNT(*) n, GROUP_CONCAT(DISTINCT party) parties, MIN(sku) sku, MIN(family) family FROM dispatches WHERE serial IN (SELECT serial FROM dispatches WHERE party_key=?) GROUP BY serial HAVING n > 1`, k);
  const rets = q(`SELECT * FROM returns WHERE merchant_key=? ORDER BY rdate DESC`, k);
  const dep = q(`SELECT COUNT(*) n, SUM(amount) amt FROM deposits WHERE store_key=?`, k);
  const findings = q(`SELECT * FROM findings WHERE dealer LIKE ?`, `%${d.name}%`);
  res.json({ dealer: { ...d, aliases: JSON.parse(d.aliases || '[]') }, serials, duplicates: dups, returns: rets, deposits: dep[0] || { n: 0, amt: 0 }, findings });
});

// ---------- API: Returns ----------
app.get('/api/returns', (req, res) => {
  const family = (req.query.family || '').toString().trim();
  const kind = (req.query.kind || '').toString().trim();
  let rows = q(`SELECT * FROM returns ORDER BY rdate DESC`);
  if (family) rows = rows.filter(r => core.nrm(r.family).includes(core.nrm(family)));
  if (kind === 'imei') rows = rows.filter(r => r.kind === 'IMEI');
  res.json({ rows, total: rows.length });
});

// ---------- API: Risk ----------
app.get('/api/risk', (req, res) => {
  const rows = q(`SELECT family, SUM(1) units, COUNT(DISTINCT serial) serials, COUNT(DISTINCT CASE WHEN serial IN (SELECT serial FROM dispatches GROUP BY serial HAVING COUNT(*)>1) THEN serial END) dup_serials FROM dispatches GROUP BY family`);
  const dupCross = q(`SELECT family, COUNT(DISTINCT serial) n FROM dispatches WHERE serial IN (SELECT serial FROM dispatches GROUP BY serial HAVING COUNT(DISTINCT party_key)>1) GROUP BY family`);
  const crossMap = Object.fromEntries(dupCross.map(r => [r.family, r.n]));
  const locks = q(`SELECT family, COUNT(*) n FROM returns WHERE kind='IMEI' GROUP BY family`);
  const lockMap = Object.fromEntries(locks.map(r => [r.family, r.n]));

  const out = rows.map(r => {
    const dupUnits = r.units - r.serials;
    const dupRate = r.units ? Math.round(dupUnits / r.units * 1000) / 10 : 0;
    const lock = lockMap[r.family] || 0;
    const lockRate = r.units ? Math.round(lock / r.units * 1000) / 10 : 0;
    return { family: r.family, units: r.units, serials: r.serials, dupUnits, crossDup: crossMap[r.family] || 0, dupRate, imeiLock: lock, lockRate, risk: Math.round((dupRate + lock * 8 + lockRate * 10) * 10) / 10 };
  }).filter(r => r.units >= 5).sort((a, b) => b.risk - a.risk);
  res.json({ rows: out });
});

// ---------- API: Findings ----------
app.get('/api/findings', (req, res) => {
  const status = (req.query.status || '').toString().trim();
  const kind = (req.query.kind || '').toString().trim();
  const owner = (req.query.owner || '').toString().trim();
  const severity = (req.query.severity || '').toString().trim();
  const minValue = parseFloat(req.query.minValue || '0') || 0;
  let sql = 'SELECT * FROM findings WHERE 1=1';
  const p = [];
  if (status) { sql += ' AND status=?'; p.push(status); }
  if (kind) { sql += ' AND kind=?'; p.push(kind); }
  if (owner) { sql += ' AND owner=?'; p.push(owner); }
  if (severity) { sql += ' AND severity=?'; p.push(severity); }
  if (minValue) { sql += ' AND value_at_risk >= ?'; p.push(minValue); }
  sql += ` ORDER BY score DESC, CASE severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, updated_at DESC`;
  const limit = Math.min(Math.max(parseInt(req.query.limit || '0', 10) || 0, 0), 2000);
  const offset = Math.max(parseInt(req.query.offset || '0', 10) || 0, 0);
  const params = limit ? [...p, limit, offset] : p;
  if (limit) sql += ' LIMIT ? OFFSET ?';
  const rows = db.prepare(sql).all(...params).map(withEvidence);
  const counts = one(`SELECT SUM(CASE WHEN status='open' THEN 1 ELSE 0 END) open, SUM(CASE WHEN status='investigating' THEN 1 ELSE 0 END) investigating, SUM(CASE WHEN status='resolved' THEN 1 ELSE 0 END) resolved, SUM(CASE WHEN status='dismissed' THEN 1 ELSE 0 END) dismissed, COUNT(*) total, ROUND(SUM(CASE WHEN status='open' THEN value_at_risk ELSE 0 END)) open_value FROM findings`);
  const byOwner = q(`SELECT owner, status, COUNT(*) n FROM findings GROUP BY owner, status ORDER BY n DESC`);
  res.json({ rows, counts, byOwner });
});

app.get('/api/findings/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'bad id', requestId: req.requestId });
  const row = one('SELECT * FROM findings WHERE id=?', id);
  if (!row) return res.status(404).json({ error: 'not found', requestId: req.requestId });
  res.json({ finding: withEvidence(row) });
});

app.patch('/api/findings/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { status, owner, resolution } = req.body || {};
  const cur = one('SELECT * FROM findings WHERE id=?', id);
  if (!cur) return res.status(404).json({ error: 'not found', requestId: req.requestId });
  const n = { status: status || cur.status, owner: owner !== undefined ? owner : cur.owner, resolution: resolution !== undefined ? resolution : cur.resolution, updated_at: new Date().toISOString() };
  db.prepare(`UPDATE findings SET status=?, owner=?, resolution=?, updated_at=? WHERE id=?`).run(n.status, n.owner, n.resolution, n.updated_at, id);
  const row = one('SELECT * FROM findings WHERE id=?', id);
  broadcast({ type: 'finding_updated', finding: row, by: req.body && req.body.actor || null });
  // Audit log
  if (config.enableAuditLog) {
    logger.info('finding_updated', { findingId: id, status: n.status, owner: n.owner, requestId: req.requestId });
  }
  res.json({ ok: true, finding: row });
});

// ---------- API: Ownership ----------
app.get('/api/ownership', (req, res) => {
  const people = q(`SELECT owner, COUNT(*) total, SUM(CASE WHEN status='open' THEN 1 ELSE 0 END) open, SUM(CASE WHEN status='investigating' THEN 1 ELSE 0 END) investigating, SUM(CASE WHEN status='resolved' THEN 1 ELSE 0 END) resolved, SUM(CASE WHEN status='dismissed' THEN 1 ELSE 0 END) dismissed, ROUND(SUM(CASE WHEN status='open' THEN value_at_risk ELSE 0 END)) open_amount FROM findings GROUP BY owner ORDER BY total DESC`);
  const unassigned = one(`SELECT COUNT(*) c, ROUND(SUM(value_at_risk)) amt FROM findings WHERE owner='' OR owner IS NULL`);
  const byKind = q(`SELECT kind, severity, COUNT(*) n, ROUND(SUM(value_at_risk)) amt FROM findings GROUP BY kind, severity ORDER BY n DESC`);
  res.json({ people, unassigned, byKind });
});

// ---------- API: Portfolio ----------
app.get('/api/portfolio', (req, res) => {
  const s = dbm.stats(db);
  const bySeverity = q(`SELECT severity, COUNT(*) n, ROUND(SUM(value_at_risk)) value FROM findings GROUP BY severity`);
  const topValue = q(`SELECT serial, family, dealer, ROUND(value_at_risk) value, diagnosis, score FROM findings WHERE value_at_risk > 0 ORDER BY value_at_risk DESC LIMIT 20`);
  const byDiagnosis = q(`SELECT diagnosis, COUNT(*) n, ROUND(SUM(value_at_risk)) value FROM findings WHERE diagnosis IS NOT NULL GROUP BY diagnosis ORDER BY n DESC`);
  const book = require('./reason').buildPriceBook(db);
  const priceBook = [...book.entries()].map(([family, v]) => ({ family, typical: v.typical, min: v.min, max: v.max, samples: v.samples })).sort((a, b) => b.samples - a.samples);
  const exposure = one(`SELECT ROUND(SUM(value_at_risk)) total, ROUND(SUM(CASE WHEN status='open' THEN value_at_risk ELSE 0 END)) open_total, SUM(CASE WHEN value_at_risk > 0 AND status='open' THEN 1 ELSE 0 END) priced_items FROM findings`);
  res.json({ stats: s, bySeverity, topValue, byDiagnosis, priceBook, exposure });
});

// ---------- API: Chains ----------
app.get('/api/chains', (req, res) => {
  const rows = db.prepare('SELECT * FROM chains ORDER BY count DESC').all().map(c => Object.assign({}, c, { sample: JSON.parse(c.sample || '[]') }));
  res.json({ rows });
});

// ---------- API: Inspect ----------
app.get('/api/inspect/:serial', validateSerial, (req, res) => {
  res.json(inspectSerial(req.params.serial.trim()));
});

// ---------- API: Database Backup ----------
app.post('/api/backup', auth.authenticate, auth.authorize('sync'), (req, res) => {
  try {
    const backupPath = path.join('/tmp', `nspector-backup-${Date.now()}.db`);
    db.backup(backupPath);
    audit.log(db, 'backup_created', { user: req.user.username, path: backupPath, requestId: req.requestId });
    res.json({ ok: true, path: backupPath, timestamp: new Date().toISOString() });
  } catch (e) {
    logger.error('Backup failed', { error: e.message, requestId: req.requestId });
    res.status(500).json({ error: 'Backup failed', requestId: req.requestId });
  }
});

// ---------- API: Sync ----------
app.post('/api/sync', async (req, res) => {
  const ids = (req.body && req.body.sheetIds) || null;
  const fetched = await sync.fetchSheets(DATA, ids);
  const r = sync.runSync(db, DATA, broadcast);
  overlapCache = null;
  if (config.enableAuditLog) {
    logger.info('sync_completed', { fetched, dispatches: r.stats?.dispatches, findings: r.findings, requestId: req.requestId });
  }
  res.json({ fetched, ...r });
});

app.get('/api/sync/status', (req, res) => {
  res.json({
    syncedAt: (one("SELECT v FROM meta WHERE k='synced_at'") || {}).v || null,
    dataDir: DATA, dbFile: DBFILE, clients: clients.size,
    amayaDir: AMAYA_DIR, amayaReady,
  });
});

app.get('/api/clients', (req, res) => res.json({ live: clients.size }));

// ---------- API: Audit Log ----------
app.get('/api/audit', auth.authenticate, auth.authorize('read'), (req, res) => {
  const filters = {
    action: req.query.action,
    user: req.query.user,
    entity: req.query.entity,
    since: req.query.since,
    limit: req.query.limit,
  };
  const rows = audit.query(db, filters);
  res.json({ rows, total: rows.length });
});

// ---------- API: OpenAPI Spec ----------
app.get('/api/docs', (req, res) => {
  res.json({
    openapi: '3.0.0',
    info: {
      title: 'AMAYA × NSpector Suite API',
      version: config.version,
      description: 'Unified device intelligence API — NSpector ledger + AMAYA IMEI Control Center',
    },
    servers: [{ url: `http://localhost:${config.port}` }],
    paths: {
      '/api/health': { get: { summary: 'Health check', responses: { 200: { description: 'OK' } } } },
      '/api/stats': { get: { summary: 'Database statistics', responses: { 200: { description: 'Stats' } } } },
      '/api/overview': { get: { summary: 'Dashboard overview', responses: { 200: { description: 'Overview data' } } } },
      '/api/duplicates': { get: { summary: 'Duplicate serials', parameters: [{ name: 'kind', in: 'query' }, { name: 'dealer', in: 'query' }, { name: 'limit', in: 'query' }, { name: 'offset', in: 'query' }] } },
      '/api/imei/{serial}': { get: { summary: 'IMEI lookup', parameters: [{ name: 'serial', in: 'path', required: true }] } },
      '/api/dealers': { get: { summary: 'List dealers', parameters: [{ name: 'q', in: 'query' }, { name: 'limit', in: 'query' }] } },
      '/api/findings': { get: { summary: 'List findings', parameters: [{ name: 'status', in: 'query' }, { name: 'kind', in: 'query' }, { name: 'severity', in: 'query' }, { name: 'owner', in: 'query' }] } },
      '/api/inspect/{serial}': { get: { summary: 'Full reasoning dossier', parameters: [{ name: 'serial', in: 'path', required: true }] } },
      '/api/combo/overview': { get: { summary: 'Merged NSpector + AMAYA overview' } },
      '/api/combo/asset/{serial}': { get: { summary: 'Merged device dossier', parameters: [{ name: 'serial', in: 'path', required: true }] } },
      '/api/combo/search': { get: { summary: 'Cross-ledger search', parameters: [{ name: 'q', in: 'query' }, { name: 'limit', in: 'query' }] } },
      '/api/combo/sources': { get: { summary: 'Data source inventory' } },
      '/api/metrics': { get: { summary: 'System metrics' } },
      '/api/audit': { get: { summary: 'Audit log', security: [{ bearerAuth: [] }] } },
      '/api/auth/login': { post: { summary: 'Login', requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { username: { type: 'string' }, password: { type: 'string' } } } } } } } },
      '/api/auth/register': { post: { summary: 'Register', requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { username: { type: 'string' }, password: { type: 'string' }, role: { type: 'string' } } } } } } } },
    },
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
  });
});

// ---------- API: Merged NSpector + AMAYA ----------
let overlapCache = null;

function nsSerialSet() {
  return new Set(q(`SELECT DISTINCT serial FROM dispatches WHERE serial IS NOT NULL AND serial <> ''`).map(r => String(r.serial)));
}

function getOverlap() {
  const stats = dbm.stats(db);
  const key = (stats.syncedAt || 'never') + '|' + stats.dispatches + '|' + stats.uniqueSerials;
  if (!overlapCache || overlapCache.key !== key) {
    const set = nsSerialSet();
    overlapCache = { key, at: new Date().toISOString(), result: amaya.overlap(set, 18) };
  }
  return overlapCache;
}

app.get('/api/combo/overview', (req, res) => {
  const stats = dbm.stats(db);
  const exposure = one(`SELECT ROUND(SUM(value_at_risk)) total, ROUND(SUM(CASE WHEN status='open' THEN value_at_risk ELSE 0 END)) open_total, SUM(CASE WHEN value_at_risk > 0 AND status='open' THEN 1 ELSE 0 END) priced_items FROM findings`);
  const bySeverity = q(`SELECT severity, COUNT(*) n, ROUND(SUM(value_at_risk)) value FROM findings GROUP BY severity`);
  const byKind = q(`SELECT kind, COUNT(*) n FROM findings GROUP BY kind ORDER BY n DESC`);
  const topCritical = db.prepare(`SELECT id, kind, severity, score, title, detail, diagnosis, serial, family, dealer, value_at_risk, status, owner FROM findings WHERE status IN ('open','investigating') AND severity IN ('critical','high') ORDER BY score DESC, value_at_risk DESC LIMIT 6`).all();
  const latest = db.prepare(`SELECT id, kind, severity, score, title, serial, dealer, status FROM findings ORDER BY updated_at DESC LIMIT 6`).all();
  const ov = getOverlap();
  const a = amaya.stats();
  res.json({
    generatedAt: new Date().toISOString(),
    ns: { stats, exposure, bySeverity, byKind, topCritical, latest },
    amaya: a,
    overlap: ov.result,
    overlapAt: ov.at,
  });
});

app.get('/api/combo/asset/:serial', validateSerial, (req, res) => {
  const serial = req.params.serial.trim();
  const ns = inspectSerial(serial);
  const a = amaya.asset(serial);
  const inNs = ns.dispatches.length > 0 || ns.returns.length > 0 || ns.findings.length > 0;
  res.json({
    serial,
    presence: inNs && a ? 'both' : inNs ? 'nspector' : a ? 'amaya' : 'none',
    ns,
    amaya: a,
  });
});

app.get('/api/combo/search', (req, res) => {
  const term = (req.query.q || '').toString().trim();
  const limit = Math.min(Math.max(parseInt(req.query.limit || '20', 10) || 20, 1), 100);
  if (!term) return res.json({ q: term, rows: [] });
  const like = `%${term}%`;
  const nsRows = q(`SELECT serial, MAX(family) family, COUNT(*) records, MIN(dt) first_dt, MAX(dt) last_dt FROM dispatches WHERE serial LIKE ? GROUP BY serial ORDER BY MAX(dt) DESC LIMIT ?`, like, limit);
  const rows = new Map();
  for (const r of nsRows) {
    rows.set(r.serial, {
      serial: r.serial, family: r.family, records: r.records,
      first: r.first_dt ? String(r.first_dt).slice(0, 10) : null,
      last: r.last_dt ? String(r.last_dt).slice(0, 10) : null,
      inNs: true, inAmaya: false, amaya: null,
    });
  }
  for (const hit of amaya.search(term, limit)) {
    let row = rows.get(hit.imei);
    if (!row) {
      row = { serial: hit.imei, family: '', records: 0, first: null, last: null, inNs: false, inAmaya: true, amaya: null };
      rows.set(hit.imei, row);
    }
    row.inAmaya = true;
    const a = amaya.asset(hit.imei);
    if (a) row.amaya = { product: a.product, state: a.state, occurrences: a.occurrences, first: a.first, last: a.last, conflict: a.conflict, repeat: a.repeat };
  }
  const out = [...rows.values()].slice(0, limit);
  res.json({ q: term, rows: out, counts: { total: rows.size, ns: nsRows.length } });
});

app.get('/api/combo/sources', (req, res) => {
  let files = [];
  try {
    files = fs.readdirSync(DATA).filter(f => /\.(csv|json|txt)$/i.test(f)).map(f => {
      const st = fs.statSync(path.join(DATA, f));
      return { name: f, bytes: st.size, modified: st.mtime.toISOString() };
    }).sort((a, b) => a.name.localeCompare(b.name));
  } catch (e) {}
  res.json({ dataDir: DATA, files, amaya: amaya.stats(), amayaDir: AMAYA_DIR });
});

// ---------- Metrics Endpoint ----------
if (config.enableMetrics) {
  app.get('/api/metrics', (req, res) => {
    const mem = process.memoryUsage();
    const stats = dbm.stats(db);
    res.json({
      uptime: process.uptime(),
      memory: mem,
      cpu: process.cpuUsage(),
      database: stats,
      clients: clients.size,
      version: config.version,
    });
  });
}

// ---------- Error Handler ----------
app.use((err, req, res, next) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack, requestId: req.requestId, path: req.path });
  res.status(err.status || 500).json({
    error: config.nodeEnv === 'production' ? 'Internal server error' : err.message,
    requestId: req.requestId,
  });
});

// ---------- 404 Handler ----------
app.use((req, res) => {
  res.status(404).json({ error: 'Not found', path: req.path, requestId: req.requestId });
});

// ---------- First Run Ingest ----------
try {
  if (!dbm.stats(db).dispatches) {
    logger.info('First run — ingesting from', { dataDir: DATA });
    const r = sync.runSync(db, DATA, null);
    if (r.ok) logger.info('Loaded', { dispatches: r.stats.dispatches, findings: r.findings });
    else logger.warn('Initial ingest failed', { error: r.error });
  }
} catch (e) {
  logger.error('First-run ingest error', { error: e.message });
}

// ---------- Graceful Shutdown ----------
let isShuttingDown = false;
function gracefulShutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  logger.info('Shutting down', { signal });
  server.close(() => {
    logger.info('Server closed');
    try { db.close(); } catch (e) {}
    process.exit(0);
  });
  setTimeout(() => {
    logger.warn('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('uncaughtException', (e) => {
  logger.error('Uncaught exception', { error: e.message, stack: e.stack });
});
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', { reason: String(reason) });
});

// ---------- Start Server ----------
server.listen(config.port, config.host, () => {
  logger.info('AMAYA × NSpector running', {
    url: `http://localhost:${config.port}`,
    data: DATA,
    amaya: `${AMAYA_DIR} (${amayaReady ? 'indexed' : 'not loaded'})`,
    clients: clients.size,
    version: config.version,
    environment: config.nodeEnv,
  });
});

module.exports = { app, server, db, broadcast };