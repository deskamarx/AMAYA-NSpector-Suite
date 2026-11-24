/** curate-themes.js — narrow AMAYA's theme picker to three polished finishes.
 *
 * The vendored Control Center ships six dark/light finishes plus "Follow system".
 * We keep only the three that are visually distinct and production-polished:
 * AMAYA Standard (aurora), Graphite and Paper. The script is idempotent so it
 * can be re-run after refreshing the vendor snapshot.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REACT = path.join(ROOT, 'vendor', 'amaya', 'assets', 'index-7236c35e.js');
const GLASS = path.join(ROOT, 'vendor', 'amaya', 'assets', 'amaya-glass-bce0f781.js');
const DEMO = path.join(ROOT, 'vendor', 'amaya', 'amaya-glass-demo.html');

function read(file) { return fs.readFileSync(file, 'utf8'); }
function write(file, text, label) {
  fs.writeFileSync(file, text);
  console.log('  curated ' + label);
}

// React theme studio: remove Steel and Overtime, and drop "Follow system".
let react = read(REACT);
const steelAt = react.indexOf(',{id:"steel",');
if (steelAt !== -1) {
  const graphiteAt = react.indexOf(',{id:"graphite",', steelAt);
  if (graphiteAt === -1) throw new Error('Could not locate Graphite theme entry');
  react = react.slice(0, steelAt) + react.slice(graphiteAt);
}
const follow = ',{value:Sr,label:"Follow system",hint:"Light or dark, whichever this device is set to.",swatch:"#0f172a",swatch2:"#e2e8f0",light:!1}';
react = react.replace(follow, '');
write(REACT, react, 'React theme studio');

// Glass quick-toggle: cycle only the matching three finishes.
let glass = read(GLASS);
glass = glass.replace(
  'var GLASS_THEMES = ["aurora", "midnight", "steel", "graphite", "paper", "solar"];',
  'var GLASS_THEMES = ["aurora", "graphite", "paper"];'
);
write(GLASS, glass, 'glass theme toggle');

// Standalone concept page: keep it consistent with the shipped app.
let demo = read(DEMO);
demo = demo.replace(
  /const themeThemes = \[[\s\S]*?\n\];/,
  [
    'const themeThemes = [',
    "  { id: 'aurora', label: 'AMAYA Standard', accent: '#38bdf8', accentRgb: '56,189,248', accent2: '#a78bfa' },",
    "  { id: 'graphite', label: 'Graphite', accent: '#a3c4bc', accentRgb: '163,196,188', accent2: '#e8b4a0' },",
    "  { id: 'paper', label: 'Paper', accent: '#0f766e', accentRgb: '15,118,110', accent2: '#b45309' }",
    '];'
  ].join('\n')
);
demo = demo.replace('Six theme finishes plus accent control', 'Three curated theme finishes plus accent control');
write(DEMO, demo, 'glass concept demo');

console.log('Theme picker now offers: AMAYA Standard, Graphite, Paper.');
