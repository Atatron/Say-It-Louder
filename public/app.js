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

async function run() {
  const c = topic.cases[cur];
  $('runBtn').disabled = true;
  $('status').className = ''; $('status').textContent = 'running…';
  try {
    const r = await fetch('/api/run', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: $('code').value, stdin: $('stdin').value }) }).then((x) => x.json());
    $('output').className = r.ok ? '' : 'err';
    let text = r.output || (r.ok ? '(no output)' : '');
    if (r.stage === 'compile') { text = 'Compile error:\n' + text; $('status').textContent = 'compile failed'; $('status').className = 'bad'; }
    else {
      const same = $('stdin').value === c.input && r.output === c.expected;
      const sameInput = $('stdin').value === c.input;
      if (r.ok && sameInput) { $('status').textContent = same ? '✓ matches expected output' : '✗ differs from expected output'; $('status').className = same ? 'ok' : 'bad'; }
      else { $('status').textContent = r.ok ? 'done' : 'stopped'; $('status').className = r.ok ? '' : 'bad'; }
      if (r.warnings && !text.includes(r.warnings)) text += '\n\n--- warnings ---\n' + r.warnings;
    }
    $('output').textContent = text;
  } catch (e) {
    $('output').className = 'err'; $('output').textContent = 'Cannot reach the server. Is `npm start` running?\n' + e;
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

renderTopics(); renderTopic();
