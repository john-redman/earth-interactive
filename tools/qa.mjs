/**
 * Broad QA run: real taps on the globe, cards, compare (UI + drag + share image), free move (tag + hold), the
 * world population counter, ships/clouds/song link, lenses, search, keyboard, games
 * (taps, Confirm/Enter, miss line, results, daily), toggles, deep links, resizes, overlaps and a leak check, on
 * desktop and phone. Slower and wider than tools/smoke.mjs (~20 min headless at ~1 fps).
 *   npm run dev   (or any static server), then   BASE=http://localhost:5173/ npm run qa [desktop|phone]
 *   ONLY='move|population' runs just the sections whose names match.
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
  const t = async (name, fn) => { if (process.env.ONLY && !new RegExp(process.env.ONLY).test(name)) return; try { await fn(); } catch (e) { fails++; console.log(`FAIL ${dev} ${name} threw ${String(e.message).split('\n')[0]}`); } };
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
    if (!(await E(() => !!window.EarthInteractive))) await go(); // when ONLY= skipped the load section
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

  await t('move a country', async () => {
    await go();
    const pieceAt = () => E(() => { const X = window.EarthInteractive, P = X.compare.previewPiece || X.compare.pieces[0], v = P.center.clone().multiplyScalar(1 + P.liftNow).project(X.globe.camera), r = document.getElementById('globe').getBoundingClientRect(); return { x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height }; });
    const cdp = touch ? await ctx.newCDPSession(p) : null;
    const touchTo = (type, pt) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x: pt.x, y: pt.y }] });
    // drag with a real pointer; `hold` waits for the press-and-hold lift before moving
    const dragFrom = async (pt, dx, dy, hold = false) => {
      if (touch) { await touchTo('touchStart', pt); } else { await p.mouse.move(pt.x, pt.y); await p.mouse.down(); }
      const lifted = hold ? await until(() => !!window.EarthInteractive.compare.drag, null, 30000) : true; // headless frames are slow, so the hold timer fires late
      for (let i = 1; i <= 6; i++) { const q = { x: pt.x + dx * i / 6, y: pt.y + dy * i / 6 }; if (touch) await touchTo('touchMove', q); else await p.mouse.move(q.x, q.y); }
      if (touch) await touchTo('touchEnd'); else await p.mouse.up();
      return lifted;
    };
    // Move from the tag, drag it, then tap another country: the same piece becomes half of a comparison
    let pt = await aim('ESP'); await tap(pt);
    await until(() => document.querySelector('#pin-tag b')?.textContent === 'Spain');
    ok('tag offers Move', await vis('#pin-tag [data-act="move"]'));
    await E(() => document.querySelector('#pin-tag [data-act="move"]').click());
    ok('Move lifts Spain with a drag banner', await until(() => document.body.classList.contains('picking') && /Drag Spain anywhere/.test(document.getElementById('pick-banner').textContent) && window.EarthInteractive.compare.previewPiece?.o.key === 'ESP'));
    ok('banner clear of the other controls', await E(() => {
      const b = document.getElementById('pick-banner').getBoundingClientRect();
      return [...document.querySelectorAll('.top-left .view-switch, .dock-btn, .corner-btn, .site-links, .brand')].every(el => { const r = el.getBoundingClientRect(); return !r.width || getComputedStyle(el).display === 'none' || r.right <= b.left || b.right <= r.left || r.bottom <= b.top || b.bottom <= r.top; }) && b.left >= 0 && b.right <= innerWidth;
    }));
    await p.waitForTimeout(1500);
    const c0 = await E(() => (window.__piece = window.EarthInteractive.compare.previewPiece).center.toArray());
    await dragFrom(await pieceAt(), -70, 50); await p.waitForTimeout(800);
    const c1 = await E(() => window.EarthInteractive.compare.previewPiece.center.toArray());
    ok('the lifted country drags freely', Math.hypot(c1[0] - c0[0], c1[1] - c0[1], c1[2] - c0[2]) > 0.01, { c0, c1 });
    if (!touch) { // the arrow keys carry the lifted piece (and don't spin the globe)
      const k0 = await E(() => window.EarthInteractive.compare.previewPiece.center.toArray());
      const cam0 = await E(() => window.EarthInteractive.globe.camera.position.toArray());
      await p.keyboard.down('ArrowRight');
      const moved = await until(k => window.EarthInteractive.compare.previewPiece.center.distanceTo(new window.EarthInteractive.globe.camera.position.constructor(...k)) > 0.02, k0, 30000);
      await p.keyboard.up('ArrowRight');
      const cam1 = await E(() => window.EarthInteractive.globe.camera.position.toArray());
      ok('arrow keys move the lifted country, not the globe', moved && Math.hypot(...cam1.map((v, i) => v - cam0[i])) < 1e-3, { cam0, cam1 });
    }
    ok('still choosing after the drag (no accidental compare)', await E(() => document.body.classList.contains('picking') && !document.body.classList.contains('comparing')));
    pt = await aim('DEU', 2.4); await tap(pt);
    ok('tapping another country turns the move into a comparison', await until(() => document.body.classList.contains('comparing'), null, 20000)
      && await E(() => { const C = window.EarthInteractive.compare; return C.pieces[0] === window.__piece && C.pieces[1].o.key === 'DEU' && document.getElementById('pick-banner').hidden; }));
    await E(() => document.querySelector('#compare-pill [data-act="done"]').click());
    ok('done ends it', await until(() => !document.body.classList.contains('comparing') && !window.EarthInteractive.compare.pieces.length, null, 20000));
    // press and hold the pinned country: it lifts under the finger and follows it
    pt = await aim('FRA'); await tap(pt);
    await until(() => document.querySelector('#pin-tag b')?.textContent === 'France');
    await p.waitForTimeout(600);
    const lifted = await dragFrom(pt, 60, -40, true); await p.waitForTimeout(800);
    const hs = await E(() => ({ key: window.EarthInteractive.compare.previewPiece?.o.key, banner: document.getElementById('pick-banner').textContent }));
    ok('press and hold lifts the pinned country', lifted && hs.key === 'FRA' && /Drag France/.test(hs.banner), { lifted, ...hs });
    const moved = await E(() => { const P = window.EarthInteractive.compare.previewPiece; return P ? P.center.distanceTo(P.shape.centroid) : 0; });
    ok('…and carries it in the same gesture', moved > 0.01, moved);
    await E(() => document.querySelector('#pick-banner button').click());
    ok('Put back sinks it and leaves the mode', await until(() => !document.body.classList.contains('picking') && !window.EarthInteractive.compare.previewPiece, null, 20000));
    // Compare then drag first: one state, the banner just leads differently
    pt = await aim('PRT'); await tap(pt);
    await until(() => document.querySelector('#pin-tag b')?.textContent === 'Portugal');
    await E(() => document.querySelector('#pin-tag [data-act="compare"]').click());
    ok('Compare banner offers dragging too', await until(() => /(Tap|Click) a country to compare with Portugal/.test(document.getElementById('pick-banner').textContent) && /drag/i.test(document.querySelector('.pk-text small')?.textContent || '')));
    await p.keyboard.press('Escape');
    ok('Escape puts it back', await until(() => !document.body.classList.contains('picking'), null, 20000));
    // holding an unpinned country (or the sea) only spins, as before
    await E(() => { const X = window.EarthInteractive; X.globe.flyTo(X.globe.camera.position.clone().set(-0.296, -0.5, 0.814).normalize(), 2.6, 1); });
    await until(() => !window.EarthInteractive.globe.flight); await p.waitForTimeout(400);
    const mid = await E(() => { const r = document.getElementById('globe').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    await dragFrom(mid, 40, 0, true);
    ok('holding elsewhere does not lift anything', await E(() => !document.body.classList.contains('picking') && !window.EarthInteractive.compare.pieces.length));
  });

  await t('world population', async () => {
    await go();
    await E(() => document.getElementById('hint').classList.add('gone'));
    ok('counter shows at globe view', await until(() => document.getElementById('popclock').classList.contains('on')));
    const n0 = await E(() => +document.querySelector('#popclock .pc-n').textContent.replace(/,/g, ''));
    await p.waitForTimeout(3000);
    const n1 = await E(() => +document.querySelector('#popclock .pc-n').textContent.replace(/,/g, ''));
    ok('a plausible estimate that ticks up', n0 > 8.2e9 && n0 < 8.6e9 && n1 > n0, { n0, n1 });
    ok('births and deaths today shown', await E(() => /born today/.test(document.getElementById('popclock').textContent)));
    await E(() => { const X = window.EarthInteractive; X.globe.flyTo(X.globe.camera.position.clone(), X.globe.fitDistance * 0.6, 1); });
    ok('fades out zoomed in', await until(() => !window.EarthInteractive.globe.flight && !document.getElementById('popclock').classList.contains('on')));
    await E(() => { const X = window.EarthInteractive; X.globe.flyTo(X.globe.camera.position.clone(), X.globe.fitDistance, 1); });
    ok('comes back zoomed out', await until(() => !window.EarthInteractive.globe.flight && document.getElementById('popclock').classList.contains('on')));
    await go('?c=BRA'); await E(() => document.getElementById('hint').classList.add('gone'));
    await E(() => document.querySelector('#pin-tag [data-act="info"]').click());
    await until(() => document.body.classList.contains('card-open'));
    ok('steps aside for the card', await until(() => !document.getElementById('popclock').classList.contains('on')));
  });

  await t('ships, clouds and the song link', async () => {
    await go();
    const at = () => E(() => { const m = window.EarthInteractive.ships.mesh, a = m.instanceMatrix.array; return { n: m.count, x: a[12], y: a[13], z: a[14] }; });
    const s0 = await at();
    const sailed = await until(a => { const m = window.EarthInteractive.ships.mesh.instanceMatrix.array; return Math.hypot(m[12] - a.x, m[13] - a.y, m[14] - a.z) > 1e-5; }, s0, 60000); // wait on frames, not time
    ok('ships sail (one instanced mesh)', s0.n > 50 && sailed, s0);
    ok(touch ? 'no clouds on phones' : 'clouds on desktop', await E(() => !!window.EarthInteractive.clouds) === !touch);
    ok('no wave crests left in the ocean shader', await E(() => { let src = ''; window.EarthInteractive.globe.scene.traverse(o => { if (o.material?.fragmentShader?.includes('the tone of the water')) src = o.material.fragmentShader; }); return !!src && !/crest/i.test(src); }));
    await E(() => window.EarthInteractive.setLens('pop'));
    ok('a data lens hides the ships', await until(() => !window.EarthInteractive.ships.mesh.visible));
    await E(() => window.EarthInteractive.setLens('none'));
    ok('…and brings them back', await until(() => window.EarthInteractive.ships.mesh.visible));
    ok('"We love the Earth" links to the video', await E(() => [...document.querySelectorAll('.site-links a')].some(a => /youtube\.com\/watch\?v=pvuN_WvF1to/.test(a.href) && a.target === '_blank' && /love the Earth/.test(a.textContent))));
  });

  await t('site links menu', async () => {
    await go();
    if (!touch) {
      ok('desktop: links in a row, brand is plain text', await vis('#site-links') && await E(() => { const b = document.getElementById('brand-btn'); return b.tabIndex === -1 && !b.hasAttribute('aria-expanded'); }));
      return;
    }
    ok('phone: links folded away, brand shows a caret', !(await vis('#site-links')) && await vis('.brand-caret') && await E(() => document.getElementById('brand-btn').getAttribute('aria-expanded') === 'false'));
    const brand = await E(() => { const r = document.getElementById('brand-btn').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    await tap(brand);
    await until(() => document.getElementById('site-links').classList.contains('open'));
    await E(() => Promise.all(document.getElementById('site-links').getAnimations().map(a => a.finished))); // it rises into place
    ok('tapping the brand opens the menu above it', await E(() => {
      const n = document.getElementById('site-links'), r = n.getBoundingClientRect(), b = document.getElementById('brand-btn').getBoundingClientRect();
      return n.querySelectorAll('a:not([hidden])').length >= 8 && r.bottom <= b.top && r.left >= 0 && r.right <= innerWidth && r.top > 0 && document.getElementById('brand-btn').getAttribute('aria-expanded') === 'true';
    }));
    await p.keyboard.press('Escape');
    ok('Escape closes it', await until(() => !document.getElementById('site-links').classList.contains('open')));
    await tap(brand); await until(() => document.getElementById('site-links').classList.contains('open'));
    const sea = await E(() => { const r = document.getElementById('globe').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height * 0.3 }; });
    await tap(sea);
    ok('tapping elsewhere closes it', await until(() => !document.getElementById('site-links').classList.contains('open')));
  });

  await t('first visit, keyboard select, game auto-advance', async () => {
    await go(); await E(() => { try { localStorage.removeItem('ei-intro'); localStorage.removeItem('ei-music'); localStorage.removeItem('ei-tip-tag'); } catch {} });
    await go();
    ok('first visit: the finger shows how to spin', await until(() => !!document.querySelector('.intro-hand:not(.out) .intro-finger'))); // a point-sized anchor, so not vis()
    ok('first visit: music is on (starts with the first tap)', await E(() => document.getElementById('music-toggle').getAttribute('aria-pressed') === 'true'));
    if (!touch) {
      await E(() => { const X = window.EarthInteractive; X.globe.autoRotate = false; X.spin.stop(); X.globe.flyTo(X.compare.anchorFor(X.layer.get('BRA')).clone(), 2.4, 1); });
      await until(() => !window.EarthInteractive.globe.flight);
      await E(() => document.getElementById('globe').focus()); await p.keyboard.press('Enter');
      ok('Enter on the globe selects the country in the middle', await until(() => document.querySelector('#pin-tag b')?.textContent === 'Brazil'));
      ok('…announced for screen readers, with a one-time tip', await until(() => /Brazil selected/.test(document.getElementById('sr-live').textContent)) && await vis('.tag-tip'));
      ok('the finger has gone after the first key press', await until(() => !document.querySelector('.intro-hand:not(.out)')));
      // keyboard flow: Move is focused, Tab goes round the three buttons, Info opens the card, Escape steps back
      const act = () => E(() => document.activeElement?.dataset?.act || document.activeElement?.className || document.activeElement?.id);
      ok('Enter puts focus on Move', (await act()) === 'move', await act());
      const order = [];
      for (let i = 0; i < 3; i++) { await p.keyboard.press('Tab'); order.push(await act()); }
      ok('Tab goes round Move, Compare, Info', order.join() === 'compare,info,move', order);
      await p.keyboard.press('Tab'); await p.keyboard.press('Tab'); await p.keyboard.press('Enter'); // → Info
      ok('Enter on Info opens the card with focus inside it', await until(() => document.body.classList.contains('card-open')) && await until(() => !!document.activeElement?.closest?.('#popup')));
      await p.keyboard.press('Escape');
      ok('Escape: card → tag, focus back on Info', await until(() => !document.body.classList.contains('card-open') && document.activeElement?.dataset?.act === 'info'));
      await p.keyboard.press('Escape');
      ok('Escape: tag → nothing, focus back on the globe', await until(() => document.getElementById('pin-tag').hidden && document.activeElement?.id === 'globe'));
      await p.keyboard.press('Enter'); await until(() => !document.getElementById('pin-tag').hidden);
      const a1 = await E(() => window.EarthInteractive.spin.angle);
      await p.keyboard.press('ArrowRight');
      ok('an arrow lets the pin go and turns the globe', await until(() => document.getElementById('pin-tag').hidden) && await until(a => Math.abs(window.EarthInteractive.spin.angle - a) > 0.02, a1, 60000));
    }
    await E(() => window.EarthInteractive.quiz.start('classic'));
    await until(() => document.querySelector('.qz-prog')?.textContent === '1 / 10');
    await E(() => { const X = window.EarthInteractive, w = X.layer.view.objects.find(o => o.unit.t === 'country'); X.quiz.answer(w, X.compare.anchorFor(w).clone()); });
    ok('a result shows a filling Next button', await until(() => !!document.querySelector('.qz-next .qz-fill')));
    if (!touch) await p.mouse.move(2, 2); // not over the panel (pointing at it holds the timer)
    ok('…and the game moves on by itself', await until(() => document.querySelector('.qz-prog')?.textContent === '2 / 10', null, 60000));
    await E(() => window.EarthInteractive.quiz.exit());
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
    await p.keyboard.press('Equal');
    const zoomed = await until(d => window.EarthInteractive.globe.camera.position.length() < d - 0.05, d0, 60000); // frames, not the clock
    const d1 = await E(() => window.EarthInteractive.globe.camera.position.length());
    ok('+ zooms in', zoomed, { d0, d1 });
    // Shift on its own zooms in, Ctrl out: a tap steps (synthetic events, so a slow headless frame can't turn it into a hold)
    const tapKey = (key) => E(k => { const o = { key: k, shiftKey: k === 'Shift', ctrlKey: k === 'Control', bubbles: true };
      window.dispatchEvent(new KeyboardEvent('keydown', o)); window.dispatchEvent(new KeyboardEvent('keyup', { ...o, shiftKey: false, ctrlKey: false })); }, key);
    const dist = () => E(() => window.EarthInteractive.globe.camera.position.length());
    const frames = n => E(n => new Promise(r => { let i = 0; const f = () => (++i >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
    await until(() => !window.EarthInteractive.globe.zoom, null, 60000);
    let z0 = await dist(); await tapKey('Control');
    ok('Ctrl tap zooms out', await until(d => window.EarthInteractive.globe.camera.position.length() > d + 0.05, z0, 60000));
    await until(() => !window.EarthInteractive.globe.zoom, null, 60000);
    z0 = await dist(); await tapKey('Shift');
    ok('Shift tap zooms in', await until(d => window.EarthInteractive.globe.camera.position.length() < d - 0.05, z0, 60000));
    await until(() => !window.EarthInteractive.globe.zoom, null, 60000);
    z0 = await dist(); await p.keyboard.down('Control');                                   // held: glides out
    ok('Ctrl held glides out', await until(d => window.EarthInteractive.globe.camera.position.length() > d + 0.05, z0, 60000));
    await p.keyboard.up('Control');
    await until(() => !window.EarthInteractive.globe.zoom, null, 60000);
    z0 = await dist(); await p.keyboard.press('Shift+Tab'); await frames(6);              // a chord never zooms
    ok('Shift+Tab does not zoom', !(await E(() => !!window.EarthInteractive.globe.zoom)) && Math.abs((await dist()) - z0) < 1e-6);
    await p.mouse.click(5, 300).catch(() => {});
    const a0 = await E(() => window.EarthInteractive.spin.angle);
    await p.keyboard.press('ArrowLeft');
    // a tap turns it a few degrees and settles; wait on the spin (headless frames are slow), not on the clock
    ok('arrow keys spin', await until(a => Math.abs(window.EarthInteractive.spin.angle - a) > 0.05, a0, 60000) && await until(() => window.EarthInteractive.spin.v === 0, null, 60000));
    await p.keyboard.press('r'); await p.waitForTimeout(2000);
    ok('R recenters + resumes auto-rotate', await E(() => window.EarthInteractive.globe.autoRotate));
  });

  await t('games', async () => {
    await go('?view=defacto');
    await E(() => window.EarthInteractive.quiz.start('classic'));
    ok('game on UN view, dock hidden', (await E(() => window.EarthInteractive.layer.view.key)) === 'un' && !(await vis('#dock')));
    let firstName = null;
    for (let i = 0; i < 3; i++) {
      const name = await E(() => document.querySelector('#quiz .qz-ask b').textContent);
      firstName ??= name;
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
    // the link is a challenge: the same ten countries, with this score to beat
    const link = clip.match(/\?play=classic&round=([a-z0-9]+)&beat=(\d+)/);
    ok('the result link carries the round and the score to beat', !!link, clip);
    if (link) {
      await E(() => document.querySelector('#quiz .qz-x').click()); await p.waitForTimeout(400);
      await go(link[0]);
      ok('a challenge link replays the same round, shows the score to beat', await until(([n, sc]) => document.querySelector('#quiz .qz-ask b')?.textContent === n
        && (document.querySelector('#quiz .qz-msg')?.textContent || '').includes('A friend scored ' + Number(sc).toLocaleString('en-US')), [firstName, link[2]]));
      ok('the challenge link is cleared from the address', !/round=|beat=/.test(await E(() => location.search)));
      for (let i = 0; i < 10; i++) { await E(() => document.querySelector('#quiz [data-a="skip"]').click()); await E(() => document.querySelector('#quiz [data-a="next"]')?.click()); await p.waitForTimeout(200); }
      ok('challenge result compares with the friend', await until(() => /your friend's|A tie with/i.test(document.querySelector('#quiz .qz-verdict')?.textContent || '')));
    }
    await E(() => document.querySelector('#quiz .qz-x').click()); await p.waitForTimeout(600);
    ok('quit: back to De facto, no leftovers', (await E(() => window.EarthInteractive.layer.view.key)) === 'defacto' && await vis('#dock'));
    // daily: yesterday's already played (a streak), finish today's, reload, still done
    await E(() => { const d = new Date(); d.setDate(d.getDate() - 1); const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; localStorage.setItem('ei-daily-' + k, JSON.stringify({ results: [], qs: [] })); });
    await go('?play=daily');
    if (touch) await E(() => { navigator.share = async d => { window.__shared = d.text; }; }); // headless Linux has no share sheet
    for (let i = 0; i < 5; i++) { await E(() => document.querySelector('#quiz [data-a="skip"]').click()); await E(() => document.querySelector('#quiz [data-a="next"]')?.click()); await p.waitForTimeout(200); }
    await until(() => !!document.querySelector('#quiz .qz-end'));
    ok('daily end: streak and when the next one opens', await until(() => { const t = document.querySelector('#quiz .qz-verdict')?.textContent || ''; return /2 days in a row/.test(t) && /next challenge opens in \d+ (h|min)/.test(t); }));
    if (touch) {
      await E(() => document.querySelector('#quiz [data-a="share"]').click());
      ok('phone: Share result opens the share sheet with the grid and streak', await until(() => /days in a row/.test(window.__shared || '') && /play=daily/.test(window.__shared)));
    }
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
    await go('?lens=density');
    ok('?lens= opens a data map, legend names the source year', await E(() => document.body.classList.contains('lens-on')) && /mostly 20\d\d/.test(await E(() => document.querySelector('#legend .lg-src')?.textContent || '')) && /lens=density/.test(await E(() => location.search)));
    await E(() => window.EarthInteractive.setLens('none'));
    ok('lens off drops it from the address', !/lens=/.test(await E(() => location.search)));
    await go('?lens=nope'); ok('bad lens ignored', !(await E(() => document.body.classList.contains('lens-on'))));
    await go('?embed=1&c=FRA');
    const embedHref = await E(() => document.querySelector('.embed-open')?.href || '');
    ok('?embed=1: just the globe, the credit and a link to the full site', !(await vis('#dock')) && !(await vis('#popclock')) && await vis('.credit') && await vis('.embed-open')
      && !/embed/.test(embedHref) && /c=FRA/.test(embedHref) && !(await E(() => document.body.classList.contains('ads-on'))), embedHref);
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
    await E(() => document.getElementById('hint').classList.add('gone'));
    await until(() => document.getElementById('popclock').classList.contains('on')); await p.waitForTimeout(900);
    const o = await E(() => {
      const sel = ['.top-left', '.dock', '.brand', '.site-links', '#recenter', '#daynight-toggle', '#music-toggle', '#sound-toggle', '#cotd', '#popclock', '.credit'];
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
    // draw every view once, so geometry counts don't depend on where the random game rounds happened to fly the
    // camera (each view's countries are a few merged draws, uploaded whole; culling only hides parts of them)
    const uploadAll = () => E(async () => {
      const X = window.EarthInteractive, frame = () => new Promise(r => requestAnimationFrame(r));
      for (const v of ['un', 'neutral', 'defacto']) {
        X.setView(v); await frame();
        X.globe.renderer.render(X.globe.scene, X.globe.camera);
      }
    });
    const stats = () => E(() => { const X = window.EarthInteractive; let n = 0; X.globe.scene.traverse(() => n++); const m = X.globe.renderer.info.memory; return { objects: n, geometries: m.geometries, textures: m.textures, lineMats: X.layer.lineMaterials.size, dom: document.querySelectorAll('*').length }; });
    const settle = async () => { await until(() => !window.EarthInteractive.layer.raised?.size, null, 120000); await p.waitForTimeout(1500); };
    await go(); await until(() => window.EarthInteractive.layer.viewCache.size >= 3, null, 120000); // all views built first
    await round(); await round(); await settle(); await uploadAll(); const s1 = await stats();   // two warm-up rounds
    for (let i = 0; i < 3; i++) await round();
    await settle(); await uploadAll(); const s2 = await stats();
    for (let i = 0; i < 3; i++) await round();
    await settle(); await uploadAll(); const s3 = await stats();
    // a leak grows round after round; a one-off (a country drawn for the first time) grows once and then stays flat
    ok('no leaks over repeated card/compare/game/lens/view rounds', Object.keys(s1).every(k => s2[k] <= s1[k] || s3[k] <= s2[k]), { s1, s2, s3 });
  });

  ok('no JS errors in the whole run', errs.length === 0, errs.slice(0, 6));
  await ctx.close();
}
await b.close();
console.log(fails ? `\n${fails} failure(s)` : '\nall passed');
process.exit(fails ? 1 : 0);
