// Live-action plates: AI-generated clips (see tools/film/shotlist.md) as JPEG frame sequences, drawn under
// the film's own overlays. tools/film/plates.json says which clip covers which window of which shot.
(function () {
  const F = window.F, W = F.W, H = F.H;
  F.PLATES = [];
  let root = '', fps = 24;
  const cache = new Map(); // url → decoded Image (small LRU: workers render frames in order)
  const url = (p, i) => `${root}/${p.id}/f${String(i + 1).padStart(4, '0')}.jpg`;

  F.loadPlates = async (manifest) => {
    try {
      const m = await fetch(manifest).then((r) => (r.ok ? r.json() : null));
      if (!m || !m.plates) return;
      root = m.root; fps = m.fps || 24;
      F.PLATES = m.plates.filter((p) => p.frames > 0);
    } catch (e) { F.PLATES = []; }
  };

  // the plate to draw for shot `s` at time t (or null: the painted shot draws itself)
  F.plateFor = (s, t) => {
    const ps = F.PLATES.filter((p) => p.shot === s.name);
    if (!ps.length) return null;
    const hit = ps.find((p) => t >= p.start && t < p.end);
    if (hit) return hit;
    const last = ps.reduce((a, b) => (b.end > a.end ? b : a));
    return t >= s.end - 1e-3 && last.end >= s.end - 0.05 ? last : null; // the outgoing side of a dissolve
  };
  const frameOf = (p, t) => F.clamp(Math.round((t - p.start + (p.src || 0)) * fps), 0, p.frames - 1);

  // load every frame the render of time t can touch (current shot and the one dissolving out)
  F.preparePlates = async (t) => {
    if (!F.PLATES.length) return;
    const sh = F.TL.shots, i = F.shotAt(t), need = [];
    for (const s of [sh[i - 1], sh[i]]) { if (!s) continue; const p = F.plateFor(s, t); if (p) need.push(url(p, frameOf(p, t))); }
    await Promise.all(need.map(async (u) => {
      if (cache.has(u)) return;
      const img = new Image(); img.src = u;
      try { await img.decode(); } catch (e) { return; }
      cache.set(u, img);
      if (cache.size > 24) cache.delete(cache.keys().next().value);
    }));
  };

  // light touches over a plate so a still keeps breathing (plates.json "fx"; times are film seconds)
  const FX = {
    dust(ctx, t, o) { // motes drifting through a sunbeam; the biggest are near the lens, out of focus
      const [x0, y0, x1, y1] = o.box, r = F.rng(o.seed || 3), col = o.color || '#ffd6a8';
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < (o.n || 60); i++) {
        const bx = x0 + r() * (x1 - x0), by = y0 + r() * (y1 - y0), sp = 3 + r() * 9, size = r(), ph = r() * 6.3;
        const x = bx + Math.sin(t * 0.27 + ph) * 18 + t * sp * 0.6, y = by + Math.cos(t * 0.19 + ph * 2) * 12 - t * sp * 0.25;
        const tw = 0.35 + 0.65 * Math.abs(Math.sin(t * 0.7 + ph));
        if (size > 0.88) F.glowDot(ctx, x, y, 10 + size * 12, col, 0.09 * tw);
        else { ctx.fillStyle = F.rgba(col, 0.3 * tw); ctx.beginPath(); ctx.arc(x, y, 1 + size * 1.6, 0, Math.PI * 2); ctx.fill(); }
      }
      ctx.restore();
    },
    rain(ctx, t, o) { // streaks between the lens and the scene
      ctx.save(); ctx.strokeStyle = `rgba(200,210,255,${o.a || 0.14})`; ctx.lineWidth = 1.2; ctx.beginPath();
      for (let i = 0; i < (o.n || 120); i++) {
        const x = F.hash(i * 3.7) * (W + 200) - 100, sp = 1100 + 500 * F.hash(i * 1.3), y = ((t * sp + F.hash(i * 9.1) * 3000) % (H + 200)) - 100;
        ctx.moveTo(x + y * 0.12, y); ctx.lineTo(x + y * 0.12 + 5, y + 34);
      }
      ctx.stroke(); ctx.restore();
    },
    flicker(ctx, t, o) { // a failing lamp: brief dips in the light
      const n = F.noise1(t * 9, 11), dip = Math.max(0, n - 0.35) / 0.65, k = (o.depth || 0.3) * dip * dip;
      if (k > 0.002) { ctx.fillStyle = `rgba(0,0,0,${k})`; ctx.fillRect(0, 0, W, H); }
    },
    warm(ctx, t, o) { // warm light slowly filling the room
      const k = F.ease.inOut(F.seg(t, o.from, o.to)) * (o.a || 0.25), col = o.color || '#ffb46a';
      if (k <= 0) return;
      ctx.save(); ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = F.rgba(col, k); ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter'; F.glowDot(ctx, o.x || 420, o.y || 380, 950, col, k * 0.3); ctx.restore();
    },
    blink(ctx, t, o) { // a device's light: a slow breath and a flash per tap; at = [x0, y0, x1, y1] on screen,
      // eased like parallax.py's camera so the glow stays on the light as the frame drifts
      const u = F.seg(t, o.from, o.to), k = u * u * (3 - 2 * u);
      let a = 0.2 + 0.1 * Math.sin(t * 3);
      for (const tt of o.times || []) a += 0.8 * F.pulse(t, tt, 0.03, 0.08, 0.15);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      F.glowDot(ctx, F.lerp(o.at[0], o.at[2], k), F.lerp(o.at[1], o.at[3], k), o.r || 50, o.color || '#2ad4c4', Math.min(1, a));
      ctx.restore();
    },
    close(ctx, t, o) { // darkness closing in from the edges
      const k = F.seg(t, o.from, o.to) * (o.a || 0.6);
      if (k <= 0) return;
      const g = ctx.createRadialGradient(W / 2, H / 2, H * (0.75 - 0.35 * k), W / 2, H / 2, H * 1.05);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${k})`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    },
  };

  F.drawPlate = (ctx, p, t) => {
    const img = cache.get(url(p, frameOf(p, F._frameT == null ? t : F._frameT)));
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    if (!img) return;
    const k = F.seg(t, p.start, p.end), z = p.push ? F.lerp(p.push[0], p.push[1], F.ease.sine(k)) : 1;
    const s = Math.max(W / img.width, H / img.height) * z, w = img.width * s, h = img.height * s;
    const [ox, oy] = p.offset || [0, 0];
    ctx.drawImage(img, (W - w) / 2 + ox, (H - h) / 2 + oy, w, h);
    for (const f of p.fx || []) if (FX[f.type]) FX[f.type](ctx, t, f);
  };
})();
