// You, Yourself Virtual Breadboard: draws the real wearable circuit and simulates it with detector.js.
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const rp = (n) => "Rp " + n.toLocaleString("id-ID");

// ---------- breadboard geometry ----------
const X = (c) => 176 + c * 13;  // breadboard column -> x
const Y = { tp: 60, tn: 73, A: 104, B: 117, C: 130, D: 143, E: 156, F: 184, G: 197, H: 210, I: 223, J: 236, bn: 266, bp: 279 };
const PIN_TOP = (i) => [345 + i * 26, 392];   // ESP32 header facing the breadboard
const PIN_BOT = (i) => [345 + i * 26, 548];   // ESP32 header on the far side
const TOP_HDR = ["EN", "VP", "VN", "D34", "D35", "D32", "D33", "D25", "D26", "D27", "D14", "D12", "D13", "GND", "VIN"];
const BOT_HDR = ["D23", "D22", "TX0", "RX0", "D21", "D19", "D18", "D5", "TX2", "RX2", "D4", "D2", "D15", "GND", "3V3"];

// Wires: colour, path, which signal animates on it, and the netlist text for export.
const WIRES = [
  { d: `M140,120 C165,120 189,92 ${X(1)},${Y.tp}`, color: "#d62828", sig: "pwr", net: "MyoWare + → 3V3 rail" },
  { d: `M140,150 C178,150 ${X(2)},112 ${X(2)},${Y.tn}`, color: "#222", sig: "pwr", net: "MyoWare − → GND rail" },
  { d: `M140,180 C260,180 423,300 ${PIN_TOP(3)[0]},392`, color: "#e9b200", sig: "env", net: "MyoWare ENV → ESP32 D34 (ADC1)" },
  { d: `M${PIN_TOP(7)[0]},392 C527,320 ${X(23)},210 ${X(23)},${Y.B}`, color: "#2a9d3a", sig: "g25", net: "ESP32 D25 → R1 (1 kΩ) → Q1 base" },
  { d: `M${PIN_TOP(13)[0]},392 C683,330 ${X(50)},200 ${X(50)},${Y.tn}`, color: "#222", sig: "pwr", net: "ESP32 GND → GND rail" },
  { d: `M${PIN_BOT(14)[0]},548 C990,620 975,40 ${X(55)},${Y.tp}`, color: "#d62828", sig: "pwr", net: "ESP32 3V3 → 3V3 rail" },
  { d: `M${X(28)},${Y.A} L${X(28)},${Y.tn}`, color: "#222", sig: "g25", net: "Q1 emitter → GND rail" },
  { d: `M${X(30)},${Y.B} C${X(31)},104 ${X(33)},104 ${X(34)},${Y.B}`, color: "#1f6fd1", sig: "g25", net: "Q1 collector → motor − / D1 anode" },
  { d: `M${X(40)},${Y.A} L${X(40)},${Y.tp}`, color: "#d62828", sig: "g25", net: "Motor + / D1 cathode → 3V3 rail" },
];

const PARTS = {
  myoware: { name: "U1 · MyoWare 2.0", type: "EMG muscle sensor", value: "ENV output, powered at 3.3 V", pins: "+ → 3V3 rail · − → GND rail · ENV → ESP32 D34", prod: "myoware" },
  electrodes: { name: "E1–E3 · Gel electrodes", type: "Ag/AgCl snap electrodes", value: "Single use", pins: "MID + END on the lower-lip muscle, REF on the jaw bone", prod: "electrodes" },
  esp32: { name: "U2 · ESP32 DevKit", type: "Microcontroller + Bluetooth LE", value: "240 MHz · 12-bit ADC", pins: "D34 ← ENV · D25 → R1 · GND → rail · 3V3 → rail", prod: "esp32", file: "firmware/ini_aku_esp32/ini_aku_esp32.ino" },
  r1: { name: "R1", type: "Resistor", value: "1 kΩ (brown-black-red-gold)", pins: "ESP32 D25 → Q1 base", price: "≈ Rp 500", desc: "Limits the base current so the GPIO only supplies about 2.6 mA." },
  q1: { name: "Q1 · 2N2222", type: "NPN transistor, TO-92", value: "Pins E-B-C (flat side facing you)", pins: "E → GND · B ← R1 · C → motor −", price: "≈ Rp 1.000", desc: "A switch: the GPIO can't power the motor directly (≈80 mA), so it switches the transistor instead." },
  d1: { name: "D1 · 1N4148", type: "Flyback diode", value: "Band = cathode", pins: "Anode → Q1 collector · cathode → 3V3", price: "≈ Rp 300", desc: "Absorbs the voltage spike when the motor turns off, protecting Q1 and the ESP32." },
  m1: { name: "M1 · Coin vibration motor", type: "10 mm, 3 V", value: "≈ 80 mA", pins: "+ → 3V3 · − → Q1 collector", prod: "motor" },
  led: { name: "LED · on-board (GPIO2)", type: "Status LED", value: "Blue", pins: "Internal to the DevKit", desc: "Turns on while a phone is connected over Bluetooth, as written in the firmware." },
  bb: { name: "Breadboard 830", type: "Prototyping", value: "63 × 10 + power rails", pins: "Rows A–E and F–J are connected in columns", price: "≈ Rp 20.000", desc: "For the hackathon build. The final wearable moves onto a small perfboard." },
  lipo: { name: "LiPo 3.7 V + TP4056", type: "Power (not placed)", value: "500 mAh", pins: "Not on this breadboard: the demo runs on USB", prod: "power" },
  piezo: { name: "Throat piezo mic", type: "Alternative sensor (not placed)", value: "Contact microphone", pins: "Would replace U1 if electrodes aren't possible", prod: "piezo" },
};

