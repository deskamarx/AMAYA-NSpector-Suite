/**
 * amaya.js — read-only index over the AMAYA IMEI Control Center snapshot.
 *
 * The published Control Center ships two compact column-store files:
 *   data/assets.json  — one entry per IMEI (68k assets in the bundled snapshot)
 *   data/events.json  — every workbook occurrence (104k events)
 *
 * The browser bundle keeps this in memory too, so loading it here lets the
 * merged desktop shell answer cross-ledger questions without a second app.
 */
const fs = require('fs');
const path = require('path');

const DAY_MS = 86400000;
const DAY_ZERO = Date.UTC(2024, 0, 1);

let cache = null;

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function load(dir) {
  if (cache && cache.dir === dir) return cache;
  const dataDir = path.join(dir, 'data');
  const metaFile = path.join(dataDir, 'meta.json');
  if (!fs.existsSync(metaFile)) {
    cache = { dir, ready: false, reason: 'AMAYA snapshot not found at ' + dataDir };
    return cache;
  }
  const meta = readJson(metaFile);
  const assets = readJson(path.join(dataDir, 'assets.json'));
  const events = readJson(path.join(dataDir, 'events.json'));
  const index = new Map();
  for (let i = 0; i < assets.imeis.length; i++) index.set(assets.imeis[i], i);
  cache = {
    dir,
    ready: true,
    meta,
    assets,
    events,
    index,
    loadedAt: new Date().toISOString()
  };
  return cache;
}

function dateFromDay(day) {
  if (typeof day !== 'number' || !Number.isFinite(day) || day < 0) return null;
  return new Date(DAY_ZERO + day * DAY_MS).toISOString().slice(0, 10);
}

function statesFromMask(mask, states) {
  const out = [];
  for (let i = 0; i < states.length; i++) if (mask & (1 << i)) out.push(states[i]);
  return out;
}

function sourceFor(meta, src) {
  if (typeof src !== 'number' || src < 0) return null;
  const key = String(src + 1).padStart(2, '0');
  const s = meta.sources && meta.sources[key];
  return s ? { key, name: s.name, url: s.url } : null;
}

/** Every movement occurrence recorded for one IMEI. */
function eventsFor(c, index) {
  const { assets, events, meta } = c;
  const start = events.bucketStart[index];
  const end = events.bucketStart[index + 1];
  const list = [];
  if (typeof start !== 'number' || typeof end !== 'number') return list;
  for (let slot = start; slot < end; slot++) {
    const e = events.order[slot];
    if (typeof e !== 'number') continue;
    const src = sourceFor(meta, events.src[e]);
    list.push({
      index: e,
      date: dateFromDay(events.day[e]),
      undated: events.day[e] < 0,
      tab: events.tabDict[events.tab[e]] || '',
      row: events.row[e],
      states: statesFromMask(events.mask[e], meta.states || []),
      product: events.model[e] >= 0 ? assets.modelDict[events.model[e]] : '',
      source: src ? src.name : null,
      sourceKey: src ? src.key : null,
      sourceUrl: src ? src.url : null
    });
  }
  list.sort((a, b) => {
    if (!a.date && !b.date) return a.index - b.index;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return a.date.localeCompare(b.date) || a.index - b.index;
  });
  return list;
}

/** One asset, in the same shape the Control Center UI uses, plus its trail. */
function asset(imei) {
  const c = cache;
  if (!c || !c.ready) return null;
  const key = String(imei || '').trim();
  const i = c.index.get(key);
  if (i === undefined) return null;
  const a = c.assets;
  const resolved = a.resolved[i];
  const model = a.model[i];
  const first = a.first[i];
  const last = a.last[i];
  return {
    found: true,
    imei: key,
    index: i,
    occurrences: a.occ[i],
    tabs: a.tabs[i],
    firstDay: first,
    lastDay: last,
    first: dateFromDay(first),
    last: dateFromDay(last),
    mask: a.mask[i],
    states: statesFromMask(a.mask[i], c.meta.states || []),
    state: (c.meta.states || [])[resolved] || 'Unknown',
    stateIndex: resolved,
    product: model >= 0 ? a.modelDict[model] : '',
    modelIndex: model,
    conflict: a.conflict[i] === 1,
    repeat: a.repeat[i] === 1,
    evidenceTab: a.evTab[i] >= 0 ? (c.events.tabDict[a.evTab[i]] || '') : '',
    evidenceRow: a.evRow[i],
    events: eventsFor(c, i)
  };
}

function stats() {
  const c = cache;
  if (!c || !c.ready) return { ready: false, reason: c ? c.reason : 'not loaded' };
  const m = c.meta || {};
  return {
    ready: true,
    generatedFrom: m.generatedFrom || '',
    dataVersion: m.dataVersion || '',
    builtAt: m.builtAt || '',
    assets: m.assets || (c.assets ? c.assets.imeis.length : 0),
    events: m.events || (c.events ? c.events.count : 0),
    conflicts: m.conflicts || 0,
    repeatIds: m.repeatIds || 0,
    reviewQueue: m.reviewQueue || 0,
    errorTokens: m.errorTokens || 0,
    emptyTabs: m.emptyTabs || 0,
    stateCounts: m.stateCounts || {},
    states: m.states || [],
    topTabs: m.topTabs || [],
    sources: m.sources || {},
    derived: m.derived || {},
    loadedAt: c.loadedAt
  };
}

function* allImeis() {
  const c = cache;
  if (!c || !c.ready) return;
  const imeis = c.assets.imeis;
  for (let i = 0; i < imeis.length; i++) yield imeis[i];
}

/** Prefix, then substring, then fuzzy numeric last-resort search. */
function search(term, limit) {
  const c = cache;
  const max = Math.min(Math.max(parseInt(limit || '20', 10) || 20, 1), 200);
  if (!c || !c.ready) return [];
  const q = String(term || '').trim();
  if (!q) return [];
  const out = [];
  const seen = new Set();
  const push = (imei, match) => {
    if (out.length >= max || seen.has(imei)) return;
    seen.add(imei);
    out.push({ imei, match });
  };
  const imeis = c.assets.imeis;
  for (let i = 0; i < imeis.length && out.length < max; i++)
    if (imeis[i].startsWith(q)) push(imeis[i], 'prefix');
  if (out.length < max) {
    for (let i = 0; i < imeis.length && out.length < max; i++)
      if (!seen.has(imeis[i]) && imeis[i].includes(q)) push(imeis[i], 'contains');
  }
  return out;
}

/** Serial numbers present in both ledgers, with a small sample. */
function overlap(nsSerials, sampleSize) {
  const c = cache;
  if (!c || !c.ready) return { ready: false, amaya: 0, both: 0, nsOnly: 0, amayaOnly: 0, sample: [] };
  const sampleTarget = Math.min(Math.max(sampleSize || 24, 0), 200);
  let both = 0;
  const sample = [];
  for (const serial of nsSerials) {
    if (c.index.has(serial)) {
      both++;
      if (sample.length < sampleTarget) sample.push(serial);
    }
  }
  const amaya = c.index.size;
  const ns = nsSerials.size;
  return {
    ready: true,
    ns,
    amaya,
    both,
    nsOnly: Math.max(ns - both, 0),
    amayaOnly: Math.max(amaya - both, 0),
    union: ns + amaya - both,
    sample
  };
}

module.exports = { load, asset, stats, search, overlap, allImeis, dateFromDay };
