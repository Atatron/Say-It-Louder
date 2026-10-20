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

  F.drawPlate = (ctx, p, t) => {
    const img = cache.get(url(p, frameOf(p, F._frameT == null ? t : F._frameT)));
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    if (!img) return;
    const k = F.seg(t, p.start, p.end), z = p.push ? F.lerp(p.push[0], p.push[1], F.ease.sine(k)) : 1;
    const s = Math.max(W / img.width, H / img.height) * z, w = img.width * s, h = img.height * s;
    const [ox, oy] = p.offset || [0, 0];
    ctx.drawImage(img, (W - w) / 2 + ox, (H - h) / 2 + oy, w, h);
  };
})();
