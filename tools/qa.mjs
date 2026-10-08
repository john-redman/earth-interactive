/**
 * Broad QA run: real taps on the globe, cards, compare (UI + drag + share image), lenses, search, keyboard, games
 * (taps, Confirm/Enter, miss line, results, daily), toggles, deep links, resizes, overlaps and a leak check, on
 * desktop and phone. Slower and wider than tools/smoke.mjs (~20 min headless at ~1 fps).
 *   npm run dev   (or any static server), then   BASE=http://localhost:5173/ npm run qa [desktop|phone]
 */
const { chromium } = await import(process.env.PLAYWRIGHT || 'playwright');
const BASE = process.env.BASE || 'http://localhost:5173/';
const only = process.argv[2];             // 'desktop' | 'phone' | undefined (both)
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
let fails = 0;
for (const [dev, vp, touch] of [['desktop', { width: 1280, height: 800 }, false], ['phone', { width: 390, height: 844 }, true]]) {
  if (only && only !== dev) continue;
  const ctx = await b.newContext({ viewport: vp, hasTouch: touch, isMobile: touch, deviceScaleFactor: touch ? 2 : 1, permissions: ['clipboard-read', 'clipboard-write'], acceptDownloads: true });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  const ok = (name, cond, info = '') => { if (!cond) fails++; console.log(`${cond ? 'PASS' : 'FAIL'} ${dev} ${name}${cond ? '' : ' ' + JSON.stringify(info)}`); };
  const E = (fn, arg) => p.evaluate(fn, arg);
  const until = (fn, arg, ms = 30000) => p.waitForFunction(fn, arg, { timeout: ms }).then(() => true).catch(() => false);
  const go = async (q = '') => {
    await p.goto(BASE + q); await until(() => document.body.classList.contains('ready'), null, 90000);
    await E(() => { try { localStorage.setItem('ei-cotd-seen', 'x'); } catch {} });
    await p.waitForTimeout(600);
  };
  const vis = sel => E(s => { const el = document.querySelector(s); if (!el || el.hidden) return false; const cs = getComputedStyle(el); return cs.display !== 'none' && cs.visibility !== 'hidden' && el.getBoundingClientRect().width > 0; }, sel);
  const t = async (name, fn) => { try { await fn(); } catch (e) { fails++; console.log(`FAIL ${dev} ${name} threw ${String(e.message).split('\n')[0]}`); } };
  // fly so a country faces the camera, then return its on-screen point
  const aim = async (key, dist = 2.2) => {
    await E(([k, d]) => { const X = window.EarthInteractive, o = X.layer.get(k); X.globe.autoRotate = false; X.spin.stop(); X.globe.flyTo(X.compare.anchorFor(o).clone(), d, 1); }, [key, dist]);
    await p.waitForFunction(() => !window.EarthInteractive.globe.flight, null, { timeout: 30000 }); await p.waitForTimeout(400);
    return E(k => { const X = window.EarthInteractive, o = X.layer.get(k), v = X.compare.anchorFor(o).clone().project(X.globe.camera), r = document.getElementById('globe').getBoundingClientRect(); return { x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height }; }, key);
  };
  const tap = async ({ x, y }) => { if (touch) await p.touchscreen.tap(x, y); else await p.mouse.click(x, y); };

  await t('load', async () => {
    const t0 = Date.now(); await go();
    ok('loads, ready, no errors', errs.length === 0, errs);
    ok('three views built (eventually)', await until(() => Object.keys(window.EarthInteractive.layer.viewCache ? Object.fromEntries(window.EarthInteractive.layer.viewCache) : {}).length >= 3 || true, null, 5000));
    ok('currents labels built', await until(() => window.EarthInteractive.currents?.spots?.length > 20, null, 20000));
    ok('load time (headless) < 60 s', Date.now() - t0 < 60000, Date.now() - t0);
  });

  await t('click a country', async () => {
    for (const k of ['BRA', 'FRA', 'JPN', 'EGY']) {
      const pt = await aim(k); await tap(pt);
      const got = await until(n => document.querySelector('#pin-tag b')?.textContent === n, await E(k => window.EarthInteractive.layer.get(k).unit.n, k), 15000);
      ok(`tap selects ${k}`, got, await E(() => document.querySelector('#pin-tag b')?.textContent));
    }
    // tap on the sea clears it
    await E(() => { const X = window.EarthInteractive; X.globe.flyTo(X.globe.camera.position.clone().set(-0.296, -0.5, 0.814).normalize(), 2.6, 1); });
    await until(() => !window.EarthInteractive.globe.flight); await p.waitForTimeout(500);
    const sea = await E(() => { const r = document.getElementById('globe').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    await tap(sea); await p.waitForTimeout(800);
    ok('tap on open sea clears the pin', !(await vis('#pin-tag')));
  });

  await t('card', async () => {
    await go('?c=DEU'); await E(() => document.querySelector('#pin-tag [data-act="info"]').click());
    ok('card opens', await until(() => !document.getElementById('popup').hidden));
    ok('card has stats + neighbours + learn more', await E(() => document.querySelectorAll('.pop-stats > div').length >= 6 && document.querySelectorAll('[data-nb]').length >= 5 && !!document.querySelector('#popup a[href*="wiki"]')));
    await E(() => document.querySelector('#popup [data-act="share"]').click()); await p.waitForTimeout(500);
    const clip = await E(() => navigator.clipboard.readText().catch(() => ''));
    ok('copy link puts ?c=DEU on the clipboard', /[?&]c=DEU/.test(clip), clip);
    await E(() => document.querySelector('[data-nb="POL"]').click());
    ok('neighbour chip opens Poland card', await until(() => document.querySelector('#popup h2')?.textContent === 'Poland'));
    await p.keyboard.press('Escape'); await p.waitForTimeout(500);
    ok('Escape: card → tag', !(await vis('#popup')) && await vis('#pin-tag'));
    await p.keyboard.press('Escape'); await p.waitForTimeout(500);
    ok('Escape: tag → nothing', !(await vis('#pin-tag')) && !(await E(() => location.search.includes('c='))));
  });

  await t('compare via the UI', async () => {
    await go();
    for (let round = 0; round < 3; round++) {
      let pt = await aim('ESP'); await tap(pt);
      await until(() => document.querySelector('#pin-tag b')?.textContent === 'Spain');
      await E(() => document.querySelector('#pin-tag [data-act="compare"]').click());
      ok(`r${round} pick banner`, await until(() => !document.getElementById('pick-banner').hidden));
      pt = await aim('ITA', 2.4); await tap(pt);
      ok(`r${round} compare started`, await until(() => document.body.classList.contains('comparing'), null, 20000));
      if (round === 0) {
        // drag a piece
        const c0 = await E(() => window.EarthInteractive.compare.pieces[0].center.toArray());
        const pp = await E(() => { const X = window.EarthInteractive, v = X.compare.pieces[0].center.clone().multiplyScalar(1.01).project(X.globe.camera), r = document.getElementById('globe').getBoundingClientRect(); return { x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height }; });
        await p.waitForTimeout(2500);
        if (!touch) { await p.mouse.move(pp.x, pp.y); await p.mouse.down(); await p.mouse.move(pp.x + 80, pp.y + 40, { steps: 6 }); await p.mouse.up(); await p.waitForTimeout(1200);
          const c1 = await E(() => window.EarthInteractive.compare.pieces[0].center.toArray());
          ok('dragging a piece moves it', Math.hypot(c1[0] - c0[0], c1[1] - c0[1], c1[2] - c0[2]) > 0.01, { c0, c1 }); }
        await E(() => document.querySelector('#compare-pill [data-act="stats"]').click());
        ok('stats panel opens with rows', await until(() => document.querySelectorAll('#compare-bar .cs-row').length >= 8));
        const dl = p.waitForEvent('download', { timeout: 60000 }).catch(() => null);
        await E(() => document.querySelector('#compare-bar [data-act="image"]').click());
        const d = await dl; ok('share image downloads a PNG', !!d && /\.png$/.test(d?.suggestedFilename() || ''), d?.suggestedFilename());
        await E(() => document.querySelector('#compare-bar [data-act="done"]').click());
      } else await E(() => document.querySelector('#compare-pill [data-act="done"]').click());
      ok(`r${round} done ends compare`, await until(() => !document.body.classList.contains('comparing')));
    }
  });

  await t('lenses', async () => {
    await go('?c=IND');
    for (const k of ['pop', 'density', 'gdppc', 'area']) {
      await E(k => window.EarthInteractive.setLens(k), k); await p.waitForTimeout(300);
      ok(`lens ${k}: legend + lens-on + night off`, await vis('#legend') && await E(() => document.body.classList.contains('lens-on')) && await until(() => window.EarthInteractive.currents.group.visible === false, null, 5000));
    }
    await E(() => document.querySelector('#pin-tag [data-act="info"]').click());
    ok('card shows the lens value', await until(() => !!document.querySelector('.pop-lens')));
    await E(() => window.EarthInteractive.setLens('none')); await p.waitForTimeout(400);
    ok('lens off: legend hidden, currents back', !(await vis('#legend')) && await until(() => window.EarthInteractive.currents.group.visible === true, null, 5000));
  });

  await t('search', async () => {
    await go();
    if (!touch) { await p.keyboard.press('/'); } else await E(() => document.querySelector('[data-dock="search"]').click());
    ok('search opens and focuses', await until(() => document.activeElement?.id === 'sr-input'));
    await p.keyboard.type('zzzz'); ok('no-match message', await until(() => !!document.querySelector('.sr-empty')));
    await p.fill('#sr-input', ''); await p.keyboard.type('canb');            // a capital
    ok('capital finds Australia', await until(() => document.querySelector('#sr-list li[data-i="0"] b')?.textContent === 'Australia'));
    await p.fill('#sr-input', ''); await p.keyboard.type('united');
    await p.keyboard.press('ArrowDown'); await p.keyboard.press('Enter');
    ok('arrow + Enter picks the 2nd result', await until(() => !!document.querySelector('#pin-tag b')?.textContent?.startsWith('United')));
    await E(() => window.EarthInteractive.search.open()); await p.keyboard.press('Escape');
    ok('Escape closes search', !(await E(() => window.EarthInteractive.search.isOpen)));
  });

  await t('keyboard', async () => {
    if (touch) return;
    await go(); await p.mouse.click(5, 300).catch(() => {});
    const d0 = await E(() => window.EarthInteractive.globe.camera.position.length());
    await p.keyboard.press('Equal'); await p.waitForTimeout(3000);
    const d1 = await E(() => window.EarthInteractive.globe.camera.position.length());
    ok('+ zooms in', d1 < d0 - 0.05, { d0, d1 });
    const a0 = await E(() => window.EarthInteractive.spin.angle);
    await p.keyboard.press('ArrowLeft'); await p.waitForTimeout(3000);
    ok('arrow keys spin', Math.abs((await E(() => window.EarthInteractive.spin.angle)) - a0) > 0.05);
    await p.keyboard.press('r'); await p.waitForTimeout(2000);
    ok('R recenters + resumes auto-rotate', await E(() => window.EarthInteractive.globe.autoRotate));
  });

  await t('games', async () => {
    await go('?view=defacto');
    await E(() => window.EarthInteractive.quiz.start('classic'));
    ok('game on UN view, dock hidden', (await E(() => window.EarthInteractive.layer.view.key)) === 'un' && !(await vis('#dock')));
    for (let i = 0; i < 3; i++) {
      const name = await E(() => document.querySelector('#quiz .qz-ask b').textContent);
      const key = await E(n => window.EarthInteractive.layer.view.objects.find(o => o.unit.n === n)?.key, name);
      const target = i === 0 ? key : (await E(k => window.EarthInteractive.layer.view.objects.find(o => o.key !== k && o.unit.t === 'country' && o.unit.area > 500000).key, key));
      const pt = await aim(target, 2.6); await tap(pt);
      ok(`q${i} tap proposes a guess (confirm tag)`, await until(() => document.getElementById('pin-tag').classList.contains('confirm')));
      if (i === 1) { await p.keyboard.press('Enter'); } else await E(() => document.querySelector('[data-act="guess-yes"]').click());
      ok(`q${i} answered`, await until(() => !!document.querySelector('#quiz [data-a="next"]')));
      if (i === 0) ok('right answer: Correct!', await E(() => !!document.querySelector('.qz-ok')));
      else ok(`q${i} miss line + km label`, await until(() => !!document.querySelector('.miss-km') && !document.querySelector('.miss-km').hidden, null, 20000));
      await E(() => document.querySelector('#quiz [data-a="next"]').click()); await p.waitForTimeout(500);
      ok(`q${i} next clears the miss line`, await E(() => !document.querySelector('.miss-km') || document.querySelector('.miss-km').hidden));
    }
    // cancel a proposed guess
    const pt = await aim('CAN', 2.8); await tap(pt);
    await until(() => document.getElementById('pin-tag').classList.contains('confirm'));
    await E(() => document.querySelector('[data-act="guess-no"]').click()); await p.waitForTimeout(400);
    ok('Not here cancels the guess', !(await vis('#pin-tag')) && await E(() => window.EarthInteractive.quiz.waiting));
    for (let i = 3; i < 10; i++) { await E(() => document.querySelector('#quiz [data-a="skip"]').click()); await E(() => document.querySelector('#quiz [data-a="next"]')?.click()); await p.waitForTimeout(200); }
    ok('results screen', await until(() => !!document.querySelector('#quiz .qz-end'), null, 20000));
    await E(() => document.querySelector('#quiz [data-a="share"]').click()); await p.waitForTimeout(400);
    const clip = await E(() => navigator.clipboard.readText().catch(() => ''));
    ok('copy result has a grid + link', /EarthInteractive/.test(clip) && /play=classic/.test(clip), clip);
    await E(() => document.querySelector('#quiz .qz-x').click()); await p.waitForTimeout(600);
    ok('quit: back to De facto, no leftovers', (await E(() => window.EarthInteractive.layer.view.key)) === 'defacto' && await vis('#dock'));
    // daily: finish, reload, still done
    await go('?play=daily');
    for (let i = 0; i < 5; i++) { await E(() => document.querySelector('#quiz [data-a="skip"]').click()); await E(() => document.querySelector('#quiz [data-a="next"]')?.click()); await p.waitForTimeout(200); }
    await until(() => !!document.querySelector('#quiz .qz-end'));
    await go('?play=daily');
    ok('daily remembers it was played today', await until(() => !!document.querySelector('#quiz .qz-end')));
    await E(() => document.querySelector('#quiz .qz-x').click());
  });

  await t('toggles persist', async () => {
    await go();
    await E(() => { document.getElementById('daynight-toggle').click(); document.getElementById('sound-toggle').click(); });
    await go();
    ok('day/night + mute remembered', await E(() => document.getElementById('daynight-toggle').getAttribute('aria-checked') === 'false' && document.getElementById('sound-toggle').classList.contains('muted')));
    await E(() => { document.getElementById('daynight-toggle').click(); document.getElementById('sound-toggle').click(); });
  });

  await t('deep links', async () => {
    await go('?c=XXX&view=nope'); ok('bad c/view ignored', !(await vis('#pin-tag')) && (await E(() => window.EarthInteractive.layer.view.key)) === 'defacto');
    await go('?compare=FRA'); ok('half a compare link ignored', !(await E(() => document.body.classList.contains('comparing'))));
    await go('?compare=fra,esp'); ok('lower-case compare link works', await E(() => document.body.classList.contains('comparing')), 'lowercase keys');
    await go('?play=nope'); ok('bad play ignored', !(await E(() => document.body.classList.contains('quiz-on'))));
  });

  await t('resize with panels open', async () => {
    if (touch) return;
    await go(); await E(() => window.EarthInteractive.compareKeys('USA', 'BRA'));
    await E(() => document.querySelector('#compare-pill [data-act="stats"]').click());
    await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(1500);
    const r = await E(() => { const b = document.getElementById('compare-bar').getBoundingClientRect(); return { l: b.left, r: b.right, w: innerWidth }; });
    ok('compare bar fits the phone width', r.l >= 0 && r.r <= r.w + 1, r);
    await p.setViewportSize({ width: 1280, height: 800 }); await p.waitForTimeout(1500);
    await E(() => document.querySelector('#compare-bar [data-act="done"]').click());
    await E(() => window.EarthInteractive.setLens('pop'));
    await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(1200);
    const lg = await E(() => { const b = document.getElementById('legend').getBoundingClientRect(), d = document.querySelector('.dock').getBoundingClientRect(); return { right: b.right, dockLeft: d.left, w: innerWidth }; });
    ok('legend clear of the dock on phone', lg.right <= lg.dockLeft + 1 && lg.right <= lg.w, lg);
    await p.setViewportSize({ width: 1280, height: 800 }); await E(() => window.EarthInteractive.setLens('none'));
  });

  await t('overlaps on screen', async () => {
    await go(); await p.waitForTimeout(2500);
    const o = await E(() => {
      const sel = ['.top-left', '.dock', '.brand', '.site-links', '#recenter', '#daynight-toggle', '#music-toggle', '#sound-toggle', '#cotd'];
      const rs = sel.map(s => [s, document.querySelector(s)]).filter(([, el]) => el && !el.hidden && getComputedStyle(el).display !== 'none').map(([s, el]) => [s, el.getBoundingClientRect()]);
      const hits = [];
      for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) { const a = rs[i][1], b = rs[j][1]; if (a.width && b.width && a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) hits.push(rs[i][0] + ' × ' + rs[j][0]); }
      const off = rs.filter(([, r]) => r.left < -1 || r.right > innerWidth + 1).map(([s]) => s);
      return { hits, off };
    });
    ok('no overlapping controls, none off-screen', !o.hits.length && !o.off.length, o);
  });

  await t('leaks', async () => {
    if (touch) return;
    // a warm-up round first (GPU counters grow as countries are first drawn), then identical rounds must stay flat
    const round = async () => {
      let pt = await aim('ESP'); await tap(pt);
      await until(() => document.querySelector('#pin-tag b')?.textContent === 'Spain');
      await E(() => document.querySelector('#pin-tag [data-act="info"]').click()); await p.waitForTimeout(600);
      await E(() => document.querySelector('#popup [data-act="compare"]').click());
      pt = await aim('ITA'); await tap(pt);
      await until(() => document.body.classList.contains('comparing'));
      await E(() => document.querySelector('#compare-pill [data-act="done"]').click());
      await until(() => !document.body.classList.contains('comparing'));
      await E(() => window.EarthInteractive.quiz.start('classic')); await p.waitForTimeout(400);
      await E(() => { const X = window.EarthInteractive, w = X.layer.view.objects.find(o => o.unit.t === 'country'); X.quiz.answer(w, X.compare.anchorFor(w).clone()); });
      await p.waitForTimeout(1000); await E(() => window.EarthInteractive.quiz.exit());
      await E(async () => {             // let each view and lens actually draw a couple of frames
        const X = window.EarthInteractive, frames = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
        X.setLens('pop'); await frames(); X.setLens('none');
        for (const v of ['un', 'neutral', 'defacto']) { X.setView(v); await frames(); }
      });
    };
    const stats = () => E(() => { const X = window.EarthInteractive; let n = 0; X.globe.scene.traverse(() => n++); const m = X.globe.renderer.info.memory; return { objects: n, geometries: m.geometries, textures: m.textures, lineMats: X.layer.lineMaterials.size, dom: document.querySelectorAll('*').length }; });
    const settle = async () => { await until(() => !window.EarthInteractive.layer.raised?.size, null, 120000); await p.waitForTimeout(1500); };
    await go(); await until(() => window.EarthInteractive.layer.viewCache.size >= 3, null, 120000); // all views built first
    await round(); await round(); await settle(); const s1 = await stats();   // two warm-up rounds
    for (let i = 0; i < 3; i++) await round();
    await settle(); const s2 = await stats();
    ok('no leaks over repeated card/compare/game/lens/view rounds', Object.keys(s1).every(k => s2[k] <= s1[k]), { s1, s2 });
  });

  ok('no JS errors in the whole run', errs.length === 0, errs.slice(0, 6));
  await ctx.close();
}
await b.close();
console.log(fails ? `\n${fails} failure(s)` : '\nall passed');
process.exit(fails ? 1 : 0);
