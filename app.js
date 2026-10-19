// You, Yourself workboard: tabs, system map, products, simulator, method, code viewer and task board.
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const rp = (n) => "Rp " + n.toLocaleString("id-ID");
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode: board just won't persist */ } },
};

// ---------- tabs ----------
function showTab(name) {
  $$(".tabs button").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.tab === name)));
  $$(".panel").forEach((p) => p.classList.toggle("active", p.id === name));
  if (name === "code" && !$("#codeBody").textContent) openFile(FILES[0][0]);
  store.set("iniaku.tab", name);
}
$$(".tabs button").forEach((b) => b.addEventListener("click", () => showTab(b.dataset.tab)));

// ---------- system map ----------
$$("#map .node").forEach((g) => g.addEventListener("click", () => {
  $$("#map .node").forEach((n) => n.classList.remove("sel"));
  g.classList.add("sel");
  const [title, body, prodId] = MAP_INFO[g.dataset.node];
  const p = PRODUCTS.find((x) => x.id === prodId);
  $("#mapInfo").innerHTML = `<h3>${esc(title)}</h3><p>${esc(body)}</p>` +
    (p ? `<p class="muted">${esc(p.name)} · ${p.price ? rp(p.price[0]) + "–" + rp(p.price[1]) : "software"}</p>` +
      `<button class="link" data-goto="${p.file ? "code" : "products"}" data-file="${esc(p.file || "")}">${p.file ? "Open its code →" : "See the part →"}</button>` : "");
  const btn = $("#mapInfo .link");
  if (btn) btn.addEventListener("click", () => { showTab(btn.dataset.goto); if (btn.dataset.file) openFile(btn.dataset.file); });
}));

// ---------- products ----------
function renderProducts(filter = "all") {
  const list = PRODUCTS.filter((p) => filter === "all" || p.kind === filter);
  $("#prodGrid").innerHTML = list.map((p) => `
    <article class="card prod ${p.kind}">
      <div class="prod-head"><span class="kind">${p.kind}</span><span class="price">${p.price ? rp(p.price[0]) + "–" + rp(p.price[1]) : "built by the team"}</span></div>
      <h3>${esc(p.name)}</h3><div class="role">${esc(p.role)}${p.unit ? " · " + esc(p.unit) : ""}</div>
      <ul>${p.specs.map((s) => `<li>${esc(s)}</li>`).join("")}</ul>
      <p class="why"><b>Why:</b> ${esc(p.why)}</p>
      ${p.file ? `<button class="link" data-file="${esc(p.file)}">View code →</button>` : ""}
    </article>`).join("");
  $$("#prodGrid .link").forEach((b) => b.addEventListener("click", () => { showTab("code"); openFile(b.dataset.file); }));
  const core = PRODUCTS.filter((p) => p.price && p.id !== "piezo" && p.id !== "power");
  const lo = core.reduce((a, p) => a + p.price[0], 0), hi = core.reduce((a, p) => a + p.price[1], 0);
  $("#bomTotal").innerHTML = `Core kit (sensor, electrodes, ESP32, motor): <b>${rp(lo)}–${rp(hi)}</b> · battery and piezo mic are optional`;
}
$$("#prodFilter button").forEach((b) => b.addEventListener("click", () => {
  $$("#prodFilter button").forEach((x) => x.classList.toggle("on", x === b));
  renderProducts(b.dataset.f);
}));
renderProducts();

// ---------- simulator ----------
const det = new Detector();
const HIST = 1000;                          // 10 s at 100 Hz
const hist = [];
let schedule = [];                          // active synthetic actions
let calTimer = null;
let vad = null, liveDev = null, liveMode = false;
let wander = 0;

const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

// Shapes are rough imitations of real ENV traces: sustained low hump (murmur),
// evenly spaced short bursts (chewing), one short tall burst (swallow).
function synthSample(t) {
  wander += (gauss() * 0.4 - wander * 0.02);
  let v = 300 + wander + gauss() * 5;
  schedule = schedule.filter((a) => t < a.end);
  for (const a of schedule) {
    const local = t - a.start;
    if (a.kind === "murmur") v += 70 * Math.min(1, local / 150, (a.end - t) / 150) * (0.85 + 0.15 * Math.sin(local / 90)) + gauss() * 6;
    if (a.kind === "chew") { const ph = local % 700; if (ph < 260) v += 110 * Math.sin(Math.PI * ph / 260); }
    if (a.kind === "swallow") v += 260 * Math.sin(Math.PI * Math.min(1, local / 420));
  }
  return v;
}