// ---------- draw the breadboard ----------
function svgBoard() {
  let s = `<defs>
    <linearGradient id="metal" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f4f4f4"/><stop offset="1" stop-color="#9a9a9a"/></linearGradient>
    <radialGradient id="ledglow"><stop offset="0" stop-color="#7fd3ff"/><stop offset="1" stop-color="#7fd3ff" stop-opacity="0"/></radialGradient>
  </defs>`;
  // board body
  s += `<g class="comp" data-id="bb"><rect class="hit" x="156" y="36" width="778" height="266" rx="6"/>
    <rect x="160" y="40" width="770" height="258" rx="6" fill="#f3f3ef" stroke="#cfcfc6"/>
    <rect x="164" y="163" width="762" height="14" fill="#e3e3dc"/>
    <line x1="170" y1="51" x2="920" y2="51" stroke="#d62828" stroke-width="2"/><line x1="170" y1="82" x2="920" y2="82" stroke="#1f6fd1" stroke-width="2"/>
    <line x1="170" y1="257" x2="920" y2="257" stroke="#1f6fd1" stroke-width="2"/><line x1="170" y1="288" x2="920" y2="288" stroke="#d62828" stroke-width="2"/>
    <text x="164" y="64" class="lbl dark" fill="#d62828">+</text><text x="164" y="77" class="lbl dark">−</text>`;
  for (const [r, y] of Object.entries(Y)) {
    for (let c = 0; c < 57; c++) {
      if ((r.length === 2) && c % 6 === 5) continue; // rails come in groups of five
      s += `<rect x="${X(c) - 2.5}" y="${y - 2.5}" width="5" height="5" fill="#4a4a4a" rx="1"/>`;
    }
    if (r.length === 1) s += `<text x="${X(57) + 2}" y="${y + 3}" font-size="8" fill="#999">${r}</text>`;
  }
  s += `</g>`;

  // MyoWare module (off-board, wired in)
  s += `<g class="comp" data-id="myoware"><rect class="hit" x="10" y="66" width="140" height="186" rx="8"/>
    <rect x="16" y="72" width="124" height="172" rx="14" fill="#c2224f"/>
    <text x="78" y="96" text-anchor="middle" class="lbl">MyoWare 2.0</text>
    <text x="78" y="230" text-anchor="middle" class="pinlbl">muscle sensor</text>
    <circle cx="132" cy="120" r="5" fill="#d9b45b"/><circle cx="132" cy="150" r="5" fill="#d9b45b"/><circle cx="132" cy="180" r="5" fill="#d9b45b"/>
    <text x="122" y="123" text-anchor="end" class="pinlbl">+</text><text x="122" y="153" text-anchor="end" class="pinlbl">−</text><text x="122" y="183" text-anchor="end" class="pinlbl">ENV</text>
    <circle cx="50" cy="214" r="5" fill="#fff" id="myoLed" opacity=".25"/><text x="60" y="217" class="pinlbl">LED</text></g>`;
  // electrodes on the module + REF on its cable
  s += `<g class="comp" data-id="electrodes"><rect class="hit" x="20" y="108" width="60" height="230"/>
    <circle cx="50" cy="128" r="15" fill="url(#metal)" stroke="#777"/><text x="50" y="131" text-anchor="middle" font-size="8" fill="#333">MID</text>
    <circle cx="50" cy="178" r="15" fill="url(#metal)" stroke="#777"/><text x="50" y="181" text-anchor="middle" font-size="8" fill="#333">END</text>
    <path d="M30,240 C20,280 40,300 50,310" stroke="#333" stroke-width="3" fill="none"/>
    <circle cx="52" cy="318" r="13" fill="url(#metal)" stroke="#777"/><text x="52" y="321" text-anchor="middle" font-size="8" fill="#333">REF</text>
    <text x="72" y="322" font-size="10" fill="#555">jaw bone</text>
    <text x="16" y="62" font-size="10" fill="#555">electrodes → under the lower lip</text></g>`;

  // R1 1k on row A, col 23 -> col 29
  s += `<g class="comp" data-id="r1"><rect class="hit" x="${X(23) - 4}" y="92" width="${X(29) - X(23) + 8}" height="24"/>
    <line x1="${X(23)}" y1="${Y.A}" x2="${X(29)}" y2="${Y.A}" stroke="#9a9a9a" stroke-width="2"/>
    <rect x="${(X(23) + X(29)) / 2 - 17}" y="98" width="34" height="12" rx="5" fill="#e7cf9d" stroke="#b49865"/>
    ${[["#7a4a1c", -10], ["#111", -4], ["#c62828", 2], ["#c9a227", 10]].map(([c, o]) => `<rect x="${(X(23) + X(29)) / 2 + o}" y="98" width="3" height="12" fill="${c}"/>`).join("")}
    <text x="${(X(23) + X(29)) / 2}" y="94" text-anchor="middle" font-size="9" fill="#555">R1 1kΩ</text></g>`;

  // Q1 NPN TO-92, legs E-B-C in cols 28,29,30 row E
  s += `<g class="comp" data-id="q1"><rect class="hit" x="${X(28) - 12}" y="124" width="${X(30) - X(28) + 24}" height="36"/>
    ${[28, 29, 30].map((c) => `<line x1="${X(c)}" y1="148" x2="${X(c)}" y2="${Y.E}" stroke="#9a9a9a" stroke-width="2"/>`).join("")}
    <path d="M${X(28) - 9},148 L${X(28) - 9},136 A21,14 0 0 1 ${X(30) + 9},136 L${X(30) + 9},148 Z" fill="#222"/>
    <text x="${X(29)}" y="141" text-anchor="middle" font-size="8" fill="#ddd">Q1</text>
    ${["E", "B", "C"].map((t, i) => `<text x="${X(28 + i)}" y="${Y.E + 12}" text-anchor="middle" font-size="7" fill="#777">${t}</text>`).join("")}</g>`;

  // D1 1N4148 on row C, col 34 -> col 40, band at the cathode (col 40)
  s += `<g class="comp" data-id="d1"><rect class="hit" x="${X(34) - 4}" y="120" width="${X(40) - X(34) + 8}" height="20"/>
    <line x1="${X(34)}" y1="${Y.C}" x2="${X(40)}" y2="${Y.C}" stroke="#9a9a9a" stroke-width="2"/>
    <rect x="${(X(34) + X(40)) / 2 - 13}" y="125" width="26" height="10" rx="2" fill="#c0392b" opacity=".85"/>
    <rect x="${(X(34) + X(40)) / 2 + 8}" y="125" width="3" height="10" fill="#111"/>
    <text x="${(X(34) + X(40)) / 2}" y="121" text-anchor="middle" font-size="9" fill="#555">D1</text></g>`;

  // M1 coin motor, leads into col 34 (−) and col 40 (+) row D
  const mx = X(37), my = 222;
  s += `<g class="comp" data-id="m1"><rect class="hit" x="${mx - 44}" y="140" width="88" height="112"/>
    <path d="M${X(40)},${Y.D} C${X(40)},180 ${mx + 18},185 ${mx + 14},${my - 20}" stroke="#d62828" stroke-width="2.5" fill="none"/>
    <path d="M${X(34)},${Y.D} C${X(34)},180 ${mx - 18},185 ${mx - 14},${my - 20}" stroke="#1f6fd1" stroke-width="2.5" fill="none"/>
    <g class="motor-body" id="motorBody"><circle cx="${mx}" cy="${my}" r="26" fill="url(#metal)" stroke="#777"/><circle cx="${mx}" cy="${my}" r="9" fill="none" stroke="#999"/></g>
    <text x="${mx + 32}" y="${my + 4}" font-size="10" fill="#555">M1 motor</text></g>`;

  // ESP32 DevKit
  s += `<g class="comp" data-id="esp32"><rect class="hit" x="282" y="372" width="476" height="196" rx="6"/>
    <rect x="300" y="380" width="450" height="180" rx="8" fill="#1d1d1f"/>
    <rect x="282" y="448" width="34" height="44" rx="3" fill="url(#metal)" stroke="#777"/>
    <rect x="610" y="402" width="130" height="136" rx="4" fill="url(#metal)" stroke="#888"/>
    <text x="675" y="468" text-anchor="middle" font-size="11" font-weight="700" fill="#444">ESP-WROOM-32</text>
    <path d="M622,410 h12 v10 h12 v-10 h12 v10 h12 v-10 h12 v10 h12 v-10 h12" stroke="#c9a227" stroke-width="2" fill="none"/>
    <text x="460" y="474" text-anchor="middle" class="lbl">ESP32 DevKit V1</text>
    ${TOP_HDR.map((n, i) => { const [x, y] = PIN_TOP(i); return `<rect x="${x - 4}" y="${y - 4}" width="8" height="8" fill="#c9a227"/><text x="${x}" y="${y + 18}" text-anchor="middle" class="pinlbl">${n}</text>`; }).join("")}
    ${BOT_HDR.map((n, i) => { const [x, y] = PIN_BOT(i); return `<rect x="${x - 4}" y="${y - 4}" width="8" height="8" fill="#c9a227"/><text x="${x}" y="${y - 10}" text-anchor="middle" class="pinlbl">${n}</text>`; }).join("")}
  </g>
  <g class="comp" data-id="led"><rect class="hit" x="330" y="488" width="60" height="30"/>
    <circle id="ledGlow" cx="345" cy="502" r="16" fill="url(#ledglow)" opacity="0"/>
    <rect x="340" y="497" width="10" height="10" rx="2" fill="#b9e3ff" id="ledChip" opacity=".35"/><text x="356" y="506" class="pinlbl">LED G2</text></g>`;

  // wires above the parts, each with an animated flow overlay
  s += WIRES.map((w, i) => `<path class="wire" d="${w.d}" stroke="${w.color}"/><path class="flowline" data-sig="${w.sig}" data-i="${i}" d="${w.d}"/>`).join("");
  // re-draw pin dots on top so wire ends look plugged in
  s += WIRES.map((w) => { const m = w.d.match(/^M([\d.]+),([\d.]+)/); const e = w.d.match(/([\d.]+),([\d.]+)$/); return `<circle cx="${m[1]}" cy="${m[2]}" r="3" fill="#555"/><circle cx="${e[1]}" cy="${e[2]}" r="3" fill="#555"/>`; }).join("");
  $("#board").innerHTML = s;
}

