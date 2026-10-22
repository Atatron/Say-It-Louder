// Compiles and runs every case's reference answer and checks it matches `expected`.
const { execFileSync } = require('child_process');
const fs = require('fs'), os = require('os'), path = require('path');
const TOPICS = require('../public/content.js');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cplay-test-'));
let failed = 0;
for (const t of TOPICS) for (const c of t.cases) {
  const src = path.join(dir, 'a.c'), bin = path.join(dir, 'a');
  fs.writeFileSync(src, c.answer);
  let got;
  try {
    execFileSync('gcc', ['-Wall', '-Wextra', '-std=c11', src, '-o', bin, '-lm'], { stdio: 'pipe' });
    got = execFileSync(bin, { input: c.input, timeout: 5000 }).toString();
    // starter must compile too
    fs.writeFileSync(src, c.starter);
    execFileSync('gcc', ['-std=c11', src, '-o', bin], { stdio: 'pipe' });
  } catch (e) { got = 'ERROR: ' + (e.stderr || e.message); }
  const ok = got === c.expected;
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${t.id} / ${c.title}` + (ok ? '' : `\n  expected: ${JSON.stringify(c.expected)}\n  got:      ${JSON.stringify(got)}`));
}
fs.rmSync(dir, { recursive: true, force: true });
process.exit(failed ? 1 : 0);
