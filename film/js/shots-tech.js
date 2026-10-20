// IV · The science, V · The machine (title, blueprint, detector UI, outside channel), VII · promise, end card.
(function () {
  const F = window.F, P = F.PAL, W = F.W, H = F.H;
  const S = (F.SHOTS = F.SHOTS || {});
  const C = () => F.C;
  const L = (id) => F.TL.lines.find((l) => l.id === id);
  const shot = (n) => F.TL.shots.find((s) => s.name === n);

  function navy(ctx, grid = true, a = 1) {
    const g = ctx.createRadialGradient(W * 0.45, H * 0.4, 100, W / 2, H / 2, 1300);
    g.addColorStop(0, '#13204a'); g.addColorStop(1, '#060a1c');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    if (!grid) return;
    ctx.drawImage(F.sprite('grid', W, H, (q) => {
      q.strokeStyle = 'rgba(98,214,255,0.05)'; q.lineWidth = 1;
      for (let x = 0; x <= W; x += 40) { q.beginPath(); q.moveTo(x + 0.5, 0); q.lineTo(x + 0.5, H); q.stroke(); }
      for (let y = 0; y <= H; y += 40) { q.beginPath(); q.moveTo(0, y + 0.5); q.lineTo(W, y + 0.5); q.stroke(); }
      q.strokeStyle = 'rgba(98,214,255,0.1)';
      for (let x = 0; x <= W; x += 200) { q.beginPath(); q.moveTo(x + 0.5, 0); q.lineTo(x + 0.5, H); q.stroke(); }
      for (let y = 0; y <= H; y += 200) { q.beginPath(); q.moveTo(0, y + 0.5); q.lineTo(W, y + 0.5); q.stroke(); }
    }), 0, 0);
  }
  const tag = (ctx, s, x, y, a = 1, col = P.cyan) => F.text(ctx, s, x, y, { family: 'JetBrains Mono', size: 20, weight: 600, tracking: 2, color: col, alpha: a });
  function label(ctx, s, x, y, tx, ty, a = 1, col = P.cyan, sub) {
    if (a <= 0) return;
    ctx.save(); ctx.globalAlpha *= a;
    ctx.strokeStyle = F.rgba(col, 0.7); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(tx, ty); ctx.lineTo(tx + (tx > x ? 30 : -30), ty); ctx.stroke();
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
    const al = tx > x ? 'left' : 'right', ox = tx > x ? 40 : -40;
    F.text(ctx, s, tx + ox, ty + 7, { size: 22, weight: 600, color: '#eaf6ff', align: al });
    if (sub) F.text(ctx, sub, tx + ox, ty + 34, { family: 'JetBrains Mono', size: 15, color: 'rgba(200,230,255,0.65)', align: al });
    ctx.restore();
  }
  // deterministic EMG-ish signals
  const envAt = (tt) => { // muscle envelope: rest + two murmur bursts every 5.2 s
    const ph = ((tt % 5.2) + 5.2) % 5.2, b = (c, w) => Math.exp(-Math.pow((ph - c) / w, 2));
    return 0.06 + 0.02 * F.noise1(tt * 3, 2) + 0.8 * b(1.2, 0.45) + 0.62 * b(3.6, 0.35);
  };
  function scope(ctx, x, y, w, h, fn, t, col, a, opts = {}) {
    if (a <= 0) return;
    ctx.save(); ctx.globalAlpha *= a;
    F.rrect(ctx, x, y, w, h, 12); ctx.fillStyle = 'rgba(8,16,40,0.85)'; ctx.fill(); ctx.strokeStyle = 'rgba(98,214,255,0.25)'; ctx.lineWidth = 1.5; ctx.stroke();
    if (opts.title) F.text(ctx, opts.title, x + 16, y + 28, { family: 'JetBrains Mono', size: 15, weight: 600, color: F.rgba(col, 0.95), tracking: 1 });
    ctx.save(); ctx.beginPath(); ctx.rect(x + 8, y + 40, w - 16, h - 50); ctx.clip();
    const n = opts.n || 260, span = opts.span || 4, mid = y + 40 + (h - 50) * (opts.mid == null ? 0.55 : opts.mid), amp = (h - 50) * 0.42;
    if (opts.dots) {
      ctx.fillStyle = col;
      for (let i = 0; i < opts.dots; i++) { const u = i / (opts.dots - 1), v = fn(t - span + u * span);
        const px = x + 12 + u * (w - 24), py = mid - v * amp; ctx.fillRect(px - 1.5, py - 1.5, 3, 3);
        if (opts.stems) { ctx.globalAlpha *= 0.4; ctx.fillRect(px - 0.5, py, 1, mid - py + amp * 0.1); ctx.globalAlpha /= 0.4; } }
    } else {
      ctx.strokeStyle = col; ctx.lineWidth = opts.lw || 2; ctx.beginPath();
      for (let i = 0; i <= n; i++) { const u = i / n, v = fn(t - span + u * span); const px = x + 12 + u * (w - 24), py = mid - v * amp; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
      ctx.stroke();
    }
    ctx.restore(); ctx.restore();
  }

  // ------------------------------------------------------------------ IV · THE SCIENCE
  const BRAIN = [[52, -62], [42, -92], [8, -112], [-42, -114], [-86, -96], [-106, -58], [-104, -18], [-86, 2], [-58, 8], [-32, 2], [-6, 10], [24, 4], [46, -18]];
  const NODE = { speech: [30, -46], hear: [-26, -14], lips: [90, 34] };
  S.science = {
    bars: 0, trans: 0.9, vignette: 0.35,
    draw(ctx, t, lt, d) {
      navy(ctx);
      const c = C(), s0 = t - lt;
      const lipsZ = F.ease.inOut(F.seg(t, c.lips - 0.2, c.lips + 1.0));
      ctx.save(); F.cam(ctx, F.lerp(900, 980, lipsZ), F.lerp(540, 560, lipsZ), F.lerp(1, 1.55, lipsZ));
      const hx = 760, hy = 470, s = 2.05;
      const toW = (p) => [hx + p[0] * s, hy + p[1] * s];
      // the thread: from the left edge, untangling into her profile
      const draw = F.ease.inOut(F.seg(t, s0, s0 + 2.8));
      if (draw < 1) {
        const pts = []; for (let i = 0; i <= 60; i++) { const u = i / 60; pts.push([F.lerp(-40, hx + 58 * s, u), hy - 90 * s + Math.sin(u * 9 + t * 2) * 40 * (1 - u)]); }
        F.line(ctx, F.partial(pts, Math.min(1, draw * 3)), F.PAL.cyan, 3, 0.8 * (1 - draw));
      }
      F.drawSenjaLine(ctx, hx, hy, s, { progress: draw < 1 ? draw : null, color: P.cyan, w: 2.6, glow: 14, alpha: 0.95 });
      const br = F.seg(t, s0 + 2.2, s0 + 3.2);
      if (br > 0) {
        ctx.save(); ctx.globalAlpha = br * 0.85;
        const bp = F.spline(BRAIN.map(toW), true); ctx.strokeStyle = 'rgba(190,220,255,0.55)'; ctx.lineWidth = 2; ctx.setLineDash([2, 6]); ctx.stroke(bp);
        ctx.setLineDash([]); F.line(ctx, [[hx + 36 * s, hy - 22 * s], [hx - 10 * s, hy - 30 * s], [hx - 60 * s, hy - 28 * s]], 'rgba(190,220,255,0.45)', 2);
        ctx.restore();
      }
      // nodes
      const sp = toW(NODE.speech), hr = toW(NODE.hear), lp = toW(NODE.lips);
      const weak = F.seg(t, c.weak, c.weak + 0.6);
      if (br > 0) {
        F.glowDot(ctx, sp[0], sp[1], 60, P.amber, 0.7 * br);
        ctx.fillStyle = F.rgba(P.amber, br); ctx.beginPath(); ctx.arc(sp[0], sp[1], 9, 0, Math.PI * 2); ctx.fill();
        F.text(ctx, 'speech plan', sp[0] + 20, sp[1] - 26, { size: 22, weight: 600, color: P.amber, alpha: br });
        const flare = weak * (0.6 + 0.4 * Math.sin(t * 7));
        F.glowDot(ctx, hr[0], hr[1], 70 + 80 * flare, weak > 0 ? P.rose : P.teal, (0.55 + 0.4 * flare) * br);
        ctx.fillStyle = F.rgba(weak > 0 ? P.rose : P.teal, br); ctx.beginPath(); ctx.arc(hr[0], hr[1], 9 + 6 * flare, 0, Math.PI * 2); ctx.fill();
        F.text(ctx, 'hearing', hr[0] - 24, hr[1] + 50, { size: 22, weight: 600, align: 'right', color: weak > 0 ? P.rose : P.teal, alpha: br });
      }
      // pulses: motor command to the lips + the copy to "hearing"
      const p0 = c.copy + 0.2, period = 1.7;
      if (t > p0) {
        const k = ((t - p0) % period) / period;
        const mot = F.bezierPts(sp, [sp[0] + 60, sp[1] + 30], [lp[0] - 20, lp[1] - 60], lp, 20);
        const cp = F.bezierPts(sp, [sp[0] - 10, sp[1] - 70], [hr[0] + 40, hr[1] - 70], hr, 20);
        F.line(ctx, mot, P.amber, 2, 0.35);
        const dash = weak > 0 ? [4, 14] : [10, 8];
        F.line(ctx, cp, P.cyan, weak > 0 ? 1.5 : 2.5, weak > 0 ? 0.25 + 0.2 * Math.abs(Math.sin(t * 13)) : 0.75, dash);
        const mk = F.partial(mot, F.clamp(k * 1.6)); const pm = mk[mk.length - 1];
        F.glowDot(ctx, pm[0], pm[1], 26, P.amber, 0.9 * (1 - F.seg(k, 0.6, 0.7)));
        const ck = F.partial(cp, F.clamp(k * 1.6 * (weak > 0 ? 0.62 : 1))); const pc = ck[ck.length - 1];
        F.glowDot(ctx, pc[0], pc[1], 30, P.cyan, (weak > 0 ? 0.35 : 0.95) * (1 - F.seg(k, weak > 0 ? 0.32 : 0.6, weak > 0 ? 0.5 : 0.7)));
        F.text(ctx, 'copy · “corollary discharge”', (sp[0] + hr[0]) / 2 - 10, sp[1] - 92, { family: 'JetBrains Mono', size: 18, align: 'center', color: P.cyan, alpha: 0.85 * F.seg(t, p0, p0 + 0.5) * (1 - 0.6 * weak) });
        const ok = F.seg(t, p0 + 1.0, p0 + 1.4) * (1 - weak);
        if (ok > 0) { F.text(ctx, '✓ this is me', hr[0] - 24, hr[1] + 84, { size: 26, weight: 700, align: 'right', color: P.teal, alpha: ok }); }
        F.text(ctx, 'lips', lp[0] + 30, lp[1] + 8, { size: 20, weight: 600, color: P.amber, alpha: 0.8 * F.seg(t, p0, p0 + 0.5) });
      }
      // someone else: a voice bubble outside her head
      const so = F.seg(t, c.someone, c.someone + 0.6) * (1 - F.seg(t, c.lips - 0.2, c.lips + 0.4));
      if (so > 0) {
        const bx = hx - 330 * s / 2.05 - 250, by = hy - 250;
        F.shadowFigure(ctx, hx - 470, hy + 520, 0.75, 0.55 * so, t);
        ctx.save(); ctx.globalAlpha = so; ctx.strokeStyle = P.rose; ctx.lineWidth = 2.5; ctx.setLineDash([8, 7]);
        F.rrect(ctx, bx - 120, by - 60, 240, 110, 50); ctx.stroke(); ctx.setLineDash([]);
        F.text(ctx, '“…”', bx, by + 12, { family: 'Fraunces', style: 'italic', size: 48, align: 'center', color: P.rose });
        F.line(ctx, [hr, [bx + 60, by + 50]], P.rose, 1.5, 0.6, [3, 6]);
        F.text(ctx, 'her own inner speech, heard as someone else', bx, by + 110, { size: 20, align: 'center', color: '#ffd0da' });
        ctx.restore();
      }
      // lips: the muscle moves
      if (lipsZ > 0) {
        scope(ctx, lp[0] + 40, lp[1] - 190, 300, 150, (x) => (F.noise1(x * 60, 4) * 0.5 + F.noise1(x * 23, 5) * 0.3) * (0.3 + 0.7 * Math.max(0, Math.sin(x * 2.2))), t, P.rose, lipsZ, { title: 'LIP EMG', span: 2, n: 200, lw: 1.6 });
      }
      ctx.restore();
      // evidence
      const ev = F.pulse(t, c.weak + 0.4, 0.5, c.lips - c.weak - 1.2, 0.5);
      if (ev > 0) {
        ctx.save(); ctx.globalAlpha = ev;
        F.rrect(ctx, 1340, 150, 470, 330, 16); ctx.fillStyle = 'rgba(6,10,28,0.8)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.14)'; ctx.stroke();
        F.text(ctx, 'EEG · n = 142', 1370, 200, { size: 30, weight: 700, color: P.white });
        F.text(ctx, 'Brain response to their own inner speech', 1370, 236, { size: 18, color: 'rgba(230,236,255,0.8)' });
        const b1 = F.ease.out(F.seg(t, c.weak + 0.8, c.weak + 1.6)), b2 = F.ease.out(F.seg(t, c.weak + 1.2, c.weak + 2.0));
        ctx.fillStyle = P.teal; ctx.fillRect(1390, 330, 120, 70 * b1); F.text(ctx, '↓ dampened', 1450, 430, { size: 18, weight: 600, align: 'center', color: P.teal });
        F.text(ctx, 'controls', 1450, 456, { size: 16, align: 'center', color: 'rgba(230,236,255,0.7)' });
        ctx.fillStyle = P.rose; ctx.fillRect(1600, 330 - 70 * b2, 120, 70 * b2); F.text(ctx, '↑ louder', 1660, 430, { size: 18, weight: 600, align: 'center', color: P.rose });
        F.text(ctx, 'hearing voices', 1660, 456, { size: 16, align: 'center', color: 'rgba(230,236,255,0.7)' });
        ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(1380, 329, 360, 2);
        ctx.restore();
        F.text(ctx, 'Whitford et al., 2025 · Schizophrenia Bulletin', 1575, 510, { family: 'JetBrains Mono', size: 15, align: 'center', color: 'rgba(200,210,240,0.6)', alpha: ev });
      }
      const lv = F.seg(t, c.lips + 0.5, c.lips + 1.0);
      F.callout(ctx, 1400, 600, 'LIP-MUSCLE EMG', '↑ during silent voices', 'n = 11 · Rapin et al., 2013', { alpha: lv, accent: P.rose, w: 460 });
      F.callout(ctx, 1400, 760, 'IN 9 PATIENTS', 'EMG rose in 47.6% of voices', 'Inouye & Shimizu, 1970', { alpha: F.seg(t, c.lips + 0.9, c.lips + 1.4), accent: P.rose, w: 460 });
    },
  };

  // ------------------------------------------------------------------ V · TITLE
  function logo(ctx, x, y, r, k, a = 1) {
    ctx.save(); ctx.globalAlpha *= a;
    F.glowDot(ctx, x, y, r * 4.5, P.gold, 0.35 * k);
    ctx.strokeStyle = F.rgba(P.gold, 0.55); ctx.lineWidth = r * 0.09;
    ctx.beginPath(); ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * F.ease.inOut(F.clamp(k * 1.3)), false); ctx.stroke();
    const dk = F.ease.outBack(F.seg(k, 0.25, 0.75));
    ctx.fillStyle = P.gold; ctx.beginPath(); ctx.arc(x, y, r * 0.42 * dk, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  F.logo = logo;
  S.title = {
    bars: 0, trans: 0.6, vignette: 0.6,
    draw(ctx, t, lt, d) {
      ctx.fillStyle = '#05050c'; ctx.fillRect(0, 0, W, H);
      F.glowDot(ctx, 960, 470, 900, '#2a1d4a', 0.9);
      logo(ctx, 960, 360, 92, F.seg(lt, 0.0, 1.4));
      // the title builds letter by letter on its own layer; a light sweep then passes over the letters only
      const title = 'You, Yourself', TL_ = F.layer(1), tg = TL_.getContext('2d');
      tg.setTransform(1, 0, 0, 1, 0, 0); tg.globalCompositeOperation = 'source-over'; tg.globalAlpha = 1; tg.clearRect(0, 0, W, H);
      tg.font = F.font(156, 600, 'Fraunces'); const tw = tg.measureText(title).width;
      let x = 960 - tw / 2;
      for (let i = 0; i < title.length; i++) {
        const ch = title[i], k = F.ease.out(F.seg(lt, 0.45 + i * 0.05, 1.1 + i * 0.05));
        tg.font = F.font(156, 600, 'Fraunces'); const cw = tg.measureText(ch).width;
        F.text(tg, ch, x, 640 + (1 - k) * 30, { family: 'Fraunces', size: 156, weight: 600, color: P.cream, alpha: k });
        x += cw;
      }
      const sw = F.seg(lt, 1.4, 2.6);
      if (sw > 0 && sw < 1) {
        tg.save(); tg.globalCompositeOperation = 'source-atop';
        const gx = F.lerp(500, 1450, sw), g = tg.createLinearGradient(gx - 140, 0, gx + 140, 0);
        g.addColorStop(0, 'rgba(255,214,140,0)'); g.addColorStop(0.5, 'rgba(255,214,140,0.85)'); g.addColorStop(1, 'rgba(255,214,140,0)');
        tg.fillStyle = g; tg.fillRect(0, 0, W, H); tg.restore();
      }
      ctx.drawImage(TL_, 0, 0);
      const l32 = L('L31'); // 'A second way to know: this is me.'
      F.text(ctx, '“THIS IS ME.”', 960, 730, { size: 32, weight: 600, tracking: 12, align: 'center', color: P.gold, alpha: F.seg(t, l32.start - 0.2, l32.start + 0.5) });
      F.text(ctx, 'A wearable that tells you which voice is yours', 960, 790, { size: 24, align: 'center', color: 'rgba(230,226,240,0.7)', alpha: F.seg(t, l32.start + 0.6, l32.start + 1.2) });
    },
  };

  // ------------------------------------------------------------------ V · THE MACHINE (blueprint)
  function myoware(ctx, x, y, hl) {
    ctx.save(); ctx.translate(x, y);
    if (hl > 0) F.glowDot(ctx, 0, 0, 260, '#ff4f8b', 0.35 * hl);
    ctx.fillStyle = '#c2185b'; F.rrect(ctx, -150, -95, 300, 190, 26); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; F.rrect(ctx, -130, -75, 260, 150, 18); ctx.fill();
    for (const [sx, sy, lab] of [[-95, -30, 'MID'], [-95, 40, 'END'], [95, 0, 'REF']]) {
      ctx.fillStyle = '#d9d9e0'; ctx.beginPath(); ctx.arc(sx, sy, 22, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#9a9aa8'; ctx.beginPath(); ctx.arc(sx, sy, 9, 0, Math.PI * 2); ctx.fill();
      F.text(ctx, lab, sx, sy + 40, { family: 'JetBrains Mono', size: 13, align: 'center', color: 'rgba(255,255,255,0.8)' });
    }
    F.text(ctx, 'MyoWare 2.0', 0, -50, { size: 22, weight: 700, align: 'center', color: '#fff' });
    F.text(ctx, '+   −   ENV', 0, 70, { family: 'JetBrains Mono', size: 16, align: 'center', color: '#fff' });
    F.glowDot(ctx, 30, 20, 18, '#ff3355', 0.9); ctx.restore();
  }
  function esp32(ctx, x, y, hl, t) {
    ctx.save(); ctx.translate(x, y);
    if (hl > 0) F.glowDot(ctx, 0, 0, 280, P.cyan, 0.3 * hl);
    ctx.fillStyle = '#16181f'; F.rrect(ctx, -190, -90, 380, 180, 10); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#b8bcc6'; F.rrect(ctx, 40, -72, 140, 144, 6); ctx.fill();
    F.text(ctx, 'ESP-WROOM-32', 110, 6, { family: 'JetBrains Mono', size: 14, align: 'center', color: '#333' });
    ctx.strokeStyle = '#d4a017'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(60, -60); for (let i = 0; i < 6; i++) { ctx.lineTo(70 + i * 16, -60); ctx.lineTo(70 + i * 16, -48); ctx.lineTo(78 + i * 16, -48); ctx.lineTo(78 + i * 16, -60); } ctx.stroke();
    ctx.fillStyle = '#d4a017'; for (let i = 0; i < 19; i++) { ctx.fillRect(-180 + i * 19, -88, 8, 8); ctx.fillRect(-180 + i * 19, 80, 8, 8); }
    F.text(ctx, 'ESP32 DevKit', -80, 6, { size: 22, weight: 700, align: 'center', color: '#e8eaf0' });
    F.text(ctx, 'D34 · ADC1 · 12-bit', -80, 34, { family: 'JetBrains Mono', size: 14, align: 'center', color: 'rgba(232,234,240,0.7)' });
    F.glowDot(ctx, -160, 50, 16, P.cyan, 0.5 + 0.5 * Math.sin(t * 10));
    ctx.restore();
  }
  function phone(ctx, x, y, w, h, t, fn, a = 1, opts = {}) {
    ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y);
    ctx.fillStyle = '#0d0f17'; F.rrect(ctx, -w / 2, -h / 2, w, h, 34); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = opts.screen || '#f4f3fb'; F.rrect(ctx, -w / 2 + 12, -h / 2 + 14, w - 24, h - 28, 24); ctx.fill();
    ctx.fillStyle = '#0d0f17'; F.rrect(ctx, -30, -h / 2 + 20, 60, 14, 7); ctx.fill();
    if (fn) {
      F.text(ctx, 'You, Yourself', -w / 2 + 28, -h / 2 + 70, { family: 'Fraunces', size: 20, weight: 700, color: '#1d1a33' });
      ctx.fillStyle = '#efeef7'; F.rrect(ctx, -w / 2 + 24, -h / 2 + 90, w - 48, 170, 12); ctx.fill();
      ctx.save(); ctx.beginPath(); ctx.rect(-w / 2 + 24, -h / 2 + 90, w - 48, 170); ctx.clip();
      ctx.strokeStyle = P.purple; ctx.lineWidth = 2; ctx.beginPath();
      for (let i = 0; i <= 120; i++) { const u = i / 120, v = fn(t - 3 + u * 3); const px = -w / 2 + 28 + u * (w - 56), py = -h / 2 + 230 - v * 120; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
      ctx.stroke(); ctx.restore();
      ctx.strokeStyle = 'rgba(220,60,80,0.8)'; ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.moveTo(-w / 2 + 24, -h / 2 + 200); ctx.lineTo(w / 2 - 24, -h / 2 + 200); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#f5c04e'; F.rrect(ctx, -w / 2 + 24, h / 2 - 120, w - 48, 54, 12); ctx.fill();
      F.text(ctx, 'I hear a voice', 0, h / 2 - 86, { size: 19, weight: 700, align: 'center', color: '#2a1c00' });
    }
    ctx.restore();
  }
  S.machine = {
    bars: 0, trans: 0.7, vignette: 0.35,
    draw(ctx, t, lt, d) {
      navy(ctx);
      const c = C();
      const z = F.lerp(1.28, 1.0, F.ease.inOut(F.seg(t, c.myoware - 0.4, c.myoware + 1.0)));
      const cx = F.lerp(470, 960, F.ease.inOut(F.seg(t, c.myoware - 0.4, c.myoware + 1.0)));
      ctx.save(); F.cam(ctx, cx, F.lerp(430, 540, F.seg(t, c.myoware - 0.4, c.myoware + 1.0)), z);
      tag(ctx, 'INSIDE CHANNEL  ·  lip muscle → phone', 90, 120, F.seg(lt, 0.2, 0.8));
      // her profile (line art), sensor placement
      const HX = 330, HY = 420, HS = 1.25;
      F.drawSenjaLine(ctx, HX, HY, HS, { color: '#8fdcff', w: 2.4, alpha: 0.9, inner: true });
      const e1 = [HX + 80 * HS, HY + 50 * HS], e2 = [HX + 92 * HS, HY + 62 * HS], ref = [HX + 44 * HS, HY + 86 * HS];
      const ep = F.seg(t, c.electrodes + 0.3, c.electrodes + 0.9), pulse = 0.5 + 0.5 * Math.sin(t * 6);
      for (const p of [e1, e2, ref]) { F.glowDot(ctx, p[0], p[1], 34, p === ref ? P.cyan : P.amber, ep * (0.4 + 0.4 * pulse));
        ctx.fillStyle = '#e8dccb'; ctx.beginPath(); ctx.arc(p[0], p[1], 9 * ep, 0, Math.PI * 2); ctx.fill(); }
      label(ctx, '2 electrodes · below the lower lip', e2[0], e2[1], 560, 590, F.seg(t, c.electrodes + 0.6, c.electrodes + 1.2), P.amber, 'orbicularis oris muscle');
      label(ctx, 'reference · jaw bone', ref[0], ref[1], 560, 680, F.seg(t, c.electrodes + 1.0, c.electrodes + 1.6), P.cyan);
      // wiring
      const mw = [770, 290], es = [1235, 290];
      const wk = F.seg(t, c.myoware - 0.2, c.myoware + 0.6);
      F.line(ctx, F.partial([e1, [510, 500], [600, 380], [mw[0] - 150, mw[1]]], wk), P.amber, 3, 0.9);
      F.line(ctx, F.partial([ref, [490, 540], [640, 410], [mw[0] - 120, mw[1] + 70]], wk), P.cyan, 3, 0.9);
      if (wk > 0) myoware(ctx, mw[0], mw[1], F.pulse(t, c.myoware, 0.3, 2.8, 0.6));
      const wk2 = F.seg(t, c.esp32 - 0.4, c.esp32 + 0.4);
      F.line(ctx, F.partial([[mw[0] + 150, mw[1] - 20], [es[0] - 190, es[1] - 20]], wk2), '#ff5a5a', 3, 0.9);
      F.line(ctx, F.partial([[mw[0] + 150, mw[1] + 10], [es[0] - 190, es[1] + 10]], wk2), '#9aa0b0', 3, 0.9);
      F.line(ctx, F.partial([[mw[0] + 150, mw[1] + 40], [es[0] - 190, es[1] + 40]], wk2), '#f5c04e', 3, 0.9);
      if (wk2 > 0) {
        esp32(ctx, es[0], es[1], F.pulse(t, c.esp32, 0.3, 3.5, 0.6), t);
        F.text(ctx, '3.3 V   GND   ENV → D34', (mw[0] + es[0]) / 2 + 10, mw[1] - 46, { family: 'JetBrains Mono', size: 15, align: 'center', color: 'rgba(220,235,255,0.8)', alpha: wk2 });
        // battery + motor driver
        ctx.save(); ctx.globalAlpha = wk2;
        ctx.fillStyle = '#7c8ba6'; F.rrect(ctx, 650, 470, 250, 90, 14); ctx.fill(); F.text(ctx, 'LiPo 3.7 V · TP4056', 775, 523, { size: 18, weight: 600, align: 'center', color: '#0d1426' });
        ctx.fillStyle = '#c9ccd4'; ctx.beginPath(); ctx.arc(1330, 520, 44, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#9aa0ac'; ctx.beginPath(); ctx.arc(1330, 520, 16, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#1b1b22'; ctx.beginPath(); ctx.arc(1170, 520, 22, Math.PI, 0); ctx.fill(); ctx.fillRect(1148, 520, 44, 10);
        F.line(ctx, [[es[0] - 60, es[1] + 90], [1170, 492]], '#3ddc97', 3); F.line(ctx, [[1192, 522], [1286, 522]], '#3ddc97', 3);
        F.text(ctx, 'coin motor · D25 → NPN + 1 kΩ · flyback diode', 1250, 600, { family: 'JetBrains Mono', size: 15, align: 'center', color: 'rgba(220,235,255,0.75)' });
        ctx.restore();
      }
      // phone + BLE packets
      const ph = F.seg(t, c.esp32 + 0.5, c.esp32 + 1.2);
      if (ph > 0) {
        phone(ctx, 1690, 410, 260, 500, t, envAt, ph);
        F.text(ctx, 'Bluetooth LE · 10 samples / 100 ms', 1690, 696, { family: 'JetBrains Mono', size: 16, align: 'center', color: P.cyan, alpha: ph });
        for (let i = 0; i < 6; i++) {
          const k = ((t * 1.25 + i / 6) % 1);
          const px = F.lerp(es[0] + 190, 1560, k), py = F.lerp(es[1], 360, k) - Math.sin(k * Math.PI) * 60;
          ctx.save(); ctx.globalAlpha = ph * Math.sin(k * Math.PI);
          ctx.fillStyle = 'rgba(98,214,255,0.25)'; F.rrect(ctx, px - 26, py - 13, 52, 26, 8); ctx.fill(); ctx.strokeStyle = P.cyan; ctx.lineWidth = 1.5; ctx.stroke();
          for (let j = 0; j < 10; j++) { ctx.fillStyle = P.cyan; ctx.fillRect(px - 20 + j * 4.2, py - 2 - 6 * F.hash(i * 10 + j), 2.4, 8); }
          ctx.restore();
        }
      }
      ctx.restore();
      // signal chain strip
      const sc = F.seg(t, c.myoware + 0.4, c.myoware + 1.2);
      const raw = (x) => F.noise1(x * 90, 7) * envAt(x) * 1.3, rect = (x) => Math.abs(raw(x)) * 1.2 - 0.4, env = (x) => envAt(x) * 1.1 - 0.4;
      scope(ctx, 90, 752, 400, 170, raw, t, '#ff7aa8', sc, { title: '1 · RAW EMG', n: 320, lw: 1.4, mid: 0.5 });
      scope(ctx, 530, 752, 400, 170, rect, t, '#ffb36b', F.seg(t, c.myoware + 0.8, c.myoware + 1.6), { title: '2 · RECTIFIED', n: 320, lw: 1.4, mid: 0.75 });
      scope(ctx, 970, 752, 400, 170, env, t, P.teal, F.seg(t, c.myoware + 1.2, c.myoware + 2.0), { title: '3 · ENVELOPE (ENV)', n: 160, lw: 2.4, mid: 0.75 });
      const adc = F.seg(t, c.esp32 + 0.2, c.esp32 + 1.0);
      scope(ctx, 1410, 752, 420, 170, env, t, P.cyan, adc, { title: '4 · ADC 1 kHz → 100 Hz', dots: 64, stems: true, mid: 0.75, span: 1.2 });
      for (const ax of [510, 950, 1390]) F.text(ctx, '→', ax, 848, { size: 28, align: 'center', color: 'rgba(200,230,255,0.6)', alpha: sc });
    },
  };

  // ------------------------------------------------------------------ the detector, in the real app UI
  const BASE = 301, SD = 5.1, THR = 326;
  const detSig = (tt) => {
    const c = C(); let v = BASE + 5.1 * F.noise1(tt * 22, 3) + 2.5 * F.noise1(tt * 61, 4);
    const m0 = c.murmur + 0.35, m1 = m0 + 2.0;
    if (tt > m0 && tt < m1) { const e = Math.min(F.seg(tt, m0, m0 + 0.15), 1 - F.seg(tt, m1 - 0.2, m1)); v += e * (70 + 12 * F.noise1(tt * 9, 6)); }
    const sw = c.swallow + 0.25; if (tt > sw && tt < sw + 0.4) v += Math.sin(F.seg(tt, sw, sw + 0.4) * Math.PI) * 165;
    for (let k = 0; k < 3; k++) { const ch = c.chew + 0.15 + k * 0.32; if (tt > ch && tt < ch + 0.2) v += Math.sin(F.seg(tt, ch, ch + 0.2) * Math.PI) * 95; }
    return v;
  };
  function cursor(ctx, x, y, down) {
    ctx.save(); ctx.translate(x, y); ctx.scale(1.3, 1.3);
    ctx.fillStyle = '#111'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 26); ctx.lineTo(7, 20); ctx.lineTo(12, 31); ctx.lineTo(17, 29); ctx.lineTo(12, 18); ctx.lineTo(21, 18); ctx.closePath(); ctx.fill(); ctx.stroke();
    if (down > 0) { ctx.strokeStyle = `rgba(91,75,160,${down})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 18 + (1 - down) * 18, 0, Math.PI * 2); ctx.stroke(); }
    ctx.restore();
  }
  function btn(ctx, x, y, w, h, s, kind, pressed) {
    const col = { pri: ['#5b4ba0', '#fff'], gold: ['#f5c04e', '#2a1c00'], plain: ['#ffffff', '#1d1a33'] }[kind];
    ctx.save(); if (pressed > 0) { ctx.translate(0, 2 * pressed); }
    ctx.fillStyle = col[0]; F.rrect(ctx, x, y, w, h, 14); ctx.fill();
    if (kind === 'plain') { ctx.strokeStyle = pressed > 0 ? '#5b4ba0' : '#dcdaf0'; ctx.lineWidth = 2; ctx.stroke(); }
    F.text(ctx, s, x + w / 2, y + h / 2 + 8, { size: 22, weight: 700, align: 'center', color: col[1] });
    ctx.restore();
  }
  S.detector = {
    bars: 0, trans: 1.0, vignette: 0.2, grain: 0.03,
    draw(ctx, t, lt, d) {
      const c = C(), s0 = t - lt;
      ctx.fillStyle = '#f4f3fb'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#1d1a33'; ctx.fillRect(0, 0, W, 86);
      F.logo(ctx, 70, 43, 18, 1);
      F.text(ctx, 'You, Yourself', 104, 52, { family: 'Fraunces', size: 26, weight: 700, color: '#fff' });
      F.text(ctx, '“it’s me”', 300, 51, { size: 17, color: '#f5c04e' });
      ['Overview', 'Products', 'Simulator', 'Method', 'Code', 'Board'].forEach((n, i) => {
        if (n === 'Simulator') { ctx.fillStyle = '#f4f3fb'; F.rrect(ctx, 600 + i * 150 - 18, 30, 150, 56, 10); ctx.fill(); }
        F.text(ctx, n, 600 + i * 150 + 57, 66, { size: 20, weight: 600, align: 'center', color: n === 'Simulator' ? '#1d1a33' : '#c9c6e6' });
      });
      F.text(ctx, 'Simulator', 150, 168, { family: 'Fraunces', size: 50, weight: 700, color: '#1d1a33' });
      F.text(ctx, 'runs the real detector.js', 420, 166, { size: 20, color: '#5d5a7a' });
      // scope card
      ctx.fillStyle = '#fff'; F.rrect(ctx, 150, 210, 1110, 620, 22); ctx.fill(); ctx.strokeStyle = '#e1dff2'; ctx.lineWidth = 2; ctx.stroke();
      const calDone = t > c.calib + 3.0, calK = F.seg(t, c.calib + 0.3, c.calib + 3.0);
      ctx.fillStyle = calDone ? '#2a9d8f' : '#c9c6e6'; F.rrect(ctx, 180, 236, calDone ? 150 : 190, 40, 20); ctx.fill();
      F.text(ctx, calDone ? 'Calibrated' : 'Not calibrated', calDone ? 255 : 275, 263, { size: 18, weight: 700, align: 'center', color: '#fff' });
      if (calDone) F.text(ctx, `baseline ${BASE} ± ${SD} · threshold ${THR}`, 1230, 263, { size: 19, align: 'right', color: '#5d5a7a' });
      const X0 = 180, X1 = 1230, Y0 = 300, Y1 = 760, T0 = s0 - 0.2, T1 = s0 + d + 0.2;
      const xOf = (tt) => X0 + (tt - T0) / (T1 - T0) * (X1 - X0), yOf = (v) => Y1 - (v - 270) / 230 * (Y1 - Y0);
      ctx.fillStyle = '#f4f3fb'; F.rrect(ctx, X0, Y0, X1 - X0, Y1 - Y0, 14); ctx.fill();
      // regions
      const regs = [[c.murmur + 0.35 + 0.05, c.murmur + 2.35, 'rgba(63,192,174,0.28)', 'speech-motor ✓', '#1f8a7c'],
        [c.swallow + 0.25, c.swallow + 0.65, 'rgba(255,107,129,0.3)', 'swallow · ignored', '#c23b55'],
        [c.chew + 0.15, c.chew + 0.99, 'rgba(242,181,107,0.38)', 'chewing · ignored', '#b06a14']];
      regs.forEach(([a, b, col, lab, tc], i) => {
        const shown = i === 0 ? F.seg(t, a + 0.3, a + 0.45) : F.seg(t, b, b + 0.15);
        if (shown <= 0 || t < a) return;
        const xb = xOf(Math.min(b, t));
        ctx.fillStyle = col; ctx.globalAlpha = shown; ctx.fillRect(xOf(a), Y0, xb - xOf(a), Y1 - Y0); ctx.globalAlpha = 1;
        F.text(ctx, lab, xOf(a) + 6, Y0 + 32 + i * 34, { size: 19, weight: 700, color: tc, alpha: shown });
      });
      // calibration band
      if (calK > 0) { ctx.fillStyle = `rgba(91,75,160,${0.12 * calK})`; ctx.fillRect(xOf(c.calib + 0.3), yOf(BASE + 3 * SD), xOf(Math.min(t, c.calib + 3.0)) - xOf(c.calib + 0.3), yOf(BASE - 3 * SD) - yOf(BASE + 3 * SD)); }
      if (calDone) { ctx.strokeStyle = '#e0465c'; ctx.lineWidth = 2; ctx.setLineDash([9, 7]); ctx.beginPath(); ctx.moveTo(X0, yOf(THR)); ctx.lineTo(X1, yOf(THR)); ctx.stroke(); ctx.setLineDash([]);
        F.text(ctx, 'threshold = mean + 3 SD', X1 - 12, yOf(THR) - 10, { size: 17, weight: 600, align: 'right', color: '#e0465c', alpha: F.seg(t, c.calib + 3.0, c.calib + 3.4) }); }
      // trace drawn up to now
      ctx.save(); ctx.beginPath(); ctx.rect(X0, Y0, X1 - X0, Y1 - Y0); ctx.clip();
      ctx.strokeStyle = '#5b4ba0'; ctx.lineWidth = 2.6; ctx.beginPath();
      const n = 700; for (let i = 0; i <= n; i++) { const tt = T0 + (i / n) * (T1 - T0); if (tt > t) break; const px = xOf(tt), py = yOf(detSig(tt)); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
      ctx.stroke(); ctx.restore();
      // 300 ms bracket on the murmur
      const m0 = c.murmur + 0.4, br = F.seg(t, m0, m0 + 0.3);
      if (br > 0 && t < c.swallow) { const yb = yOf(392); ctx.strokeStyle = '#1f8a7c'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(xOf(m0), yb); ctx.lineTo(xOf(m0 + 0.3 * br), yb); ctx.stroke();
        F.text(ctx, '≥ 300 ms', xOf(m0) + 4, yb - 12, { size: 18, weight: 700, color: '#1f8a7c', alpha: br }); }
      // controls card
      ctx.fillStyle = '#fff'; F.rrect(ctx, 1300, 230, 470, 600, 22); ctx.fill(); ctx.strokeStyle = '#e1dff2'; ctx.stroke();
      const press = (cue, dt = 0) => F.pulse(t, c[cue] + dt, 0.06, 0.12, 0.25);
      F.text(ctx, '1 · CALIBRATE', 1330, 280, { size: 18, weight: 700, tracking: 2, color: '#5d5a7a' });
      btn(ctx, 1330, 300, 410, 64, 'Calibrate (3 s rest)', 'pri', press('calib', 0.25));
      F.text(ctx, '2 · ACT', 1330, 410, { size: 18, weight: 700, tracking: 2, color: '#5d5a7a' });
      btn(ctx, 1330, 430, 130, 70, 'Murmur', 'plain', press('murmur', 0.25));
      btn(ctx, 1470, 430, 130, 70, 'Chew', 'plain', press('chew', 0.05));
      btn(ctx, 1610, 430, 130, 70, 'Swallow', 'plain', press('swallow', 0.05));
      F.text(ctx, '3 · CHECK', 1330, 550, { size: 18, weight: 700, tracking: 2, color: '#5d5a7a' });
      btn(ctx, 1330, 570, 410, 70, 'I hear a voice', 'gold', 0);
      const insideOn = t > c.murmur + 0.75 && t < c.swallow;
      ctx.fillStyle = insideOn ? '#e3f6f2' : '#fff'; F.rrect(ctx, 1330, 660, 200, 90, 14); ctx.fill(); ctx.strokeStyle = insideOn ? '#2a9d8f' : '#e1dff2'; ctx.lineWidth = 2; ctx.stroke();
      F.text(ctx, 'Inside', 1350, 696, { size: 17, color: '#5d5a7a' }); F.text(ctx, insideOn ? 'active' : 'quiet', 1350, 730, { size: 23, weight: 700, color: '#1d1a33' });
      ctx.fillStyle = '#fff'; F.rrect(ctx, 1540, 660, 200, 90, 14); ctx.fill(); ctx.strokeStyle = '#e1dff2'; ctx.stroke();
      F.text(ctx, 'Outside', 1560, 696, { size: 17, color: '#5d5a7a' }); F.text(ctx, 'no speech', 1560, 730, { size: 23, weight: 700, color: '#1d1a33' });
      // cursor path between buttons
      const targets = [[s0 - 1, 900, 700], [c.calib + 0.25, 1535, 335], [c.murmur + 0.25, 1395, 468], [c.swallow + 0.05, 1675, 468], [c.chew + 0.05, 1535, 468], [s0 + d + 1, 1535, 600]];
      let cxp = 900, cyp = 700;
      for (let i = 1; i < targets.length; i++) { const [ta, xa, ya] = targets[i - 1], [tb, xb, yb] = targets[i];
        if (t >= ta && t <= tb) { const k = F.ease.inOut(F.seg(t, Math.max(ta, tb - 0.55), tb)); cxp = F.lerp(xa, xb, k); cyp = F.lerp(ya, yb, k); } }
      if (t > targets[targets.length - 1][0]) { cxp = 1535; cyp = 600; }
      cursor(ctx, cxp, cyp, Math.max(press('calib', 0.25), press('murmur', 0.25), press('swallow', 0.05), press('chew', 0.05)));
      F.text(ctx, 'you-yourself.vercel.app  ·  the real detector, running in the browser', 960, 900, { family: 'JetBrains Mono', size: 18, align: 'center', color: '#8a87a8' });
    },
  };

  // the app, seen as a screen in a dark room rather than a full-frame screen recording
  {
    const ui = S.detector.draw;
    S.detector.vignette = 0.45;
    S.detector.draw = function (ctx, t, lt, d) {
      ctx.fillStyle = '#07060d'; ctx.fillRect(0, 0, W, H);
      F.glowDot(ctx, 960, 560, 1150, '#3b3566', 0.38);
      const k = F.ease.sine(F.clamp(lt / d)), sc = F.lerp(0.84, 0.875, k);
      ctx.save(); ctx.translate(960, 532); ctx.scale(sc, sc); ctx.translate(-960, -540);
      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 70; F.rrect(ctx, -16, -16, W + 32, H + 32, 28); ctx.fillStyle = '#121019'; ctx.fill(); ctx.restore();
      ctx.save(); F.rrect(ctx, 0, 0, W, H, 16); ctx.clip();
      ui.call(this, ctx, t, lt, d);
      ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = '#e4e1ec'; ctx.fillRect(0, 0, W, H); // screen brightness
      ctx.restore(); ctx.restore();
    };
  }

  // ------------------------------------------------------------------ outside channel
  const BANDS = 56;
  const fOf = (i) => 100 * Math.pow(80, i / (BANDS - 1));
  S.outside = {
    bars: 0, trans: 1.0, vignette: 0.35,
    draw(ctx, t, lt, d) {
      navy(ctx);
      const c = C(), s0 = t - lt;
      tag(ctx, 'OUTSIDE CHANNEL  ·  phone microphone, on the device', 90, 120, F.seg(lt, 0.1, 0.6), P.amber);
      const talk = 1 - F.seg(t, s0 + 2.0, s0 + 2.6);
      // phone with mic
      phone(ctx, 330, 560, 300, 600, t, null, 1, { screen: '#0f1530' });
      ctx.save(); ctx.translate(330, 520);
      ctx.strokeStyle = P.amber; ctx.lineWidth = 6; F.rrect(ctx, -26, -70, 52, 100, 26); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 10, 50, 0.1 * Math.PI, 0.9 * Math.PI); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, 60); ctx.lineTo(0, 90); ctx.stroke();
      for (let k = 0; k < 3; k++) { const ph = ((t * 1.2 + k / 3) % 1); ctx.strokeStyle = F.rgba(P.amber, (1 - ph) * 0.5 * (0.3 + 0.7 * talk)); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, -10, 70 + ph * 90, -0.6, 0.6); ctx.stroke(); ctx.beginPath(); ctx.arc(0, -10, 70 + ph * 90, Math.PI - 0.6, Math.PI + 0.6); ctx.stroke(); }
      ctx.restore();
      const verdict = F.seg(t, c.verdict - 0.2, c.verdict + 0.4);
      const st = talk > 0.5 ? 'someone is speaking' : 'no speech';
      F.text(ctx, st, 330, 905, { size: 30, weight: 700, align: 'center', color: talk > 0.5 ? P.amber : P.teal, alpha: 1 - verdict });
      // spectrum
      const X0 = 720, X1 = 1780, YB = 760, HMAX = 440;
      const xOf = (f) => X0 + Math.log(f / 100) / Math.log(80) * (X1 - X0);
      ctx.save(); ctx.globalAlpha = 1 - verdict;
      ctx.fillStyle = 'rgba(245,192,78,0.08)'; ctx.fillRect(xOf(300), YB - HMAX - 20, xOf(3400) - xOf(300), HMAX + 20);
      F.text(ctx, 'speech band 300–3400 Hz', (xOf(300) + xOf(3400)) / 2, YB - HMAX - 34, { size: 20, weight: 600, align: 'center', color: P.amber });
      const floor = 0.16 + 0.03 * Math.sin(t * 0.7), thr = floor + 0.24;
      for (let i = 0; i < BANDS; i++) {
        const f = fOf(i), inBand = f > 300 && f < 3400;
        const formant = Math.exp(-Math.pow(Math.log(f / 700), 2) * 3) * 0.8 + Math.exp(-Math.pow(Math.log(f / 1800), 2) * 4) * 0.55;
        const sy = 0.5 + 0.5 * Math.sin(t * 7.3 + i * 0.4) * Math.sin(t * 3.1 + i * 0.13);
        const v = floor * (0.6 + 0.6 * F.noise1(t * 6 + i, 3) ** 2) + talk * formant * (0.55 + 0.45 * sy);
        const h = Math.max(4, v * HMAX), x = X0 + (i / BANDS) * (X1 - X0);
        ctx.fillStyle = inBand ? (v > thr ? P.amber : 'rgba(245,192,78,0.45)') : 'rgba(98,214,255,0.35)';
        F.rrect(ctx, x + 2, YB - h, (X1 - X0) / BANDS - 4, h, 3); ctx.fill();
      }
      ctx.strokeStyle = 'rgba(200,230,255,0.6)'; ctx.setLineDash([6, 6]); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(X0, YB - floor * HMAX); ctx.lineTo(X1, YB - floor * HMAX); ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle = P.rose; ctx.beginPath(); ctx.moveTo(X0, YB - thr * HMAX); ctx.lineTo(X1, YB - thr * HMAX); ctx.stroke();
      F.text(ctx, 'adaptive noise floor', X1, YB - floor * HMAX + 26, { family: 'JetBrains Mono', size: 15, align: 'right', color: 'rgba(200,230,255,0.75)' });
      F.text(ctx, '+12 dB → speech', X1, YB - thr * HMAX - 10, { family: 'JetBrains Mono', size: 15, align: 'right', color: P.rose });
      ['100 Hz', '1 kHz', '8 kHz'].forEach((s, i) => F.text(ctx, s, xOf([100, 1000, 8000][i]), YB + 32, { family: 'JetBrains Mono', size: 15, align: 'center', color: 'rgba(200,230,255,0.6)' }));
      ctx.restore();
      const nr = F.seg(t, c.norec, c.norec + 0.5) * (1 - verdict);
      if (nr > 0) {
        ctx.save(); ctx.globalAlpha = nr; ctx.translate(800, 880);
        ctx.strokeStyle = P.teal; ctx.lineWidth = 4; F.rrect(ctx, -18, -10, 36, 30, 6); ctx.stroke(); ctx.beginPath(); ctx.arc(0, -12, 12, Math.PI, 0); ctx.stroke();
        F.text(ctx, 'Nothing recorded · 2 numbers per frame · never leaves the phone', 36, 14, { size: 24, weight: 600, color: P.teal });
        ctx.restore();
      }
      // the decision table
      if (verdict > 0) {
        ctx.save(); ctx.globalAlpha = verdict;
        const x = 660, y = 300, cw = 520, chh = 170;
        F.text(ctx, 'Two channels. One gentle answer.', 960 + 0, 230, { family: 'Fraunces', size: 50, weight: 600, align: 'center', color: P.cream });
        F.text(ctx, 'OUTSIDE: no speech', x + cw * 0.5, y - 14, { size: 18, weight: 700, tracking: 2, align: 'center', color: P.teal });
        F.text(ctx, 'OUTSIDE: speech', x + cw * 1.5, y - 14, { size: 18, weight: 700, tracking: 2, align: 'center', color: P.amber });
        F.text(ctx, 'INSIDE: active', x - 20, y + chh * 0.5 + 6, { size: 18, weight: 700, tracking: 2, align: 'right', color: P.teal });
        F.text(ctx, 'INSIDE: quiet', x - 20, y + chh * 1.5 + 6, { size: 18, weight: 700, tracking: 2, align: 'right', color: P.mute });
        const cells = [['Probably your own inner speech', '→ two taps + hum coach', 1], ['Real speech + muscle', '→ can’t separate, logged', 0],
          ['A voice nobody made', '→ diary for the clinician', 0], ['Someone nearby is speaking', '→ it’s real', 0]];
        cells.forEach(([a, b, hl], i) => {
          const cx = x + (i % 2) * cw, cy = y + Math.floor(i / 2) * chh;
          F.rrect(ctx, cx + 6, cy + 6, cw - 12, chh - 12, 16);
          ctx.fillStyle = hl ? 'rgba(63,192,174,0.22)' : 'rgba(255,255,255,0.05)'; ctx.fill();
          ctx.strokeStyle = hl ? P.teal : 'rgba(255,255,255,0.15)'; ctx.lineWidth = hl ? 3 : 1.5; ctx.stroke();
          F.text(ctx, a, cx + cw / 2, cy + 76, { size: 27, weight: 700, align: 'center', color: hl ? '#dffcf6' : '#e8e6f4' });
          F.text(ctx, b, cx + cw / 2, cy + 116, { size: 21, align: 'center', color: hl ? P.teal : 'rgba(230,228,245,0.65)' });
        });
        F.text(ctx, '“Probably” — never “definitely”. The app can be wrong, and says so.', 960, 720, { size: 24, align: 'center', color: 'rgba(240,236,228,0.8)' });
        ctx.restore();
      }
    },
  };

  // ------------------------------------------------------------------ VII · THE PROMISE
  S.promise = {
    bars: 0, trans: 0.8, vignette: 0.5,
    draw(ctx, t, lt, d) {
      const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1a1230'); g.addColorStop(1, '#2c1a2a');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      F.glowDot(ctx, 960, 1080, 1000, '#f2b56b', 0.18);
      const c = C();
      const cards = [['p1', 'Not a cure.', 'A support for care, never a replacement. Used with a clinician.'],
        ['p2', 'Muscles, never thoughts.', 'It measures a muscle. The raw signal is always visible.'],
        ['p3', 'Stays on her phone.', 'No cloud. No audio recorded. She can switch it off.']];
      cards.forEach(([cue, title, sub], i) => {
        const k = F.ease.out(F.seg(t, c[cue] - 0.1, c[cue] + 0.5));
        if (k <= 0) return;
        const x = i === 2 ? 565 : 150 + (i % 2) * 830, y = 180 + Math.floor(i / 2) * 290 + (1 - k) * 30;
        ctx.save(); ctx.globalAlpha = k;
        F.rrect(ctx, x, y, 790, 250, 22); ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.14)'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillStyle = P.gold; ctx.fillRect(x, y + 40, 5, 170);
        F.text(ctx, title, x + 46, y + 112, { family: 'Fraunces', size: 58, weight: 600, color: P.cream });
        F.text(ctx, sub, x + 48, y + 172, { size: 22, color: 'rgba(240,236,228,0.75)' });
        ctx.restore();
      });
      const r = F.seg(t, c.p4 + 0.3, c.p4 + 0.9);
      F.text(ctx, 'Before testing on anyone, we stress-tested our own statistics: false alarms 85–100% (naive test) → 4.8–6.3% (ours), across 16 simulated scenarios.',
        960, 820, { size: 21, align: 'center', color: 'rgba(240,236,228,0.7)', alpha: r });
    },
  };

  // ------------------------------------------------------------------ END CARD
  S.end = {
    bars: 1, trans: 1.3, transType: 'black', vignette: 0.6,
    draw(ctx, t, lt, d) {
      ctx.fillStyle = '#06050c'; ctx.fillRect(0, 0, W, H);
      F.glowDot(ctx, 960, 440, 800, '#3a2350', 0.8);
      F.logo(ctx, 960, 330, 70, F.seg(lt, 0.0, 1.3));
      F.text(ctx, 'You, Yourself', 960, 520, { family: 'Fraunces', size: 108, weight: 600, align: 'center', color: P.cream, alpha: F.seg(lt, 0.3, 1.0) });
      F.text(ctx, '“IT’S ME.”', 960, 585, { size: 26, weight: 600, tracking: 10, align: 'center', color: P.gold, alpha: F.seg(lt, 0.6, 1.2) });
      F.text(ctx, 'Try the live demo  →  you-yourself.vercel.app', 960, 680, { size: 32, weight: 600, align: 'center', color: '#fff', alpha: F.seg(lt, 1.0, 1.6) });
      const a = F.seg(lt, 1.6, 2.4);
      F.text(ctx, 'Based on a true story, adapted from a published, anonymised nursing case report (SINERGI, 2025). Names and identifying details changed.', 960, 790, { size: 17, align: 'center', color: 'rgba(220,214,232,0.7)', alpha: a });
      F.text(ctx, 'Evidence: Whitford et al. 2025 · Rapin et al. 2013 · Inouye & Shimizu 1970 · Green & Kinsbourne 1990 · WHO 2022', 960, 822, { size: 17, align: 'center', color: 'rgba(220,214,232,0.7)', alpha: a });
      F.text(ctx, 'Research prototype — not a medical device. Built for people who hear voices, with them.', 960, 864, { size: 19, weight: 600, align: 'center', color: 'rgba(245,192,78,0.85)', alpha: a });
    },
  };
})();