// ---------- toolbox ----------
const ICONS = {
  myoware: `<rect x="6" y="4" width="20" height="24" rx="5" fill="#c2224f"/><circle cx="12" cy="11" r="3" fill="#ddd"/><circle cx="12" cy="21" r="3" fill="#ddd"/>`,
  electrodes: `<circle cx="16" cy="16" r="10" fill="#ddd" stroke="#777" stroke-width="2"/><circle cx="16" cy="16" r="3" fill="#777"/>`,
  esp32: `<rect x="3" y="8" width="26" height="16" rx="2" fill="#1d1d1f"/><rect x="18" y="10" width="9" height="12" fill="#bbb"/>`,
  m1: `<circle cx="16" cy="16" r="10" fill="#ccc" stroke="#777" stroke-width="2"/><path d="M4 10l-2 2M28 10l2 2" stroke="#e0631d" stroke-width="2"/>`,
  q1: `<path d="M9 22V12a7 6 0 0 1 14 0v10z" fill="#222"/><path d="M12 22v6M16 22v6M20 22v6" stroke="#999" stroke-width="2"/>`,
  r1: `<path d="M2 16h6M24 16h6" stroke="#999" stroke-width="2"/><rect x="8" y="11" width="16" height="10" rx="3" fill="#e7cf9d"/><path d="M12 11v10M16 11v10" stroke="#c62828" stroke-width="2"/>`,
  d1: `<path d="M2 16h8M22 16h8" stroke="#999" stroke-width="2"/><rect x="10" y="12" width="12" height="8" fill="#c0392b"/><rect x="19" y="12" width="2" height="8" fill="#111"/>`,
  led: `<path d="M10 18a6 6 0 0 1 12 0v6H10z" fill="#5ab4ff"/><path d="M13 24v6M19 24v6" stroke="#999" stroke-width="2"/>`,
  bb: `<rect x="3" y="6" width="26" height="20" rx="2" fill="#f3f3ef" stroke="#bbb"/><path d="M6 10h20M6 22h20" stroke="#d62828"/><g fill="#555"><rect x="7" y="14" width="2" height="2"/><rect x="12" y="14" width="2" height="2"/><rect x="17" y="14" width="2" height="2"/><rect x="22" y="14" width="2" height="2"/></g>`,
  lipo: `<rect x="5" y="9" width="20" height="14" rx="2" fill="#3a6ea5"/><rect x="25" y="13" width="3" height="6" fill="#999"/>`,
  piezo: `<circle cx="16" cy="16" r="10" fill="#d9b45b"/><circle cx="16" cy="16" r="5" fill="#eee"/>`,
};
const CATS = [
  ["Sensors", ["myoware", "electrodes", "piezo"]],
  ["Microcontrollers", ["esp32"]],
  ["Actuators", ["m1", "led"]],
  ["Passives", ["r1", "q1", "d1"]],
  ["Power", ["lipo"]],
  ["Prototyping", ["bb"]],
];
function priceOf(id) {
  const p = PARTS[id];
  const prod = p.prod && PRODUCTS.find((x) => x.id === p.prod);
  return prod ? `${rp(prod.price[0])}–${rp(prod.price[1])}` : p.price || "—";
}
function buildToolbox() {
  $("#iconsGrid").innerHTML = Object.keys(ICONS).map((id) => `<button data-sel="${id}" title="${esc(PARTS[id].name)}"><svg viewBox="0 0 32 32">${ICONS[id]}</svg></button>`).join("");
  $("#cats").innerHTML = CATS.map(([cat, ids], i) => `<div class="cat${i < 3 ? " open" : ""}"><button>${cat}</button><ul>${ids.map((id) => `<li data-sel="${id}"><span>${esc(PARTS[id].name.replace(/^.*· /, ""))}</span><small>${$("#board").querySelector(`[data-id="${id}"]`) ? "placed" : "—"}</small></li>`).join("")}</ul></div>`).join("");
  $$(".cat > button").forEach((b) => b.addEventListener("click", () => b.parentElement.classList.toggle("open")));
  $$("[data-sel]").forEach((el) => el.addEventListener("click", () => select(el.dataset.sel)));
}

