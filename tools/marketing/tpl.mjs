// Shared template helpers for composed marketing images.
import { FONT_CSS, BASE } from './lib.mjs';
import { SITE } from '../site.config.mjs';
export const R = BASE + 'tools/marketing/.work/raw/';
export const ICON = BASE + 'icons/icon.svg';
/** The address printed on every image: follows tools/site.config.mjs, so a domain change is one re-render away. */
export const URL_TXT = SITE.url.replace(/^https?:\/\//, '').replace(/\/$/, '');
export const BASE_CSS = `${FONT_CSS}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:100%;height:100%;overflow:hidden}
body{font-family:'Plus Jakarta Sans',system-ui,sans-serif;color:#f2f3ff;-webkit-font-smoothing:antialiased;
  background:radial-gradient(120% 90% at 50% 45%,#0d1030 0%,#070920 45%,#03040b 100%);position:relative}
.abs{position:absolute}
.img{position:absolute;display:block}
.brand{display:flex;align-items:center;gap:.5em;font-weight:700;letter-spacing:.01em}
.mark{width:1em;height:1em;border-radius:50%;flex:none;background:radial-gradient(circle at 35% 30%,#c8e6ff,#4f8dff 45%,#6a2bd8);box-shadow:0 0 .6em rgba(90,130,255,.7)}
.url{color:rgba(226,230,255,.75);font-weight:600}
.accent{color:#b98aff}
h1{font-weight:800;letter-spacing:-.02em;line-height:1.04}
.sub{color:rgba(226,230,255,.78);font-weight:500;line-height:1.35}
.chip{display:inline-flex;align-items:center;gap:.45em;padding:.35em .8em;border-radius:999px;background:rgba(14,16,38,.72);border:1px solid rgba(255,255,255,.16);font-weight:700}
.dot{width:.75em;height:.75em;border-radius:4px;flex:none}
.pill{display:inline-block;padding:.32em .9em;border-radius:999px;background:#9645f8;color:#fff;font-weight:700}
.shade-top{position:absolute;left:0;right:0;top:0;background:linear-gradient(#03040bf2 0%,#03040bcc 55%,#03040b00 100%)}
.shade-bot{position:absolute;left:0;right:0;bottom:0;background:linear-gradient(#03040b00 0%,#03040bd9 55%,#03040bf5 100%)}
`;
export const page = (w, h, body, css = '') => `<!doctype html><html><head><meta charset="utf-8"><style>${BASE_CSS}${css}</style></head><body style="width:${w}px;height:${h}px">${body}</body></html>`;
export const footer = (size = 30, extra = '') => `<div class="brand" style="font-size:${size}px;${extra}"><span class="mark"></span>EarthInteractive</div>`;
export const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