function addAction(kind) {
  const t = det.t;
  const len = { murmur: 2200, chew: 2900, swallow: 420 }[kind];
  schedule.push({ kind, start: t, end: t + len });
}
$$("[data-act]").forEach((b) => b.addEventListener("click", () => {
  if (liveMode) return note("Live mode is on: actions come from the real sensor.");
  addAction(b.dataset.act);
}));

function feed(v) {
  det.push(v);
  hist.push({ v, t: det.t });
  if (hist.length > HIST) hist.shift();
}

// Synthetic stream: 5 samples every 50 ms. setInterval, not rAF, so it keeps running in a hidden tab.
setInterval(() => {
  if (!liveMode) for (let i = 0; i < 5; i++) feed(synthSample(det.t));
  draw();
  updateChannels();
}, 50);

det.onEvent((ev) => {
  if (ev.type === "noise") return;
  const label = { speech: "Speech-motor activity", chewing: "Chewing (ignored)", swallow: "Swallow (ignored)" }[ev.type];
  const li = document.createElement("li");
  li.className = ev.type;
  li.innerHTML = `<b>${label}</b> · ${(ev.durMs / 1000).toFixed(2)} s · peak ${ev.peak} <span class="muted">at ${(ev.end / 1000).toFixed(1)} s</span>`;
  $("#evLog").prepend(li);
  while ($("#evLog").children.length > 12) $("#evLog").lastChild.remove();
});

$("#btnCal").addEventListener("click", () => {
  det.startCalibration();
  schedule = [];
  $("#simState").textContent = "Calibrating… stay still";
  $("#simState").className = "pill warn";
  clearTimeout(calTimer);
  calTimer = setTimeout(() => {
    try {
      const r = det.finishCalibration();
      $("#simState").textContent = "Calibrated";
      $("#simState").className = "pill ok";
      $("#thrText").textContent = `baseline ${r.mean.toFixed(0)} ± ${r.sd.toFixed(1)} · threshold ${r.threshold.toFixed(0)}`;
    } catch (e) {
      $("#simState").textContent = e.message;
      $("#simState").className = "pill bad";
    }
  }, 3000);
});

const outsideSpeech = () => (vad ? vad.speechRecently() : $("#roomTalk").checked);

function updateChannels() {
  const cal = det.isCalibrated();
  const inn = cal && det.insideActive();
  $("#chIn b").textContent = cal ? (inn ? "active" : "quiet") : "–";
  $("#chIn").className = "ch " + (inn ? "on" : "");
  const out = outsideSpeech();
  $("#chOut b").textContent = out ? "speech" : "no speech";
  $("#chOut").className = "ch " + (out ? "on b" : "");
}

$("#btnVoice").addEventListener("click", () => {
  if (!det.isCalibrated()) return note("Calibrate first: the detector needs your resting baseline.", true);
  const v = verdict(det.insideActive(), outsideSpeech());
  const card = $("#verdictCard");
  card.className = "card verdict " + v.key;
  card.innerHTML = `<div class="vsmall">Inside: ${det.insideActive() ? "active" : "quiet"} · Outside: ${outsideSpeech() ? "speech" : "no speech"}</div>
    <h2>${esc(v.title)}</h2><p>${esc(v.detail)}</p><p class="act">${esc(v.action)}</p>
    ${v.key === "inner" ? `<button id="btnHum" class="primary">Start 30-second hum coach</button><div id="hum" class="hum"></div>` : ""}`;
  if (v.key === "inner") {
    buzz();
    $("#btnHum").addEventListener("click", humCoach);
  }
  diary(v);
});

function buzz() {
  const h = $("#haptic");
  h.classList.remove("buzz"); void h.offsetWidth; h.classList.add("buzz");
  if (navigator.vibrate && navigator.userActivation?.hasBeenActive) navigator.vibrate([60, 90, 60]);
  if (liveDev) liveDev.tap(1).catch(() => {});
}

function humCoach() {
  let left = 30;
  const el = $("#hum");
  if (liveDev) liveDev.tap(2).catch(() => {});
  const t = setInterval(() => {
    el.innerHTML = `<div class="ring" style="--p:${(30 - left) / 30}"></div><span>${left > 0 ? "Hum one soft note… " + left + " s" : "Done. How loud is the voice now?"}</span>`;
    if (left-- <= 0) clearInterval(t);
  }, 1000);
}