// ---------- selection + properties ----------
let selected = null;
function select(id) {
  selected = id;
  $$(".comp").forEach((g) => g.classList.toggle("sel", g.dataset.id === id));
  $$("[data-sel]").forEach((el) => el.classList.toggle("on", el.dataset.sel === id));
  showDoc("board");
  renderProps();
}
function renderProps() {
  if (!selected) { $("#props").innerHTML = ""; return; }
  const p = PARTS[selected];
  const prod = p.prod && PRODUCTS.find((x) => x.id === p.prod);
  const rows = [["Name", p.name], ["Type", p.type], ["Value", p.value], ["Connections", p.pins], ["Price", priceOf(selected)]];
  let html = `<tr class="group"><td colspan="2">Misc</td></tr>` + rows.map(([k, v]) => `<tr><td>${k}</td><td>${esc(v)}</td></tr>`).join("");
  const live = liveProps(selected);
  if (live.length) html += `<tr class="group"><td colspan="2">Live (simulation)</td></tr>` + live.map(([k, v]) => `<tr><td>${k}</td><td class="live">${esc(v)}</td></tr>`).join("");
  $("#props").innerHTML = html;
  $("#descTitle").textContent = p.name;
  $("#descBody").textContent = p.desc || (prod ? prod.why : "");
  if (p.file) $("#descBody").insertAdjacentHTML("beforeend", ` <a href="#" id="openFw">Open firmware →</a>`);
  const a = $("#openFw"); if (a) a.addEventListener("click", (e) => { e.preventDefault(); openCode(p.file); });
}

