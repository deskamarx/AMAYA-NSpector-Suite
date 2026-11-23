import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "data");
const files = ["meta.json", "assets.json", "events.json"];
const hashes = {};
for (const name of files) {
  const bytes = fs.readFileSync(path.join(dataDir, name));
  hashes[name] = {
    bytes: bytes.length,
    sha256: crypto.createHash("sha256").update(bytes).digest("hex")
  };
}
const meta = JSON.parse(fs.readFileSync(path.join(dataDir, "meta.json"), "utf8"));
const manifestPath = path.join(root, "update", "manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
manifest.files = hashes;
manifest.dataVersion = meta.dataVersion;
manifest.dataSeq = meta.dataSeq;
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
fs.writeFileSync(path.join(root, "update", "integrity.json"), JSON.stringify({
  dataVersion: meta.dataVersion,
  dataSeq: meta.dataSeq,
  generatedAt: new Date().toISOString(),
  files: hashes
}, null, 2) + "\n");
console.log("integrity written for", files.join(", "));