function diary(v) {
  const d = store.get("iniaku.diary", []);
  d.unshift({ at: new Date().toISOString(), verdict: v.key });
  store.set("iniaku.diary", d.slice(0, 100));
}

function note(msg, bad) { $("#liveMsg").textContent = msg; $("#liveMsg").classList.toggle("bad", !!bad); if (bad) $("#liveMsg").scrollIntoView({ block: "nearest" }); }

// ---------- scope drawing ----------
const cvs = $("#scope"), g = cvs.getContext("2d");
function draw() {
  const W = cvs.width, H = cvs.height;
  g.clearRect(0, 0, W, H);
  if (!hist.length) return;
  const vals = hist.map((h) => h.v);
  const lo = Math.min(...vals, det.mean ?? Infinity) - 20, hi = Math.max(...vals, det.threshold() ?? -Infinity, 420) + 20;
  const y = (v) => H - ((v - lo) / (hi - lo)) * H;
  const t0 = hist[0].t, t1 = t0 + HIST * 10;
  const x = (t) => ((t - t0) / (t1 - t0)) * W;
  const col = { speech: "rgba(42,157,143,.22)", chewing: "rgba(233,162,59,.22)", swallow: "rgba(209,73,91,.22)" };
  for (const e of det.events) if (col[e.type] && e.end > t0) { g.fillStyle = col[e.type]; g.fillRect(x(e.start), 0, x(e.end) - x(e.start), H); }
  g.strokeStyle = "rgba(142,125,190,.18)"; g.lineWidth = 1;
  for (let i = 1; i < 10; i++) { g.beginPath(); g.moveTo((W / 10) * i, 0); g.lineTo((W / 10) * i, H); g.stroke(); }
  const thr = det.threshold();
  if (thr) { g.strokeStyle = "#d1495b"; g.setLineDash([6, 5]); g.beginPath(); g.moveTo(0, y(thr)); g.lineTo(W, y(thr)); g.stroke(); g.setLineDash([]); }
  g.strokeStyle = "#5b4b9a"; g.lineWidth = 2; g.beginPath();
  hist.forEach((h, i) => (i ? g.lineTo(x(h.t), y(h.v)) : g.moveTo(x(h.t), y(h.v))));
  g.stroke();
}

// ---------- live hardware ----------
$("#btnBle").addEventListener("click", async () => {
  if (!LiveDevice.supported()) return note("Web Bluetooth needs Chrome on Android or desktop, opened from localhost or https.", true);
  try {
    liveDev = new LiveDevice((samples) => samples.forEach(feed));
    liveDev.onDisconnect = () => { liveMode = false; liveDev = null; note("Device disconnected. Back to the simulator."); };
    const name = await liveDev.connect();
    liveMode = true; schedule = [];
    note(`Connected to ${name}. Now press Calibrate and stay still for 3 seconds.`);
  } catch (e) { liveDev = null; note("Bluetooth: " + e.message, true); }
});
$("#btnMic").addEventListener("click", async () => {
  try {
    if (vad) { vad.stop(); vad = null; $("#btnMic").textContent = "Use real microphone"; $("#roomTalk").disabled = false; return note("Microphone off."); }
    vad = new OutsideVAD();
    await vad.start();
    $("#btnMic").textContent = "Stop microphone"; $("#roomTalk").disabled = true;
    note("Microphone on. Processed live on this device; nothing is recorded.");
  } catch (e) { vad = null; note("Microphone: " + e.message, true); }
});

// ---------- method ----------
$("#steps").innerHTML = STEPS.map(([t, b], i) => `<details class="card step"${i < 2 ? " open" : ""}><summary><span class="num">${i + 1}</span>${esc(t)}</summary><p>${esc(b)}</p></details>`).join("");
$("#safety").innerHTML = SAFETY.map(([t, b]) => `<div class="card safe"><h3>${esc(t)}</h3><p>${esc(b)}</p></div>`).join("");
$("#refs").innerHTML = REFS.map(([t, d]) => `<li>${esc(t)} · <a href="https://doi.org/${esc(d)}" target="_blank" rel="noopener">doi:${esc(d)}</a></li>`).join("");

// ---------- code viewer ----------
$("#fileList").innerHTML = FILES.map(([f, d]) => `<button data-file="${esc(f)}"><b>${esc(f.split("/").pop())}</b><span>${esc(d)}</span></button>`).join("");
$$("#fileList button").forEach((b) => b.addEventListener("click", () => openFile(b.dataset.file)));