// ---------- simulation ----------
let det = new Detector();
let running = false, calibrating = false, calEnd = 0;
let schedule = [], hist = [], wander = 0, lastEnv = 0, g25 = false, lastSerial = 0;
const gauss = () => { let u = 0; while (!u) u = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * Math.random()); };

// Same synthetic ENV shapes as the workboard simulator.
function synth(t) {
  wander += gauss() * 0.4 - wander * 0.02;
  let v = 300 + wander + gauss() * 5;
  schedule = schedule.filter((a) => t < a.end);
  for (const a of schedule) {
    const l = t - a.start;
    if (a.kind === "murmur") v += 70 * Math.min(1, l / 150, (a.end - t) / 150) * (0.85 + 0.15 * Math.sin(l / 90)) + gauss() * 6;
    if (a.kind === "chew") { const ph = l % 700; if (ph < 260) v += 110 * Math.sin(Math.PI * ph / 260); }
    if (a.kind === "swallow") v += 260 * Math.sin(Math.PI * Math.min(1, l / 420));
  }
  return Math.round(v);
}

function serial(line) {
  const el = $("#serial");
  el.textContent += line + "\n";
  const lines = el.textContent.split("\n");
  if (lines.length > 400) el.textContent = lines.slice(-400).join("\n");
  el.scrollTop = el.scrollHeight;
}

