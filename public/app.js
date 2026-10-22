const $ = (id) => document.getElementById(id);
const store = { get: (k, d) => { try { return localStorage.getItem(k) ?? d; } catch { return d; } },
                set: (k, v) => { try { localStorage.setItem(k, v); } catch {} } };

let topic = TOPICS.find((t) => t.id === store.get('topic')) || TOPICS[0];
let cur = 0;
const draftKey = () => `draft:${topic.id}:${cur}`;

function renderTopics() {
  $('topics').innerHTML = '';
  TOPICS.forEach((t) => {
    const b = document.createElement('button');
    b.textContent = t.title;
    b.className = t === topic ? 'active' : '';
    b.onclick = () => { topic = t; store.set('topic', t.id); cur = 0; renderTopic(); renderTopics(); };
    $('topics').appendChild(b);
  });
}

function renderTopic() {
  $('topicTitle').textContent = topic.title;
  $('material').innerHTML = topic.material;
  $('caseSelect').innerHTML = topic.cases.map((c, i) => `<option value="${i}">${i + 1}. ${c.title}</option>`).join('');
  $('caseSelect').value = cur;
  loadCase();
}

function loadCase() {
  const c = topic.cases[cur];
  $('caseTitle').textContent = c.title;
  $('caseTask').textContent = c.task;
  $('code').value = store.get(draftKey(), c.starter);
  $('stdin').value = c.input;
  $('output').textContent = 'Press Run to compile and execute.';
  $('output').className = '';
  $('status').textContent = '';
  $('answer').hidden = true; $('loadBtn').hidden = true;
  $('answerBtn').textContent = 'Show answer';
  $('answerCode').textContent = c.answer;
  $('answerExplain').innerHTML = '<b>Why:</b> ' + c.explain;
  $('expected').textContent = c.expected ? c.expected.replace(/\n/g, '↵ ') : '(no output)';
}

// Backend: the local Node server (real gcc) if present, otherwise C runs in the browser via WebAssembly.
let backend = null;
async function detectBackend() {
  try { backend = (await fetch('/api/health')).ok ? 'gcc' : 'wasm'; } catch { backend = 'wasm'; }
  $('engine').textContent = backend === 'gcc' ? 'Engine: gcc (local)' : 'Engine: in-browser C interpreter (picoc)';
}

function runInBrowser(code, stdin) {
  return new Promise((resolve) => {
    const w = new Worker('runner.js');
    const timer = setTimeout(() => { w.terminate(); resolve({ ok: false, stage: 'run', output: '[stopped: exceeded 5s \u2014 infinite loop?]' }); }, 5000);
    w.onmessage = ({ data }) => { clearTimeout(timer); w.terminate(); resolve({ ok: !data.error, stage: 'run', output: data.output + (data.error ? '\n' + data.error : '') }); };
    w.onerror = (e) => { clearTimeout(timer); w.terminate(); resolve({ ok: false, stage: 'run', output: 'Runtime error: ' + e.message }); };
    w.postMessage({ code, stdin });
  });
}

const norm = (s) => s.replace(/\s+$/, '');

async function run() {
  const c = topic.cases[cur];
  $('runBtn').disabled = true;
  $('status').className = ''; $('status').textContent = 'running\u2026';
  try {
    if (!backend) await detectBackend();
    const code = $('code').value, stdin = $('stdin').value;
    const r = backend === 'gcc'
      ? await fetch('/api/run', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code, stdin }) }).then((x) => x.json())
      : await runInBrowser(code, stdin);
    $('output').className = r.ok ? '' : 'err';
    let text = r.output || (r.ok ? '(no output)' : '');
    if (r.stage === 'compile') { text = 'Compile error:\n' + text; $('status').textContent = 'compile failed'; $('status').className = 'bad'; }
    else if (backend === 'wasm' && /^file\.c:\d+:\d+ |\n?file\.c:\d+:\d+ /.test(r.output)) {
      $('output').className = 'err'; $('status').textContent = 'error'; $('status').className = 'bad';
      text = r.output.replace(/file\.c:/g, 'line ');
    }
    else {
      const same = norm(r.output) === norm(c.expected);
      if (r.ok && stdin === c.input) { $('status').textContent = same ? '\u2713 matches expected output' : '\u2717 differs from expected output'; $('status').className = same ? 'ok' : 'bad'; }
      else { $('status').textContent = r.ok ? 'done' : 'stopped'; $('status').className = r.ok ? '' : 'bad'; }
      if (r.warnings && !text.includes(r.warnings)) text += '\n\n--- warnings ---\n' + r.warnings;
    }
    $('output').textContent = text;
  } catch (e) {
    $('output').className = 'err'; $('output').textContent = 'Cannot run the code.\n' + e;
  } finally { $('runBtn').disabled = false; }
}

$('runBtn').onclick = run;
$('resetBtn').onclick = () => { $('code').value = topic.cases[cur].starter; store.set(draftKey(), $('code').value); };
$('caseSelect').onchange = (e) => { cur = +e.target.value; loadCase(); };
$('answerBtn').onclick = () => {
  const show = $('answer').hidden;
  $('answer').hidden = !show; $('loadBtn').hidden = !show;
  $('answerBtn').textContent = show ? 'Hide answer' : 'Show answer';
};
$('loadBtn').onclick = () => { $('code').value = topic.cases[cur].answer; store.set(draftKey(), $('code').value); };
$('code').addEventListener('input', () => store.set(draftKey(), $('code').value));
$('code').addEventListener('keydown', (e) => {
  if (e.key === 'Tab') {
    e.preventDefault();
    const t = e.target, s = t.selectionStart;
    t.setRangeText('    ', s, t.selectionEnd, 'end');
    t.dispatchEvent(new Event('input'));
  } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); run(); }
});

renderTopics(); renderTopic(); detectBackend();
