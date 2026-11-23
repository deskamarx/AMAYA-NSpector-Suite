import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

for (const name of [
  "manifest.webmanifest",
  "update/manifest.json",
  "update/integrity.json",
  "data/meta.json",
  "data/assets.json",
  "data/events.json",
  "data/verifications.json",
  "verification/candidates.json"
]) {
  try {
    JSON.parse(read(name));
    console.log("OK   json " + name);
  } catch (e) {
    failures.push("bad json " + name + ": " + e.message);
  }
}

const BASE = "/amaya-imei-control-center";

const html = read("index.html");
for (const match of html.matchAll(/(?:src|href)="([^"#]+)"/g)) {
  let ref = match[1];
  if (!ref.startsWith("/") && !ref.startsWith("./")) continue;
  if (ref.startsWith(BASE + "/")) ref = ref.slice(BASE.length);
  const file = (ref.startsWith("./") ? ref.slice(2) : ref.slice(1)).split("?")[0];
  if (!fs.existsSync(path.join(root, file))) failures.push("missing html ref " + ref);
}
console.log("OK   html references");

const sw = read("sw.js");
for (const match of sw.matchAll(/"(\/[^"\s]+)"/g)) {
  let ref = match[1];
  if (ref.includes("${") || ref === "/active-data" || ref === "/data/" || ref === "/update/") continue;
  if (ref === BASE) continue;
  if (ref.startsWith(BASE + "/")) ref = ref.slice(BASE.length);
  if (!fs.existsSync(path.join(root, ref.slice(1)))) failures.push("missing shell ref " + ref);
}
console.log("OK   service worker shell references");

for (const name of [
  "sw.js",
  "assets/device-media.js",
  "assets/verify.js",
  "verification/worklist.js"
]) {
  try {
    new Function(read(name));
    console.log("OK   js " + name);
  } catch (e) {
    failures.push("bad js " + name + ": " + e.message);
  }
}

const bundle = read("assets/index-7236c35e.js");
for (const needle of [
  'crypto.subtle.digest("SHA-256"',
  '"imei.lock.attempts"',
  "__AMAYA_DEVICE_MEDIA",
  'id="${sid}"'
]) {
  if (!bundle.includes(needle)) failures.push("bundle missing " + needle);
}
console.log("OK   bundle integrity, throttle, media gate, svg ids");

if (!read("netlify.toml").includes("frame-ancestors")) failures.push("netlify.toml missing CSP");
if (!read("edge/worker.js").includes("X-Frame-Options")) failures.push("edge worker missing security headers");
console.log("OK   deploy header configs");

const manifest = JSON.parse(read("update/manifest.json"));
const meta = JSON.parse(read("data/meta.json"));
if (manifest.dataVersion !== meta.dataVersion) failures.push("manifest/meta dataVersion mismatch");
if (manifest.dataSeq !== meta.dataSeq) failures.push("manifest/meta dataSeq mismatch");
console.log("OK   manifest/meta agreement");

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("build check passed");