function run() {
  if (running) return;
  det = new Detector();
  det.onEvent((ev) => { if (ev.type !== "noise") serial(`[EVENT] ${ev.type.padEnd(8)} ${(ev.durMs / 1000).toFixed(2)} s  peak=${ev.peak}${ev.type === "speech" ? "" : "  (ignored)"}`); });
  hist = []; schedule = [];
  running = true;
  $("#board").classList.add("running");
  $(".tb.run").classList.add("active");
  serial("You, Yourself ready, advertising as INI-AKU");
  serial("[BLE] phone connected");
  calibrate();
}
function calibrate() {
  if (!running) return;
  det.startCalibration(); calibrating = true; calEnd = det.t + 3000; schedule = [];
  serial("[CAL] calibrating baseline, stay still for 3 s…");
}
function stop() {
  running = false; calibrating = false;
  $("#board").classList.remove("running");
  $(".tb.run").classList.remove("active");
  serial("[BLE] disconnected");
}

function tick() {
  if (running) {
    for (let i = 0; i < 5; i++) {
      lastEnv = synth(det.t);
      det.push(lastEnv);
      hist.push({ v: lastEnv, t: det.t });
    }
    if (hist.length > 500) hist.splice(0, hist.length - 500);
    if (calibrating && det.t >= calEnd) {
      calibrating = false;
      const r = det.finishCalibration();
      serial(`[CAL] baseline ${r.mean.toFixed(0)} ± ${r.sd.toFixed(1)}  threshold ${r.threshold.toFixed(0)}`);
    }
    if (det.t - lastSerial >= 500 && det.isCalibrated()) {
      lastSerial = det.t;
      serial(`t=${(det.t / 1000).toFixed(1).padStart(6)}s  ENV=${String(lastEnv).padStart(4)}  thr=${det.threshold().toFixed(0)}  inside=${det.insideActive() ? "ACTIVE" : "quiet"}`);
    }
  }
  paint();
}
setInterval(tick, 50); // not rAF: keeps simulating when the window is in the background

function paint() {
  const st = $("#tbStatus");
  st.textContent = !running ? "Stopped" : calibrating ? "Calibrating…" : "Running";
  st.className = "tbstatus" + (running ? (calibrating ? " cal" : " running") : "");
  $("#status").textContent = !running ? "Ready · press ▶ Run to start the simulation" : calibrating ? "Calibrating: rest baseline (3 s)" : "Running · 100 Hz · BLE connected";
  $("#simTime").textContent = running ? `t = ${(det.t / 1000).toFixed(1)} s` : "";
  $("#pins").textContent = running ? `D34=${lastEnv}  D25=${g25 ? "HIGH" : "LOW"}  G2=HIGH` : "";
  // MyoWare LED brightness follows the envelope, the on-board LED shows the BLE link
  const thr = det.threshold();
  $("#myoLed").setAttribute("opacity", running && thr ? Math.min(1, Math.max(.25, (lastEnv - det.mean) / 80)) : .25);
  $("#ledGlow").setAttribute("opacity", running ? 1 : 0);
  $("#ledChip").setAttribute("opacity", running ? 1 : .35);
  $$(".flowline").forEach((f) => f.classList.toggle("on", running && (f.dataset.sig !== "g25" || g25)));
  if (selected) renderProps();
  drawScope();
}

