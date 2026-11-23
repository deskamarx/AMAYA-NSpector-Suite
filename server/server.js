/**
 * server.js — unified REST API + WebSocket live sync for the combo suite.
 *
 * One process serves:
 *   /                          merged desktop/web shell (this project)
 *   /amaya-imei-control-center the AMAYA IMEI Control Center PWA, unchanged
 *   /api/*                     NSpector ledger API + merged cross-ledger API
 */
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

const PORT = process.env.PORT || 4173;
const ROOT = path.join(__dirname, '..');
const WEB = path.join(ROOT, 'web');
const DATA = process.env.NSPECTOR_DATA || path.join(ROOT, 'data');
// On read-only filesystems (e.g., Render), use /tmp for the database
const DBFILE = process.env.NSPECTOR_DB || '/tmp/nspector.db';
const AMAYA_DIR = process.env.AMAYA_DIR || path.join(ROOT, 'vendor', 'amaya');

let db;
try {
  db = dbm.open(DBFILE);
  console.log('[combo] database opened:', DBFILE);
} catch (e) {
  console.error('[combo] failed to open database:', e.message);
  process.exit(1);
}
const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

// ---------- amaya control center (read-only) ----------
try {
  amaya.load(AMAYA_DIR);
  console.log('[combo] AMAYA loaded:', AMAYA_DIR, amaya.stats().ready);
} catch (e) {
  console.error('[combo] AMAYA load failed:', e.message);
}
app.use('/amaya-imei-control-center', express.static(AMAYA_DIR, {
  index: 'index.html',
  extensions: ['html'],
  setHeaders(res, file) {
    if (/\.html$/i.test(file)) res.setHeader('Cache-Control', 'no-cache');
    if (/\.json$/i.test(file)) res.setHeader('Cache-Control', 'no-cache');
  }
}));

// ---------- merged shell ----------
app.use(express.static(WEB));

// ---------- websocket ----------
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });
const clients = new Set();

function broadcast(msg) {
  const s = JSON.stringify(msg);
  for (const c of clients) { if (c.readyState === 1) { try { c.send(s); } catch (e) {} } }
}
wss.on('connection', ws => {
  clients.add(ws);
  ws.send(JSON.stringify({ type:'hello', stats: dbm.stats(db), clients: clients.size }));
  ws.on('close', () => clients.delete(ws));
  ws.on('error', () => clients.delete(ws));
  ws.on('message', m => {
    try { const d = JSON.parse(m);
      if (d.type === 'ping') ws.send(JSON.stringify({ type:'pong', t: Date.now() }));
    } catch (e) {}
  });
});

// ---------- helpers ----------
const q = (sql, ...a) => db.prepare(sql).all(...a);
const one = (sql, ...a) => db.prepare(sql).get(...a);

/** attach parsed evidence to a finding row */
function withEvidence(f) {
  if (!f) return f;
  let ev = [], acts = [];
  try { ev = JSON.parse(f.evidence || '[]'); } catch (e) {}
  try { acts = JSON.parse(f.next_actions || '[]'); } catch (e) {}
  if (!acts.length && f.next_action) acts = [f.next_action];
  return Object.assign({}, f, { evidence: ev, next_actions: acts });
}

