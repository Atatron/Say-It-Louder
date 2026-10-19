// Senja: a profile silhouette (facing right in local space), rim-lit, posable.
(function () {
  const F = window.F;

  // Catmull-Rom through points → smooth Path2D
  F.spline = (pts, closed = true, path = new Path2D(), move = true) => {
    const n = pts.length;
    const P = (i) => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
    if (move) path.moveTo(pts[0][0], pts[0][1]); else path.lineTo(pts[0][0], pts[0][1]);
    const last = closed ? n : n - 1;
    for (let i = 0; i < last; i++) {
      const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
      path.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6,
        p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]);
    }
    if (closed) path.closePath();
    return path;
  };

  // --- geometry (local units: ~1px at scale 1; head centre ≈ (0,0); she faces +x)
  const FACE = [[58, -90], [70, -66], [75, -50], [70, -39], [76, -27], [90, -12], [101, -1], [94, 7], [85, 11],
    [86, 18], [92, 25], [86, 31], [90, 39], [86, 46], [79, 52], [83, 62], [86, 70], [78, 82], [64, 91]];
  const HOOD_BACK = [[64, 98], [38, 110], [0, 118], [-54, 118], [-98, 100], [-116, 56], [-120, -2], [-108, -58],
    [-78, -102], [-32, -126], [14, -122], [44, -106]];
  const HIJAB_INNER = [[58, -90], [36, -84], [16, -62], [8, -24], [12, 22], [26, 60], [46, 88], [64, 91]];
  const BODY = [[30, 96], [70, 118], [96, 176], [118, 250], [128, 340], [-262, 340], [-262, 286], [-246, 238],
    [-212, 196], [-160, 160], [-122, 118], [-60, 108]];
  const PIVOT = [8, 92];

  const headPath = () => {
    const p = new Path2D();
    F.spline(FACE, false, p, true);
    F.spline(HOOD_BACK, false, p, false);
    p.closePath();
    return p;
  };
  const facePath = () => { const p = new Path2D(); F.spline(FACE, false, p, true); F.spline([...HIJAB_INNER].reverse(), false, p, false); p.closePath(); return p; };
  const bodyPath = () => F.spline(BODY, true);
  const HEAD = headPath(), FACEP = facePath(), BODYP = bodyPath();

  // anchors in head space (before tilt) — used for electrodes, waves, whispers
  F.SENJA_ANCHORS = { lips: [90, 34], electrode: [82, 54], jaw: [46, 84], ear: [-30, 10], eye: [66, -38], collar: [70, 150] };

  // transform a head-space point by the pose tilt (around PIVOT)
  F.senjaHeadPoint = (pt, tilt) => {
    const c = Math.cos(tilt), s = Math.sin(tilt), dx = pt[0] - PIVOT[0], dy = pt[1] - PIVOT[1];
    return [PIVOT[0] + dx * c - dy * s, PIVOT[1] + dx * s + dy * c];
  };

  function arms(ctx, pose, k, tilt) {
    // k: 0..1 blend for poses that animate in
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const lim = (pts, w) => { ctx.lineWidth = w; ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(...p) : ctx.moveTo(...p))); ctx.stroke(); };
    if (pose === 'write') {
      const hx = 190 + Math.sin(k * 9) * 6, hy = 286 + Math.cos(k * 7) * 3;
      lim([[-150, 190], [-30, 292], [hx, hy]], 44);
      ctx.save(); ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(hx + 22, hy - 4); ctx.lineTo(hx + 58, hy - 30); ctx.stroke(); ctx.restore();
      ctx.beginPath(); ctx.ellipse(hx + 12, hy - 2, 34, 22, 0.2, 0, Math.PI * 2); ctx.fill();
    } else if (pose === 'ears') {
      const ear = F.senjaHeadPoint([-22, 4], tilt);
      const hand = [F.lerp(160, ear[0] + 6, k), F.lerp(340, ear[1], k)];
      const elbow = [F.lerp(60, 182, k), F.lerp(330, 252, k)];
      lim([[-60, 172], elbow], 50);
      lim([elbow, hand], 42);
      ctx.save(); ctx.translate(hand[0], hand[1]); ctx.rotate(-1.05 * k);
      ctx.beginPath(); ctx.ellipse(0, -8, 36, 54, 0, 0, Math.PI * 2); ctx.fill();
      for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.ellipse(-24 + i * 15, -64, 7.5, 26, (i - 1.5) * 0.14, 0, Math.PI * 2); ctx.fill(); }
      ctx.beginPath(); ctx.ellipse(30, -10, 9, 24, 0.9, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    } else if (pose === 'phone') {
      const hand = [168, 236 - 6 * k];
      lim([[-150, 180], [-10, 320], hand], 44);
      ctx.beginPath(); ctx.ellipse(hand[0] + 6, hand[1] + 6, 30, 22, -0.5, 0, Math.PI * 2); ctx.fill();
    }
  }

  // Draw Senja. o: {pose, k, tilt, facing, color, rim, rimW, face, alpha, light ('front'|'back'), sensor, led, eyes}
  F.drawSenja = (ctx, x, y, s, o = {}) => {
    const pad = 80, W0 = 560, H0 = 520; // local box: x -280..280, y -150..370
    const cw = Math.ceil((W0 + pad * 2) * s), ch = Math.ceil((H0 + pad * 2) * s);
    const key = 'senjaLayer';
    if (!F._senja || F._senja.width < cw || F._senja.height < ch) F._senja = F.canvas(Math.max(cw, 900), Math.max(ch, 900));
    const L = F._senja, g = L.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, L.width, L.height);
    const tilt = o.tilt || 0;
    g.save();
    g.translate((280 + pad) * s, (150 + pad) * s); g.scale(s, s);
    const rimW = o.rimW == null ? 5 : o.rimW;
    const dir = o.light === 'back' ? 1 : -1;
    const body = (gg, dx, dy) => {
      gg.save(); gg.translate(dx, dy);
      gg.fill(BODYP);
      gg.save(); gg.translate(PIVOT[0], PIVOT[1]); gg.rotate(tilt); gg.translate(-PIVOT[0], -PIVOT[1]); gg.fill(HEAD); gg.restore();
      gg.restore();
    };
    const limbs = (gg, dx, dy) => { gg.save(); gg.translate(dx, dy); gg.strokeStyle = gg.fillStyle; arms(gg, o.pose || 'rest', o.k == null ? 1 : o.k, tilt); gg.restore(); };
    // 1) rim colour silhouette, 2) dark silhouette shifted away from the light, atop
    g.fillStyle = o.rim || F.PAL.amber; body(g, 0, 0);
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = o.color || '#120e1c'; body(g, dir * rimW, rimW * 0.35);
    // face plane, slightly lifted so the profile reads
    if (o.face) {
      g.save(); g.translate(PIVOT[0], PIVOT[1]); g.rotate(tilt); g.translate(-PIVOT[0], -PIVOT[1]);
      g.translate(dir * rimW, rimW * 0.35); g.fillStyle = o.face; g.fill(FACEP);
      g.strokeStyle = o.eyeColor || 'rgba(0,0,0,0.55)'; g.lineWidth = 2.6; g.lineCap = 'round';
      g.beginPath();
      if (o.eyes === 'open') { g.moveTo(58, -40); g.quadraticCurveTo(64, -44, 70, -40); }
      else { g.moveTo(56, -36); g.quadraticCurveTo(63, -31, 70, -35); }
      g.stroke();
      g.restore();
    }
    g.globalCompositeOperation = 'source-over';
    // arms on their own layer so they catch their own rim light over the body
    if (o.pose && o.pose !== 'rest') {
      if (!F._senjaArms || F._senjaArms.width < L.width || F._senjaArms.height < L.height) F._senjaArms = F.canvas(L.width, L.height);
      const A = F._senjaArms, ag = A.getContext('2d');
      ag.setTransform(1, 0, 0, 1, 0, 0); ag.clearRect(0, 0, A.width, A.height);
      ag.translate((280 + pad) * s, (150 + pad) * s); ag.scale(s, s);
      ag.fillStyle = o.rim || F.PAL.amber; limbs(ag, 0, 0);
      ag.globalCompositeOperation = 'source-atop';
      ag.fillStyle = o.armColor || o.color || '#120e1c'; limbs(ag, dir * rimW * 0.8, rimW * 0.3);
      g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(A, 0, 0);
      g.translate((280 + pad) * s, (150 + pad) * s); g.scale(s, s);
    }
    if (o.sensor) drawSensor(g, tilt, o);
    g.restore();
    ctx.save();
    ctx.globalAlpha *= o.alpha == null ? 1 : o.alpha;
    ctx.translate(x, y);
    if ((o.facing || 1) < 0) ctx.scale(-1, 1);
    ctx.drawImage(L, 0, 0, cw, ch, -(280 + pad) * s, -(150 + pad) * s, cw, ch);
    ctx.restore();
  };

  function drawSensor(g, tilt, o) {
    const e = F.senjaHeadPoint(F.SENJA_ANCHORS.electrode, tilt), j = F.senjaHeadPoint(F.SENJA_ANCHORS.jaw, tilt);
    const c = F.SENJA_ANCHORS.collar;
    g.strokeStyle = 'rgba(30,30,40,0.9)'; g.lineWidth = 2.2;
    g.beginPath(); g.moveTo(e[0] - 2, e[1] + 6); g.bezierCurveTo(e[0] - 6, e[1] + 40, c[0] - 10, c[1] - 50, c[0] - 4, c[1] - 12); g.stroke();
    g.beginPath(); g.moveTo(j[0], j[1] + 6); g.bezierCurveTo(j[0] + 4, j[1] + 30, c[0] - 16, c[1] - 30, c[0] - 8, c[1] - 12); g.stroke();
    for (const p of [e, j]) { g.fillStyle = '#d8c7b4'; g.beginPath(); g.arc(p[0], p[1], 6.5, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#9a8f86'; g.beginPath(); g.arc(p[0], p[1], 2.2, 0, Math.PI * 2); g.fill(); }
    // collar pod
    g.fillStyle = '#2a2a36'; F.rrect(g, c[0] - 20, c[1] - 14, 40, 28, 8); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = 1.2; g.stroke();
    const led = o.led == null ? 0.6 : o.led;
    F.glowDot(g, c[0] + 10, c[1] - 2, 16, F.PAL.teal, led);
    g.fillStyle = F.rgba(F.PAL.teal, 0.6 + 0.4 * led); g.beginPath(); g.arc(c[0] + 10, c[1] - 2, 2.6, 0, Math.PI * 2); g.fill();
  }

  // Line-art version (science + blueprint). Returns nothing; strokes in current transform.
  F.drawSenjaLine = (ctx, x, y, s, o = {}) => {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.strokeStyle = o.color || F.PAL.cyan; ctx.lineWidth = (o.w || 2.4) / s;
    ctx.globalAlpha *= o.alpha == null ? 1 : o.alpha;
    if (o.glow) { ctx.shadowColor = o.color || F.PAL.cyan; ctx.shadowBlur = o.glow; }
    if (o.progress != null && o.progress < 1) {
      // draw the face profile progressively (thread → profile)
      const pts = F.splinePts([...FACE, ...HOOD_BACK], false, 10);
      const part = F.partial(pts, o.progress);
      ctx.beginPath(); part.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke();
    } else {
      ctx.stroke(HEAD); ctx.stroke(BODYP);
      if (o.inner) { ctx.globalAlpha *= 0.35; ctx.setLineDash([6 / s, 8 / s]); ctx.stroke(new Path2D(F.spline(HIJAB_INNER, false))); }
    }
    ctx.restore();
  };

  // sample a Catmull-Rom spline into points (for progressive drawing)
  F.splinePts = (pts, closed, per = 8) => {
    const n = pts.length, out = [];
    const P = (i) => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
    const last = closed ? n : n - 1;
    for (let i = 0; i < last; i++) {
      const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
      for (let k = 0; k < per; k++) {
        const t = k / per, t2 = t * t, t3 = t2 * t;
        out.push([0, 1].map((d) => 0.5 * ((2 * p1[d]) + (-p0[d] + p2[d]) * t + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * t2 + (-p0[d] + 3 * p1[d] - 3 * p2[d] + p3[d]) * t3)));
      }
    }
    out.push(closed ? pts[0] : pts[n - 1]);
    return out;
  };
})();
