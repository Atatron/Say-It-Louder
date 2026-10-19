// VI · Imagine — Senja with You, Yourself (clearly labelled: imagined scenario, simulated signal).
(function () {
  const F = window.F, P = F.PAL, W = F.W, H = F.H;
  const S = (F.SHOTS = F.SHOTS || {});
  const C = () => F.C;

  const SX = 760, SY = 470, SS = 1.15; // Senja, facing right toward the window light
  const RP = { x: 260, y: 150 };
  function room() {
    return F.sprite('imagineRoom', W + RP.x * 2, H + RP.y * 2, (g) => {
      g.translate(RP.x, RP.y);
      const wall = g.createLinearGradient(-RP.x, 0, W + RP.x, 0);
      wall.addColorStop(0, '#2a1b33'); wall.addColorStop(0.55, '#4a2c45'); wall.addColorStop(1, '#8a4a4c');
      g.fillStyle = wall; g.fillRect(-RP.x, -RP.y, W + RP.x * 2, H + RP.y * 2);
      g.fillStyle = '#20141f'; g.fillRect(-RP.x, 880, W + RP.x * 2, 200 + RP.y);
      // window light falling across the wall from the right
      g.save(); g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 2; i++) {
        const x0 = 1900 - i * 260, gr = g.createLinearGradient(x0, 200, x0 - 900, 800);
        gr.addColorStop(0, 'rgba(255,170,110,0.28)'); gr.addColorStop(1, 'rgba(255,170,110,0)');
        g.fillStyle = gr; g.beginPath(); g.moveTo(x0, 160); g.lineTo(x0 + 140, 160); g.lineTo(x0 - 520, 900); g.lineTo(x0 - 820, 900); g.closePath(); g.fill();
      }
      g.restore();
      // her day-three drawing, pinned to the wall
      g.save(); g.translate(990, 300); g.rotate(0.03);
      g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(-122, -82, 258, 182);
      g.fillStyle = '#f3ecdc'; g.fillRect(-130, -92, 258, 182);
      g.scale(0.3, 0.3); g.translate(-430, -304); F.drawDay(g, 3, 1, 0);
      g.restore();
      g.fillStyle = '#c0392b'; g.beginPath(); g.arc(990, 216, 7, 0, Math.PI * 2); g.fill();
      // desk edge + crayons + mug
      g.fillStyle = '#3a2418'; g.fillRect(-RP.x, 860, W + RP.x * 2, 24); g.fillStyle = '#24160f'; g.fillRect(-RP.x, 884, W + RP.x * 2, 300);
      ['#2f7d43', '#f2b400', '#2f4fae', '#16141a'].forEach((c, i) => { g.save(); g.translate(1180 + i * 46, 846); g.rotate(-0.2 + i * 0.12);
        g.fillStyle = c; F.rrect(g, -50, -8, 100, 16, 4); g.fill(); g.fillStyle = 'rgba(255,255,255,0.6)'; g.fillRect(-20, -8, 40, 16); g.restore(); });
      g.fillStyle = '#6b7f8a'; g.fillRect(1500, 800, 46, 56);
    });
  }
  function hud(ctx, x, y, w, h, title, a, accent) {
    ctx.save(); ctx.globalAlpha *= a;
    F.rrect(ctx, x, y, w, h, 18); ctx.fillStyle = 'rgba(10,8,20,0.72)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.16)'; ctx.lineWidth = 1.5; ctx.stroke();
    F.text(ctx, title, x + 24, y + 38, { family: 'JetBrains Mono', size: 17, weight: 600, tracking: 2, color: accent });
    ctx.restore();
  }
  function phoneScreen(ctx, x, y, w, h, t, a) {
    if (a <= 0) return;
    const c = C();
    ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y);
    ctx.fillStyle = '#0d0f17'; F.rrect(ctx, -w / 2, -h / 2, w, h, 44); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.save(); F.rrect(ctx, -w / 2 + 14, -h / 2 + 16, w - 28, h - 32, 32); ctx.clip();
    ctx.fillStyle = '#f4f3fb'; ctx.fillRect(-w / 2, -h / 2, w, h);
    const L = -w / 2 + 40, R = w / 2 - 40, T = -h / 2 + 40;
    F.text(ctx, 'You, Yourself', L, T + 44, { family: 'Fraunces', size: 28, weight: 700, color: '#1d1a33' });
    const verdict = F.seg(t, c.press + 0.55, c.press + 0.9), coach = F.seg(t, c.hum - 0.6, c.hum - 0.2), diary = F.seg(t, c.diary - 0.1, c.diary + 0.4);
    if (diary > 0) {
      F.text(ctx, 'Diary', L, T + 110, { family: 'Fraunces', size: 42, weight: 700, color: '#1d1a33', alpha: diary });
      const rows = [['19:42', 'voice heard'], ['inside', 'active · 1.6 s'], ['outside', 'quiet · no speech'], ['helped', 'hummed 30 s'], ['after', 'calmer']];
      rows.forEach(([k, v], i) => { const yy = T + 176 + i * 56, a2 = diary * F.seg(t, c.diary + 0.2 + i * 0.25, c.diary + 0.5 + i * 0.25);
        ctx.fillStyle = `rgba(29,26,51,${0.06 * a2})`; F.rrect(ctx, L, yy - 34, R - L, 48, 12); ctx.fill();
        F.text(ctx, k, L + 18, yy - 4, { size: 21, weight: 600, color: '#5d5a7a', alpha: a2 }); F.text(ctx, v, R - 18, yy - 4, { size: 23, weight: 700, align: 'right', color: '#1d1a33', alpha: a2 }); });
      const sa = diary * F.seg(t, c.diary + 1.6, c.diary + 2.2);
      F.text(ctx, 'Weekly summary · for her care team', L, T + 478, { size: 19, weight: 600, color: '#5b4ba0', alpha: sa });
      [5, 6, 4, 4, 3, 2, 2].forEach((v, i) => { ctx.fillStyle = `rgba(91,75,160,${sa})`; F.rrect(ctx, L + i * 44, T + 600 - v * 14, 30, v * 14, 6); ctx.fill(); });
      F.text(ctx, 'simulated data', R, T + 640, { family: 'JetBrains Mono', size: 15, align: 'right', color: '#8a87a8', alpha: sa });
    } else if (coach > 0) {
      const k = F.seg(t, c.hum, c.diary - 0.2);
      F.text(ctx, 'Hum coach', L, T + 110, { family: 'Fraunces', size: 42, weight: 700, color: '#1d1a33', alpha: coach });
      F.text(ctx, 'Hum one soft note.', L, T + 156, { size: 24, color: '#5d5a7a', alpha: coach });
      ctx.save(); ctx.globalAlpha *= coach; ctx.translate(0, T + 390);
      ctx.strokeStyle = '#e8e6f4'; ctx.lineWidth = 22; ctx.beginPath(); ctx.arc(0, 0, 120, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = '#f5c04e'; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(0, 0, 120, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k); ctx.stroke();
      F.text(ctx, '0:' + String(Math.max(0, Math.round(30 - 30 * k))).padStart(2, '0'), 0, 22, { family: 'Fraunces', size: 64, weight: 600, align: 'center', color: '#1d1a33' });
      ctx.restore();
    } else {
      // live trace + the button
      F.text(ctx, 'Inside · lip muscle', L, T + 96, { size: 20, weight: 600, color: '#5d5a7a' });
      ctx.fillStyle = '#efeef7'; F.rrect(ctx, L, T + 112, R - L, 170, 16); ctx.fill();
      ctx.save(); ctx.beginPath(); ctx.rect(L, T + 112, R - L, 170); ctx.clip(); ctx.strokeStyle = '#5b4ba0'; ctx.lineWidth = 3; ctx.beginPath();
      for (let i = 0; i <= 120; i++) { const u = i / 120, tt = t - 3 + u * 3; const on = F.seg(tt, c.emg, c.emg + 0.2) * (1 - F.seg(tt, c.taps + 0.4, c.taps + 0.8));
        const v = 0.15 + 0.06 * F.noise1(tt * 25, 2) + on * (0.45 + 0.08 * F.noise1(tt * 9, 3)); const px = L + u * (R - L), py = T + 272 - v * 190; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
      ctx.stroke(); ctx.restore();
      ctx.strokeStyle = 'rgba(220,60,80,0.8)'; ctx.setLineDash([8, 6]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(L, T + 212); ctx.lineTo(R, T + 212); ctx.stroke(); ctx.setLineDash([]);
      const pr = F.pulse(t, c.press + 0.3, 0.06, 0.15, 0.3);
      ctx.fillStyle = '#f5c04e'; F.rrect(ctx, L, T + 310 + pr * 3, R - L, 80, 18); ctx.fill();
      F.text(ctx, 'I hear a voice', 0, T + 361 + pr * 3, { size: 30, weight: 700, align: 'center', color: '#2a1c00' });
      if (pr > 0) { ctx.strokeStyle = `rgba(91,75,160,${pr})`; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(30, T + 350, 30 + 40 * (1 - pr), 0, Math.PI * 2); ctx.stroke(); }
      if (verdict > 0) {
        ctx.save(); ctx.globalAlpha *= verdict; ctx.translate(0, (1 - verdict) * 30);
        ctx.fillStyle = '#1d1a33'; F.rrect(ctx, L - 10, T + 418, R - L + 20, 250, 22); ctx.fill();
        F.text(ctx, 'Inside: active · Outside: no speech', L + 14, T + 458, { size: 17, weight: 600, color: '#f5c04e' });
        F.text(ctx, 'Probably your own', L + 14, T + 510, { family: 'Fraunces', size: 34, weight: 600, color: '#fff' });
        F.text(ctx, 'inner speech.', L + 14, T + 552, { family: 'Fraunces', size: 34, weight: 600, color: '#fff' });
        F.text(ctx, 'Try humming one soft note', L + 14, T + 602, { size: 20, color: '#f5c04e' });
        F.text(ctx, 'for 30 seconds.', L + 14, T + 630, { size: 20, color: '#f5c04e' });
        ctx.restore();
      }
    }
    ctx.restore(); ctx.restore();
  }

  S.imagine = {
    bars: 1, trans: 1.0, grain: 0.05,
    draw(ctx, t, lt, d) {
      const c = C(), s0 = t - lt;
      const hum = F.seg(t, c.hum, c.hum + 2.2), warm = F.seg(t, c.hum, c.diary);
      const k = F.ease.sine(F.clamp(lt / d));
      const shake = F.seg(t, c.emg - 0.6, c.taps) * (1 - F.seg(t, c.taps, c.taps + 0.4)) * 2.2;
      ctx.save(); F.cam(ctx, F.lerp(860, 900, k) + F.noise1(t * 8, 1) * shake, F.lerp(560, 540, k), F.lerp(1.06, 1.16, k));
      ctx.drawImage(room(), -RP.x, -RP.y);
      // the shadow behind her back, until she hums
      const sh = F.seg(t, c.emg - 1.6, c.emg) * (1 - F.seg(t, c.hum + 0.4, c.hum + 2.2));
      F.shadowFigure(ctx, 330, 900, 0.95, 0.75 * sh, t);
      const tilt = 0.06 - 0.1 * F.ease.inOut(F.seg(t, c.hum - 0.4, c.hum + 0.3)) * (1 - F.seg(t, c.diary, c.diary + 1));
      const led = 0.35 + 0.35 * Math.sin(t * 3) + 0.6 * F.pulse(t, c.taps, 0.03, 0.08, 0.15) + 0.6 * F.pulse(t, c.taps + 0.27, 0.03, 0.08, 0.15);
      F.drawSenja(ctx, SX, SY, SS, { pose: 'phone', k: 1, tilt, facing: 1, color: '#1a1220', rim: F.mixc('#ffb27a', '#ffd38a', warm), rimW: 5, face: '#2c1f2a', sensor: true, led: F.clamp(led), armColor: '#21182a', eyes: hum > 0 && t < c.diary ? 'closed' : 'open' });
      // her phone, in her hand
      const hp = [SX + 176 * SS, SY + 226 * SS];
      ctx.save(); ctx.translate(hp[0], hp[1]); ctx.rotate(-0.35);
      ctx.fillStyle = '#0d0f17'; F.rrect(ctx, -22, -40, 44, 80, 7); ctx.fill(); ctx.fillStyle = '#e9e8f6'; F.rrect(ctx, -18, -35, 36, 70, 5); ctx.fill();
      ctx.restore();
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; F.glowDot(ctx, hp[0], hp[1] - 30, 160, '#b9c2ff', 0.18); ctx.restore();
      // the whisper returns
      const w4 = F.TL.whispers.find((w) => w.id === 'w4');
      const wa = F.seg(t, w4.start - 0.1, w4.start + 0.3) * (1 - F.seg(t, c.hum + 0.2, c.hum + 1.6));
      const shiver = F.pulse(t, c.taps, 0.05, 0.4, 0.3) * 6;
      for (let i = 0; i < 4; i++) {
        const ang = t * (0.3 + i * 0.05) + i * 1.9, rr = 210 + i * 30;
        const x = SX + 20 + Math.cos(ang) * rr + F.noise1(t * 20 + i, 3) * shiver, y = SY - 40 + Math.sin(ang) * rr * 0.42;
        F.drawWhisper(ctx, x, y, 0.42 + 0.06 * (i % 2), wa * (0.45 + 0.25 * Math.sin(t * 2 + i)), '#ffb8c8', 'rose', Math.sin(ang) * 0.1);
      }
      // dissolving into gold
      if (hum > 0 && hum < 1) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 120; i++) {
          const a0 = F.hash(i) * Math.PI * 2, r0 = 200 + F.hash(i + 9) * 140;
          const x = SX + 20 + Math.cos(a0) * r0 + hum * 140 * F.hash(i + 2), y = SY - 40 + Math.sin(a0) * r0 * 0.42 - hum * 260 * F.hash(i + 5);
          ctx.fillStyle = `rgba(255,214,140,${0.75 * Math.sin(hum * Math.PI) * F.hash(i + 7)})`; ctx.beginPath(); ctx.arc(x, y, 1.5 + 2.5 * F.hash(i + 3), 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
      }
      // the hum: golden waves from her lips
      const humOn = F.seg(t, c.hum, c.hum + 0.3) * (1 - F.seg(t, c.hum + 2.2, c.hum + 2.9));
      if (humOn > 0) {
        const lp = F.senjaHeadPoint(F.SENJA_ANCHORS.lips, tilt), lx = SX + lp[0] * SS + 10, ly = SY + lp[1] * SS;
        for (let i = 0; i < 6; i++) { const ph = ((t - c.hum) * 0.9 + i / 6) % 1;
          ctx.strokeStyle = `rgba(255,200,110,${humOn * 0.75 * (1 - ph)})`; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(lx, ly, 20 + ph * 280, -0.55, 0.55); ctx.stroke(); }
      }
      // two taps from the collar pod
      const cp = [SX + F.SENJA_ANCHORS.collar[0] * SS + 10, SY + F.SENJA_ANCHORS.collar[1] * SS - 2];
      for (const tt of [c.taps, c.taps + 0.27]) {
        const q = F.seg(t, tt, tt + 0.9);
        if (q > 0 && q < 1) { ctx.strokeStyle = `rgba(63,192,174,${0.9 * (1 - q)})`; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(cp[0], cp[1], 14 + q * 110, 0, Math.PI * 2); ctx.stroke(); }
      }
      const tp = F.pulse(t, c.taps + 0.1, 0.2, 1.2, 0.5);
      F.text(ctx, 'tap · tap', cp[0] + 60, cp[1] + 70, { family: 'JetBrains Mono', size: 22, weight: 600, color: P.teal, alpha: tp });
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; F.glowDot(ctx, 1500, 400, 900, '#ffb070', 0.14 + 0.16 * warm); ctx.restore();
      ctx.restore();

      // HUD: inside + outside, then the phone
      const toPhone = F.ease.inOut(F.seg(t, c.press - 0.1, c.press + 0.4));
      const ha = F.seg(t, c.emg - 0.1, c.emg + 0.4) * (1 - toPhone), hb = F.seg(t, c.quiet_room - 0.1, c.quiet_room + 0.4) * (1 - toPhone);
      if (ha > 0) {
        const x = 1330 + (1 - ha) * 60, y = 180;
        hud(ctx, x, y, 470, 250, 'INSIDE · LIP EMG', ha, P.teal);
        ctx.save(); ctx.globalAlpha *= ha; ctx.beginPath(); ctx.rect(x + 20, y + 56, 430, 150); ctx.clip();
        const thrY = y + 130; ctx.strokeStyle = 'rgba(255,107,129,0.8)'; ctx.setLineDash([7, 6]); ctx.beginPath(); ctx.moveTo(x + 20, thrY); ctx.lineTo(x + 450, thrY); ctx.stroke(); ctx.setLineDash([]);
        ctx.strokeStyle = P.teal; ctx.lineWidth = 2.6; ctx.beginPath();
        for (let i = 0; i <= 160; i++) { const u = i / 160, tt = t - 2.5 + u * 2.5; const on = F.seg(tt, c.emg, c.emg + 0.25);
          const v = 0.12 + 0.05 * F.noise1(tt * 30, 2) + on * (0.55 + 0.1 * F.noise1(tt * 11, 4)); const px = x + 24 + u * 422, py = y + 196 - v * 140; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
        ctx.stroke(); ctx.restore();
        const ok = F.seg(t, c.emg + 0.45, c.emg + 0.8);
        F.text(ctx, '✓ speech-motor · ≥ 300 ms', x + 446, y + 234, { size: 19, weight: 700, align: 'right', color: P.teal, alpha: ok * ha });
      }
      if (hb > 0) {
        const x = 1330 + (1 - hb) * 60, y = 450;
        hud(ctx, x, y, 470, 200, 'OUTSIDE · MICROPHONE', hb, P.amber);
        ctx.save(); ctx.globalAlpha *= hb;
        for (let i = 0; i < 28; i++) { const v = 0.12 + 0.08 * Math.abs(F.noise1(t * 5 + i, 7)); ctx.fillStyle = 'rgba(245,192,78,0.55)'; F.rrect(ctx, x + 26 + i * 15, y + 176 - v * 220, 10, v * 220, 3); ctx.fill(); }
        F.text(ctx, 'no speech', x + 446, y + 38, { size: 19, weight: 700, align: 'right', color: P.amber });
        ctx.restore();
      }
      phoneScreen(ctx, 1540, 540, 450, 740, t, toPhone);
      // honesty label
      F.text(ctx, 'IMAGINED SCENARIO  ·  SIMULATED SIGNAL', 90, 186, { family: 'JetBrains Mono', size: 17, weight: 600, tracking: 3, color: P.amber, alpha: 0.85 * F.seg(lt, 0.4, 1.2) });
    },
  };
})();