/** the full NSpector reasoning dossier for one serial */
function inspectSerial(serial) {
  const R = require('./reason');
  const dispatches = q(`SELECT * FROM dispatches WHERE serial=? ORDER BY dt, id`, serial);
  const returns = q(`SELECT * FROM returns WHERE serial=?`, serial);
  const findings = db.prepare('SELECT * FROM findings WHERE serial=?').all(serial).map(withEvidence);

  const book = R.buildPriceBook(db);
  const l = R.luhn(serial);
  const t = R.tac(serial);
  const tacFamilies = t
    ? q(`SELECT family, COUNT(DISTINCT serial) n FROM dispatches
        WHERE SUBSTR(serial,1,8)=? GROUP BY family ORDER BY n DESC`, t)
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
        { label:'Dispatch trail', detail:`Only ${dispatches.length} dispatch record — the serial is not duplicated.`, weight:'good' },
        { label:'Check digit', detail: l === true ? 'Valid, so not a clone or corruption.' : 'Not a 15-digit IMEI, so not applicable.', weight:'good' },
        { label:'Logged reason', detail:r.reason, weight:'bad' },
        { label:'Consequence', detail:'Cannot be sold as new until resolved.', weight:'bad' }
      ],
      nextActions: lock ? [
        'Dial *#06# and compare with the box and the invoice — all three must match.',
        'If it asks for a previous account, only the original owner can release it. Do not attempt a repair.',
        'If one model dominates this list, raise a batch claim with the supplier.'
      ] : diff ? [
        'Photograph the unit and the box label side by side.',
        'Segregate permanently as bad-bin.',
        'Raise a warranty claim rather than writing the unit off.'
      ] : [
        'Raise a warranty claim with the supplier against this serial.',
        'Check whether other units from the same batch show the same fault.',
        'Restock only after repair is confirmed, never straight back into sellable stock.'
      ],
      valueAtRisk: r.price || 0
    };
  }

  const related = dispatches.length
    ? q(`SELECT COUNT(*) n FROM dispatches WHERE party_key IN
        (SELECT party_key FROM dispatches WHERE serial=?) AND serial<>?`,
        serial, serial)[0].n
    : 0;

  return {
    serial, serialKind: R.serialKind(serial), luhn: l, tac: t, tacFamilies,
    dispatches, returns, findings, diagnosis,
    price: book.get(dispatches[0] ? dispatches[0].family : '') || null,
    relatedCount: related
  };
}

// ---------- api: health / stats ----------
app.get('/api/health', (req, res) => res.json({
  ok: true, ts: Date.now(), amaya: amaya.stats().ready
}));

app.get('/api/stats', (req, res) => {
  const s = dbm.stats(db);
  s.liveClients = clients.size;
  res.json(s);
});

app.get('/api/overview', (req, res) => {
  const stats = dbm.stats(db);
  const cod = q(`SELECT ym, COUNT(*) n, SUM(amount) amt,
      SUM(CASE WHEN is_cod=1 THEN amount ELSE 0 END) cod_amt,
      SUM(CASE WHEN is_cod=1 THEN 1 ELSE 0 END) cod_n
    FROM deposits WHERE ym IS NOT NULL GROUP BY ym ORDER BY ym`);
  const dispatch = q(`SELECT substr(dt,1,7) ym, COUNT(*) units
    FROM dispatches WHERE dt IS NOT NULL GROUP BY ym ORDER BY ym`);
  const dispatchByFamily = q(`SELECT family, COUNT(*) units, COUNT(DISTINCT serial) serials
    FROM dispatches GROUP BY family ORDER BY units DESC LIMIT 40`);
  const classes = q(`SELECT cls, COUNT(*) units FROM dispatches GROUP BY cls`);
  const dupTop = q(`
    SELECT d.party_key, d.name, d.units, d.cross_dup,
      (SELECT COUNT(DISTINCT serial) FROM dispatches x WHERE x.party_key=d.party_key) serials
    FROM dealers d WHERE d.cross_dup > 0 ORDER BY d.cross_dup DESC LIMIT 25`);
  res.json({ stats, cod, dispatch, dispatchByFamily, classes, dupTop });
});

/** duplicate serials with filtering + paging */
app.get('/api/duplicates', (req, res) => {
  const dealer = (req.query.dealer || '').toString().trim();
  const limit = Math.min(parseInt(req.query.limit || '100', 10), 1000);
  const offset = parseInt(req.query.offset || '0', 10);
  const kind = (req.query.kind || 'cross').toString(); // cross | same | multi

  let sql = `
    SELECT serial, COUNT(*) n, COUNT(DISTINCT party_key) dealers,
           GROUP_CONCAT(DISTINCT party) parties, GROUP_CONCAT(DISTINCT wing) wings,
           MIN(sku) sku, MIN(family) family,
           MIN(dt) first_dt, MAX(dt) last_dt,
           COUNT(DISTINCT dt) dates
    FROM dispatches GROUP BY serial HAVING n > 1`;
  const params = [];
  if (kind === 'cross') sql += ' AND dealers > 1';
  if (kind === 'multi') sql += ' AND dealers >= 3';
  sql += ' ORDER BY dealers DESC, n DESC, last_dt DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);
  let rows = q(sql, ...params);

  if (dealer) {
    const k = core.nrm(dealer);
    const filt = rows.filter(r => String(r.parties).split(',').some(p => core.nrm(p) === k));
    const full = q(`SELECT serial, COUNT(*) n, COUNT(DISTINCT party_key) dealers,
        GROUP_CONCAT(DISTINCT party) parties, GROUP_CONCAT(DISTINCT wing) wings,
        MIN(sku) sku, MIN(family) family, MIN(dt) first_dt, MAX(dt) last_dt
      FROM dispatches GROUP BY serial HAVING n > 1 AND dealers > 1`);
    rows = filt;
    const totalForDealer = full.filter(r => String(r.parties).split(',').some(p => core.nrm(p) === k)).length;
    rows.totalForDealer = totalForDealer;
  }
  res.json({ rows, kind, dealer });
});