function liveProps(id) {
  if (!running) return [];
  const inside = det.isCalibrated() && det.insideActive();
  if (id === "esp32") return [["D34 (ADC)", String(lastEnv)], ["D25", g25 ? "HIGH" : "LOW"], ["BLE", "connected · 10 samples / 100 ms"]];
  if (id === "myoware") return [["ENV", `${lastEnv} (≈ ${(lastEnv / 4095 * 3.1).toFixed(2)} V)`], ["Threshold", det.threshold() ? det.threshold().toFixed(0) : "calibrating"], ["Inside channel", inside ? "ACTIVE" : "quiet"]];
  if (id === "m1" || id === "q1" || id === "r1" || id === "d1") return [["State", g25 ? "ON (tap)" : "off"]];
  if (id === "led") return [["State", "ON"]];
  return [];
}

const sc = $("#scope"), g = sc.getContext("2d");
function drawScope() {
  const W = sc.width, H = sc.height;
  g.fillStyle = "#0d1a0d"; g.fillRect(0, 0, W, H);
  g.strokeStyle = "#1f3a1f"; g.lineWidth = 1;
  for (let i = 1; i < 6; i++) { g.beginPath(); g.moveTo(i * W / 6, 0); g.lineTo(i * W / 6, H); g.stroke(); }
  for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(0, i * H / 4); g.lineTo(W, i * H / 4); g.stroke(); }
  if (!hist.length) return;
  const lo = 260, hi = 600;
  const y = (v) => H - ((v - lo) / (hi - lo)) * H;
  const thr = det.threshold();
  if (thr) { g.strokeStyle = "#ff6b6b"; g.setLineDash([4, 4]); g.beginPath(); g.moveTo(0, y(thr)); g.lineTo(W, y(thr)); g.stroke(); g.setLineDash([]); }
  g.strokeStyle = "#5dff7a"; g.lineWidth = 1.5; g.beginPath();
  hist.forEach((h, i) => { const x = (i / 500) * W; i ? g.lineTo(x, y(h.v)) : g.moveTo(x, y(h.v)); });
  g.stroke();
}

function pulseMotor() {
  // Firmware pattern 1: two 60 ms taps with 90 ms between them.
  const body = $("#motorBody");
  const on = () => { g25 = true; body.classList.remove("buzz"); void body.getBBox(); body.classList.add("buzz"); };
  const off = () => { g25 = false; };
  on(); setTimeout(off, 60); setTimeout(on, 150); setTimeout(off, 210);
  setTimeout(() => body.classList.remove("buzz"), 900);
}

function voice() {
  if (!running) return modal("Not running", "Press ▶ Run first. The simulation calibrates for 3 seconds, then you can act and check.");
  if (calibrating) return modal("Still calibrating", "Wait for the 3-second rest baseline to finish.");
  const inside = det.insideActive();
  const outside = $("#roomTalk").checked;
  const v = verdict(inside, outside);
  serial(`[CHECK] inside=${inside ? "active" : "quiet"} outside=${outside ? "speech" : "none"} → ${v.title}`);
  if (v.key === "inner") { serial("[HAPTIC] pattern 1 (two taps)"); pulseMotor(); }
  modal(v.title, `<p>${esc(v.detail)}</p><p><b>${esc(v.action)}</b></p><p style="color:#777;font-size:12px">Inside: ${inside ? "active" : "quiet"} · Outside: ${outside ? "speech" : "no speech"}</p>`);
}

$$("[data-act]").forEach((b) => b.addEventListener("click", () => {
  if (!running || calibrating) return modal("Not ready", "Run the simulation and let calibration finish first.");
  const len = { murmur: 2200, chew: 2900, swallow: 420 }[b.dataset.act];
  schedule.push({ kind: b.dataset.act, start: det.t, end: det.t + len });
  serial(`[STIM] ${b.dataset.act}`);
}));
$("#roomTalk").addEventListener("change", (e) => serial(`[STIM] room speech ${e.target.checked ? "on" : "off"}`));

// ---------- documents ----------
function showDoc(name) {
  $$("#docTabs button").forEach((b) => b.classList.toggle("on", b.dataset.doc === name));
  $$(".doc").forEach((d) => d.classList.toggle("on", d.id === "doc-" + name));
}
$$("#docTabs button").forEach((b) => b.addEventListener("click", () => { if (b.dataset.doc === "code" && !$("#codeBody").textContent) openCode("firmware/ini_aku_esp32/ini_aku_esp32.ino"); else showDoc(b.dataset.doc); }));

