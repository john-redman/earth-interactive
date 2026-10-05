// Copies the publishable web app (the same files the GitHub Pages workflow publishes) into app/www,
// which Capacitor bundles into the Android and iOS apps. Run from app/: `npm run sync:web`.
//
// Differences from the website build:
//  - sw.js is left out. Service workers don't run in iOS's WKWebView (capacitor:// scheme), and the
//    app already ships every file locally, so there is nothing to cache. main.js skips registration
//    on hostname "localhost", which is what both Capacitor schemes use, so nothing breaks either way.
//  - www/js/platform.js is written and loaded first, so CSS and scripts can tell they run in the app
//    (`<html data-platform="native">`, `window.EI_PLATFORM === 'native'`). js/native.js also checks
//    window.Capacitor directly, so this is a convenience, not a requirement.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = path.resolve(appDir, '..');
const www = path.join(appDir, 'www');

// Keep in step with .github/workflows/pages.yml (minus sw.js).
const FILES = ['index.html', 'manifest.webmanifest', 'og-image.png', 'LICENSE', 'THIRD_PARTY_NOTICES.md'];
const DIRS = ['css', 'js', 'data', 'vendor', 'icons'];

fs.rmSync(www, { recursive: true, force: true });
fs.mkdirSync(www, { recursive: true });

for (const f of FILES) {
  const src = path.join(root, f);
  if (!fs.existsSync(src)) { console.warn(`! missing ${f}, skipped`); continue; }
  fs.copyFileSync(src, path.join(www, f));
}
for (const d of DIRS) {
  fs.cpSync(path.join(root, d), path.join(www, d), { recursive: true, filter: src => !/(^|[\\/])\.DS_Store$/.test(src) });
}

// Native marker, loaded before any module.
fs.writeFileSync(path.join(www, 'js', 'platform.js'),
  `// Written by app/scripts/sync-web.mjs. Only exists inside the native app.
window.EI_PLATFORM = 'native';
document.documentElement.dataset.platform = 'native';
`);

const indexPath = path.join(www, 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');
const tag = '<script src="js/platform.js"></script>';
if (!html.includes('</head>')) throw new Error('index.html has no </head>');
html = html.replace('</head>', `  ${tag}\n</head>`);
fs.writeFileSync(indexPath, html);

let bytes = 0, count = 0;
const walk = dir => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p); else { bytes += fs.statSync(p).size; count++; }
  }
};
walk(www);
console.log(`✓ www: ${count} files, ${(bytes / 1e6).toFixed(1)} MB`);
