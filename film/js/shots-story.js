// Story shots: prologue, Senja, family, weight, the voice, hospital, data.
(function () {
  const F = window.F, P = F.PAL, W = F.W, H = F.H;
  const S = (F.SHOTS = F.SHOTS || {});
  const C = () => F.C;

  // ------------------------------------------------------------------ scenery painters
  function sky(g, x, y, w, h, night = 0) {
    const gr = g.createLinearGradient(0, y, 0, y + h);
    if (!night) {
      gr.addColorStop(0, '#22163f'); gr.addColorStop(0.38, '#5d3266'); gr.addColorStop(0.66, '#c45f5f');
      gr.addColorStop(0.84, '#ef9a66'); gr.addColorStop(1, '#ffd49a');
    } else {
      gr.addColorStop(0, '#0b1030'); gr.addColorStop(0.6, '#1d2a66'); gr.addColorStop(1, '#3a4a94');
    }
    g.fillStyle = gr; g.fillRect(x, y, w, h);
    const r = F.rng(night ? 77 : 7);
    if (!night) {
      F.glowDot(g, x + w * 0.62, y + h * 0.86, w * 0.55, '#ffcf8a', 0.75);
      g.fillStyle = '#fff1d0'; g.beginPath(); g.arc(x + w * 0.62, y + h * 0.86, w * 0.07, 0, Math.PI * 2); g.fill();
      for (let i = 0; i < 9; i++) { // thin clouds
        g.fillStyle = `rgba(255,${150 + r() * 60},${140 + r() * 40},${0.12 + r() * 0.12})`;
        g.beginPath(); g.ellipse(x + r() * w, y + h * (0.3 + r() * 0.42), w * (0.2 + r() * 0.3), 4 + r() * 7, 0, 0, Math.PI * 2); g.fill();
      }
    } else {
      for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(230,235,255,${0.25 + r() * 0.6})`; g.fillRect(x + r() * w, y + r() * h * 0.8, 1.6, 1.6); }
      g.fillStyle = '#e8ecff'; g.beginPath(); g.arc(x + w * 0.3, y + h * 0.22, 16, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#10163a'; g.beginPath(); g.arc(x + w * 0.3 + 7, y + h * 0.22 - 4, 15, 0, Math.PI * 2); g.fill();
    }
  }
  function skyline(g, x, y, w, h, col) {
    g.fillStyle = col; const r = F.rng(11);
    let cx = x; g.beginPath(); g.moveTo(x, y + h);
    while (cx < x + w) { const bw = 40 + r() * 90, bh = 26 + r() * 60; g.lineTo(cx, y + h - bh); if (r() > 0.5) { g.lineTo(cx + bw / 2, y + h - bh - 26); } g.lineTo(cx + bw, y + h - bh); cx += bw; }
    g.lineTo(x + w, y + h); g.closePath(); g.fill();
  }
  function palm(g, x, y, hgt, lean, col) {
    g.strokeStyle = col; g.fillStyle = col; g.lineCap = 'round';
    const top = [x + lean, y - hgt];
    g.lineWidth = 9; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + lean * 0.2, y - hgt * 0.6, top[0], top[1]); g.stroke();
    for (let i = 0; i < 9; i++) {
      const a = -Math.PI / 2 + (i - 4) * 0.42, len = hgt * (0.42 + 0.12 * Math.sin(i * 1.7));
      const tip = [top[0] + Math.cos(a) * len, top[1] + Math.sin(a) * len * 0.55 + len * 0.35];
      const mid = [top[0] + Math.cos(a) * len * 0.5, top[1] + Math.sin(a) * len * 0.5 - 12];
      g.beginPath(); g.moveTo(top[0], top[1]); g.quadraticCurveTo(mid[0], mid[1] - 10, tip[0], tip[1]);
      g.quadraticCurveTo(mid[0], mid[1] + 10, top[0], top[1] + 4); g.fill();
    }
  }
  function windowFrame(g, x, y, w, h, night) {
    g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
    sky(g, x - 40, y - 40, w + 80, h + 80, night);
    skyline(g, x - 20, y + h * 0.62, w + 40, h * 0.38, night ? '#090b1c' : '#2a173a');
    palm(g, x + w * 0.25, y + h, h * 0.62, 26, night ? '#06081a' : '#1d1030');
    palm(g, x + w * 0.85, y + h, h * 0.5, -18, night ? '#06081a' : '#1d1030');
    g.restore();
    g.strokeStyle = '#1a1220'; g.lineWidth = 16; g.strokeRect(x, y, w, h);
    g.lineWidth = 9; g.beginPath(); g.moveTo(x + w / 2, y); g.lineTo(x + w / 2, y + h); g.moveTo(x, y + h * 0.42); g.lineTo(x + w, y + h * 0.42); g.stroke();
  }
  function desksRow(g, col) {
    g.fillStyle = col;
    for (let row = 0; row < 3; row++) for (let i = 0; i < 4; i++) {
      const x = 60 + i * 190 + row * 34, y = 740 + row * 60, s = 1 - row * 0.06;
      g.fillRect(x, y, 130 * s, 12); g.fillRect(x + 8, y, 8, 90 * s); g.fillRect(x + 114 * s, y, 8, 90 * s);
      g.fillRect(x + 150 * s, y + 30, 46 * s, 9); g.fillRect(x + 186 * s, y - 20, 8, 110 * s); g.fillRect(x + 152 * s, y + 30, 7, 60 * s);
    }
  }
  const RP = { x: 280, y: 160 };
  function roomBg(night) {
    return F.sprite('room' + night, W + RP.x * 2, H + RP.y * 2, (g) => {
      g.translate(RP.x, RP.y);
      const wall = g.createLinearGradient(0, 0, 0, H);
      if (!night) { wall.addColorStop(0, '#2b1f3c'); wall.addColorStop(0.7, '#4b3048'); wall.addColorStop(1, '#2a1c2c'); }
      else { wall.addColorStop(0, '#0d0d1e'); wall.addColorStop(0.7, '#17142a'); wall.addColorStop(1, '#0c0b16'); }
      g.fillStyle = wall; g.fillRect(-RP.x, -RP.y, W + RP.x * 2, H + RP.y * 2);
      // floor
      g.fillStyle = night ? '#0a0912' : '#24182a'; g.fillRect(-RP.x, 880, W + RP.x * 2, 200 + RP.y);
      if (night) { // moonlight spilling through the windows onto the wall
        for (const wx of [225, 525]) { const m = g.createRadialGradient(wx, 470, 40, wx, 520, 520);
          m.addColorStop(0, 'rgba(120,140,255,0.22)'); m.addColorStop(1, 'rgba(120,140,255,0)'); g.fillStyle = m; g.fillRect(wx - 600, 0, 1200, 1100); }
      }
      windowFrame(g, 110, 210, 230, 500, night); windowFrame(g, 410, 210, 230, 500, night);
      // window light spilled on the wall
      if (!night) { const sp = g.createRadialGradient(380, 470, 50, 380, 470, 700); sp.addColorStop(0, 'rgba(255,170,110,0.22)'); sp.addColorStop(1, 'rgba(255,170,110,0)'); g.fillStyle = sp; g.fillRect(0, 0, W, H); }
      // chalkboard
      g.fillStyle = night ? '#101a17' : '#1f2e2a'; g.fillRect(1330, 230, 520, 330);
      g.strokeStyle = night ? '#1c1418' : '#3a2a22'; g.lineWidth = 14; g.strokeRect(1330, 230, 520, 330);
      F.text(g, 'FINAL EXAMS', 1370, 312, { family: 'Caveat', size: 50, weight: 700, color: 'rgba(240,240,230,' + (night ? 0.18 : 0.62) + ')' });
      F.text(g, 'next week', 1372, 362, { family: 'Caveat', size: 38, weight: 400, color: 'rgba(240,240,230,' + (night ? 0.14 : 0.5) + ')' });
      F.text(g, 'x² + 2x − 8 = 0', 1372, 440, { family: 'Caveat', size: 34, color: 'rgba(240,240,230,' + (night ? 0.12 : 0.4) + ')' });
      F.text(g, '· school event ·', 1560, 520, { family: 'Caveat', size: 30, color: 'rgba(245,200,120,' + (night ? 0.16 : 0.55) + ')' });
      // clock face
      g.fillStyle = night ? '#1a1826' : '#e9dcc4'; g.beginPath(); g.arc(1030, 280, 44, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#1a1220'; g.lineWidth = 6; g.stroke();
      for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; g.fillStyle = '#3a2c2c'; g.fillRect(1030 + Math.cos(a) * 34 - 2, 280 + Math.sin(a) * 34 - 2, 4, 4); }
      desksRow(g, night ? '#07060d' : '#1b1222');
    });
  }
  function deskFg(night) {
    return F.sprite('desk' + night, W, H, (g) => {
      const top = g.createLinearGradient(0, 840, 0, 870);
      top.addColorStop(0, night ? '#2a1a14' : '#5a3a28'); top.addColorStop(1, night ? '#140d0a' : '#3a2418');
      g.fillStyle = top; g.fillRect(700, 840, 1000, 30);
      g.fillStyle = night ? '#100a08' : '#2c1b12'; g.fillRect(712, 870, 976, 260);
      g.fillStyle = night ? '#1a120e' : '#3d271b'; g.fillRect(740, 900, 420, 150); g.fillRect(1200, 900, 460, 150);
      // exam papers
      for (let i = 0; i < 7; i++) { g.fillStyle = i % 2 ? '#e9e2d2' : '#f4eee2'; g.fillRect(760 + i * 2, 826 - i * 5, 240, 14); }
      for (let i = 0; i < 4; i++) { g.fillStyle = '#efe7d6'; g.fillRect(1380 + i * 3, 830 - i * 5, 200, 12); }
      g.fillStyle = '#c8bca6'; g.fillRect(900, 834, 180, 6);
      // mug
      g.fillStyle = night ? '#28303a' : '#6b7f8a'; g.fillRect(1610, 790, 44, 52); g.strokeStyle = g.fillStyle; g.lineWidth = 7; g.beginPath(); g.arc(1660, 812, 13, -1.2, 1.2); g.stroke();
    });
  }
  // the room a little out of focus behind her (depth of field), same framing as roomBg
  function roomBlur(night) {
    return F.sprite('roomBlur' + night, W + RP.x * 2, H + RP.y * 2, (g) => { g.filter = 'blur(2.6px)'; g.drawImage(roomBg(night), 0, 0); });
  }
  // a student chair close to the lens, a little out of focus, rim-lit by the window (for depth)
  function fgChair(ctx, x, y, s, a = 1, rim = '#c98a5e') {
    const sp = F.sprite('fgChair' + rim, 560, 640, (g) => {
      const shape = (gg) => {
        gg.beginPath(); gg.moveTo(70, 120); gg.quadraticCurveTo(280, 70, 490, 120); gg.lineTo(486, 176); gg.quadraticCurveTo(280, 134, 74, 176); gg.closePath(); gg.fill();
        gg.fillRect(96, 160, 34, 480); gg.fillRect(430, 160, 34, 480);                // posts
        gg.fillRect(120, 300, 320, 26); gg.fillRect(250, 170, 22, 140);               // rail + slat
        gg.fillRect(40, 520, 480, 44);                                                 // seat edge
      };
      g.filter = 'blur(6px)';
      g.fillStyle = rim; g.save(); g.translate(-5, -4); shape(g); g.restore();         // rim light, up-left
      g.fillStyle = '#07050a'; shape(g);
    });
    ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); ctx.scale(s, s); ctx.drawImage(sp, -280, -120); ctx.restore();
  }
  // shadows of palm fronds outside, swaying through the window light
  function leafShadows(ctx, t, a) {
    if (a <= 0) return;
    const leaf = F.sprite('leafShadow', 260, 90, (g) => { g.filter = 'blur(12px)'; g.fillStyle = '#3a1c30';
      g.beginPath(); g.ellipse(130, 45, 104, 15, 0, 0, Math.PI * 2); g.fill(); });
    ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = a * 0.3;
    ctx.beginPath();
    for (let i = 0; i < 2; i++) { const x0 = 120 + i * 300; ctx.moveTo(x0 + 120, 230); ctx.lineTo(x0 + 230, 230); ctx.lineTo(x0 + 1100, 900); ctx.lineTo(x0 + 520, 940); ctx.closePath(); }
    ctx.clip();
    for (let i = 0; i < 9; i++) {
      const sway = F.noise1(t * 0.45 + i * 2.7, 12), x = 330 + (i % 5) * 150 + sway * 22, y = 430 + Math.floor(i / 5) * 170 + (i % 2) * 50;
      ctx.save(); ctx.translate(x, y); ctx.rotate(-0.75 + (i % 3) * 0.32 + sway * 0.08); ctx.drawImage(leaf, -130, -45); ctx.restore();
    }
    ctx.restore();
  }
  function clockHands(ctx, t, blur = 0) {
    const sec = Math.floor(t - 0.2), a = (sec % 60) / 60 * Math.PI * 2 - Math.PI / 2;
    ctx.save(); ctx.translate(1030, 280); ctx.strokeStyle = '#2a1c1c'; ctx.lineCap = 'round';
    if (blur) ctx.filter = `blur(${blur}px)`;
    ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(-1.2) * 18, Math.sin(-1.2) * 18); ctx.stroke();
    ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(0.5) * 28, Math.sin(0.5) * 28); ctx.stroke();
    ctx.strokeStyle = '#a33'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * 33, Math.sin(a) * 33); ctx.stroke();
    ctx.restore();
  }
  function rays(ctx, t, a = 1) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 2; i++) {
      const x0 = 120 + i * 300, gr = ctx.createLinearGradient(x0, 300, x0 + 900, 900);
      gr.addColorStop(0, `rgba(255,170,110,${0.16 * a})`); gr.addColorStop(1, 'rgba(255,170,110,0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(x0 + 120, 230); ctx.lineTo(x0 + 230, 230); ctx.lineTo(x0 + 1100, 900); ctx.lineTo(x0 + 520, 940); ctx.closePath(); ctx.fill();
    }
    const r = F.rng(5);
    for (let i = 0; i < 70; i++) { // dust
      const bx = 250 + r() * 900, by = 300 + r() * 560, sp = 4 + r() * 10;
      const x = bx + Math.sin(t * 0.3 + i) * 20 + t * sp * 0.5, y = by + Math.cos(t * 0.21 + i * 2) * 14 - t * sp * 0.3;
      const tw = 0.4 + 0.6 * Math.abs(Math.sin(t * 0.8 + i));
      ctx.fillStyle = `rgba(255,214,170,${0.35 * tw * a})`; ctx.beginPath(); ctx.arc(x, y, 1.4 + r() * 1.8, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
  function lamp(ctx, on, flicker = 0) {
    ctx.save();
    ctx.fillStyle = '#16100c'; ctx.fillRect(1470, 770, 70, 10); ctx.fillRect(1500, 680, 8, 92);
    ctx.beginPath(); ctx.moveTo(1450, 690); ctx.lineTo(1556, 690); ctx.lineTo(1528, 640); ctx.lineTo(1478, 640); ctx.closePath(); ctx.fill();
    if (on > 0) {
      ctx.globalCompositeOperation = 'lighter';
      const k = on * (1 - flicker);
      const g = ctx.createRadialGradient(1503, 700, 10, 1503, 760, 620);
      g.addColorStop(0, `rgba(255,190,120,${0.55 * k})`); g.addColorStop(0.4, `rgba(255,160,90,${0.18 * k})`); g.addColorStop(1, 'rgba(255,160,90,0)');
      ctx.fillStyle = g; ctx.fillRect(800, 300, 1300, 800);
    }
    ctx.restore();
  }

  // whisper sprite: "come home", smoky
  function whisperSprite(color, key) {
    return F.sprite('wh' + key, 760, 200, (g) => {
      for (let k = 5; k >= 0; k--) {
        g.save(); g.filter = `blur(${k * 3 + 0.6}px)`; g.globalAlpha = k ? 0.2 : 0.8;
        F.text(g, 'come home…', 380, 120, { family: 'Fraunces', style: 'italic', size: 92, weight: 400, color, align: 'center', tracking: 4 });
        g.restore();
      }
    });
  }
  F.whisperSprite = whisperSprite;
  F.drawWhisper = (ctx, x, y, s, a, color = '#ffd9e0', key = 'rose', rot = 0) => {
    if (a <= 0) return; const sp = whisperSprite(color, key);
    ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s); ctx.drawImage(sp, -380, -110); ctx.restore();
  };
  // whisper intensity at time t from the audio timing of whisper `id`
  const wEnv = (t, w, pre = 0.1, post = 1.4) => (w ? F.seg(t, w.start - pre, w.start + 0.25) * (1 - F.seg(t, w.end + 0.1, w.end + post)) : 0);
  const W_ = (id) => F.TL.whispers.find((w) => w.id === id);

  // shadow figure, smoky
  function shadow(ctx, x, y, s, a, t) {
    if (a <= 0) return;
    const pts = [];
    const prof = [[0, -600], [40, -592], [58, -560], [50, -520], [34, -500], [110, -470], [132, -420], [128, -300], [110, -160], [90, -40], [60, 0]];
    for (let i = 0; i < prof.length; i++) { const [px, py] = prof[i]; const n = F.noise1(t * 1.3 + i * 0.7, 9) * 10;
      pts.push([x + (px + n) * s, y + py * s]); }
    for (let i = prof.length - 1; i >= 0; i--) { const [px, py] = prof[i]; const n = F.noise1(t * 1.2 + i * 0.9, 11) * 10;
      pts.push([x - (px + n) * s, y + py * s]); }
    const path = F.spline(pts, true);
    ctx.save(); ctx.globalAlpha *= a;
    ctx.shadowColor = 'rgba(255,70,110,0.35)'; ctx.shadowBlur = 40;
    ctx.filter = 'blur(5px)';
    const g = ctx.createLinearGradient(0, y - 600 * s, 0, y);
    g.addColorStop(0, 'rgba(2,1,6,0.97)'); g.addColorStop(0.75, 'rgba(2,1,6,0.9)'); g.addColorStop(1, 'rgba(2,1,6,0)');
    ctx.fillStyle = g; ctx.fill(path);
    ctx.restore();
    // wisps rising off it
    ctx.save(); ctx.globalAlpha *= a * 0.7;
    for (let i = 0; i < 18; i++) {
      const ph = (t * 0.35 + i / 18) % 1, wx = x + (F.hash(i) - 0.5) * 220 * s + Math.sin(t + i) * 12, wy = y - 560 * s - ph * 160 * s;
      ctx.fillStyle = `rgba(2,1,6,${0.45 * (1 - ph)})`; ctx.beginPath(); ctx.arc(wx, wy, (10 + 16 * F.hash(i + 3)) * s * (1 - ph * 0.5), 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
  F.shadowFigure = shadow;

  // ------------------------------------------------------------------ PROLOGUE
  S.open = {
    bars: 1, trans: 0, grain: 0.06,
    draw(ctx, t, lt, d) {
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
      // the voice is felt before anything is seen: a faint warm breath of light where it comes from
      const w1 = W_('w1'), w2 = W_('w2');
      const a1 = wEnv(t, w1, 0.3, 1.8), a2 = wEnv(t, w2, 0.2, 1.1);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      F.glowDot(ctx, 620 + lt * 6, 470, 460, '#f0b089', 0.11 * a1);
      F.glowDot(ctx, 1320 - lt * 5, 610, 400, '#f0b089', 0.14 * a2);
      ctx.restore();
      // a horizon of dusk slowly appearing
      const hz = F.smooth(t, d - 3.0, d + 0.4);
      if (hz > 0) {
        const g = ctx.createLinearGradient(0, 600, 0, 948);
        g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(214,110,90,${0.3 * hz})`);
        ctx.fillStyle = g; ctx.fillRect(0, 600, W, 348);
      }
      const c0 = C().card, c = F.pulse(t, c0, 1.0, 2.2, 0.8);
      if (c > 0) {
        F.text(ctx, 'Based on a true story.', W / 2, 512, { family: 'Fraunces', style: 'italic', size: 58, align: 'center', color: P.cream, alpha: c });
        F.text(ctx, 'Names and identifying details have been changed.', W / 2, 574,
          { size: 20, weight: 500, tracking: 1.5, align: 'center', color: 'rgba(226,219,232,0.8)', alpha: c * F.seg(t, c0 + 0.4, c0 + 1.1) });
        F.text(ctx, 'Adapted from a published, anonymised nursing case report.', W / 2, 612,
          { size: 18, align: 'center', color: 'rgba(206,200,220,0.72)', alpha: c * F.seg(t, c0 + 0.7, c0 + 1.4) });
        if (F.PLATES && F.PLATES.length) F.text(ctx, 'Dramatization: scenes are recreated with AI-generated imagery. No one shown is a real person from this story.', W / 2, 644,
          { size: 18, align: 'center', color: 'rgba(206,200,220,0.72)', alpha: c * F.seg(t, c0 + 0.7, c0 + 1.4) });
      }
    },
  };

  // ------------------------------------------------------------------ I · SENJA (classroom, dusk)
  // name card: "Senja / not her real name"
  function nameCard(ctx, t) {
      const l1 = F.TL.lines.find((l) => l.id === 'L01'), l2 = F.TL.lines.find((l) => l.id === 'L02');
      const a = F.pulse(t, l1.start - 0.1, 0.7, l2.end - l1.start + 0.6, 0.8);
      if (a > 0) {
        const y = 846, x = 150, rise = (1 - F.ease.out(F.seg(t, l1.start - 0.1, l1.start + 0.7))) * 18;
        // a soft shade in the corner keeps the card readable over a busy frame
        const g = ctx.createRadialGradient(x + 120, y + 10, 40, x + 120, y + 10, 520);
        g.addColorStop(0, `rgba(0,0,0,${0.62 * a})`); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 560, 1000, 388);
        F.text(ctx, 'Senja', x, y - 30 + rise, { family: 'Fraunces', style: 'italic', size: 76, color: P.cream, alpha: a });
        ctx.fillStyle = F.rgba(P.amber, a); ctx.fillRect(x + 4, y - 4 + rise, 64 * F.ease.out(F.seg(t, l1.start + 0.3, l1.start + 1.2)), 2);
        F.text(ctx, 'not her real name', x + 2, y + 32 + rise, { size: 22, weight: 500, tracking: 1, color: 'rgba(240,232,220,0.95)', alpha: a * F.seg(t, l2.start - 0.1, l2.start + 0.5) });
      }
  }
  S.class = {
    bars: 1, trans: 1.1,
    overlay(ctx, t) { nameCard(ctx, t); },
    draw(ctx, t, lt, d) {
      // opens close under the clock, then eases back to find her at her desk, then a slow push
      const rev = F.ease.inOut(F.seg(lt, 0.0, 3.6)), drift = F.ease.sine(F.clamp(lt / (d + 0.6)));
      const cx = F.lerp(1050, F.lerp(985, 1010, drift), rev), cy = F.lerp(360, F.lerp(565, 585, drift), rev);
      const z = F.lerp(1.5, F.lerp(1.02, 1.08, drift), rev);
      ctx.save(); F.cam(ctx, cx, cy, z);
      ctx.drawImage(roomBlur(0), -RP.x, -RP.y); clockHands(ctx, t, 1.5);
      rays(ctx, t, 1 - 0.25 * drift);
      leafShadows(ctx, t, 1);
      F.drawSenja(ctx, 1165, 470, 1.15, { pose: 'write', k: t * 0.9, tilt: 0.12, facing: -1, color: '#1a1222', rim: '#ffb27a', rimW: 5, face: '#2a1c2a' });
      ctx.drawImage(deskFg(0), 0, 0);
      ctx.restore();
      // an empty student chair, close to the lens, drifting past
      fgChair(ctx, 230 - (cx - 1000) * 1.4 - lt * 8, 905 - (cy - 570) * 0.5, 1.15, 0.95);
      nameCard(ctx, t);
    },
  };

  // ------------------------------------------------------------------ family photo
  const PHOTO = { w: 760, h: 500 };
  // a person in an old photo: head, neck, shoulders; a hijab drapes over the shoulders, or a ponytail hangs
  function figure(g, x, base, h, hijab, col, tail) {
    const hr = h * 0.105, hy = base - h + hr * 1.05, sw = h * (h > 250 ? 0.2 : 0.18), sh = hy + hr * 2.15; // sh: shoulder line
    g.fillStyle = col;
    g.beginPath();
    if (hijab) { // crown → temple → wrapped chin → over the shoulder → down the arm (and mirrored)
      g.moveTo(x, hy - hr * 1.12);
      g.bezierCurveTo(x + hr * 0.75, hy - hr * 1.12, x + hr * 1.05, hy - hr * 0.5, x + hr * 1.0, hy + hr * 0.15);
      g.bezierCurveTo(x + hr * 0.95, hy + hr * 0.7, x + hr * 0.78, hy + hr * 1.05, x + hr * 0.82, hy + hr * 1.3);
      g.bezierCurveTo(x + hr * 1.1, hy + hr * 1.55, x + sw * 1.0, sh - hr * 0.2, x + sw * 1.12, sh + hr * 0.4);
      g.quadraticCurveTo(x + sw * 1.2, base - h * 0.3, x + sw * 1.1, base);
      g.lineTo(x - sw * 1.1, base);
      g.quadraticCurveTo(x - sw * 1.2, base - h * 0.3, x - sw * 1.12, sh + hr * 0.4);
      g.bezierCurveTo(x - sw * 1.0, sh - hr * 0.2, x - hr * 1.1, hy + hr * 1.55, x - hr * 0.82, hy + hr * 1.3);
      g.bezierCurveTo(x - hr * 0.78, hy + hr * 1.05, x - hr * 0.95, hy + hr * 0.7, x - hr * 1.0, hy + hr * 0.15);
      g.bezierCurveTo(x - hr * 1.05, hy - hr * 0.5, x - hr * 0.75, hy - hr * 1.12, x, hy - hr * 1.12);
    } else {     // head, neck, shoulders
      g.ellipse(x, hy, hr * 0.82, hr, 0, 0, Math.PI * 2); g.fill();
      g.fillRect(x - hr * 0.34, hy + hr * 0.6, hr * 0.68, hr * 1.0);
      g.beginPath(); g.moveTo(x - hr * 0.45, sh - hr * 0.55);
      g.quadraticCurveTo(x - sw * 0.95, sh - hr * 0.45, x - sw * 1.1, sh + hr * 0.3);
      g.quadraticCurveTo(x - sw * 1.2, base - h * 0.3, x - sw * 1.1, base);
      g.lineTo(x + sw * 1.1, base);
      g.quadraticCurveTo(x + sw * 1.2, base - h * 0.3, x + sw * 1.1, sh + hr * 0.3);
      g.quadraticCurveTo(x + sw * 0.95, sh - hr * 0.45, x + hr * 0.45, sh - hr * 0.55);
    }
    g.closePath(); g.fill();
    if (tail) { g.beginPath(); g.ellipse(x + hr * 0.05, hy + hr * 1.35, hr * 0.3, hr * 0.95, 0.04, 0, Math.PI * 2); g.fill(); }
    // arms against the body: two faint folds of light
    g.strokeStyle = 'rgba(255,236,200,0.16)'; g.lineWidth = 2;
    for (const d of [-1, 1]) { g.beginPath(); g.moveTo(x + d * sw * 0.66, sh + hr * 1.4); g.quadraticCurveTo(x + d * sw * 0.7, base - h * 0.2, x + d * sw * 0.64, base); g.stroke(); }
  }
  function photoSprite(withFather) {
    return F.sprite('photo' + withFather, PHOTO.w, PHOTO.h, (g, w, h) => {
      const sk = g.createLinearGradient(0, 0, 0, h);
      sk.addColorStop(0, '#d9b98f'); sk.addColorStop(0.55, '#f0cf9a'); sk.addColorStop(1, '#c9a274');
      g.fillStyle = sk; g.fillRect(0, 0, w, h);
      F.glowDot(g, w * 0.5, h * 0.48, 260, '#fff2cf', 0.8);
      g.fillStyle = '#a8946f';
      g.beginPath(); g.moveTo(0, h * 0.62); g.lineTo(w * 0.22, h * 0.3); g.lineTo(w * 0.42, h * 0.55); g.lineTo(w * 0.6, h * 0.36); g.lineTo(w, h * 0.66); g.lineTo(w, h); g.lineTo(0, h); g.fill();
      g.fillStyle = '#8c7c5e'; g.fillRect(0, h * 0.78, w, h * 0.22);
      g.save(); g.filter = 'blur(1.2px)';
      const col = '#4a3a2c';
      if (withFather) figure(g, w * 0.17, h * 0.99, h * 0.7, false, col);
      figure(g, w * 0.36, h * 0.99, h * 0.62, true, col);
      figure(g, w * 0.55, h * 0.99, h * 0.56, false, col, true); // Senja
      figure(g, w * 0.71, h * 0.99, h * 0.43, false, col);
      figure(g, w * 0.84, h * 0.99, h * 0.35, true, col);
      g.restore();
      // age: warm vignette, faded corners, a crease, dust
      const v = g.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, h * 0.9);
      v.addColorStop(0, 'rgba(60,40,20,0)'); v.addColorStop(1, 'rgba(60,40,20,0.5)'); g.fillStyle = v; g.fillRect(0, 0, w, h);
      g.strokeStyle = 'rgba(255,248,230,0.18)'; g.lineWidth = 2; g.beginPath(); g.moveTo(w * 0.62, 0); g.quadraticCurveTo(w * 0.6, h * 0.5, w * 0.66, h); g.stroke();
      const r = F.rng(3); for (let i = 0; i < 700; i++) { g.fillStyle = `rgba(255,250,230,${r() * 0.12})`; g.fillRect(r() * w, r() * h, 1.5, 1.5); }
    });
  }
  // an out-of-focus mug at the edge of frame
  function fgMug(ctx, x, y, s, a = 1) {
    const sp = F.sprite('fgMug', 420, 520, (g) => { g.filter = 'blur(16px)'; g.fillStyle = '#120b08';
      g.fillRect(90, 110, 220, 300); g.lineWidth = 34; g.strokeStyle = '#120b08'; g.beginPath(); g.arc(320, 230, 66, -1.3, 1.3); g.stroke(); });
    ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); ctx.scale(s, s); ctx.drawImage(sp, -210, -260); ctx.restore();
  }
  S.family = {
    bars: 1, trans: 0.9,
    draw(ctx, t, lt, d) {
      // a desk at night under a lamp
      const g = ctx.createRadialGradient(700, 300, 50, 900, 560, 1100);
      g.addColorStop(0, '#5a3a26'); g.addColorStop(0.5, '#2a1a12'); g.addColorStop(1, '#0c0807');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      const r = F.rng(4); ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 2;
      for (let i = 0; i < 40; i++) { const y = r() * H; ctx.beginPath(); ctx.moveTo(0, y); ctx.bezierCurveTo(600, y + 20, 1200, y - 20, W, y + 10); ctx.stroke(); }
      const k = F.ease.sine(F.clamp(lt / d)), z = F.lerp(1.0, 1.13, k);
      ctx.save(); F.cam(ctx, 960, 540, z);
      ctx.translate(960 - PHOTO.w / 2, 540 - PHOTO.h / 2); ctx.rotate(-0.025);
      // frame + shadow
      ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(18, 24, PHOTO.w + 40, PHOTO.h + 40);
      ctx.fillStyle = '#3b2416'; ctx.fillRect(-20, -20, PHOTO.w + 40, PHOTO.h + 40);
      ctx.strokeStyle = '#6a4630'; ctx.lineWidth = 3; ctx.strokeRect(-12, -12, PHOTO.w + 24, PHOTO.h + 24);
      // her father fades from the photograph into light
      const fade = F.smooth(t, C().father + 0.1, C().father + 2.2);
      ctx.drawImage(photoSprite(false), 0, 0);
      if (fade < 1) { ctx.globalAlpha = 1 - fade; ctx.drawImage(photoSprite(true), 0, 0); ctx.globalAlpha = 1; }
      if (fade > 0 && fade < 1) {
        const pr = F.rng(23);
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 110; i++) {
          const sx = PHOTO.w * 0.17 + (pr() - 0.5) * 130, sy = PHOTO.h * (0.32 + pr() * 0.62);
          const life = F.seg(fade, pr() * 0.4, 0.6 + pr() * 0.4);
          if (life <= 0 || life >= 1) continue;
          ctx.fillStyle = `rgba(255,226,170,${0.6 * Math.sin(life * Math.PI)})`;
          ctx.beginPath(); ctx.arc(sx + Math.sin(i + life * 3) * 20, sy - life * 220, 1.4 + pr() * 2.4, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
      }
      // the eldest: a little light finds her; it grows when the family starts to lean on her
      const l4 = F.TL.lines.find((l) => l.id === 'L04'), l6 = F.TL.lines.find((l) => l.id === 'L06');
      const e = Math.max(F.pulse(t, l4.start, 0.4, 0.9, 0.7) * 0.6, F.seg(t, l6.start - 0.1, l6.start + 0.8));
      if (e > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; F.glowDot(ctx, PHOTO.w * 0.55, PHOTO.h * 0.68, 150, '#ffe2a8', 0.5 * e); ctx.restore(); }
      // glass glare
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.08;
      const gl = ctx.createLinearGradient(0, 0, PHOTO.w, PHOTO.h); gl.addColorStop(0.2, 'rgba(255,255,255,0)'); gl.addColorStop(0.35, 'rgba(255,255,255,1)'); gl.addColorStop(0.5, 'rgba(255,255,255,0)');
      ctx.fillStyle = gl; ctx.fillRect(0, 0, PHOTO.w, PHOTO.h); ctx.restore();
      ctx.restore();
      // lamp light, and a mug out of focus in the foreground
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; F.glowDot(ctx, 560, 240, 700, '#ffb070', 0.18); ctx.restore();
      fgMug(ctx, 1700 + lt * 14, 880, 1.2 * z, 0.95);
    },
  };

  // ------------------------------------------------------------------ the weight
  const BOOKS = [
    { word: 'mother', label: 'MOTHER', col: '#7d4452', w: 250 },
    { word: 'siblings', label: 'SIBLINGS', col: '#3a5272', w: 236 },
    { word: 'students', label: 'STUDENTS', col: '#55623a', w: 280 },
  ];
  const wordT = (id, w) => { const ln = F.TL.lines.find((l) => l.id === id); const x = ln.words.find((q) => q.w.toLowerCase().startsWith(w)); return x ? x.s : ln.start; };
  // rain on the night windows: streaks outside, drops sliding down the glass
  function rainOnWindows(ctx, t, a) {
    if (a <= 0) return;
    ctx.save(); ctx.globalAlpha *= a;
    for (const [x0, y0, w, h] of [[118, 218, 214, 484], [418, 218, 214, 484]]) {
      ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, w, h); ctx.clip();
      ctx.strokeStyle = 'rgba(190,205,255,0.3)'; ctx.lineWidth = 1.2; ctx.beginPath();
      for (let i = 0; i < 48; i++) {
        const sx = x0 + F.hash(i * 7.1 + x0) * (w + 60) - 30, sp = 900 + 500 * F.hash(i * 3.3 + x0);
        const y = y0 + ((t * sp + F.hash(i * 1.9 + x0) * 2000) % (h + 120)) - 60;
        ctx.moveTo(sx + (y - y0) * 0.08, y); ctx.lineTo(sx + (y - y0) * 0.08 + 4, y + 26);
      }
      ctx.stroke();
      for (let i = 0; i < 16; i++) {
        const dx = x0 + 10 + F.hash(i * 5.7 + x0 * 0.1) * (w - 20), sp = 24 + 60 * F.hash(i * 2.3 + x0);
        const dy = y0 + ((t * sp + F.hash(i + x0) * 900) % (h + 40)) - 20;
        ctx.strokeStyle = 'rgba(210,220,255,0.12)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(dx, dy - 3); ctx.lineTo(dx + Math.sin(i) * 2, dy - 50 * F.hash(i + 3)); ctx.stroke();
        ctx.fillStyle = 'rgba(214,224,255,0.38)'; ctx.beginPath(); ctx.ellipse(dx, dy, 2.2, 3.2, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
    ctx.restore();
  }
  function nightRoom(ctx, t, rain = 0) {
    ctx.drawImage(roomBlur(1), -RP.x, -RP.y); clockHands(ctx, t, 1.5);
    rainOnWindows(ctx, t, rain);
  }
  S.weight = {
    bars: 1, trans: 0.9,
    draw(ctx, t, lt, d) {
      const al = C().alone, pull = F.ease.inOut(F.seg(t, al - 0.2, al + 2.6));
      const z = F.lerp(1.12, 0.92, pull), cx = F.lerp(1150, 900, pull), cy = F.lerp(560, 540, pull);
      ctx.save(); F.cam(ctx, cx, cy, z);
      nightRoom(ctx, t, 0.55);
      lamp(ctx, 1 - 0.35 * pull);
      // sinking posture as the weight lands
      let sink = 0; BOOKS.forEach((b) => { sink += F.ease.outBack(F.seg(t, wordT('L07', b.word), wordT('L07', b.word) + 0.45)); });
      F.drawSenja(ctx, 1165, 470 + sink * 7, 1.15, { pose: 'rest', tilt: 0.16 + sink * 0.05, facing: -1, color: '#100c18', rim: '#ffab6b', rimW: 4, face: '#1d1520' });
      ctx.drawImage(deskFg(1), 0, 0);
      // books stacking on her shoulders
      const fadeB = 1 - F.seg(t, al + 0.3, al + 1.6);
      let y = 640;
      BOOKS.forEach((b, i) => {
        const ts = wordT('L07', b.word), k = F.seg(t, ts - 0.05, ts + 0.45);
        if (k <= 0) return;
        const yy = F.lerp(y - 260, y, F.ease.outBack(k)), x = 1395 - b.w / 2 + (i % 2 ? 14 : -10);
        ctx.save(); ctx.globalAlpha = fadeB * F.seg(t, ts - 0.05, ts + 0.15); ctx.translate(x + b.w / 2, yy); ctx.rotate((i - 1) * 0.04);
        ctx.fillStyle = 'rgba(0,0,0,0.35)'; F.rrect(ctx, -b.w / 2 + 6, -22, b.w, 46, 6); ctx.fill();
        ctx.fillStyle = b.col; F.rrect(ctx, -b.w / 2, -30, b.w, 46, 6); ctx.fill();
        ctx.fillStyle = '#e9dcc4'; ctx.fillRect(b.w / 2 - 16, -26, 10, 38);
        ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(-b.w / 2 + 8, -24, b.w - 30, 4);
        F.text(ctx, b.label, -8, 2, { family: 'Fraunces', size: 20, weight: 600, tracking: 4, align: 'center', color: 'rgba(255,246,230,0.88)' });
        ctx.restore();
        y -= 50;
      });
      ctx.restore();
      // pulling back: the empty classroom around her, a chair close to the lens
      fgChair(ctx, F.lerp(-300, 210, pull), 930, 1.2, pull, '#7a6a9a');
    },
  };

  // ------------------------------------------------------------------ II · THE VOICE
  function voiceNotes(ctx, t, lt, d) {
    const c = C(), s1 = t - lt + d;
      // case notes
      const l10 = F.TL.lines.find((l) => l.id === 'L10');
      F.callout(ctx, 1350, 170, 'WHISPERS', '4–5× a day · ≤ 5 min', 'from the case report', { alpha: F.pulse(t, l10.start - 0.1, 0.5, 2.6, 0.6), accent: P.rose, w: 470 });
      F.callout(ctx, 1350, 330, 'BLACK SHADOW', '5–7× a day · 1–2 min', 'from the case report', { alpha: F.pulse(t, c.shadow + 0.1, 0.5, 2.4, 0.6), accent: P.rose, w: 470 });
      // hard cut to black with the tinnitus
      const cut = F.seg(t, s1 - 0.48, s1 - 0.42);
      if (cut > 0) { ctx.fillStyle = `rgba(0,0,0,${cut})`; ctx.fillRect(0, 0, W, H); }
  }
  S.voice = {
    overlay(ctx, t, lt, d) { voiceNotes(ctx, t, lt, d); },
    bars: 1, trans: 0, // a hard cut from the same room: the night goes on, the rain gets heavier
    draw(ctx, t, lt, d) {
      const c = C(), w3 = W_('w3'), s1 = t - lt + d;
      const shake = F.seg(t, c.shadow, c.ears + 0.8) * 5;
      const sx = F.noise1(t * 9, 1) * shake, sy = F.noise1(t * 8, 2) * shake;
      const k = F.ease.sine(F.clamp(lt / d));
      ctx.save(); F.cam(ctx, F.lerp(1100, 1120, k) + sx, F.lerp(540, 520, k) + sy, F.lerp(1.0, 1.14, k));
      nightRoom(ctx, t, 1);
      // the lamp stutters as the first whisper arrives, then the room goes cold
      const fl = t > w3.start - 0.9 && t < w3.start - 0.1 ? (Math.sin(t * 90) > 0.2 ? 0.9 : 0) : 0;
      lamp(ctx, 0.7 * (1 - F.seg(t, w3.start - 0.2, w3.start + 0.6) * 0.75), fl);
      const cold = F.seg(t, w3.start - 0.4, w3.start + 1.0);
      ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = F.mixc('#ffffff', '#6a70c8', cold); ctx.fillRect(0, 0, W, H); ctx.restore();
      // the shadow walks in from the window corner
      const sh = F.seg(t, c.shadow - 0.3, c.ears + 1.2);
      shadow(ctx, F.lerp(380, 760, F.ease.inOut(sh)), 900, F.lerp(0.75, 1.05, sh), F.smooth(t, c.shadow - 0.4, c.shadow + 0.8), t);
      const ears = F.ease.inOut(F.seg(t, c.ears - 0.05, c.ears + 0.45));
      F.drawSenja(ctx, 1165, 470, 1.15, { pose: ears > 0 ? 'ears' : 'rest', k: ears, tilt: 0.16 + 0.12 * ears, facing: -1, color: '#0b0a14', rim: F.mixc('#ffab6b', '#8a7dff', cold), rimW: 5, face: '#161424', armColor: '#2a2546' });
      ctx.drawImage(deskFg(1), 0, 0);
      // the whisper circles her head, then multiplies
      const base = wEnv(t, w3, 0.1, 4.5);
      const surge = F.seg(t, c.ears - 0.6, c.ears + 0.4) * (1 - F.seg(t, s1 - 0.6, 99));
      const n = 2 + Math.floor(3 * surge);
      for (let i = 0; i < n; i++) {
        const ang = t * (0.26 + i * 0.04) + i * 2.1, rr = 240 + i * 28 + F.noise1(t + i, 5) * 20;
        const a = (i < 2 ? base : surge) * (0.32 + 0.22 * Math.sin(t * 1.6 + i));
        F.drawWhisper(ctx, 1080 + Math.cos(ang) * rr, 360 + Math.sin(ang) * rr * 0.45, 0.42 + 0.08 * (i % 3), a, '#ffb8c8', 'rose', Math.sin(ang) * 0.12);
      }
      ctx.restore();
      voiceNotes(ctx, t, lt, d);
    },
  };

  // ------------------------------------------------------------------ hospital
  // a figure seen from behind, walking (feet at y)
  function walker(ctx, x, y, h, phase, hijab, lean = 0, tail = false) {
    const step = Math.sin(phase), bob = Math.abs(Math.cos(phase)) * h * 0.014;
    ctx.save(); ctx.translate(x, y - bob); ctx.rotate(lean);
    ctx.fillStyle = '#050509'; ctx.strokeStyle = '#050509'; ctx.lineCap = 'round'; ctx.lineWidth = h * 0.085;
    ctx.beginPath(); ctx.moveTo(-h * 0.04, -h * 0.46); ctx.lineTo(step * h * 0.1 - h * 0.03, 0); ctx.moveTo(h * 0.04, -h * 0.46); ctx.lineTo(-step * h * 0.1 + h * 0.03, 0); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, -h * 0.66, h * 0.135, h * 0.25, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(0, -h * 0.93, h * 0.075, 0, Math.PI * 2); ctx.fill();
    if (hijab) { ctx.beginPath(); ctx.moveTo(-h * 0.08, -h * 0.97); ctx.quadraticCurveTo(-h * 0.17, -h * 0.8, -h * 0.16, -h * 0.68);
      ctx.lineTo(h * 0.16, -h * 0.68); ctx.quadraticCurveTo(h * 0.17, -h * 0.8, h * 0.08, -h * 0.97); ctx.fill(); }
    if (tail) { ctx.beginPath(); ctx.ellipse(0, -h * 0.84, h * 0.028, h * 0.075, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }
  S.hospital = {
    bars: 1, trans: 0.35, transType: 'black',
    draw(ctx, t, lt, d) {
      const k = F.ease.sine(F.clamp(lt / d));
      ctx.save(); F.cam(ctx, F.lerp(960, 985, k), F.lerp(560, 600, k), F.lerp(1.0, 1.16, k));
      const bg = F.sprite('hospital', W, H, (g) => {
        sky(g, 0, 0, W, H, 1);
        g.fillStyle = '#05060f'; g.fillRect(0, 760, W, 320);
        // building
        g.fillStyle = '#0b0d1c'; g.fillRect(380, 520, 1160, 260); g.fillRect(820, 440, 300, 90);
        g.fillStyle = '#0e1124'; g.fillRect(360, 506, 1200, 18);
        const r = F.rng(31);
        for (let row = 0; row < 2; row++) for (let i = 0; i < 12; i++) {
          const x = 430 + i * 92, y = 570 + row * 96, lit = (row === 0 && i === 8) || (row === 1 && i === 3) || (row === 0 && i === 2);
          if (row === 1 && (i === 5 || i === 6)) continue; // the entrance
          g.fillStyle = lit ? '#f2c27a' : `rgba(40,48,80,${0.5 + r() * 0.3})`; g.fillRect(x, y, 46, 58);
          if (lit) F.glowDot(g, x + 23, y + 29, 90, '#f2b56b', 0.4);
        }
        // the entrance: a lit doorway under an awning, a path leading to it
        g.fillStyle = '#ffd59a'; g.fillRect(926, 668, 88, 112);
        F.glowDot(g, 970, 724, 260, '#ffc27a', 0.55);
        g.fillStyle = '#090b18'; g.fillRect(890, 650, 160, 16);
        const path = g.createLinearGradient(0, 780, 0, 1080); path.addColorStop(0, 'rgba(255,200,130,0.22)'); path.addColorStop(1, 'rgba(255,200,130,0)');
        g.fillStyle = path; g.beginPath(); g.moveTo(930, 780); g.lineTo(1010, 780); g.lineTo(1240, 1080); g.lineTo(700, 1080); g.closePath(); g.fill();
        // trees
        for (let i = 0; i < 7; i++) { const x = 120 + i * 270 + (i > 2 ? 520 : 0); if (x > W) break; g.fillStyle = '#04050c'; g.beginPath(); g.ellipse(x, 700, 90, 150, 0, 0, Math.PI * 2); g.fill(); g.fillRect(x - 8, 700, 16, 120); }
        // gate
        g.strokeStyle = '#1a1d34'; g.lineWidth = 6; for (let i = 0; i < 26; i++) { g.beginPath(); g.moveTo(140 + i * 24, 900); g.lineTo(140 + i * 24, 780); g.stroke(); }
      });
      ctx.drawImage(bg, 0, 0);
      // her family walks her to the door
      const s0 = t - lt, wk = F.seg(t, s0 - 0.4, s0 + d + 0.6), ph = t * 5.2;
      const by = F.lerp(1010, 905, wk), bh = F.lerp(178, 126, wk), bx = F.lerp(1000, 975, wk);
      walker(ctx, bx - bh * 0.42, by + 4, bh * 1.04, ph + 1.6, false, 0.05);
      walker(ctx, bx, by, bh * 0.94, ph + 0.4, false, -0.03, true); // Senja, between them
      walker(ctx, bx + bh * 0.4, by + 2, bh * 0.98, ph, true, -0.06);
      // fog and rain
      const fog = F.sprite('fogBlob', 700, 220, (g) => { g.filter = 'blur(30px)'; g.fillStyle = 'rgba(150,160,205,0.5)'; g.beginPath(); g.ellipse(350, 110, 280, 60, 0, 0, Math.PI * 2); g.fill(); });
      ctx.save(); ctx.globalAlpha = 0.22;
      for (let i = 0; i < 6; i++) { const x = ((i * 410 + t * (14 + i * 5)) % 2600) - 600, y = 700 + (i % 3) * 70; ctx.drawImage(fog, x, y); }
      ctx.restore();
      ctx.restore();
      ctx.save(); ctx.strokeStyle = 'rgba(200,210,255,0.16)'; ctx.lineWidth = 1.2; ctx.beginPath();
      for (let i = 0; i < 120; i++) {
        const x = F.hash(i * 3.7) * (W + 200) - 100, sp = 1100 + 500 * F.hash(i * 1.3), y = ((t * sp + F.hash(i * 9.1) * 3000) % (H + 200)) - 100;
        ctx.moveTo(x + y * 0.12, y); ctx.lineTo(x + y * 0.12 + 5, y + 34);
      }
      ctx.stroke(); ctx.restore();
    },
  };

  // ------------------------------------------------------------------ data: 24 million
  const DOTS = (() => {
    const r = F.rng(41), cols = 80, rows = 30, out = [];
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      out.push({ x: 960 + (i - (cols - 1) / 2) * 19, y: 600 + (j - (rows - 1) / 2) * 15, v: r() < 0.7, res: r() < 0.3, d: Math.hypot(i - 39.5, (j - 14.5) * 1.3), ph: r() * 6 });
    }
    return out;
  })();
  S.data = {
    bars: 1, trans: 0.8,
    draw(ctx, t, lt, d) {
      ctx.fillStyle = '#05060f'; ctx.fillRect(0, 0, W, H);
      const z = F.lerp(3.2, 1.0, F.ease.inOut(F.seg(t, F.TL.shots.find((s) => s.name === 'data').start, C().millions + 0.4)));
      ctx.save(); F.cam(ctx, 960, 600, z);
      const reveal = F.seg(t, C().millions - 0.9, C().millions + 1.6) * 60;
      const sv = F.seg(t, C().seven, C().seven + 0.8), tr = F.seg(t, C().three, C().three + 0.8);
      for (const p of DOTS) {
        const on = p.d < 0.5 ? 1 : F.clamp((reveal - p.d) / 4);
        if (on <= 0) continue;
        let col = '#efe6d2', a = 0.55 * on;
        if (p.v && sv > 0) { col = F.mixc('#efe6d2', P.rose, sv); }
        if (p.res && tr > 0) { col = F.mixc(col.startsWith('#') ? col : '#ff6b81', P.amber, tr); a = 0.55 + 0.35 * tr; }
        ctx.fillStyle = col.startsWith('#') ? F.rgba(col, a) : col.replace(/[\d.]+\)$/, a + ')');
        ctx.beginPath(); ctx.arc(p.x, p.y, 3.1, 0, Math.PI * 2); ctx.fill();
        if (p.v && sv > 0 && !tr) {
          const ph = ((t * 0.9 + p.ph) % 1);
          ctx.strokeStyle = F.rgba(P.rose, 0.35 * (1 - ph) * sv); ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(p.x, p.y, 3 + ph * 7, 0, Math.PI * 2); ctx.stroke();
        }
      }
      // her dot
      const hx = DOTS[14 * 80 + 40];
      F.glowDot(ctx, hx.x, hx.y, 28, P.gold, 0.9);
      ctx.strokeStyle = F.rgba(P.gold, 0.9); ctx.lineWidth = 2 / z; ctx.beginPath(); ctx.arc(hx.x, hx.y, 11, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
      const l15 = F.TL.lines.find((l) => l.id === 'L14'); // 'She is not alone.'
      F.text(ctx, 'Senja', 960, 470 - (1 - F.seg(t, l15.start, l15.start + 0.6)) * 10, { family: 'Fraunces', style: 'italic', size: 30, align: 'center', color: P.gold, alpha: F.pulse(t, l15.start, 0.5, 0.8, 0.6) });
      // numbers
      const m = F.seg(t, C().millions, C().millions + 1.6);
      if (m > 0) {
        const n = Math.round(24000000 * F.ease.out(m));
        F.text(ctx, n.toLocaleString('en-US'), 960, 250, { family: 'Fraunces', size: 116, weight: 600, align: 'center', color: P.cream, alpha: F.seg(t, C().millions, C().millions + 0.3) });
        F.text(ctx, 'people live with schizophrenia', 960, 300, { size: 26, align: 'center', color: 'rgba(240,236,228,0.8)', alpha: F.seg(t, C().millions + 0.4, C().millions + 0.9) });
      }
      F.text(ctx, '~7 in 10 hear voices', 560, 880, { size: 38, weight: 600, align: 'center', color: P.rose, alpha: F.seg(t, C().seven, C().seven + 0.5) });
      F.text(ctx, 'up to 3 in 10: medicine is not enough', 1360, 880, { size: 38, weight: 600, align: 'center', color: P.amber, alpha: F.seg(t, C().three, C().three + 0.5) });
      F.text(ctx, '1 dot = 10,000 people · WHO 2022 · Indonesia: 7 per 1,000 (Riskesdas 2018)', 960, 935, { family: 'JetBrains Mono', size: 15, align: 'center', color: 'rgba(200,198,220,0.55)', alpha: F.seg(t, C().millions + 1, C().millions + 1.6) });
    },
  };
})();
