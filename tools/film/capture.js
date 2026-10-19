// Render every frame of the film with N parallel headless browsers, then encode with the master audio.
// Usage: node tools/film/capture.js [--workers 4] [--fps 30] [--from 0] [--to <sec>] [--frames <dir>] [--no-encode]
// Needs the site served at http://localhost:8765 and PW=<path to playwright>.
const { chromium } = require(process.env.PW || 'playwright');
const fs = require('fs'), path = require('path'), { spawnSync } = require('child_process');

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const ROOT = path.resolve(__dirname, '..', '..');
const tl = JSON.parse(fs.readFileSync(path.join(ROOT, 'film', 'timeline.json')));
const fps = +arg('fps', 30), workers = +arg('workers', 4);
const from = +arg('from', 0), to = Math.min(+arg('to', tl.duration), tl.duration);
const dir = arg('frames', '/home/user/filmframes');
const out = arg('out', path.join(ROOT, 'film', 'you-yourself-film.mp4'));
fs.mkdirSync(dir, { recursive: true });

(async () => {
  const first = Math.round(from * fps), last = Math.ceil(to * fps) - 1, total = last - first + 1;
  const per = Math.ceil(total / workers);
  const t0 = Date.now();
  let done = 0;
  await Promise.all([...Array(workers)].map(async (_, w) => {
    const a = first + w * per, b = Math.min(last, a + per - 1);
    if (a > b) return;
    const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--disable-gpu'] });
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    page.on('pageerror', (e) => console.error('pageerror', w, e.message));
    await page.goto('http://localhost:8765/film/index.html?render=1', { waitUntil: 'load' });
    await page.waitForFunction(() => window.FILM_READY === true, null, { timeout: 120000 });
    for (let f = a; f <= b; f++) {
      const data = await page.evaluate((t) => { F.renderAt(t); return F.canvasEl.toDataURL('image/jpeg', 0.93); }, f / fps);
      fs.writeFileSync(path.join(dir, `f${String(f).padStart(5, '0')}.jpg`), Buffer.from(data.split(',')[1], 'base64'));
      if (++done % 250 === 0) console.log(`${done}/${total} frames · ${((Date.now() - t0) / 1000).toFixed(0)} s`);
    }
    await browser.close();
  }));
  console.log(`rendered ${total} frames in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  if (process.argv.includes('--no-encode')) return;
  const audio = path.join(__dirname, 'build', 'master.wav');
  const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(fps), '-start_number', String(first), '-i', path.join(dir, 'f%05d.jpg'),
    '-ss', String(from), '-i', audio, '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-preset', 'slow', '-crf', '19', '-pix_fmt', 'yuv420p',
    '-profile:v', 'high', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', out], { stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status);
  console.log('wrote', out, (fs.statSync(out).size / 1e6).toFixed(1), 'MB');
})();
