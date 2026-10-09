// Rebuilds the marketing kit (marketing/) and the link-preview image (og-image.png) from the live app.
//   node tools/marketing/run.mjs                 everything (about an hour headless: the app renders in software)
//   node tools/marketing/run.mjs compose contact  only re-render the composed images (fast; e.g. after a domain
//                                                 change, since every image prints SITE.url from tools/site.config.mjs)
// Steps: capture (raw app shots into .work/raw) · compose (posts, stories, banners, gallery, profile) · video
// (3 vertical clips, needs ffmpeg) · og (og-image.png) · contact (contact sheet, needs ImageMagick).
// Needs Playwright (PLAYWRIGHT=/path/to/playwright/index.mjs if it isn't installed here). Serves the repo itself.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { spawn } from 'node:child_process';

const ROOT = new URL('../../', import.meta.url).pathname, PORT = +(process.env.MK_PORT || 8765);
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; }
  fs.readFile(f, (err, buf) => {
    if (err) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }).end(buf);
  });
});
await new Promise(r => server.listen(PORT, '127.0.0.1', r));
const env = { ...process.env, MK_BASE: `http://127.0.0.1:${PORT}/` };

const STEPS = {
  capture: ['capture.mjs', 'recap.mjs', 'stories.mjs', 'hex.mjs'],
  compose: ['brand.mjs', 'gallery.mjs', 'posts.mjs'],
  video: [['video.mjs', 'v01'], ['video.mjs', 'v02'], ['video.mjs', 'v03']],
  og: ['og.mjs'],
  contact: ['contact.mjs'],
};
const ORDER = ['capture', 'compose', 'video', 'og', 'contact'];
const want = process.argv.slice(2);
const todo = want.length && !want.includes('all') ? ORDER.filter(k => want.includes(k)) : ORDER;
const runStep = (file, args) => new Promise(res => spawn(process.execPath, [new URL(file, import.meta.url).pathname, ...args], { stdio: 'inherit', env }).on('exit', res));
outer: for (const k of todo) for (const step of STEPS[k]) {
  const [file, ...args] = [].concat(step), t0 = Date.now();
  console.log(`\n▶ ${k}: ${file} ${args.join(' ')}`);
  const code = await runStep(file, args);
  if (code) { console.error(`✗ ${file} exited with ${code}`); process.exitCode = 1; break outer; }
  console.log(`✓ ${file} ${args.join(' ')} (${Math.round((Date.now() - t0) / 1000)} s)`);
}
server.close();
