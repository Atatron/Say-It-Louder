// Compositor + player. Shots register themselves in F.SHOTS[name] = { draw(ctx, t, lt, d), bars, trans, transType }.
(function () {
  const F = window.F;
  F.SHOTS = F.SHOTS || {};

  F.layers = [];
  F.layer = (i = 0) => { if (!F.layers[i]) F.layers[i] = F.canvas(F.W, F.H); return F.layers[i]; };

  const spec = (name) => F.SHOTS[name] || { draw: (c) => { c.fillStyle = '#111'; c.fillRect(0, 0, F.W, F.H);
    F.text(c, 'shot: ' + name, 80, 120, { size: 40 }); }, bars: 1 };

  // a live-action plate (plates.js) replaces the painted shot where one exists; the shot then adds only its overlays
  function drawShot(ctx, s, t) {
    ctx.save();
    const sp = spec(s.name), p = F.plateFor && F.plateFor(s, t);
    if (p) { F.drawPlate(ctx, p, t); if (sp.overlay) sp.overlay(ctx, t, t - s.start, s.end - s.start, p); }
    else sp.draw(ctx, t, t - s.start, s.end - s.start, s);
    ctx.restore();
  }

  F.drawFrame = (ctx, t) => {
    const TL = F.TL, shots = TL.shots;
    t = F.clamp(t, 0, TL.duration - 1e-3);
    let i = shots.findIndex((s) => t < s.end); if (i < 0) i = shots.length - 1;
    const cur = shots[i], sp = spec(cur.name), lt = t - cur.start;
    const tr = sp.trans || 0;
    ctx.save();
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, F.W, F.H);
    let barK = sp.bars ? 1 : 0;
    if (tr > 0 && lt < tr && i > 0) {
      const prev = shots[i - 1], k = F.ease.inOut(lt / tr), pk = spec(prev.name).bars ? 1 : 0;
      barK = F.lerp(pk, barK, k);
      if (sp.transType === 'black') {
        if (k < 0.5) { drawShot(ctx, prev, t); ctx.fillStyle = `rgba(0,0,0,${k * 2})`; ctx.fillRect(0, 0, F.W, F.H); }
        else { drawShot(ctx, cur, t); ctx.fillStyle = `rgba(0,0,0,${(1 - k) * 2})`; ctx.fillRect(0, 0, F.W, F.H); }
      } else {
        drawShot(ctx, prev, t);
        const L = F.layer(0), g = L.getContext('2d');
        g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
        g.clearRect(0, 0, F.W, F.H); drawShot(g, cur, t);
        ctx.globalAlpha = k; ctx.drawImage(L, 0, 0); ctx.globalAlpha = 1;
      }
    } else {
      drawShot(ctx, cur, t);
    }
    // finish: vignette, grain, bars, chapter + subtitles
    F.vignette(ctx, sp.vignette == null ? 0.5 : sp.vignette);
    if (!F.RENDER) F.grain(ctx, t, sp.grain == null ? 0.05 : sp.grain); // in the film, grain comes from encode.py
    F.bars(ctx, barK);
    const ch = [...TL.chapters].reverse().find((c) => t >= c.t);
    if (ch && ch.label !== 'Prologue' && ch.label !== 'Epilogue') {
      F.chapterTitle(ctx, ch.label, F.pulse(t, ch.t + 0.3, 0.6, 2.6, 0.8), barK);
    }
    const sub = TL.subs.find((s) => t >= s.start && t < s.end);
    if (sub) F.subtitle(ctx, sub.text, Math.min(F.seg(t, sub.start, sub.start + 0.15), 1 - F.seg(t, sub.end - 0.15, sub.end)), barK, sub.italic);
    // global fade out
    const fo = F.seg(t, TL.duration - 1.6, TL.duration - 0.2);
    if (fo > 0) { ctx.fillStyle = `rgba(0,0,0,${fo})`; ctx.fillRect(0, 0, F.W, F.H); }
    ctx.restore();
  };

  // ---------------------------------------------------------------- motion blur
  // A 180° shutter: average n renders spread over half a frame, in linear light, never across a hard cut.
  F.shotAt = (t) => { const s = F.TL.shots; let i = s.findIndex((x) => t < x.end); return i < 0 ? s.length - 1 : i; };
  const LIN = new Float32Array(256).map((_, i) => Math.pow(i / 255, 2.2));
  const ENC = new Uint8ClampedArray(4096).map((_, i) => Math.round(255 * Math.pow(i / 4095, 1 / 2.2)));
  F.renderMB = (t, n = 4, shutter = 0.5 / 24) => {
    if (n <= 1) { F.renderAt(t); return; }
    const g = F.ctx, W = F.W, H = F.H, i0 = F.shotAt(t), sh = F.TL.shots[i0];
    const acc = F._acc || (F._acc = new Float32Array(W * H * 3)); acc.fill(0);
    F._frameT = t; // live-action plates already carry their own motion blur: one plate frame per film frame
    for (let k = 0; k < n; k++) {
      let tk = t + ((k + 0.5) / n - 0.5) * shutter;
      if (!(spec(sh.name).trans > 0 && tk - sh.start < spec(sh.name).trans)) tk = F.clamp(tk, sh.start, sh.end - 1e-4);
      F.renderAt(tk);
      const d = g.getImageData(0, 0, W, H).data;
      for (let p = 0, q = 0; p < d.length; p += 4, q += 3) { acc[q] += LIN[d[p]]; acc[q + 1] += LIN[d[p + 1]]; acc[q + 2] += LIN[d[p + 2]]; }
    }
    const img = g.createImageData(W, H), o = img.data, m = 4095 / n;
    for (let p = 0, q = 0; p < o.length; p += 4, q += 3) { o[p] = ENC[(acc[q] * m) | 0]; o[p + 1] = ENC[(acc[q + 1] * m) | 0]; o[p + 2] = ENC[(acc[q + 2] * m) | 0]; o[p + 3] = 255; }
    g.putImageData(img, 0, 0);
    F._frameT = null;
  };

  // ---------------------------------------------------------------- boot
  F.boot = async (canvas) => {
    F.canvasEl = canvas;
    const [tl] = await Promise.all([fetch('timeline.json').then((r) => r.json()), document.fonts.ready]);
    F.TL = tl; F.C = tl.cues;
    await Promise.all(['Fraunces', 'Inter', 'JetBrains Mono', 'Caveat'].map((f) => document.fonts.load(`40px "${f}"`)));
    await document.fonts.load('italic 40px "Fraunces"');
    for (const k in F.SHOTS) if (F.SHOTS[k].init) F.SHOTS[k].init();
    F.ctx = canvas.getContext('2d');
    F.renderAt = (t) => F.drawFrame(F.ctx, t);
    return tl;
  };
})();
