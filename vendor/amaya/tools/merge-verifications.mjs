import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "data");
const outDir = path.join(root, "verification");
const candidatesFile = path.join(outDir, "candidates.json");
const inputFile = path.join(outDir, "verifications.csv");
const outputFile = path.join(dataDir, "verifications.json");

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n") { row.push(cell.replace(/\r$/, "")); rows.push(row); row = []; cell = ""; }
    else cell += ch;
  }
  if (cell.length || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((v) => v !== ""));
}

const meta = JSON.parse(fs.readFileSync(path.join(dataDir, "meta.json"), "utf8"));
const candidates = JSON.parse(fs.readFileSync(candidatesFile, "utf8")).candidates;
const known = new Set(candidates.map((c) => c.pairId));
const rows = parseCsv(fs.readFileSync(inputFile, "utf8"));
const header = rows.shift() || [];
const index = Object.fromEntries(header.map((h, i) => [h.trim(), i]));
const required = ["pair_id", "status", "proof_type", "evidence_ref", "checked_at", "checked_by"];
for (const field of required) {
  if (!(field in index)) {
    console.error("missing required column:", field);
    process.exit(1);
  }
}

const records = [];
const errors = [];
for (const row of rows) {
  const get = (field) => (row[index[field]] || "").trim();
  const pairId = get("pair_id");
  const status = get("status");
  if (!pairId) continue;
  if (!known.has(pairId)) { errors.push("unknown pair_id " + pairId); continue; }
  if (!["confirmed_same_device", "confirmed_distinct", "needs_source", "unverified"].includes(status)) {
    errors.push("invalid status for " + pairId + ": " + status);
    continue;
  }
  if (status === "confirmed_same_device" && !get("evidence_ref")) {
    errors.push("confirmed pair without evidence_ref: " + pairId);
    continue;
  }
  const candidate = candidates.find((c) => c.pairId === pairId);
  records.push({
    pairId,
    imei1: candidate.imei1,
    imei2: candidate.imei2,
    status,
    proofType: get("proof_type"),
    evidenceRef: get("evidence_ref"),
    checkedAt: get("checked_at"),
    checkedBy: get("checked_by"),
    notes: get("notes")
  });
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

const summary = records.reduce((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc; }, {});
fs.writeFileSync(outputFile, JSON.stringify({
  dataVersion: meta.dataVersion,
  generatedAt: new Date().toISOString(),
  count: records.length,
  summary,
  records
}, null, 2) + "\n");
console.log("wrote", outputFile, records.length, "records", summary);
