// Character test sheet: node toontest.js out.png
const { chromium } = require(process.env.PW || 'playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--disable-gpu'] });
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8765/film/index.html?render=1'); await p.waitForFunction(() => window.FILM_READY === true);
  await p.evaluate(() => {
    const c = F.ctx; c.setTransform(1, 0, 0, 1, 0, 0);
    const g = c.createLinearGradient(0, 0, 0, 1080); g.addColorStop(0, '#3b2a4a'); g.addColorStop(1, '#6b4a5a'); c.fillStyle = g; c.fillRect(0, 0, 1920, 1080);
    const cells = [
      ['neutral', { pose: 'write', expr: { mouth: 'neutral', look: [-0.2, 0.6] }, t: 1.0 }],
      ['smile', { pose: 'rest', expr: { mouth: 'smile', smile: 0.7, lift: 2 }, t: 2.0 }],
      ['sad + tear', { pose: 'rest', expr: { mouth: 'sad', inner: 1, look: [0, 0.7], tear: 0.4, glisten: 1 }, t: 3.0, tilt: 0.08 }],
      ['scared', { pose: 'rest', expr: { mouth: 'gasp', lift: 6, inner: 0.6, look: [0.8, -0.1] }, t: 4.0 }],
      ['ears', { pose: 'ears', expr: { mouth: 'tense', closed: 1, eyes: 'squeeze', inner: 1 }, t: 5.0, tilt: 0.05 }],
      ['phone', { pose: 'phone', expr: { mouth: 'neutral', look: [0.1, 0.8] }, t: 6.0, sensor: true }],
      ['hum', { pose: 'phone', expr: { mouth: 'hum', closed: 1, lift: 1 }, t: 7.0, tilt: -0.06, sensor: true }],
      ['bigsmile', { pose: 'phone', expr: { mouth: 'bigsmile', lift: 3 }, t: 8.0, sensor: true }],
    ];
    cells.forEach(([lab, o], i) => {
      const x = 240 + (i % 4) * 480, y = 200 + Math.floor(i / 4) * 520;
      F.toon(c, x, y, 0.62, Object.assign({ facing: i % 2 ? -1 : 1, rim: '#ffb27a', rimW: 4, rimDir: -1 }, o));
      F.text(c, lab, x, y - 120, { size: 26, weight: 700, align: 'center', color: '#fff' });
    });
  });
  await p.screenshot({ path: process.argv[2] });
  console.log('ok', errs);
  await b.close();
})();
