import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const mediaRoot = path.join(root, "media", "devices");
const found = [];
for (const brand of fs.readdirSync(mediaRoot)) {
  const dir = path.join(mediaRoot, brand);
  if (!fs.statSync(dir).isDirectory()) continue;
  for (const name of fs.readdirSync(dir)) {
    if (name.toLowerCase().endsWith(".webp")) found.push("/media/devices/" + brand + "/" + name);
  }
}
found.sort();
const out = "window.__AMAYA_DEVICE_MEDIA=new Set(" + JSON.stringify(found) + ");\n";
fs.writeFileSync(path.join(root, "assets", "device-media.js"), out);
console.log("device media files:", found.length);
