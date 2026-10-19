// Render stills at given times → contact sheet. Usage: node stills.js out.png 9.5 12 16.2 ...  (needs the site served on :8765)
const { chromium } = require(process.env.PW || '/usr/lib/node_modules/playwright');
const fs = require('fs');
(async () => {
  const [out, ...ts] = process.argv.slice(2);
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--disable-gpu'] });
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await p.goto('http://localhost:8765/film/index.html?render=1', { waitUntil: 'load' });
  await p.waitForFunction(() => window.FILM_READY === true, null, { timeout: 60000 });
  const imgs = [];
  for (const t of ts) {
    const t0 = Date.now();
    const data = await p.evaluate((t) => { F.renderAt(t); return F.canvasEl.toDataURL('image/jpeg', 0.85); }, parseFloat(t));
    imgs.push({ t, data, ms: Date.now() - t0 });
  }
  // contact sheet: 2 columns at 960x540
  const cols = ts.length > 1 ? 2 : 1, w = ts.length > 1 ? 960 : 1920, h = ts.length > 1 ? 540 : 1080, rows = Math.ceil(ts.length / cols);
  const html = `<body style="margin:0;background:#222"><div style="display:grid;grid-template-columns:repeat(${cols},${w}px)">` +
    imgs.map((i) => `<div style="position:relative"><img src="${i.data}" style="width:${w}px;height:${h}px;display:block"><span style="position:absolute;left:8px;top:6px;color:#0f0;font:bold 22px monospace;background:#000a">${i.t}s</span></div>`).join('') + '</div></body>';
  const q = await b.newPage({ viewport: { width: cols * w, height: rows * h } });
  await q.setContent(html); await q.screenshot({ path: out });
  console.log('rendered', imgs.map((i) => `${i.t}:${i.ms}ms`).join(' '), errs.length ? '\nERRORS: ' + [...new Set(errs)].join(' | ') : '');
  await b.close();
})();
