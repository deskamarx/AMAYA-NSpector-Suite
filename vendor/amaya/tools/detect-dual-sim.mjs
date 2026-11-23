import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "data");
const outDir = path.join(root, "verification");
const A = JSON.parse(fs.readFileSync(path.join(dataDir, "assets.json"), "utf8"));
const E = JSON.parse(fs.readFileSync(path.join(dataDir, "events.json"), "utf8"));
const M = JSON.parse(fs.readFileSync(path.join(dataDir, "meta.json"), "utf8"));

const SOLD_BIT = 1 << M.states.indexOf("Sold Delivered");
const assetOf = new Int32Array(E.count).fill(-1);
for (let i = 0; i < A.count; i++) {
  const start = E.bucketStart[i];
  const end = E.bucketStart[i + 1] ?? E.count;
  for (let p = start; p < end; p++) assetOf[E.order[p]] = i;
}

const info = Array.from({ length: A.count }, () => ({
  days: new Set(),
  tabs: new Set(),
  rows: new Set(),
  locs: new Set(),
  sold: false
}));
for (let e = 0; e < E.count; e++) {
  const a = assetOf[e];
  if (a < 0) continue;
  const n = info[a];
  n.days.add(E.day[e]);
  n.tabs.add(E.tab[e]);
  n.rows.add(E.row[e]);
  n.locs.add(E.tab[e] + "|" + E.row[e]);
  if (E.mask[e] & SOLD_BIT) n.sold = true;
}

function luhn(value) {
  let sum = 0;
  for (let i = 0; i < 15; i++) {
    let digit = Number(value[14 - i]);
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
}

const valid = Array.from({ length: A.count }, (_, i) => luhn(A.imeis[i]));
const modelName = Array.from({ length: A.count }, (_, i) => A.modelDict[A.model[i]] || "");
const bySnr = new Map();
for (let i = 0; i < A.count; i++) {
  const key = A.imeis[i].slice(0, 8) + "|" + A.imeis[i].slice(8, 14);
  if (!bySnr.has(key)) bySnr.set(key, []);
  bySnr.get(key).push(i);
}

function intersect(a, b) {
  const out = [];
  for (const value of a) if (b.has(value)) out.push(value);
  return out;
}

const seen = new Set();
const candidates = [];
for (let i = 0; i < A.count; i++) {
  const tac = A.imeis[i].slice(0, 8);
  const snr = Number(A.imeis[i].slice(8, 14));
  for (let delta = 1; delta <= 5; delta++) {
    for (const direction of [1, -1]) {
      const target = snr + delta * direction;
      if (target < 0 || target > 999999) continue;
      const key = tac + "|" + String(target).padStart(6, "0");
      for (const j of bySnr.get(key) || []) {
        if (j <= i) continue;
        const id = i + "-" + j;
        if (seen.has(id)) continue;
        seen.add(id);
        const a = info[i];
        const b = info[j];
        const sharedDays = intersect(a.days, b.days);
        const sharedTabs = intersect(a.tabs, b.tabs).map((t) => E.tabDict[t]);
        const sharedLocs = intersect(a.locs, b.locs);
        let rowNear = false;
        for (const ta of a.tabs) {
          for (const tb of b.tabs) {
            if (ta !== tb) continue;
            for (const ra of a.rows) {
              for (const rb of b.rows) {
                if (Math.abs(ra - rb) <= 2) rowNear = true;
              }
            }
          }
        }
        const modelEqual = A.model[i] === A.model[j];
        const bothSold = a.sold && b.sold;
        const bothValid = valid[i] && valid[j];
        let score = delta === 1 ? 40 : delta <= 3 ? 20 : 10;
        if (modelEqual) score += 15;
        if (bothValid) score += 5;
        if (sharedDays.length) score += 10;
        if (bothSold) score += 10;
        if (sharedTabs.length) score += 5;
        if (rowNear) score += 8;
        if (sharedLocs.length) score += 25;
        if (score < 60) continue;
        const high = sharedLocs.length > 0 || (rowNear && bothSold && sharedDays.length > 0);
        const tier = high ? "high" : bothSold && sharedDays.length ? "review" : "watch";
        candidates.push({
          pairId: "DS-" + String(candidates.length + 1).padStart(5, "0"),
          imei1: A.imeis[i],
          imei2: A.imeis[j],
          tac,
          snrDelta: delta * direction,
          model: modelName[i],
          sharedDays: sharedDays.slice(0, 6),
          sharedTabs: sharedTabs.slice(0, 6),
          sharedRows: sharedLocs.slice(0, 6),
          bothSold,
          bothValid,
          rowNear,
          score,
          tier
        });
      }
    }
  }
}

candidates.sort((x, y) => y.score - x.score || x.pairId.localeCompare(y.pairId));
candidates.forEach((c, n) => { c.pairId = "DS-" + String(n + 1).padStart(5, "0"); });

function csv(value) {
  const text = Array.isArray(value) ? value.join(" / ") : value == null ? "" : String(value);
  return /[",\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
}

const header = ["pair_id", "imei_1", "imei_2", "tac", "snr_delta", "model", "shared_day", "shared_tab", "shared_row", "both_sold", "score", "tier", "status"];
const rows = candidates
  .filter((c) => c.tier !== "watch")
  .map((c) => [c.pairId, c.imei1, c.imei2, c.tac, c.snrDelta, c.model, c.sharedDays, c.sharedTabs, c.sharedRows, c.bothSold, c.score, c.tier, "unverified"].map(csv).join(","));
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "candidates.json"), JSON.stringify({ generatedAt: new Date().toISOString(), dataVersion: M.dataVersion, count: candidates.length, candidates }, null, 2));
fs.writeFileSync(path.join(outDir, "worklist.csv"), [header.join(","), ...rows].join("\n") + "\n");
fs.writeFileSync(path.join(outDir, "worklist.js"), "window.AMAYA_WORKLIST=" + JSON.stringify(candidates.filter((c) => c.tier !== "watch").map((c) => ({
  pairId: c.pairId, imei1: c.imei1, imei2: c.imei2, model: c.model,
  score: c.score, tier: c.tier, bothSold: c.bothSold,
  sharedDays: c.sharedDays, sharedTabs: c.sharedTabs, sharedRows: c.sharedRows
}))) + ";\n");

const counts = candidates.reduce((acc, c) => { acc[c.tier] = (acc[c.tier] || 0) + 1; return acc; }, {});
console.log("dataVersion", M.dataVersion);
console.log("candidates", candidates.length, counts);
console.log("worklist rows", rows.length);
console.log("written to", outDir);