function highlight(src, isC) {
  const kw = isC ? "\\b(?:void|int|uint8_t|uint16_t|uint32_t|int32_t|bool|volatile|static|class|public|override|if|else|for|return|new|true|false|const)\\b"
    : "\\b(?:const|let|var|function|class|constructor|return|if|else|for|of|new|this|async|await|try|catch|throw|typeof|true|false|null)\\b";
  const re = new RegExp(`(\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/)|("(?:[^"\\\\\\n]|\\\\.)*"|'(?:[^'\\\\\\n]|\\\\.)*'|\`(?:[^\`\\\\]|\\\\.)*\`)|(#\\w+)|(${kw})|(\\b\\d[\\d.]*\\b)`, "g");
  let out = "", last = 0, m;
  while ((m = re.exec(src))) {
    out += esc(src.slice(last, m.index));
    out += `<span class="${m[1] ? "c" : m[2] ? "s" : m[3] ? "p" : m[4] ? "k" : "n"}">${esc(m[0])}</span>`;
    last = re.lastIndex;
  }
  return out + esc(src.slice(last));
}
async function openCode(path) {
  const tab = $('#docTabs button[data-doc="code"]');
  tab.textContent = path.split("/").pop();
  showDoc("code");
  try {
    const r = await fetch(path, { cache: "no-store" });
    if (!r.ok) throw new Error(r.status + " " + r.statusText);
    $("#codeBody").innerHTML = highlight(await r.text(), path.endsWith(".ino"));
  } catch (e) {
    $("#codeBody").textContent = `Couldn't load ${path} (${e.message}). Open the page through start.bat, not by double-clicking.`;
  }
}

// ---------- tree, menus, toolbar ----------
$$("#tree .tw").forEach((t) => t.addEventListener("click", (e) => { e.stopPropagation(); const li = t.parentElement; li.classList.toggle("open"); t.textContent = li.classList.contains("open") ? "▾" : "▸"; }));
$$("#tree [data-file]").forEach((li) => li.addEventListener("click", (e) => { e.stopPropagation(); openCode(li.dataset.file); }));
$$("#tree [data-open]").forEach((li) => li.addEventListener("click", (e) => { e.stopPropagation(); showDoc("board"); }));

function modal(title, html) {
  $("#mTitle").textContent = title;
  $("#mBody").innerHTML = html;
  $("#modal").classList.remove("hidden");
}

let zoom = 1;
const CMDS = {
  run, stop, voice, calibrate,
  zoomin: () => { zoom = Math.min(2, zoom + 0.15); $("#board").style.width = zoom * 100 + "%"; },
  zoomout: () => { zoom = Math.max(0.7, zoom - 0.15); $("#board").style.width = zoom * 100 + "%"; },
  upload: () => openCode("firmware/ini_aku_esp32/ini_aku_esp32.ino"),
  serial: () => showDoc("serial"),
  clearserial: () => { $("#serial").textContent = ""; },
  scope: () => { const w = $("#scopeWin"); w.style.display = w.style.display === "none" ? "" : "none"; },
  deselect: () => { selected = null; $$(".comp").forEach((g) => g.classList.remove("sel")); renderProps(); $("#descBody").textContent = "Click a component on the breadboard."; },
  closemodal: () => $("#modal").classList.add("hidden"),
  about: () => modal("About You, Yourself", "<p>A prosthetic “this is me” signal for people who hear voices: a lip-muscle sensor (inside channel) and the phone microphone (outside channel) combine into a gentle, probabilistic verdict.</p><p>This breadboard shows the real hackathon circuit. The simulation runs the same <code>detector.js</code> the phone app uses.</p>"),
  export: () => {
    const text = "You, Yourself wiring list\n\n" + WIRES.map((w, i) => `${String(i + 1).padStart(2)}. ${w.net}`).join("\n") +
      "\n\nParts\n" + Object.entries(PARTS).map(([id, p]) => `- ${p.name} (${p.type}) ${priceOf(id)}`).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    a.download = "you-yourself-wiring.txt"; a.click();
    modal("Wiring list exported", `<pre style="font-size:11.5px;white-space:pre-wrap">${esc(text)}</pre>`);
  },
};
document.addEventListener("click", (e) => {
  const c = e.target.closest("[data-cmd]");
  if (!c) return;
  CMDS[c.dataset.cmd] && CMDS[c.dataset.cmd]();
  if (c.closest(".drop")) document.activeElement.blur(); // close the menu
});
document.addEventListener("keydown", (e) => { if (e.key === "F5") { e.preventDefault(); running ? stop() : run(); } if (e.key === "Escape") CMDS.closemodal(); });

svgBoard();
$$(".comp").forEach((g) => g.addEventListener("click", (e) => { e.stopPropagation(); select(g.dataset.id); }));
buildToolbox();
select("esp32");
