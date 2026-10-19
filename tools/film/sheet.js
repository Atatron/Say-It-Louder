// 4x4 contact sheets across a time range. Usage: node sheet.js outprefix start end count
const { chromium } = require(process.env.PW || 'playwright');
(async () => {
  const [pre, a, b, n] = process.argv.slice(2); const N = +n, A = +a, B = +b;
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--disable-gpu'] });
  const p = await br.newPage({ viewport: { width: 1920, height: 1080 } });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8765/film/index.html?render=1'); await p.waitForFunction(() => window.FILM_READY === true);
  const ts = [...Array(N)].map((_, i) => +(A + (B - A) * i / (N - 1)).toFixed(2)), imgs = [];
  for (const t of ts) imgs.push(await p.evaluate((t) => { F.renderAt(t); return F.canvasEl.toDataURL('image/jpeg', 0.8); }, t));
  for (let s = 0; s < Math.ceil(N / 16); s++) {
    const q = await br.newPage({ viewport: { width: 1920, height: 1080 } });
    await q.setContent('<body style="margin:0;background:#111"><div style="display:grid;grid-template-columns:repeat(4,480px)">' +
      imgs.slice(s * 16, s * 16 + 16).map((d, i) => `<div style="position:relative"><img src="${d}" style="width:480px;height:270px;display:block"><b style="position:absolute;left:4px;top:2px;color:#0f0;font:bold 15px monospace;background:#000a">${ts[s * 16 + i]}</b></div>`).join('') + '</div></body>');
    await q.screenshot({ path: `${pre}${s + 1}.png` });
  }
  console.log('ok', errs.length ? 'ERR ' + [...new Set(errs)].join(' | ') : '');
  await br.close();
})();
