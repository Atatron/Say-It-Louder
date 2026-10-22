// Local C playground: static files + POST /api/run (compile with gcc, run with limits).
// Zero dependencies. Binds to 127.0.0.1 only — it executes code you type, never expose it.
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile, spawn } = require('child_process');

const PORT = process.env.PORT || 3000;
const PUBLIC = path.join(__dirname, 'public');
const RUN_TIMEOUT_MS = 5000;
const MAX_OUTPUT = 64 * 1024;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };

function runC({ code, stdin }) {
  return new Promise((resolve) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cplay-'));
    const src = path.join(dir, 'main.c');
    const bin = path.join(dir, 'main');
    const done = (r) => { fs.rm(dir, { recursive: true, force: true }, () => {}); resolve(r); };
    fs.writeFileSync(src, code);
    execFile('gcc', ['-Wall', '-Wextra', '-std=c11', src, '-o', bin, '-lm'], { timeout: 15000 }, (err, _o, stderr) => {
      if (err) return done({ stage: 'compile', ok: false, output: stderr || String(err) });
      const child = spawn(bin, [], { stdio: ['pipe', 'pipe', 'pipe'] });
      let out = '', truncated = false, timedOut = false;
      const collect = (d) => {
        if (out.length < MAX_OUTPUT) out += d; else truncated = true;
      };
      child.stdout.on('data', collect);
      child.stderr.on('data', collect);
      child.stdin.on('error', () => {});
      child.stdin.end(stdin || '');
      const timer = setTimeout(() => { timedOut = true; child.kill('SIGKILL'); }, RUN_TIMEOUT_MS);
      child.on('close', (exitCode, signal) => {
        clearTimeout(timer);
        if (truncated) out += '\n[output truncated]';
        if (timedOut) out += `\n[stopped: exceeded ${RUN_TIMEOUT_MS / 1000}s — infinite loop?]`;
        else if (signal) out += `\n[crashed: ${signal}]`;
        done({ stage: 'run', ok: !timedOut && !signal, exitCode, output: out, warnings: stderr });
      });
    });
  });
}

http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api/run') {
    let body = '';
    req.on('data', (d) => { body += d; if (body.length > 200000) req.destroy(); });
    req.on('end', async () => {
      try {
        const { code, stdin } = JSON.parse(body);
        if (typeof code !== 'string') throw new Error('code required');
        const result = await runC({ code, stdin });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ stage: 'server', ok: false, output: String(e.message) }));
      }
    });
    return;
  }
  if (req.url === '/api/health') { res.writeHead(200); return res.end('ok'); }
  const rel = req.url.split('?')[0] === '/' ? '/index.html' : decodeURIComponent(req.url.split('?')[0]);
  const file = path.join(PUBLIC, path.normalize(rel));
  if (!file.startsWith(PUBLIC)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(PORT, '127.0.0.1', () => console.log(`C Playground: http://localhost:${PORT}`));