function highlight(src, isC) {
  const kw = isC ? "\\b(?:void|int|uint8_t|uint16_t|uint32_t|int32_t|bool|volatile|static|class|public|override|if|else|for|return|new|true|false|const)\\b"
    : "\\b(?:const|let|var|function|class|constructor|return|if|else|for|of|new|this|async|await|try|catch|throw|typeof|true|false|null)\\b";
  const re = new RegExp(`(\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/)|("(?:[^"\\\\\\n]|\\\\.)*"|'(?:[^'\\\\\\n]|\\\\.)*'|\`(?:[^\`\\\\]|\\\\.)*\`)|(#\\w+)|(${kw})|(\\b\\d[\\d.]*\\b)`, "g");
  let out = "", last = 0, m;
  while ((m = re.exec(src))) {
    out += esc(src.slice(last, m.index));
    const cls = m[1] ? "c" : m[2] ? "s" : m[3] ? "p" : m[4] ? "k" : "n";
    out += `<span class="${cls}">${esc(m[0])}</span>`;
    last = re.lastIndex;
  }
  return out + esc(src.slice(last));
}

async function openFile(path) {
  $$("#fileList button").forEach((b) => b.classList.toggle("on", b.dataset.file === path));
  const meta = FILES.find((f) => f[0] === path);
  $("#codeName").textContent = path;
  $("#codeDesc").textContent = meta ? meta[1] : "";
  $("#btnDl").href = path;
  try {
    const r = await fetch(path, { cache: "no-store" });
    if (!r.ok) throw new Error(r.status + " " + r.statusText);
    const text = await r.text();
    $("#codeBody").innerHTML = highlight(text, path.endsWith(".ino"));
    $("#codeBody").dataset.raw = text;
  } catch (e) {
    $("#codeBody").textContent = `Couldn't load ${path} (${e.message}). Open this site through the local server (start.bat), not by double-clicking index.html.`;
  }
}
$("#btnCopy").addEventListener("click", async () => {
  try { await navigator.clipboard.writeText($("#codeBody").dataset.raw || ""); $("#btnCopy").textContent = "Copied"; }
  catch { $("#btnCopy").textContent = "Copy failed"; }
  setTimeout(() => ($("#btnCopy").textContent = "Copy"), 1500);
});

// ---------- board ----------
const COLS = [["todo", "To do"], ["doing", "Doing"], ["done", "Done"]];
let tasks = store.get("iniaku.tasks", null) || TASKS.map(([day, text, col], i) => ({ id: i, day, text, col }));
function renderBoard() {
  $("#kanban").innerHTML = COLS.map(([k, label]) => `
    <div class="col" data-col="${k}"><h3>${label} <span>${tasks.filter((t) => t.col === k).length}</span></h3>
      ${tasks.filter((t) => t.col === k).map((t) => `<div class="task" draggable="true" data-id="${t.id}"><span class="day">${t.day}</span>${esc(t.text)}</div>`).join("")}
    </div>`).join("");
  const done = tasks.filter((t) => t.col === "done").length;
  $("#progress").innerHTML = `<div class="bar"><i style="width:${(done / tasks.length) * 100}%"></i></div>${done} of ${tasks.length} done`;
  $$(".task").forEach((el) => {
    el.addEventListener("dragstart", (e) => e.dataTransfer.setData("text/plain", el.dataset.id));
    // Tap to advance, for phones where drag-and-drop doesn't work.
    el.addEventListener("click", () => { const t = tasks.find((x) => x.id == el.dataset.id); t.col = { todo: "doing", doing: "done", done: "todo" }[t.col]; save(); });
  });
  $$(".col").forEach((c) => {
    c.addEventListener("dragover", (e) => { e.preventDefault(); c.classList.add("over"); });
    c.addEventListener("dragleave", () => c.classList.remove("over"));
    c.addEventListener("drop", (e) => { e.preventDefault(); const t = tasks.find((x) => x.id == e.dataTransfer.getData("text/plain")); if (t) { t.col = c.dataset.col; save(); } });
  });
}
function save() { store.set("iniaku.tasks", tasks); renderBoard(); }
$("#btnReset").addEventListener("click", () => { tasks = TASKS.map(([day, text, col], i) => ({ id: i, day, text, col })); save(); });
renderBoard();

showTab(store.get("iniaku.tab", "overview"));