/** every record for one serial */
app.get('/api/imei/:serial', (req, res) => {
  const s = req.params.serial.trim();
  const recs = q(`SELECT * FROM dispatches WHERE serial=? ORDER BY dt, id`, s);
  const ret = q(`SELECT * FROM returns WHERE serial=?`, s);
  const finding = q(`SELECT * FROM findings WHERE serial=?`, s);
  res.json({ serial:s, found: recs.length > 0, dispatches: recs, returns: ret, findings: finding });
});

app.get('/api/dealers', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit || '200', 10), 2000);
  const search = (req.query.q || '').toString().trim();
  let rows = q(`
    SELECT d.*,
      COALESCE((SELECT SUM(amount) FROM deposits p WHERE p.store_key IN
        (SELECT party_key FROM dealers z WHERE z.name=d.name)),0) paid
    FROM dealers d ORDER BY d.units DESC LIMIT ?`, limit);
  if (search) {
    const k = core.nrm(search);
    rows = rows.filter(r => core.nrm(r.name).includes(k) || core.nrm(r.aliases || '').includes(k));
  }
  res.json({ rows, total: one('SELECT COUNT(*) c FROM dealers').c });
});

app.get('/api/dealers/:key', (req, res) => {
  const k = req.params.key;
  const d = one('SELECT * FROM dealers WHERE party_key=?', k);
  if (!d) return res.status(404).json({ error:'not found' });
  const serials = q(`SELECT serial, sku, family, date, dt, wing, party FROM dispatches
    WHERE party_key=? ORDER BY dt DESC LIMIT 500`, k);
  const dups = q(`SELECT serial, COUNT(*) n, GROUP_CONCAT(DISTINCT party) parties,
      MIN(sku) sku, MIN(family) family
    FROM dispatches WHERE serial IN (SELECT serial FROM dispatches WHERE party_key=?)
    GROUP BY serial HAVING n > 1`, k);
  const rets = q(`SELECT * FROM returns WHERE merchant_key=? ORDER BY rdate DESC`, k);
  const dep = q(`SELECT COUNT(*) n, SUM(amount) amt FROM deposits WHERE store_key=?`, k);
  const findings = q(`SELECT * FROM findings WHERE dealer LIKE ?`, `%${d.name}%`);
  res.json({ dealer:{ ...d, aliases: JSON.parse(d.aliases || '[]') },
             serials, duplicates: dups, returns: rets,
             deposits: dep[0] || { n:0, amt:0 }, findings });
});

app.get('/api/returns', (req, res) => {
  const family = (req.query.family || '').toString().trim();
  const kind = (req.query.kind || '').toString().trim();
  let rows = q(`SELECT * FROM returns ORDER BY rdate DESC`);
  if (family) rows = rows.filter(r => core.nrm(r.family).includes(core.nrm(family)));
  if (kind === 'imei') rows = rows.filter(r => r.kind === 'IMEI');
  res.json({ rows, total: rows.length });
});

