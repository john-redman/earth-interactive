import { page, footer, R, ICON, URL_TXT } from './tpl.mjs';
import { renderAll } from './render.mjs';
const only = process.argv[2]?.split(',');
// raw hero: 2000x2000, globe centred, radius ~878px
const GR = 878;
const globe = (src, cx, cy, r, extra = '') => { const s = r / GR, size = 2000 * s; return `<img class="img" src="${R}${src}.png" style="left:${cx - size / 2}px;top:${cy - size / 2}px;width:${size}px;height:${size}px;-webkit-mask-image:radial-gradient(closest-side,#000 90%,transparent 100%);mask-image:radial-gradient(closest-side,#000 90%,transparent 100%);${extra}">`; };
const headline = 'See how big countries <span class="accent">really</span> are';
const sub = 'Spin a true-to-scale 3D globe, compare any two countries and play the daily geography challenge.';
const jobs = [];
// ---------- profile pictures ----------
for (const s of [1080, 400]) {
  jobs.push({ out: `profile/pfp-icon-${s}.png`, w: s, h: s, html: page(s, s, `<img class="img" src="${ICON}" style="left:0;top:0;width:${s}px;height:${s}px">`) });
  jobs.push({ out: `profile/pfp-globe-${s}.png`, w: s, h: s, html: page(s, s, globe('hero_euaf', s / 2, s / 2, s * 0.43)) });
}
jobs.push({ out: 'profile/discord-server-icon-512.png', w: 512, h: 512, html: page(512, 512, `<img class="img" src="${ICON}" style="left:0;top:0;width:512px;height:512px">`) });
jobs.push({ out: 'profile/producthunt-thumbnail-240.png', w: 240, h: 240, html: page(240, 240, `<img class="img" src="${ICON}" style="left:0;top:0;width:240px;height:240px">`) });

// ---------- banners ----------
// 3:1 header (X, Mastodon; Bluesky at 2x)
const header31 = (w, h) => page(w, h, `
  ${globe('hero_euaf', w * 0.79, h * 0.62, h * 0.70)}
  <div class="abs" style="left:${w * 0.065}px;top:${h * 0.16}px;width:${w * 0.52}px">
    ${footer(h * 0.055, `margin-bottom:${h * 0.05}px;color:#fff`)}
    <h1 style="font-size:${h * 0.13}px">${headline}</h1>
    <p class="sub" style="font-size:${h * 0.047}px;margin-top:${h * 0.045}px;max-width:${w * 0.42}px">${sub}</p>
    <p class="url" style="font-size:${h * 0.044}px;margin-top:${h * 0.04}px">${URL_TXT}</p>
  </div>`);
jobs.push({ out: 'banners/x-header-1500x500.jpg', w: 1500, h: 500, html: header31(1500, 500), q: 90 });
jobs.push({ out: 'banners/mastodon-header-1500x500.jpg', w: 1500, h: 500, html: header31(1500, 500), q: 90 });
jobs.push({ out: 'banners/bluesky-banner-3000x1000.jpg', w: 1500, h: 500, dsf: 2, html: header31(1500, 500), q: 86 });
// YouTube 2560x1440, safe area 1546x423 centred (x 507-2053, y 508-931)
jobs.push({ out: 'banners/youtube-channel-art-2560x1440.jpg', w: 2560, h: 1440, q: 88, html: page(2560, 1440, `
  ${globe('hero_euaf', 1930, 720, 600)}
  <div class="abs" style="left:560px;top:548px;width:740px">
    ${footer(30, 'margin-bottom:18px;color:#fff')}
    <h1 style="font-size:76px">${headline}</h1>
    <p class="url" style="font-size:30px;margin-top:22px">New true-size compares every Tuesday</p>
  </div>`) });
// Facebook cover 851x315 rendered @2x; keep content within central 640px (mobile crops ~90px each side... and shows 640x360)
jobs.push({ out: 'banners/facebook-cover-1702x630.jpg', w: 851, h: 315, dsf: 2, q: 90, html: page(851, 315, `
  ${globe('hero_euaf', 700, 180, 200)}
  <div class="abs" style="left:110px;top:58px;width:420px">
    ${footer(15, 'margin-bottom:12px;color:#fff')}
    <h1 style="font-size:36px;max-width:400px">${headline}</h1>
    <p class="url" style="font-size:14px;margin-top:14px">Free 3D globe · no sign-up · daily challenge</p>
  </div>`) });
// LinkedIn personal background 1584x396: avatar covers the lower-left, so text sits centre-right
jobs.push({ out: 'banners/linkedin-banner-1584x396.jpg', w: 1584, h: 396, q: 90, html: page(1584, 396, `
  ${globe('hero_euaf', 1420, 230, 290)}
  <div class="abs" style="left:520px;top:70px;width:640px">
    ${footer(22, 'margin-bottom:14px;color:#fff')}
    <h1 style="font-size:52px">${headline}</h1>
    <p class="url" style="font-size:21px;margin-top:16px">A free true-to-scale 3D globe · no sign-up</p>
  </div>`) });
// Reddit profile banner 1920x384: edges crop on mobile, keep text inside the centre ~1200px
jobs.push({ out: 'banners/reddit-banner-1920x384.jpg', w: 1920, h: 384, q: 90, html: page(1920, 384, `
  ${globe('hero_euaf', 1380, 250, 300)}
  <div class="abs" style="left:420px;top:92px;width:700px">
    <h1 style="font-size:54px">${headline}</h1>
    <p class="url" style="font-size:22px;margin-top:16px">EarthInteractive · ${URL_TXT}</p>
  </div>`) });
// 16:9 banners: Discord server banner, Pinterest profile cover
const wide169 = (w, h) => page(w, h, `
  ${globe('hero_euaf', w * 0.77, h * 0.5, h * 0.42)}
  <div class="abs" style="left:${w * 0.07}px;top:${h * 0.3}px;width:${w * 0.46}px">
    ${footer(h * 0.032, `margin-bottom:${h * 0.03}px;color:#fff`)}
    <h1 style="font-size:${h * 0.085}px">${headline}</h1>
    <p class="sub" style="font-size:${h * 0.028}px;margin-top:${h * 0.03}px;max-width:${w * 0.4}px">${sub}</p>
    <p class="url" style="font-size:${h * 0.026}px;margin-top:${h * 0.025}px">${URL_TXT}</p>
  </div>`);
jobs.push({ out: 'banners/discord-server-banner-1920x1080.jpg', w: 1920, h: 1080, q: 88, html: wide169(1920, 1080) });
jobs.push({ out: 'banners/pinterest-cover-1600x900.jpg', w: 1600, h: 900, q: 88, html: wide169(1600, 900) });
await renderAll(only ? jobs.filter(j => only.some(o => j.out.includes(o))) : jobs);
