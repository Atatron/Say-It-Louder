// You, Yourself — film engine core. Deterministic: every frame is a pure function of time t.
(function () {
  const F = (window.F = window.F || {});
  F.W = 1920; F.H = 1080; F.BAR = 132;

  F.PAL = {
    ink: '#07070f', night: '#0c0f22', indigo: '#141638', plum: '#3a2350', violet: '#5b3a78',
    coral: '#e8775d', amber: '#f2b56b', gold: '#f5c04e', cream: '#f3ecdc', paper: '#efe6d2',
    teal: '#3fc0ae', rose: '#ff6b81', cyan: '#62d6ff', white: '#f6f4ee', mute: '#9aa0c8',
    blueprint: '#0a1530', purple: '#5b4ba0', lavender: '#f4f3fb',
  };

  // ---------------------------------------------------------------- math
  F.clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  F.lerp = (a, b, t) => a + (b - a) * t;
  F.seg = (t, a, b) => F.clamp((t - a) / (b - a));
  F.smooth = (t, a, b) => { const x = F.seg(t, a, b); return x * x * (3 - 2 * x); };
  F.ease = {
    in: (x) => x * x * x,
    out: (x) => 1 - Math.pow(1 - x, 3),
    inOut: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
    sine: (x) => -(Math.cos(Math.PI * x) - 1) / 2,
    outBack: (x) => { const c1 = 1.5, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); },
    expo: (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x)),
  };
  F.pulse = (t, a, inT, hold, outT) => F.seg(t, a, a + inT) * (1 - F.seg(t, a + inT + hold, a + inT + hold + outT));

  // ---------------------------------------------------------------- randomness + noise (seeded)
  F.rng = (seed) => {
    let s = seed >>> 0 || 1;
    return () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  };
  F.hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  F.noise1 = (x, seed = 0) => {
    const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
    return F.lerp(F.hash(i + seed * 57.3), F.hash(i + 1 + seed * 57.3), u) * 2 - 1;
  };
  F.noise2 = (x, y, seed = 0) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const h = (a, b) => F.hash(a * 157.1 + b * 311.7 + seed * 71.9);
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    return F.lerp(F.lerp(h(xi, yi), h(xi + 1, yi), u), F.lerp(h(xi, yi + 1), h(xi + 1, yi + 1), u), v) * 2 - 1;
  };
  F.fbm = (x, y, seed = 0, oct = 4) => { let a = 0.5, s = 0, f = 1; for (let i = 0; i < oct; i++) { s += a * F.noise2(x * f, y * f, seed + i * 13); f *= 2; a *= 0.5; } return s; };

  // ---------------------------------------------------------------- color
  F.hex = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  F.rgba = (h, a = 1) => { const [r, g, b] = F.hex(h); return `rgba(${r},${g},${b},${a})`; };
  F.mixc = (h1, h2, t, a = 1) => { const A = F.hex(h1), B = F.hex(h2);
    return `rgba(${Math.round(F.lerp(A[0], B[0], t))},${Math.round(F.lerp(A[1], B[1], t))},${Math.round(F.lerp(A[2], B[2], t))},${a})`; };

  // ---------------------------------------------------------------- canvases + sprites
  F.canvas = (w, h) => { const c = document.createElement('canvas'); c.width = Math.ceil(w); c.height = Math.ceil(h); return c; };
  const SPR = {};
  F.sprite = (key, w, h, draw) => {
    if (!SPR[key]) { const c = F.canvas(w, h); draw(c.getContext('2d'), w, h); SPR[key] = c; }
    return SPR[key];
  };

  // ---------------------------------------------------------------- drawing helpers
  F.font = (size, weight = 400, family = 'Inter', style = 'normal') => `${style} ${weight} ${size}px "${family}"`;
  F.text = (ctx, s, x, y, o = {}) => {
    ctx.save();
    ctx.font = F.font(o.size || 32, o.weight || 400, o.family || 'Inter', o.style || 'normal');
    ctx.fillStyle = o.color || F.PAL.white;
    ctx.textAlign = o.align || 'left';
    ctx.textBaseline = o.baseline || 'alphabetic';
    ctx.globalAlpha *= o.alpha == null ? 1 : o.alpha;
    if (o.tracking) ctx.letterSpacing = `${o.tracking}px`;
    if (o.glow) { ctx.shadowColor = o.glow; ctx.shadowBlur = o.glowBlur || 18; }
    ctx.fillText(s, x, y);
    ctx.restore();
  };
  F.measure = (ctx, s, o = {}) => { ctx.save(); ctx.font = F.font(o.size || 32, o.weight || 400, o.family || 'Inter', o.style || 'normal');
    if (o.tracking) ctx.letterSpacing = `${o.tracking}px`; const w = ctx.measureText(s).width; ctx.restore(); return w; };
  F.wrap = (ctx, s, maxW, o = {}) => {
    const words = s.split(' '); const lines = []; let cur = '';
    for (const w of words) { const test = cur ? cur + ' ' + w : w; if (F.measure(ctx, test, o) > maxW && cur) { lines.push(cur); cur = w; } else cur = test; }
    if (cur) lines.push(cur); return lines;
  };
  F.rrect = (ctx, x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };
  F.cam = (ctx, cx, cy, z = 1, rot = 0) => { ctx.translate(F.W / 2, F.H / 2); if (rot) ctx.rotate(rot); ctx.scale(z, z); ctx.translate(-cx, -cy); };
  F.glowDot = (ctx, x, y, r, color, a = 1) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, F.rgba(color, a)); g.addColorStop(0.35, F.rgba(color, a * 0.35)); g.addColorStop(1, F.rgba(color, 0));
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  };
  F.line = (ctx, pts, color, w = 2, a = 1, dash) => {
    ctx.save(); ctx.globalAlpha *= a; ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (dash) ctx.setLineDash(dash);
    ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke(); ctx.restore();
  };
  // draw the first fraction `p` of a polyline
  F.partial = (pts, p) => {
    if (p >= 1) return pts; if (p <= 0) return [pts[0]];
    let L = 0; const seg = [];
    for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(d); L += d; }
    let goal = L * p; const out = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      if (goal <= seg[i - 1]) { const k = goal / seg[i - 1]; out.push([F.lerp(pts[i - 1][0], pts[i][0], k), F.lerp(pts[i - 1][1], pts[i][1], k)]); return out; }
      goal -= seg[i - 1]; out.push(pts[i]);
    }
    return out;
  };
  F.bezierPts = (p0, p1, p2, p3, n = 24) => { const o = []; for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t;
    o.push([u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]); } return o; };

  // a chip / data callout
  F.callout = (ctx, x, y, title, value, note, o = {}) => {
    const a = o.alpha == null ? 1 : o.alpha; if (a <= 0) return;
    ctx.save(); ctx.globalAlpha *= a;
    const w = o.w || 430, h = o.h || (note ? 138 : 108);
    F.rrect(ctx, x, y, w, h, 14); ctx.fillStyle = o.bg || 'rgba(10,12,28,0.72)'; ctx.fill();
    ctx.strokeStyle = o.border || 'rgba(255,255,255,0.14)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = o.accent || F.PAL.gold; ctx.fillRect(x, y + 18, 4, h - 36);
    F.text(ctx, title, x + 26, y + 36, { size: 15, weight: 600, tracking: 3, color: o.accent || F.PAL.gold });
    F.text(ctx, value, x + 26, y + 78, { size: o.valueSize || 34, weight: 600, family: 'Inter', color: F.PAL.white });
    if (note) F.text(ctx, note, x + 26, y + 112, { size: 15, family: 'JetBrains Mono', color: 'rgba(230,228,245,0.62)' });
    ctx.restore();
  };

  // ---------------------------------------------------------------- film finish
  F.grainTiles = null;
  F.makeGrain = () => {
    F.grainTiles = [0, 1, 2, 3].map((k) => F.sprite('grain' + k, 512, 512, (g, w, h) => {
      const img = g.createImageData(w, h); const r = F.rng(99 + k);
      for (let i = 0; i < img.data.length; i += 4) { const v = r() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
      g.putImageData(img, 0, 0);
    }));
  };
  F.grain = (ctx, t, amt = 0.045) => {
    if (!F.grainTiles) F.makeGrain();
    const fr = Math.floor(t * 24); const tile = F.grainTiles[fr % 4];
    const ox = Math.floor(F.hash(fr) * 512), oy = Math.floor(F.hash(fr + 7) * 512);
    ctx.save(); ctx.globalAlpha = amt; ctx.globalCompositeOperation = 'overlay';
    for (let x = -ox; x < F.W; x += 512) for (let y = -oy; y < F.H; y += 512) ctx.drawImage(tile, x, y);
    ctx.restore();
  };
  F.vignette = (ctx, amt = 0.55) => {
    const v = F.sprite('vignette', F.W, F.H, (g, w, h) => {
      const gr = g.createRadialGradient(w / 2, h / 2, h * 0.35, w / 2, h / 2, h * 0.95);
      gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,1)'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    });
    ctx.save(); ctx.globalAlpha = amt; ctx.drawImage(v, 0, 0); ctx.restore();
  };
  F.bars = (ctx, k) => { if (k <= 0) return; const h = F.BAR * k; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, F.W, h); ctx.fillRect(0, F.H - h, F.W, h); };

  // English captions: set in the lower letterbox bar when there is one, otherwise on a soft dark band.
  // Whispers (the voice in her head) are captioned in italics.
  F.subtitle = (ctx, s, a, barK, italic) => {
    if (!s || a <= 0) return;
    ctx.save(); ctx.globalAlpha = a;
    const inBar = barK > 0.5, y = inBar ? F.H - F.BAR / 2 + 11 : F.H - 66;
    const o = italic ? { family: 'Fraunces', style: 'italic', size: 34, weight: 400, align: 'center', color: '#e9d7d2' }
      : { size: 31, weight: 500, align: 'center', color: '#f1ece2' };
    if (!inBar) {
      const w = F.measure(ctx, s, o) + 48; F.rrect(ctx, F.W / 2 - w / 2, y - 40, w, 56, 12);
      ctx.fillStyle = 'rgba(6,6,12,0.58)'; ctx.fill();
    }
    F.text(ctx, s, F.W / 2, y, o);
    ctx.restore();
  };
  F.chapterTitle = (ctx, label, a, barK) => {
    if (a <= 0) return;
    const y = barK > 0.5 ? F.BAR / 2 + 7 : 64;
    F.text(ctx, label.toUpperCase(), 72, y, { size: 22, weight: 600, tracking: 7, color: F.PAL.amber, alpha: a * 0.92 });
  };
})();