/** model risk ranking */
app.get('/api/risk', (req, res) => {
  const rows = q(`SELECT family,
      SUM(1) units,
      COUNT(DISTINCT serial) serials,
      COUNT(DISTINCT CASE WHEN serial IN (SELECT serial FROM dispatches GROUP BY serial HAVING COUNT(*)>1) THEN serial END) dup_serials
    FROM dispatches GROUP BY family`);
  const dupCross = q(`SELECT family, COUNT(DISTINCT serial) n FROM dispatches
    WHERE serial IN (SELECT serial FROM dispatches GROUP BY serial HAVING COUNT(DISTINCT party_key)>1)
    GROUP BY family`);
  const crossMap = Object.fromEntries(dupCross.map(r => [r.family, r.n]));
  const locks = q(`SELECT family, COUNT(*) n FROM returns WHERE kind='IMEI' GROUP BY family`);
  const lockMap = Object.fromEntries(locks.map(r => [r.family, r.n]));

  const out = rows.map(r => {
    const dupUnits = r.units - r.serials;
    const dupRate = r.units ? Math.round(dupUnits / r.units * 1000)/10 : 0;
    const lock = lockMap[r.family] || 0;
    const lockRate = r.units ? Math.round(lock / r.units * 1000)/10 : 0;
    return { family:r.family, units:r.units, serials:r.serials, dupUnits,
             crossDup: crossMap[r.family] || 0, dupRate,
             imeiLock: lock, lockRate,
             risk: Math.round((dupRate + lock*8 + lockRate*10)*10)/10 };
  }).filter(r => r.units >= 5).sort((a,b) => b.risk - a.risk);
  res.json({ rows: out });
});

/** findings / work queue with ownership */
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
  sql += ` ORDER BY score DESC,
             CASE severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1
             WHEN 'medium' THEN 2 ELSE 3 END, updated_at DESC`;
  const limit = Math.min(Math.max(parseInt(req.query.limit || '0', 10) || 0, 0), 2000);
  const offset = Math.max(parseInt(req.query.offset || '0', 10) || 0, 0);
  const params = limit ? [...p, limit, offset] : p;
  if (limit) sql += ' LIMIT ? OFFSET ?';
  const rows = db.prepare(sql).all(...params).map(withEvidence);
  const counts = one(`SELECT
      SUM(CASE WHEN status='open' THEN 1 ELSE 0 END) open,
      SUM(CASE WHEN status='investigating' THEN 1 ELSE 0 END) investigating,
      SUM(CASE WHEN status='resolved' THEN 1 ELSE 0 END) resolved,
      SUM(CASE WHEN status='dismissed' THEN 1 ELSE 0 END) dismissed,
      COUNT(*) total,
      ROUND(SUM(CASE WHEN status='open' THEN value_at_risk ELSE 0 END)) open_value
    FROM findings`);
  const byOwner = q(`SELECT owner, status, COUNT(*) n FROM findings
    GROUP BY owner, status ORDER BY n DESC`);
  res.json({ rows, counts, byOwner });
});

/** one finding, by id — used by the detail sheet */
app.get('/api/findings/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'bad id' });
  const row = one('SELECT * FROM findings WHERE id=?', id);
  if (!row) return res.status(404).json({ error: 'not found' });
  res.json({ finding: withEvidence(row) });
});

app.patch('/api/findings/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { status, owner, resolution } = req.body || {};
  const cur = one('SELECT * FROM findings WHERE id=?', id);
  if (!cur) return res.status(404).json({ error:'not found' });
  const n = { status: status || cur.status, owner: owner !== undefined ? owner : cur.owner,
              resolution: resolution !== undefined ? resolution : cur.resolution,
              updated_at: new Date().toISOString() };
  db.prepare(`UPDATE findings SET status=?, owner=?, resolution=?, updated_at=? WHERE id=?`)
    .run(n.status, n.owner, n.resolution, n.updated_at, id);
  const row = one('SELECT * FROM findings WHERE id=?', id);
  broadcast({ type:'finding_updated', finding: row, by: req.body && req.body.actor || null });
  res.json({ ok:true, finding: row });
});

/** ownership + progress rollup */
app.get('/api/ownership', (req, res) => {
  const people = q(`SELECT owner,
      COUNT(*) total,
      SUM(CASE WHEN status='open' THEN 1 ELSE 0 END) open,
      SUM(CASE WHEN status='investigating' THEN 1 ELSE 0 END) investigating,
      SUM(CASE WHEN status='resolved' THEN 1 ELSE 0 END) resolved,
      SUM(CASE WHEN status='dismissed' THEN 1 ELSE 0 END) dismissed,
      ROUND(SUM(CASE WHEN status='open' THEN value_at_risk ELSE 0 END)) open_amount
    FROM findings GROUP BY owner ORDER BY total DESC`);
  const unassigned = one(`SELECT COUNT(*) c, ROUND(SUM(value_at_risk)) amt
    FROM findings WHERE owner='' OR owner IS NULL`);
  const byKind = q(`SELECT kind, severity, COUNT(*) n, ROUND(SUM(value_at_risk)) amt
    FROM findings GROUP BY kind, severity ORDER BY n DESC`);
  res.json({ people, unassigned, byKind });
});

