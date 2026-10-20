// III · Crayons, and the epilogue. Wax-on-paper drawing engine + Senja's three days.
(function () {
  const F = window.F, P = F.PAL, W = F.W, H = F.H;
  const S = (F.SHOTS = F.SHOTS || {});
  const C = () => F.C;
  const PW = 860, PH = 608; // page size

  // ------------------------------------------------------------------ crayon engine
  F.crayon = (ctx, pts, col, w, p, seed = 1, alpha = 0.9) => {
    if (p <= 0) return null;
    const part = F.partial(pts, p);
    ctx.save(); ctx.fillStyle = col;
    for (let i = 1; i < part.length; i++) {
      const x0 = part[i - 1][0], y0 = part[i - 1][1], x1 = part[i][0], y1 = part[i][1];
      const L = Math.hypot(x1 - x0, y1 - y0), steps = Math.max(1, Math.ceil(L / 2.4));
      for (let k = 0; k < steps; k++) {
        const u = k / steps, x = x0 + (x1 - x0) * u, y = y0 + (y1 - y0) * u;
        const h = F.hash(seed * 0.37 + i * 13.17 + k * 7.71);
        if (h < 0.1) continue;
        ctx.globalAlpha = alpha * (0.3 + 0.55 * h);
        const jx = (F.hash(seed + i * 3.31 + k) - 0.5) * w * 0.7, jy = (F.hash(seed + i * 5.13 + k * 2.1) - 0.5) * w * 0.7;
        const sz = w * (0.35 + 0.35 * F.hash(seed + i * 1.7 + k * 3.9));
        ctx.fillRect(x + jx - sz / 2, y + jy - sz / 2, sz, sz);
      }
    }
    ctx.restore();
    return part[part.length - 1];
  };
  // a crayon held at the drawing point
  F.crayonStick = (ctx, x, y, col, a = 1, ang = -0.75) => {
    if (a <= 0) return;
    ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); ctx.rotate(ang);
    ctx.fillStyle = 'rgba(0,0,0,0.18)'; F.rrect(ctx, 6, 8, 150, 22, 6); ctx.fill();
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(26, -10); ctx.lineTo(26, 10); ctx.closePath(); ctx.fill();
    F.rrect(ctx, 24, -11, 120, 22, 4); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.fillRect(48, -11, 70, 22);
    ctx.fillStyle = col; ctx.fillRect(56, -4, 54, 3);
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(24, -9, 120, 4);
    ctx.restore();
  };

  // ------------------------------------------------------------------ her three drawings (page space)
  const TANGLE = (() => {
    const r = F.rng(8), pts = [], N = 1100;
    pts.push([170, 520], [240, 470], [300, 420]);
    const ph = [r() * 6, r() * 6, r() * 6];
    for (let i = 0; i < N; i++) {
      const u = i / N, th = u * Math.PI * 2 * 15;
      const rad = 105 + 38 * Math.sin(3 * th + ph[0]) + 22 * Math.sin(7.3 * th + ph[1]) + 30 * F.noise1(u * 40, 3);
      const cx = 440 + 34 * Math.sin(th / 5.3 + ph[2]), cy = 300 + 22 * Math.cos(th / 7.1);
      pts.push([cx + rad * Math.cos(th) * 1.3, cy + rad * Math.sin(th) * 0.95]);
    }
    pts.push([600, 230], [700, 160], [760, 150]);
    return pts;
  })();
  const wob = (a, b, seed, n = 14) => { const o = []; for (let i = 0; i <= n; i++) { const u = i / n;
    o.push([F.lerp(a[0], b[0], u) + F.noise1(u * 3 + seed, seed) * 2.5, F.lerp(a[1], b[1], u) + F.noise1(u * 3 + seed + 9, seed) * 2.5]); } return o; };
  const ROOM = [
    [[300, 150], [570, 150]], [[570, 150], [570, 370]], [[570, 370], [300, 370]], [[300, 370], [300, 150]],
    [[300, 370], [110, 575]], [[570, 370], [760, 575]], [[300, 150], [110, 35]], [[570, 150], [760, 35]],
    [[355, 195], [485, 195]], [[485, 195], [485, 300]], [[485, 300], [355, 300]], [[355, 300], [355, 195]], [[420, 195], [420, 300]], [[355, 248], [485, 248]],
    [[600, 430], [740, 430]], [[600, 430], [640, 395]], [[640, 395], [770, 395]], [[740, 430], [770, 395]], [[600, 430], [600, 480]], [[740, 430], [740, 480]],
    [[180, 455], [290, 455]], [[200, 455], [200, 520]], [[275, 455], [275, 520]],
  ].map((l, i) => wob(l[0], l[1], i + 3));
  const MTN = [[40, 480], [150, 330], [250, 205], [320, 290], [380, 340], [470, 230], [540, 150], [620, 260], [700, 360], [820, 480]];
  const MTN_PTS = F.splinePts(MTN, false, 8);
  const SUN = (() => { const o = []; for (let i = 0; i <= 40; i++) { const a = (i / 40) * Math.PI * 2; o.push([690 + Math.cos(a) * 52, 110 + Math.sin(a) * 52]); } return o; })();
  const RAYS = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => { const a = (i / 8) * Math.PI * 2 + 0.2; return wob([690 + Math.cos(a) * 66, 110 + Math.sin(a) * 66], [690 + Math.cos(a) * 96, 110 + Math.sin(a) * 96], 40 + i, 4); });
  const HATCH = (() => { const o = []; let x = 60; let up = true;
    while (x < 800) { const yTop = (() => { let best = 480; for (const p of MTN_PTS) if (Math.abs(p[0] - x) < 6) best = Math.min(best, p[1]); return best; })();
      o.push([x, up ? yTop + 14 : 478]); x += 9; up = !up; } return o; })();
  const SNOW = [[[230, 230], [250, 205], [272, 232]], [[518, 178], [540, 150], [562, 180]]].map((l, i) => F.splinePts(l, false, 6));
  const RIVER = F.splinePts([[470, 480], [430, 440], [470, 400], [440, 360]], false, 10);

  function drawDay(ctx, day, p, t) {
    let tip = null;
    if (day === 1) tip = F.crayon(ctx, TANGLE, '#16141a', 7, p, 11, 0.95);
    if (day === 2) {
      const n = ROOM.length, per = 1 / n;
      ROOM.forEach((ln, i) => { const q = F.clamp((p - i * per) / per); if (q > 0) tip = F.crayon(ctx, ln, '#2f4fae', 6, q, 20 + i) || tip; });
    }
    if (day === 3) {
      const a = F.seg(p, 0, 0.3), b = F.seg(p, 0.3, 0.62), c = F.seg(p, 0.62, 0.78), d = F.seg(p, 0.78, 0.9), e = F.seg(p, 0.9, 1);
      tip = F.crayon(ctx, MTN_PTS, '#2f7d43', 8, a, 31) || tip;
      if (b > 0) tip = F.crayon(ctx, HATCH, '#5aa45c', 9, b, 32, 0.55) || tip;
      if (c > 0) SNOW.forEach((s, i) => { tip = F.crayon(ctx, s, '#f7f7f2', 7, c, 33 + i, 0.95) || tip; });
      if (d > 0) { tip = F.crayon(ctx, SUN, '#f2b400', 9, d, 35) || tip; RAYS.forEach((r, i) => F.crayon(ctx, r, '#f2b400', 6, F.clamp(d * 1.4 - i * 0.05), 36 + i)); }
      if (e > 0) tip = F.crayon(ctx, RIVER, '#3e8fd6', 7, e, 45) || tip;
    }
    return tip;
  }
  F.drawDay = drawDay;
  const DAYCOL = { 1: '#16141a', 2: '#2f4fae', 3: '#2f7d43' };

  function paper(ctx, x, y, s, a = 1, rot = 0) {
    const sp = F.sprite('paper', PW, PH, (g) => {
      g.fillStyle = '#f3ecdc'; g.fillRect(0, 0, PW, PH);
      const r = F.rng(12);
      for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(${120 + r() * 60},${100 + r() * 50},${80 + r() * 40},${r() * 0.06})`; g.fillRect(r() * PW, r() * PH, 1 + r() * 2, 1); }
      const v = g.createRadialGradient(PW / 2, PH / 2, PH * 0.3, PW / 2, PH / 2, PW * 0.7);
      v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(120,90,50,0.12)'); g.fillStyle = v; g.fillRect(0, 0, PW, PH);
    });
    ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
    ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.fillRect(-PW / 2 + 10, -PH / 2 + 14, PW, PH);
    ctx.drawImage(sp, -PW / 2, -PH / 2);
    ctx.translate(-PW / 2, -PH / 2);
    return () => ctx.restore();
  }
  function table(ctx) {
    ctx.drawImage(F.sprite('table', W + 400, H + 300, (g, w, h) => {
      g.fillStyle = '#7a5a40'; g.fillRect(0, 0, w, h);
      const r = F.rng(14);
      for (let i = 0; i < 9; i++) { // planks
        const y = i * 180; g.fillStyle = `rgba(${90 + r() * 30},${60 + r() * 20},${40 + r() * 10},0.5)`; g.fillRect(0, y, w, 176);
        g.fillStyle = 'rgba(30,18,10,0.5)'; g.fillRect(0, y + 176, w, 4);
        for (let k = 0; k < 26; k++) { g.strokeStyle = `rgba(40,25,15,${0.08 + r() * 0.1})`; g.lineWidth = 1 + r() * 2; const yy = y + r() * 176;
          g.beginPath(); g.moveTo(0, yy); g.bezierCurveTo(w * 0.3, yy + r() * 20 - 10, w * 0.6, yy + r() * 20 - 10, w, yy + r() * 10 - 5); g.stroke(); }
      }
      const l = g.createRadialGradient(w * 0.35, h * 0.2, 100, w * 0.5, h * 0.5, w * 0.8);
      l.addColorStop(0, 'rgba(255,240,220,0.22)'); l.addColorStop(1, 'rgba(0,0,0,0.45)'); g.fillStyle = l; g.fillRect(0, 0, w, h);
    }), -200, -150);
  }
  const BOXCOLS = ['#16141a', '#2f4fae', '#2f7d43', '#f2b400', '#e8772e', '#d83a3a', '#7a3fb0', '#7a4a2a'];
  function crayonBox(ctx, x, y, s, taken) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(-150 + 10, -100 + 14, 300, 220);
    ctx.fillStyle = '#e7b23a'; ctx.fillRect(-150, -100, 300, 220);
    ctx.fillStyle = '#c99420'; ctx.fillRect(-150, -100, 300, 30);
    BOXCOLS.forEach((c, i) => {
      if (taken && taken.includes(i)) return;
      ctx.fillStyle = c; F.rrect(ctx, -132 + i * 33, -150, 26, 140, 5); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-132 + i * 33, -150); ctx.lineTo(-119 + i * 33, -176); ctx.lineTo(-106 + i * 33, -150); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillRect(-132 + i * 33, -120, 26, 46);
    });
    ctx.fillStyle = '#e7b23a'; ctx.fillRect(-150, -60, 300, 180);
    F.text(ctx, 'CRAYONS', 0, 40, { size: 32, weight: 700, tracking: 6, align: 'center', color: '#7a2a16' });
    F.text(ctx, '8 colours', 0, 80, { family: 'Caveat', size: 30, align: 'center', color: '#7a2a16' });
    ctx.restore();
  }
  function nurseHand(ctx, x, y, a, flip = 1) {
    if (a <= 0) return;
    ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); ctx.scale(flip, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(30, 20, 120, 60, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#8fb8d8'; F.rrect(ctx, 60, -60, 600, 130, 50); ctx.fill();
    ctx.fillStyle = '#7aa4c4'; ctx.fillRect(60, -60, 40, 130);
    ctx.fillStyle = '#c8916a'; ctx.beginPath(); ctx.ellipse(10, 4, 80, 56, 0, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.ellipse(-62, -36 + i * 24, 34, 11, 0.1 * i, 0, Math.PI * 2); ctx.fill(); }
    ctx.beginPath(); ctx.ellipse(-10, 58, 30, 14, -0.6, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  function evalCard(ctx, t, a) {
    if (a <= 0) return;
    const c = C();
    const marks = [[c.day1 - 1.0, 9, 'Before'], [c.day2 - 0.5, 5, 'Day 1'], [c.day3 - 0.5, 3, 'Day 2'], [c.chart - 0.5, 1, 'Day 3']];
    let cur = marks[0]; for (const m of marks) if (t >= m[0]) cur = m;
    const flip = F.seg(t, cur[0], cur[0] + 0.35);
    ctx.save(); ctx.globalAlpha *= a; ctx.translate(1640, 520); ctx.rotate(0.03);
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(-170 + 10, -230 + 14, 340, 470);
    ctx.fillStyle = '#5a4030'; F.rrect(ctx, -170, -230, 340, 470, 14); ctx.fill();
    ctx.fillStyle = '#fbf8f0'; ctx.fillRect(-150, -196, 300, 420);
    ctx.fillStyle = '#9a9a9a'; F.rrect(ctx, -50, -246, 100, 36, 8); ctx.fill();
    F.text(ctx, 'Hallucination signs', 0, -146, { family: 'Caveat', size: 38, weight: 700, align: 'center', color: '#2a2a3a' });
    F.text(ctx, 'NURSES’ CHECKLIST', 0, -112, { size: 15, weight: 600, tracking: 3, align: 'center', color: '#6a6a7a' });
    ctx.globalAlpha *= 0.4 + 0.6 * flip;
    F.text(ctx, String(cur[1]), 0, 60 - (1 - flip) * 18, { family: 'Fraunces', size: 190, weight: 600, align: 'center', color: cur[1] <= 1 ? '#2f7d43' : '#c0392b' });
    ctx.globalAlpha = a;
    F.text(ctx, 'of 21 checked · ' + cur[2], 0, 120, { size: 20, weight: 500, align: 'center', color: '#4a4a5a' });
    F.text(ctx, 'standard nursing checklist', 0, 180, { family: 'JetBrains Mono', size: 15, align: 'center', color: '#8a8a9a' });
    ctx.restore();
  }

  // the memory: a child drawing mountains at a table, her father and mother leaning in (sepia, backlit, soft)
  function person(g, x, base, h, lean, hijab, col) {
    g.save(); g.translate(x, base); g.rotate(lean); g.fillStyle = col;
    const hr = h * 0.12;
    g.beginPath(); g.ellipse(0, -h + hr, hr * (hijab ? 1.15 : 1), hr * (hijab ? 1.2 : 1.05), 0, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.moveTo(-hr * (hijab ? 1.35 : 0.55), -h + hr * 1.75);
    g.quadraticCurveTo(-h * 0.26, -h * 0.62, -h * 0.25, 0); g.lineTo(h * 0.25, 0);
    g.quadraticCurveTo(h * 0.26, -h * 0.62, hr * (hijab ? 1.35 : 0.55), -h + hr * 1.75); g.closePath(); g.fill();
    g.restore();
  }
  function memory(ctx, t, a) {
    if (a <= 0) return;
    const M = F._mem || (F._mem = F.canvas(480, 270)), g = M.getContext('2d');
    g.setTransform(0.25, 0, 0, 0.25, 0, 0);
    const bg = g.createLinearGradient(0, 0, W, 0);
    bg.addColorStop(0, '#c98d55'); bg.addColorStop(0.5, '#f7dcaa'); bg.addColorStop(1, '#d99a5c');
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    F.glowDot(g, 960, 300, 900, '#fff4d8', 0.9);               // the window behind them
    g.fillStyle = 'rgba(120,80,45,0.35)'; g.fillRect(560, 80, 800, 520);
    g.fillStyle = 'rgba(255,246,220,0.9)'; g.fillRect(590, 110, 740, 460);
    g.fillStyle = 'rgba(150,110,70,0.5)'; g.fillRect(955, 110, 10, 460); g.fillRect(590, 335, 740, 10);
    g.fillStyle = '#6e4628'; g.fillRect(0, 760, W, 330);       // table
    g.fillStyle = '#fbf3e2'; g.beginPath(); g.moveTo(820, 770); g.lineTo(1110, 770); g.lineTo(1150, 815); g.lineTo(790, 815); g.closePath(); g.fill();
    const k = F.seg(t, F.C.day3 + 1.3, F.C.day3 + 4.0);
    g.strokeStyle = '#4a7a3a'; g.lineWidth = 5; g.beginPath();
    const m = [[830, 808], [880, 782], [920, 800], [970, 776], [1030, 806]];
    F.partial(m, k).forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.stroke();
    const col = '#4a2e1c';
    person(g, 600, 790, 470, 0.16, false, col);                // father
    person(g, 1330, 790, 430, -0.16, true, col);               // mother
    person(g, 965, 790, 270, 0.0, true, col);                  // Senja, small
    g.strokeStyle = col; g.lineCap = 'round';
    g.lineWidth = 34; g.beginPath(); g.moveTo(690, 520); g.quadraticCurveTo(820, 640, 900, 780); g.stroke();   // father points at the paper
    g.lineWidth = 32; g.beginPath(); g.moveTo(1260, 540); g.quadraticCurveTo(1120, 560, 1010, 610); g.stroke(); // mother's hand on her shoulder
    g.lineWidth = 22; g.beginPath(); g.moveTo(985, 640); g.quadraticCurveTo(1000, 720, F.lerp(860, 1020, k), 792); g.stroke(); // the child draws
    ctx.save(); ctx.globalAlpha = a; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(M, 0, 0, 480, 270, 0, 0, W, H);
    ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = 'rgba(255,214,160,0.55)'; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
    const v = ctx.createRadialGradient(W / 2, H / 2, 300, W / 2, H / 2, 1100);
    v.addColorStop(0, 'rgba(60,30,10,0)'); v.addColorStop(1, 'rgba(60,30,10,0.7)'); ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter'; F.glowDot(ctx, 1600, 160, 600, '#ff9a50', 0.22);
    ctx.restore();
  }

  // ------------------------------------------------------------------ III · CRAYONS
  S.crayons = {
    bars: 1, trans: 0.9, grain: 0.06,
    draw(ctx, t, lt, d) {
      const c = C(), s0 = t - lt;
      const zoomOut = F.ease.inOut(F.seg(t, c.chart - 0.3, c.chart + 0.9));
      const zoomIn = F.ease.inOut(F.seg(t, c.inside_out + 0.4, s0 + d + 0.6));
      ctx.save();
      F.cam(ctx, F.lerp(960, 425, zoomIn), F.lerp(540, 328, zoomIn), F.lerp(1.0, 4.6, zoomIn * zoomIn));
      table(ctx);
      // pages: day k page enters at its cue; earlier pages go to the left stack, then to the row for the chart
      const days = [[1, c.day1], [2, c.day2], [3, c.day3]];
      const ends = { 1: c.day2 - 0.4, 2: c.day3 - 0.4, 3: c.chart - 0.4 };
      const pageIn = F.ease.out(F.seg(t, s0 + 0.1, s0 + 0.8));
      let tipInfo = null;
      days.forEach(([k, ts], idx) => {
        const enter = k === 1 ? pageIn : F.ease.out(F.seg(t, ts - 0.3, ts + 0.4));
        if (enter <= 0) return;
        const next = days[idx + 1] ? days[idx + 1][1] : null;
        const toStack = next ? F.ease.inOut(F.seg(t, next - 0.35, next + 0.35)) : 0;
        const toRow = zoomOut;
        let x = 860, y = F.lerp(1300, 520, enter), s = 1, rot = (k - 2) * 0.012;
        if (toStack > 0) { x = F.lerp(x, 230 + idx * 16, toStack); y = F.lerp(y, 270 + idx * 24, toStack); s = F.lerp(1, 0.33, toStack); }
        if (toRow > 0) { x = F.lerp(x, 420 + idx * 540, toRow); y = F.lerp(y, 330, toRow); s = F.lerp(s, 0.52, toRow); rot = F.lerp(rot, 0, toRow); }
        const done = paper(ctx, x, y, s, 1, rot);
        const p = F.seg(t, ts + 0.45, ends[k]);
        const tip = drawDay(ctx, k, p, t);
        if (k > 0) F.text(ctx, 'Day ' + k, 40, 60, { family: 'Caveat', size: 46, weight: 700, color: '#6a6a72', alpha: F.seg(t, ts, ts + 0.5) });
        if (tip && p > 0 && p < 1 && toStack === 0) tipInfo = { x: x - PW / 2 * s + tip[0] * s, y: y - PH / 2 * s + tip[1] * s, col: DAYCOL[k] };
        done();
      });
      // the box + the nurse's hand
      const bx = F.lerp(-420, 250, F.ease.out(F.seg(t, c.box - 0.1, c.box + 0.7)));
      const boxOut = F.ease.inOut(F.seg(t, c.chart - 0.4, c.chart + 0.4));
      const taken = t > c.day3 + 0.3 ? [0, 1, 2] : t > c.day2 + 0.3 ? [0, 1] : t > c.day1 + 0.3 ? [0] : [];
      if (bx > -380) crayonBox(ctx, bx - boxOut * 700, 820, 0.78, taken);
      nurseHand(ctx, bx - 150, 835, 1 - F.seg(t, c.box + 0.9, c.box + 1.6), -1);
      if (tipInfo) F.crayonStick(ctx, tipInfo.x, tipInfo.y, tipInfo.col, 1);
      ctx.restore();
      evalCard(ctx, t, F.seg(t, c.day1 - 1.2, c.day1 - 0.6) * (1 - F.seg(t, c.chart - 0.4, c.chart + 0.1)));
      memory(ctx, t, 0.85 * F.pulse(t, c.day3 + 1.1, 0.7, 2.4, 0.9));
      // chart: 9 → 5 → 3 → 1
      const ch = F.seg(t, c.chart + 0.2, c.chart + 0.6) * (1 - F.seg(t, c.inside_out + 0.6, c.inside_out + 1.2));
      if (ch > 0) {
        ctx.save(); ctx.globalAlpha = ch;
        const vals = [9, 5, 3, 1], labels = ['Before', 'Day 1', 'Day 2', 'Day 3'], cols = ['#c0392b', '#d9612f', '#e8a13a', '#2f7d43'];
        vals.forEach((v, i) => {
          const g = F.ease.out(F.seg(t, c.chart + 0.3 + i * 0.45, c.chart + 0.9 + i * 0.45));
          const x = 640 + i * 180, h = v * 30 * g;
          ctx.fillStyle = cols[i]; F.rrect(ctx, x, 880 - h, 110, h, 8); ctx.fill();
          F.text(ctx, String(v), x + 55, 870 - h, { family: 'Caveat', size: 52, weight: 700, align: 'center', color: '#fff8ec', alpha: g });
          F.text(ctx, labels[i], x + 55, 916, { size: 20, weight: 600, align: 'center', color: 'rgba(255,248,236,0.8)' });
        });
        F.text(ctx, 'hallucination signs present, of 21 checked', 1440, 760, { size: 22, color: 'rgba(255,248,236,0.85)' });
        F.text(ctx, 'published case report, 2025', 1440, 792, { family: 'JetBrains Mono', size: 16, color: 'rgba(255,248,236,0.6)' });
        F.text(ctx, 'one patient · no control group', 1440, 818, { family: 'JetBrains Mono', size: 16, color: 'rgba(255,248,236,0.5)' });
        ctx.restore();
      }
      // inside → outside: the tangle glows as we fall into it
      const glow = F.seg(t, c.inside_out + 0.3, s0 + d);
      if (glow > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; F.glowDot(ctx, 960, 540, 900, '#ffd9a0', 0.35 * glow); ctx.restore();
        ctx.fillStyle = `rgba(8,12,30,${F.seg(t, s0 + d - 0.6, s0 + d)})`; ctx.fillRect(0, 0, W, H); }
    },
  };

  // ------------------------------------------------------------------ EPILOGUE
  S.close = {
    bars: 1, trans: 1.2,
    draw(ctx, t, lt, d) {
      ctx.fillStyle = '#1a1020'; ctx.fillRect(0, 0, W, H);
      const k = F.ease.sine(F.clamp(lt / (d + 1)));
      ctx.save(); F.cam(ctx, 960, F.lerp(470, 490, k), F.lerp(1.3, 1.44, k));
      const done = paper(ctx, 960, 540, 1.6, 1, 0);
      drawDay(ctx, 3, 1, t);
      // "come home", reclaimed: warm, written in gold crayon over her sky
      const w5 = F.TL.whispers.find((w) => w.id === 'w5');
      const a = F.seg(t, w5.start - 0.2, w5.end + 0.3);
      if (a > 0) {
        ctx.save(); ctx.beginPath(); ctx.rect(0, 0, 250 + 520 * a, PH); ctx.clip();
        F.text(ctx, 'come home', 240, 196, { family: 'Caveat', size: 92, weight: 700, color: '#e9a81d', alpha: 0.95 });
        ctx.restore();
      }
      done();
      ctx.restore();
      // dusk grade over the page
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, 'rgba(90,40,90,0.35)'); g.addColorStop(0.6, 'rgba(230,120,90,0.12)'); g.addColorStop(1, 'rgba(255,190,120,0.2)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      const l55 = F.TL.lines.find((l) => l.id === 'L53');
      const q = F.seg(t, l55.start - 0.1, l55.start + 0.9);
      if (q > 0) {
        ctx.fillStyle = `rgba(10,6,16,${0.45 * q})`; ctx.fillRect(0, 0, W, H);
        F.text(ctx, 'Come home,', W / 2, 500, { family: 'Fraunces', style: 'italic', size: 88, align: 'center', color: P.cream, alpha: q, glow: 'rgba(255,200,140,0.5)', glowBlur: 30 });
        F.text(ctx, 'to yourself.', W / 2, 610, { family: 'Fraunces', style: 'italic', size: 88, align: 'center', color: P.gold, alpha: F.seg(t, l55.start + 0.55, l55.start + 1.3), glow: 'rgba(255,200,140,0.5)', glowBlur: 30 });
      }
    },
  };
})();
