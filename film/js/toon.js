// Cartoon people for the film: Senja (and her family), with real faces that blink, breathe and emote.
// Local space: head centre ≈ (0,0), she faces +x in a 3/4 view, units ≈ px at scale 1.
(function () {
  const F = window.F;

  const LOOK = {
    skin: { base: '#c98b62', shade: '#a86d49', light: '#e3a77d', blush: 'rgba(236,112,108,0.34)', lips: '#a8505a' },
    hijab: { base: '#b9707f', shade: '#94525f', light: '#d993a0' },
    top: { base: '#2f6676', shade: '#244e5b', light: '#4a8798' }, blouse: '#efe5d2',
    iris: '#4b2b1a', brow: '#3a2216', lid: '#2b1912', hair: null, child: false,
  };
  F.TOON_LOOK = LOOK;

  // ---------------------------------------------------------------- geometry
  const HIJAB = [[-4, -124], [42, -118], [80, -96], [101, -58], [108, -14], [102, 34], [93, 78], [103, 124], [110, 176], [94, 222],
    [44, 252], [-28, 258], [-90, 236], [-118, 186], [-124, 132], [-112, 84], [-107, 40], [-111, -14], [-102, -60], [-76, -100], [-40, -118]];
  const HAIR = [[-6, -118], [40, -112], [72, -88], [86, -50], [84, -20], [74, -40], [52, -62], [10, -70], [-30, -66], [-60, -52], [-74, -20],
    [-80, 10], [-88, -40], [-76, -84], [-44, -110]];
  const FACE = [[-44, -70], [-8, -78], [30, -74], [58, -58], [70, -32], [73, -4], [70, 24], [62, 50], [46, 72], [26, 88], [12, 92], [-8, 89],
    [-32, 77], [-52, 56], [-63, 28], [-66, -4], [-61, -38]];
  const FACE_NOHIJAB = [[-50, -66], [-8, -82], [34, -76], [62, -56], [72, -30], [74, -4], [70, 24], [62, 50], [46, 72], [26, 88], [12, 92], [-8, 89],
    [-32, 77], [-52, 56], [-63, 28], [-68, -4], [-64, -40]];
  const NECK = [[-20, 70], [30, 72], [36, 128], [-24, 126]];
  const TORSO = [[-118, 118], [-60, 106], [0, 102], [62, 106], [112, 120], [142, 200], [160, 320], [170, 440], [-182, 440], [-170, 320], [-152, 200]];
  const PIVOT = [6, 100];

  const P_ = (pts) => F.spline(pts, true);
  const PATH = { hijab: P_(HIJAB), face: P_(FACE), faceBare: P_(FACE_NOHIJAB), torso: P_(TORSO), hair: P_(HAIR), neck: P_(NECK) };

  // Arms per pose: near arm (screen-left in local space) and far arm; [shoulder, elbow, hand], hand kind
  const POSES = {
    rest: { near: [[-126, 150], [-150, 292], [-36, 326]], far: [[118, 150], [140, 292], [58, 324]], nh: 'flat', fh: 'flat' },
    write: { near: [[-126, 150], [-150, 292], [-44, 328]], far: [[118, 150], [142, 290], [96, 318]], nh: 'flat', fh: 'pen' },
    ears: { near: [[-120, 138], [-182, 168], [-106, -6]], far: [[112, 138], [178, 168], [106, -6]], nh: 'open', fh: 'open' },
    phone: { near: [[-126, 150], [-142, 300], [-6, 250]], far: [[118, 150], [132, 300], [52, 244]], nh: 'grip', fh: 'grip', phone: true },
    down: { near: [[-126, 150], [-140, 300], [-120, 420]], far: [[118, 150], [130, 300], [112, 420]], nh: 'none', fh: 'none' },
  };
  const lerpPt = (a, b, k) => [F.lerp(a[0], b[0], k), F.lerp(a[1], b[1], k)];
  function poseAt(o) {
    const to = POSES[o.pose || 'rest'];
    if (!o.from || o.k == null || o.k >= 1) return to;
    const fr = POSES[o.from], k = F.ease.inOut(F.clamp(o.k));
    return { near: to.near.map((p, i) => lerpPt(fr.near[i], p, k)), far: to.far.map((p, i) => lerpPt(fr.far[i], p, k)),
      nh: k < 0.5 ? fr.nh : to.nh, fh: k < 0.5 ? fr.fh : to.fh, phone: k > 0.5 ? to.phone : fr.phone };
  }

  // ---------------------------------------------------------------- tiny helpers
  const fillPath = (g, p, c) => { g.fillStyle = c; g.fill(p); };
  const ell = (g, x, y, rx, ry, rot, c) => { g.fillStyle = c; g.beginPath(); g.ellipse(x, y, rx, ry, rot || 0, 0, Math.PI * 2); g.fill(); };
  function limb(g, a, b, w, base, shade) {
    g.lineCap = 'round'; g.strokeStyle = base; g.lineWidth = w;
    g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
    g.strokeStyle = shade; g.lineWidth = w * 0.32; g.globalAlpha *= 0.55;
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L * w * 0.28, ny = dx / L * w * 0.28;
    g.beginPath(); g.moveTo(a[0] + nx, a[1] + ny); g.lineTo(b[0] + nx, b[1] + ny); g.stroke(); g.globalAlpha /= 0.55;
  }
  function hand(g, at, from, kind, skin, t, wig) {
    if (kind === 'none') return;
    const ang = Math.atan2(at[1] - from[1], at[0] - from[0]);
    g.save(); g.translate(at[0], at[1]); g.rotate(ang);
    if (kind === 'open') {
      ell(g, 2, 0, 20, 17, 0, skin.base);
      for (let i = 0; i < 4; i++) { g.save(); g.rotate(-0.42 + i * 0.27); ell(g, 30, 0, 15, 5.6, 0, skin.base); g.restore(); }
      g.save(); g.rotate(1.2); ell(g, 16, 0, 11, 6, 0, skin.base); g.restore();
      g.strokeStyle = skin.shade; g.lineWidth = 1.6; g.globalAlpha *= 0.6;
      for (let i = 0; i < 3; i++) { g.save(); g.rotate(-0.28 + i * 0.27); g.beginPath(); g.moveTo(22, 0); g.lineTo(36, 0); g.stroke(); g.restore(); }
      g.globalAlpha /= 0.6;
    } else if (kind === 'pen') {
      ell(g, 6, 0, 19, 15, 0, skin.base);
      g.save(); g.rotate(-0.9 + (wig || 0)); g.fillStyle = '#2e3a5c'; F.rrect(g, -6, -3.5, 46, 7, 3); g.fill();
      g.fillStyle = '#d9d2c2'; g.fillRect(36, -3, 6, 6); g.restore();
      ell(g, 14, -9, 8, 6, 0.3, skin.base);
    } else if (kind === 'grip') {
      ell(g, 4, 0, 17, 14, 0, skin.base);
      ell(g, 14, -8, 9, 6, -0.4, skin.base);
    } else { // flat hand resting
      ell(g, 10, 0, 22, 13, 0, skin.base);
      ell(g, 2, -10, 8, 6, -0.6, skin.base);
      g.strokeStyle = skin.shade; g.lineWidth = 1.4; g.globalAlpha *= 0.5;
      g.beginPath(); g.moveTo(18, -6); g.lineTo(30, -5); g.moveTo(19, 2); g.lineTo(31, 2); g.stroke(); g.globalAlpha /= 0.5;
    }
    g.restore();
  }

  // blink: a short close every few seconds (deterministic in t)
  F.toonBlink = (t, seed = 0) => {
    const period = 3.4, k = Math.floor((t + seed) / period), base = k * period - seed + 0.9 + 1.4 * F.hash(k + seed * 7);
    const d = Math.abs(t - base);
    return d < 0.09 ? 1 - d / 0.09 : 0;
  };

  // ---------------------------------------------------------------- the face
  function eye(g, cx, cy, w, h, c, look, X, near, mood) {
    const open = 1 - c;
    if (open < 0.12) { // closed eye
      g.strokeStyle = X.lid; g.lineWidth = 3.2; g.lineCap = 'round';
      g.beginPath();
      if (mood === 'squeeze') { g.moveTo(cx - w / 2, cy - 2); g.lineTo(cx, cy + 3); g.lineTo(cx + w / 2, cy - 2); }
      else { g.moveTo(cx - w / 2, cy); g.quadraticCurveTo(cx, cy + h * 0.42, cx + w / 2, cy); }
      g.stroke();
      // lashes
      const oc = near ? -1 : 1, ox = cx + oc * w / 2;
      g.lineWidth = 2.2; g.beginPath(); g.moveTo(ox, cy); g.lineTo(ox + oc * 6, cy - 3); g.stroke();
      return;
    }
    const topY = cy - h * 0.78 * open, botY = cy + h * 0.55;
    const shape = new Path2D();
    shape.moveTo(cx - w / 2, cy); shape.quadraticCurveTo(cx, topY - h * 0.25 * open, cx + w / 2, cy);
    shape.quadraticCurveTo(cx, botY, cx - w / 2, cy); shape.closePath();
    g.save(); g.clip(shape);
    ell(g, cx, cy, w / 2 + 2, h, 0, '#fbf6f1');
    const r = h * 0.55, ix = cx + look[0] * w * 0.2, iy = cy + 1 + look[1] * h * 0.16;
    ell(g, ix, iy, r, r, 0, X.iris);
    ell(g, ix, iy + r * 0.25, r * 0.78, r * 0.6, 0, F.rgba('#2a160c', 0.35));
    ell(g, ix, iy, r * 0.46, r * 0.46, 0, '#140b06');
    ell(g, ix - r * 0.36, iy - r * 0.42, r * 0.3, r * 0.3, 0, '#ffffff');
    ell(g, ix + r * 0.32, iy + r * 0.3, r * 0.13, r * 0.13, 0, 'rgba(255,255,255,0.9)');
    // lid shadow on the eyeball
    g.fillStyle = 'rgba(80,40,30,0.1)'; g.fillRect(cx - w, topY - h, w * 2, h * 0.62);
    g.restore();
    // upper lid line + lash flick toward the outer corner
    const oc = near ? -1 : 1;
    g.strokeStyle = X.lid; g.lineCap = 'round'; g.lineJoin = 'round';
    g.lineWidth = 3.1; g.beginPath(); g.moveTo(cx - w / 2, cy); g.quadraticCurveTo(cx, topY - h * 0.25 * open, cx + w / 2, cy); g.stroke();
    const ox = cx + oc * w / 2;
    g.lineWidth = 2.6; g.beginPath(); g.moveTo(ox, cy); g.quadraticCurveTo(ox + oc * 5, cy - 2, ox + oc * 10, cy - 7); g.stroke();
    g.lineWidth = 1.8; for (const f of [0.62, 0.82]) { const lx = cx + oc * (w / 2) * f, ly = cy - h * 0.66 * open * Math.sqrt(1 - f * f) - h * 0.14 * open; g.beginPath(); g.moveTo(lx, ly); g.lineTo(lx + oc * 4, ly - 5); g.stroke(); }
    g.lineWidth = 1.4; g.globalAlpha *= 0.45; g.beginPath(); g.moveTo(cx - w / 2 + 3, cy + 2); g.quadraticCurveTo(cx, botY + 1, cx + w / 2 - 3, cy + 2); g.stroke(); g.globalAlpha /= 0.45;
  }
  function brow(g, x0, y0, x1, y1, lift, inner, near, col) {
    // near brow: inner end is x1 (toward the nose); far brow: inner end is x0
    const iy = -inner * 7, oy = inner * 2;
    const ax = x0, ay = y0 - lift + (near ? oy : iy), bx = x1, by = y1 - lift + (near ? iy : oy);
    g.strokeStyle = col; g.lineCap = 'round'; g.lineWidth = 5;
    g.beginPath(); g.moveTo(ax, ay); g.quadraticCurveTo((ax + bx) / 2, Math.min(ay, by) - 5, bx, by); g.stroke();
  }
  function mouth(g, kind, s, X, t) {
    const cx = 14, cy = 47;
    g.lineCap = 'round'; g.lineJoin = 'round';
    g.strokeStyle = '#6a2f33'; g.lineWidth = 3;
    if (kind === 'smile' || kind === 'bigsmile') {
      const k = kind === 'bigsmile' ? 1 : (s == null ? 0.6 : s);
      if (k > 0.75) {
        const m = new Path2D(); m.moveTo(cx - 17, cy - 3); m.quadraticCurveTo(cx, cy + 16, cx + 17, cy - 4); m.quadraticCurveTo(cx, cy + 2, cx - 17, cy - 3);
        g.fillStyle = '#7a2a30'; g.fill(m); g.save(); g.clip(m); g.fillStyle = '#fff'; g.fillRect(cx - 18, cy - 4, 36, 5); g.restore();
        g.stroke(m);
      } else {
        g.beginPath(); g.moveTo(cx - 15, cy - 3 * k); g.quadraticCurveTo(cx, cy + 4 + 6 * k, cx + 15, cy - 1 - 3 * k); g.stroke();
      }
    } else if (kind === 'sad') {
      g.beginPath(); g.moveTo(cx - 13, cy + 4); g.quadraticCurveTo(cx, cy - 4, cx + 13, cy + 4); g.stroke();
    } else if (kind === 'worried') {
      g.beginPath(); g.moveTo(cx - 13, cy + 2); g.bezierCurveTo(cx - 5, cy - 3, cx + 4, cy + 6, cx + 13, cy + 1); g.stroke();
    } else if (kind === 'tense') {
      g.beginPath(); g.moveTo(cx - 12, cy + 2); g.lineTo(cx - 4, cy - 1); g.lineTo(cx + 4, cy + 2); g.lineTo(cx + 12, cy - 1); g.stroke();
    } else if (kind === 'gasp') {
      ell(g, cx, cy + 1, 7, 9, 0, '#6a2a2e'); ell(g, cx, cy + 4, 4, 4, 0, '#b2585e');
    } else if (kind === 'hum') {
      const v = 0.6 * Math.sin(t * 40);
      ell(g, cx + 1, cy + 1, 9, 5 + v * 0.3, 0, X.skin.lips);
      g.beginPath(); g.moveTo(cx - 9, cy + 1); g.quadraticCurveTo(cx, cy + 3, cx + 10, cy + 1); g.stroke();
    } else { // neutral, a soft resting curve
      g.beginPath(); g.moveTo(cx - 13, cy); g.quadraticCurveTo(cx, cy + 5, cx + 13, cy - 1); g.stroke();
    }
    if (kind !== 'gasp' && kind !== 'hum' && !(kind === 'bigsmile')) { // lower lip hint
      g.fillStyle = F.rgba(X.skin.lips, 0.35); g.beginPath(); g.ellipse(cx + 1, cy + 7, 8, 3.2, 0, 0, Math.PI * 2); g.fill();
    }
  }

  function head(g, o, X, t) {
    const e = o.expr || {};
    const bare = !X.hijab;
    if (!bare) fillPath(g, PATH.hijab, X.hijab.base);
    else { fillPath(g, PATH.neck, X.skin.shade); }
    // face
    const fp = bare ? PATH.faceBare : PATH.face;
    fillPath(g, fp, X.skin.base);
    g.save(); g.clip(fp);
    // light: warm cheek on the near side, soft shade on the far side, shadow under the hijab edge
    const sh = g.createLinearGradient(-70, 0, 76, 0);
    sh.addColorStop(0, 'rgba(255,214,170,0.20)'); sh.addColorStop(0.55, 'rgba(255,214,170,0)'); sh.addColorStop(1, F.rgba(X.skin.shade, 0.6));
    g.fillStyle = sh; g.fillRect(-80, -90, 160, 190);
    if (!bare) { const top = g.createLinearGradient(0, -80, 0, -48); top.addColorStop(0, 'rgba(70,30,30,0.35)'); top.addColorStop(1, 'rgba(70,30,30,0)'); g.fillStyle = top; g.fillRect(-80, -90, 160, 50); }
    ell(g, -36, 24, 15, 9.5, 0, X.skin.blush); ell(g, 52, 22, 9, 7, 0, X.skin.blush);
    g.restore();
    if (!bare) { g.strokeStyle = X.hijab.shade; g.lineWidth = 5; g.stroke(fp); }
    else if (X.hair) fillPath(g, PATH.hair, X.hair);
    // features
    const blink = Math.max(e.closed || 0, F.toonBlink(t, o.seed || 0));
    const look = e.look || [0, 0];
    const bw = X.child ? 1.12 : 1;
    eye(g, -22, -4, 41 * bw, 31 * bw, blink, look, X, true, e.eyes);
    eye(g, 39, -4, 32 * bw, 27 * bw, blink, look, X, false, e.eyes);
    brow(g, -46, -36, -6, -40, e.lift || 0, e.inner || 0, true, X.brow);
    brow(g, 24, -42, 56, -36, e.lift || 0, e.inner || 0, false, X.brow);
    // nose
    g.strokeStyle = X.skin.shade; g.lineWidth = 2.6; g.lineCap = 'round';
    g.beginPath(); g.moveTo(16, 0); g.quadraticCurveTo(28, 16, 18, 23); g.stroke();
    ell(g, 14, 22, 2.4, 1.6, 0, F.rgba(X.skin.shade, 0.9));
    mouth(g, e.mouth || 'neutral', e.smile, X, t);
    // a tear
    if (e.tear > 0) {
      const y = 10 + e.tear * 46;
      g.fillStyle = 'rgba(190,225,255,0.9)'; g.beginPath(); g.moveTo(-30, y - 7); g.quadraticCurveTo(-24, y + 1, -30, y + 5); g.quadraticCurveTo(-36, y + 1, -30, y - 7); g.fill();
      ell(g, -31.5, y - 0.5, 1.4, 2, 0, '#fff');
    }
    if (e.glisten) { ell(g, -26, 1, 6, 1.6, 0, `rgba(200,230,255,${0.6 * e.glisten})`); }
  }

  function sensor(g, o, tilt) {
    const P = (p) => F.toonHeadPoint(p, tilt);
    const e1 = P([14, 63]), j = P([46, 70]), c = [44, 150];
    g.strokeStyle = 'rgba(40,40,52,0.9)'; g.lineWidth = 2.2; g.lineCap = 'round';
    g.beginPath(); g.moveTo(e1[0], e1[1] + 5); g.bezierCurveTo(e1[0] + 6, e1[1] + 40, c[0] - 12, c[1] - 50, c[0] - 4, c[1] - 12); g.stroke();
    g.beginPath(); g.moveTo(j[0], j[1] + 5); g.bezierCurveTo(j[0] + 6, j[1] + 30, c[0] + 8, c[1] - 36, c[0] + 4, c[1] - 12); g.stroke();
    for (const p of [e1, j]) { ell(g, p[0], p[1], 6.5, 6.5, 0, '#efe2d0'); ell(g, p[0], p[1], 2.3, 2.3, 0, '#9a8f86'); }
    g.fillStyle = '#2a2a36'; F.rrect(g, c[0] - 20, c[1] - 13, 40, 26, 8); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.3)'; g.lineWidth = 1.2; g.stroke();
    const led = o.led == null ? 0.6 : o.led;
    F.glowDot(g, c[0] + 10, c[1] - 1, 16, F.PAL.teal, led);
    ell(g, c[0] + 10, c[1] - 1, 2.6, 2.6, 0, F.rgba(F.PAL.teal, 0.6 + 0.4 * led));
  }

  F.toonHeadPoint = (pt, tilt) => {
    const c = Math.cos(tilt), s = Math.sin(tilt), dx = pt[0] - PIVOT[0], dy = pt[1] - PIVOT[1];
    return [PIVOT[0] + dx * c - dy * s, PIVOT[1] + dx * s + dy * c];
  };
  const ANCH = { lips: [16, 48], electrode: [14, 63], collar: [44, 150], eye: [-22, -6], phone: [22, 238], head: [0, -20] };
  // world position of an anchor for a toon drawn at (x, y, s) with options o
  F.toonPoint = (name, x, y, s, o = {}) => {
    const br = 1 + 0.006 * Math.sin((o.t || 0) * 1.75);
    const isHead = ['lips', 'electrode', 'eye', 'head'].includes(name);
    const p = isHead ? F.toonHeadPoint(ANCH[name], (o.tilt || 0)) : ANCH[name];
    return [x + (o.facing || 1) * p[0] * s, y + (p[1] + (isHead ? -3 * (br - 1) * 100 : 0)) * s];
  };

  // ---------------------------------------------------------------- main
  // o: { facing, pose, from, k, t, expr: {mouth, smile, lift, inner, look, closed, eyes, tear, glisten}, tilt, look,
  //      style (overrides LOOK), part: 'all'|'body'|'front', rim, rimDir, tint, tintA, sensor, led, phoneGlow, seed, alpha }
  F.toon = (ctx, x, y, s, o = {}) => {
    const X = Object.assign({}, LOOK, o.style || {});
    X.skin = Object.assign({}, LOOK.skin, (o.style || {}).skin || {});
    if (o.style && o.style.hijab === null) X.hijab = null;
    const t = o.t || 0, part = o.part || 'all', pz = poseAt(o);
    const tilt = (o.tilt || 0) + 0.012 * Math.sin(t * 0.7 + (o.seed || 0));
    const breath = 1 + 0.006 * Math.sin(t * 1.75 + (o.seed || 0));
    const pad = 120, W0 = 380, H0 = 340; // local box x: -380..380, y: -340..470
    const cw = Math.ceil((W0 * 2 + pad * 2) * s), ch = Math.ceil((H0 + 470 + pad * 2) * s);
    if (!F._toonL || F._toonL.width < cw || F._toonL.height < ch) { F._toonL = F.canvas(Math.max(cw, 1200), Math.max(ch, 1200)); F._toonM = F.canvas(F._toonL.width, F._toonL.height); }
    const L = F._toonL, g = L.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.clearRect(0, 0, cw + 2, ch + 2);
    g.translate((W0 + pad) * s, (H0 + pad) * s); g.scale(s, s);
    const top = X.top, skin = X.skin;
    const armW = X.child ? 30 : 40;
    const [ns, ne, nh] = pz.near, [fs, fe, fh] = pz.far;
    const ears = (o.pose === 'ears' && (o.k == null || o.k > 0.5));
    if (part !== 'front') {
      // torso breathes
      g.save(); g.translate(0, 102); g.scale(1, breath); g.translate(0, -102);
      fillPath(g, PATH.torso, top.base);
      g.save(); g.clip(PATH.torso);
      const tg = g.createLinearGradient(-180, 0, 170, 0); tg.addColorStop(0, F.rgba(top.light, 0.35)); tg.addColorStop(0.5, 'rgba(0,0,0,0)'); tg.addColorStop(1, F.rgba(top.shade, 0.8));
      g.fillStyle = tg; g.fillRect(-190, 90, 370, 360);
      g.fillStyle = X.blouse; g.beginPath(); g.moveTo(-26, 244); g.lineTo(26, 244); g.lineTo(0, 300); g.closePath(); g.fill();
      g.strokeStyle = top.shade; g.lineWidth = 4; g.beginPath(); g.moveTo(-26, 244); g.lineTo(0, 300); g.lineTo(0, 450); g.moveTo(26, 244); g.lineTo(0, 300); g.stroke();
      ell(g, 9, 340, 4, 4, 0, top.shade); ell(g, 9, 390, 4, 4, 0, top.shade);
      g.restore();
      // upper arms
      limb(g, ns, ne, armW + 4, top.base, top.shade);
      limb(g, fs, fe, armW + 4, top.base, top.shade);
      if (ears) { limb(g, fe, fh, armW, top.base, top.shade); hand(g, fh, fe, pz.fh, skin, t); }
      g.restore();
      // head (tilts) — hijab + face
      g.save(); g.translate(0, (breath - 1) * -300);
      g.translate(PIVOT[0], PIVOT[1]); g.rotate(tilt); g.scale(1.1, 1.1); g.translate(-PIVOT[0], -PIVOT[1] - 6);
      if (X.hijab) {
        // hijab drape shading
        head(g, o, X, t);
      } else head(g, o, X, t);
      g.restore();
      if (o.sensor) sensor(g, o, tilt);
    }
    if (part !== 'body') {
      // forearms + hands in front
      if (!ears) {
        limb(g, ne, nh, armW, top.base, top.shade); hand(g, nh, ne, pz.nh, skin, t, 0);
        if (pz.phone) {
          g.save(); g.translate(22, 238); g.rotate(-0.08);
          g.fillStyle = '#12141c'; F.rrect(g, -34, -58, 68, 116, 10); g.fill();
          g.fillStyle = o.screen || '#e9e8f6'; F.rrect(g, -29, -52, 58, 104, 7); g.fill();
          g.restore();
        }
        limb(g, fe, fh, armW, top.base, top.shade); hand(g, fh, fe, pz.fh, skin, t, pz.fh === 'pen' ? 0.25 * Math.sin(t * 9) : 0);
      } else { limb(g, ne, nh, armW, top.base, top.shade); hand(g, nh, ne, pz.nh, skin, t); }
    }
    // grade: tint toward the scene light
    if (o.tint) { g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-atop'; g.fillStyle = o.tint; g.fillRect(0, 0, cw, ch); g.globalCompositeOperation = 'source-over'; }
    // composite: rim light first (offset silhouette), then the character
    ctx.save();
    ctx.globalAlpha *= o.alpha == null ? 1 : o.alpha;
    ctx.translate(x, y);
    const fl = (o.facing || 1) < 0;
    if (o.rim) {
      const M = F._toonM, mg = M.getContext('2d');
      mg.setTransform(1, 0, 0, 1, 0, 0); mg.globalCompositeOperation = 'source-over'; mg.clearRect(0, 0, cw + 2, ch + 2);
      mg.drawImage(L, 0, 0); mg.globalCompositeOperation = 'source-in'; mg.fillStyle = o.rim; mg.fillRect(0, 0, cw, ch);
      const off = (o.rimW || 3) * (o.rimDir || -1);
      ctx.save(); if (fl) ctx.scale(-1, 1); ctx.globalAlpha *= o.rimA == null ? 0.7 : o.rimA;
      ctx.drawImage(M, 0, 0, cw, ch, -(W0 + pad) * s + (fl ? -off : off), -(H0 + pad) * s - 2, cw, ch);
      ctx.restore();
    }
    if (fl) ctx.scale(-1, 1);
    ctx.drawImage(L, 0, 0, cw, ch, -(W0 + pad) * s, -(H0 + pad) * s, cw, ch);
    ctx.restore();
  };

  // ready-made family looks
  F.TOON_FAMILY = {
    father: { hijab: null, hair: '#22160f', top: { base: '#5d6f8f', shade: '#45536d', light: '#7d8fb0' }, blouse: '#e8e2d6', skin: { base: '#b97d56', shade: '#9a633f' } },
    mother: { hijab: { base: '#6f8f6a', shade: '#55704f', light: '#93b08c' }, top: { base: '#8a5f7a', shade: '#6d4a60', light: '#a87e98' } },
    sister: { hijab: { base: '#e0a85a', shade: '#bf8a40', light: '#f0c27e' }, top: { base: '#c0605a', shade: '#9c4a45', light: '#d98079' }, child: true },
    brother: { hijab: null, hair: '#22160f', top: { base: '#3f8a6a', shade: '#2f6a51', light: '#5aa585' }, child: true },
    youngSenja: { child: true, hijab: { base: '#d98a98', shade: '#b86e7c', light: '#efaab6' }, top: { base: '#5a8fb0', shade: '#46718c', light: '#79aacb' } },
  };
})();