/** exposure portfolio */
app.get('/api/portfolio', (req, res) => {
  const s = dbm.stats(db);
  const bySeverity = q(`SELECT severity, COUNT(*) n, ROUND(SUM(value_at_risk)) value
    FROM findings GROUP BY severity`);
  const topValue = q(`SELECT serial, family, dealer, ROUND(value_at_risk) value, diagnosis, score
    FROM findings WHERE value_at_risk > 0 ORDER BY value_at_risk DESC LIMIT 20`);
  const byDiagnosis = q(`SELECT diagnosis, COUNT(*) n, ROUND(SUM(value_at_risk)) value
    FROM findings WHERE diagnosis IS NOT NULL GROUP BY diagnosis ORDER BY n DESC`);
  const book = require('./reason').buildPriceBook(db);
  const priceBook = [...book.entries()]
    .map(([family, v]) => ({ family, typical:v.typical, min:v.min, max:v.max, samples:v.samples }))
    .sort((a, b) => b.samples - a.samples);
  const exposure = one(`SELECT ROUND(SUM(value_at_risk)) total,
      ROUND(SUM(CASE WHEN status='open' THEN value_at_risk ELSE 0 END)) open_total,
      SUM(CASE WHEN value_at_risk > 0 AND status='open' THEN 1 ELSE 0 END) priced_items
    FROM findings`);
  res.json({ stats:s, bySeverity, topValue, byDiagnosis, priceBook, exposure });
});

/** repeated dealer-to-dealer flows */
app.get('/api/chains', (req, res) => {
  const rows = db.prepare('SELECT * FROM chains ORDER BY count DESC').all()
    .map(c => Object.assign({}, c, { sample: JSON.parse(c.sample || '[]') }));
  res.json({ rows });
});

/** full reasoning dossier for one serial */
app.get('/api/inspect/:serial', (req, res) => {
  res.json(inspectSerial(req.params.serial.trim()));
});

app.post('/api/sync', async (req, res) => {
  const ids = (req.body && req.body.sheetIds) || null;
  const fetched = await sync.fetchSheets(DATA, ids);
  const r = sync.runSync(db, DATA, broadcast);
  overlapCache = null;
  res.json({ fetched, ...r });
});

app.get('/api/sync/status', (req, res) => {
  res.json({ syncedAt: (one("SELECT v FROM meta WHERE k='synced_at'")||{}).v || null,
             dataDir: DATA, dbFile: DBFILE, clients: clients.size,
             amayaDir: AMAYA_DIR, amayaReady: amaya.stats().ready });
});

app.get('/api/clients', (req, res) => res.json({ live: clients.size }));

// ---------- api: merged NSpector + AMAYA ----------
let overlapCache = null;

function nsSerialSet() {
  return new Set(q(`SELECT DISTINCT serial FROM dispatches WHERE serial IS NOT NULL AND serial <> ''`)
    .map(r => String(r.serial)));
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
  const exposure = one(`SELECT ROUND(SUM(value_at_risk)) total,
      ROUND(SUM(CASE WHEN status='open' THEN value_at_risk ELSE 0 END)) open_total,
      SUM(CASE WHEN value_at_risk > 0 AND status='open' THEN 1 ELSE 0 END) priced_items
    FROM findings`);
  const bySeverity = q(`SELECT severity, COUNT(*) n, ROUND(SUM(value_at_risk)) value
    FROM findings GROUP BY severity`);
  const byKind = q(`SELECT kind, COUNT(*) n FROM findings GROUP BY kind ORDER BY n DESC`);
  const topCritical = db.prepare(`SELECT id, kind, severity, score, title, detail, diagnosis,
      serial, family, dealer, value_at_risk, status, owner
    FROM findings WHERE status IN ('open','investigating') AND severity IN ('critical','high')
    ORDER BY score DESC, value_at_risk DESC LIMIT 6`).all();
  const latest = db.prepare(`SELECT id, kind, severity, score, title, serial, dealer, status
    FROM findings ORDER BY updated_at DESC LIMIT 6`).all();
  const ov = getOverlap();
  const a = amaya.stats();
  res.json({
    generatedAt: new Date().toISOString(),
    ns: { stats, exposure, bySeverity, byKind, topCritical, latest },
    amaya: a,
    overlap: ov.result,
    overlapAt: ov.at
  });
});

app.get('/api/combo/asset/:serial', (req, res) => {
  const serial = req.params.serial.trim();
  const ns = inspectSerial(serial);
  const a = amaya.asset(serial);
  const inNs = ns.dispatches.length > 0 || ns.returns.length > 0 || ns.findings.length > 0;
  res.json({
    serial,
    presence: inNs && a ? 'both' : inNs ? 'nspector' : a ? 'amaya' : 'none',
    ns,
    amaya: a
  });
});

app.get('/api/combo/search', (req, res) => {
  const term = (req.query.q || '').toString().trim();
  const limit = Math.min(Math.max(parseInt(req.query.limit || '20', 10) || 20, 1), 100);
  if (!term) return res.json({ q: term, rows: [] });
  const like = `%${term}%`;
  const nsRows = q(`SELECT serial, MAX(family) family, COUNT(*) records,
      MIN(dt) first_dt, MAX(dt) last_dt
    FROM dispatches WHERE serial LIKE ?
    GROUP BY serial ORDER BY MAX(dt) DESC LIMIT ?`, like, limit);
  const rows = new Map();
  for (const r of nsRows) {
    rows.set(r.serial, {
      serial: r.serial, family: r.family, records: r.records,
      first: r.first_dt ? String(r.first_dt).slice(0,10) : null,
      last: r.last_dt ? String(r.last_dt).slice(0,10) : null,
      inNs: true, inAmaya: false, amaya: null
    });
  }
  for (const hit of amaya.search(term, limit)) {
    let row = rows.get(hit.imei);
    if (!row) {
      row = { serial: hit.imei, family: '', records: 0, first: null, last: null,
              inNs: false, inAmaya: true, amaya: null };
      rows.set(hit.imei, row);
    }
    row.inAmaya = true;
    const a = amaya.asset(hit.imei);
    if (a) row.amaya = {
      product: a.product, state: a.state, occurrences: a.occurrences,
      first: a.first, last: a.last, conflict: a.conflict, repeat: a.repeat
    };
  }
  const out = [...rows.values()].slice(0, limit);
  res.json({ q: term, rows: out, counts: { total: rows.size, ns: nsRows.length } });
});

app.get('/api/combo/sources', (req, res) => {
  let files = [];
  try {
    files = fs.readdirSync(DATA)
      .filter(f => /\.(csv|json|txt)$/i.test(f))
      .map(f => {
        const st = fs.statSync(path.join(DATA, f));
        return { name: f, bytes: st.size, modified: st.mtime.toISOString() };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch (e) {}
  res.json({
    dataDir: DATA,
    files,
    amaya: amaya.stats(),
    amayaDir: AMAYA_DIR
  });
});

// first run
try {
  if (!dbm.stats(db).dispatches) {
    console.log('[combo] first run — ingesting from', DATA);
    const r = sync.runSync(db, DATA, null);
    if (r.ok) console.log('[combo] loaded', r.stats.dispatches, 'dispatch records,', r.findings, 'findings');
    else console.log('[combo] initial ingest failed:', r.error, '— drop CSVs into', DATA);
  }
} catch (e) {
  console.error('[combo] first-run ingest error:', e.message, e.stack);
}

process.on('uncaughtException', (e) => {
  console.error('[combo] uncaught exception:', e.message, e.stack);
});
process.on('unhandledRejection', (reason) => {
  console.error('[combo] unhandled rejection:', reason);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  AMAYA × NSpector running`);
  console.log(`  http://localhost:${PORT}`);
  console.log(`  data:  ${DATA}`);
  console.log(`  amaya: ${AMAYA_DIR} (${amaya.stats().ready ? 'indexed' : 'not loaded'})`);
  console.log(`  live clients: ${clients.size}\n`);
});

module.exports = { app, server, db, broadcast };
