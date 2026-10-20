"""Original score + sound design for the film, composed against film/timeline.json.

Key: D minor for Senja's story, F major (its relative) for hope and for the machine.
Returns stems: music (ducked under the narrator later), sfx, ambience.
"""
import json, os
import numpy as np
from dsp import (Bus, S, fade, midi, rng, piano, strings, bell, pluck, kick, sub, heartbeat, crickets, clock_ticks,
                 paper_slide, crayon, whoosh, boom, blip, chime, click, motor_tap, hum, tinnitus,
                 drone, reverse_swell, hiss_room, fluorescent, rain, footstep, pen, make_ir, reverb, lp)

HERE = os.path.dirname(os.path.abspath(__file__))
TL = json.load(open(os.path.join(HERE, "..", "..", "film", "timeline.json")))
C = TL["cues"]
SHOT = {s["name"]: s for s in TL["shots"]}
END = TL["duration"]

# chord: (left hand, right-hand tones for arpeggios)
CH = {
    "Dm": (["D2", "A2"], ["D3", "A3", "D4", "F4", "A4"]),
    "Bb": (["Bb1", "F2"], ["Bb2", "F3", "Bb3", "D4", "F4"]),
    "F": (["F2", "C3"], ["F3", "C4", "F4", "A4", "C5"]),
    "C": (["C2", "G2"], ["C3", "G3", "C4", "E4", "G4"]),
    "C/E": (["E2", "C3"], ["E3", "C4", "E4", "G4", "C5"]),
    "Gm": (["G1", "D2"], ["G2", "D3", "G3", "Bb3", "D4"]),
    "A": (["A1", "E2"], ["A2", "E3", "A3", "C#4", "E4"]),
    "F/A": (["A1", "F2"], ["A2", "F3", "A3", "C4", "F4"]),
    "Fadd9": (["F2", "C3"], ["F3", "C4", "G4", "A4", "C5"]),
}
PAD = {  # string voicings
    "Dm": ["D3", "A3", "D4", "F4"], "Bb": ["Bb2", "F3", "D4", "F4"], "F": ["F3", "C4", "F4", "A4"],
    "C": ["C3", "G3", "E4", "G4"], "C/E": ["E3", "C4", "E4", "G4"], "Gm": ["G2", "D3", "Bb3", "D4"],
    "A": ["A2", "E3", "C#4", "E4"], "F/A": ["A2", "F3", "C4", "F4"], "Fadd9": ["F3", "C4", "G4", "A4"],
}


def word_time(line_id, word, default):
    for ln in TL["lines"]:
        if ln["id"] == line_id:
            for w in ln["words"]:
                if w["w"].lower().strip(".,:;").startswith(word):
                    return w["s"]
    return default


def rolled(bus, t, chord, ring, vel=0.35, spread=0.055, lh_vel=None, top=4):
    lh, rh = CH[chord]
    for i, nm in enumerate(lh):
        bus.add(piano(nm, ring, lh_vel or vel), t + i * spread * 0.5, p=-0.25)
    for i, nm in enumerate(rh[:top]):
        bus.add(piano(nm, ring - 0.1, vel * 0.8), t + (i + 1) * spread, p=-0.1 + 0.08 * i)


def motif(bus, t, notes, gaps=0.6, vel=0.36, ring=1.6):
    for i, nm in enumerate(notes):
        if nm:
            bus.add(piano(nm, ring, vel * (1 - 0.06 * i)), t + i * gaps, p=0.15)


def pad(bus, t0, t1, chord, vel=0.5, att=1.4, rel=2.2, bright=2200, seed=3):
    bus.add(strings(PAD[chord], t1 - t0, att, rel, bright, seed=seed), t0, gain=vel)


def arp(bus, t0, t1, chord, step=0.3, vel=0.3, pattern=(0, 2, 1, 3, 2, 4, 3, 2), drop=0.0, detune=0.0,
        seed=0, octave=12):
    r = rng(seed)
    tones = [midi(n) + octave for n in CH[chord][1]]
    i, t = 0, t0
    while t < t1 - 0.04:
        if r.random() >= drop:
            m = tones[pattern[i % len(pattern)]] + (r.uniform(-detune, detune) if detune else 0)
            bus.add(pluck(m, vel * (1.0 if i % 2 == 0 else 0.8), seed=i), t, p=0.35 * np.sin(i * 0.9))
        i += 1
        t += step


def build():
    music, sfx, amb = Bus(END + 6), Bus(END + 6), Bus(END + 6)

    # ------------------------------------------------ Prologue: dusk, crickets, the first whispers
    amb.add(fade(crickets(SHOT["open"]["end"] + 0.2, seed=5), 1.5, 1.6), 0.0, gain=1.0)
    music.add(piano("D2", 3.5, 0.32), C["card"] - 0.15, p=-0.2)
    music.add(piano("D3", 3.5, 0.22), C["card"] - 0.1, p=0.1)
    music.add(drone(["D2"], 6.0, vel=0.12, att=3.0), 1.0)

    # ------------------------------------------------ I · Senja (felt piano, rubato, D minor)
    a0 = SHOT["class"]["start"]
    bars = [(a0, "Dm", ["A4", "G4", "F4"]),
            (a0 + 3.6, "Bb", ["F4", "D4", "C4"]),
            (SHOT["family"]["start"], "F", ["C5", "A4", "G4"]),
            (C["father"], "Gm", ["Bb4", None, "A4"]),
            (SHOT["weight"]["start"], "Dm", ["A4", "G4", "F4", "E4"]),
            (SHOT["weight"]["start"] + 2.5, "Bb", ["D4", None, "C4"])]
    for i, (t, chord, mel) in enumerate(bars):
        nxt = bars[i + 1][0] if i + 1 < len(bars) else C["alone"]
        rolled(music, t, chord, nxt - t + 0.4, vel=0.34 if chord != "Gm" else 0.3)
        motif(music, t + (1.45 if i == 0 else 0.85), mel, gaps=0.62, vel=0.27 if i == 0 else 0.33)
    music.add(piano("D5", 3.5, 0.24), C["alone"] + 0.05, p=0.2)  # "no one to tell": one note
    music.add(piano("A3", 3.0, 0.14), C["alone"] + 0.9, p=-0.2)
    # room: a clock that becomes the only sound
    amb.add(clock_ticks(C["alone"] + 2.6 - a0), a0, gain=0.9, p=0.35)
    amb.add(hiss_room(SHOT["weight"]["end"] - a0, 0.012), a0)
    sfx.add(reverse_swell(1.4, vel=0.16), C["father"] - 1.0)
    for k, (t, d) in enumerate(((a0 + 1.0, 1.4), (a0 + 3.3, 0.9), (a0 + 5.2, 1.5))):  # her pen on the exam papers
        sfx.add(pen(d, seed=37 + k, vel=0.32), t, p=0.25)
    w0 = SHOT["weight"]["start"]
    for w, d in (("mother", w0 + 0.4), ("siblings", w0 + 1.6), ("students", w0 + 2.8)):
        tt = word_time("L07", w, d)
        sfx.add(sub("D1", 0.3, 0.16, rel=0.4), tt + 0.05)
        sfx.add(paper_slide(0.25, seed=int(tt * 10), vel=0.14), tt + 0.02, p=0.2)

    # ------------------------------------------------ II · The voice (no melody: drone, heart, tinnitus)
    v0, v1 = SHOT["voice"]["start"], SHOT["hospital"]["start"]
    music.add(drone(["D2", "Eb2"], v1 - v0 - 0.4, vel=0.18, att=3.5, rel=0.3), v0 + 0.2)
    music.add(strings(["D5", "Eb5"], C["ears"] - C["shadow"] + 1.2, att=2.5, rel=0.25, bright=4000, detune=14),
              C["shadow"], gain=0.09)
    bpm_t = v0 + 0.6
    while bpm_t < v1 - 0.55:
        prog = (bpm_t - v0) / (v1 - v0)
        sfx.add(heartbeat(0.18 + 0.14 * prog), bpm_t)
        bpm_t += 60.0 / (68 + 34 * prog)
    sfx.add(tinnitus(v1 - 0.45 - (C["shadow"] + 0.5), vel=0.008), C["shadow"] + 0.5, p=0.0)
    sfx.add(reverse_swell(2.0, vel=0.32), C["shadow"] - 1.6)
    amb.add(hiss_room(v1 - v0, 0.01), v0)
    # rain: muffled behind the classroom windows, then open air at the hospital
    r0, r1, h0_ = SHOT["weight"]["start"], SHOT["hospital"]["start"], SHOT["hospital"]["start"]
    indoor = lp(rain(r1 - r0 + 0.6, seed=33, vel=0.042, drops=30), 3200)
    ramp = np.clip((np.arange(len(indoor)) / 48000 - (v0 - r0 - 1.0)) / 2.0, 0, 1) * 0.3 + 0.55  # heavier once the voice starts
    amb.add(fade(indoor * ramp[:, None], 2.0, 0.4), r0, gain=1.0)
    outdoor = lp(rain(SHOT["data"]["start"] - h0_ + 0.8, seed=34, vel=0.026, drops=40), 6000)
    amb.add(fade(outdoor, 0.15, 1.2), h0_, gain=1.0)
    # hospital, outside at night: a heavy door far off, footsteps, a held low string
    h0, h1 = SHOT["hospital"]["start"], SHOT["data"]["start"]
    sfx.add(boom(0.22), h0 + 0.05)
    sfx.add(click(0.5, 900), h0 + 0.05)
    music.add(strings(["D2", "A2"], h1 - h0, att=1.2, rel=1.2, bright=900), h0, gain=0.45)
    for who, (off, pp) in enumerate(((0.0, -0.15), (0.21, 0.0), (0.39, 0.15))):  # three people walking her in
        ts = h0 + 0.3 + off
        while ts < h1 - 0.5:
            sfx.add(footstep(0.13, seed=35 + who * 7 + int(ts * 10)), ts, p=pp)
            ts += 0.6

    # ------------------------------------------------ data: solemn strings, Dm → Bb → Gm → A (unresolved)
    d0 = SHOT["data"]["start"]
    seq = [(d0, "Dm"), (C["millions"], "Bb"), (C["seven"], "Gm"), (C["three"], "A")]
    for i, (t, ch) in enumerate(seq):
        t1 = seq[i + 1][0] if i + 1 < len(seq) else SHOT["crayons"]["start"]
        pad(music, t, t1 + 0.3, ch, vel=0.55, att=0.9, rel=1.6, bright=1800, seed=10 + i)
        music.add(piano(CH[ch][0][0], t1 - t, 0.3), t, p=-0.2)
    sfx.add(boom(0.3), C["millions"])
    sfx.add(blip(660, 0.12), C["seven"] + 0.05, p=-0.3)
    sfx.add(blip(587, 0.12), C["three"] + 0.05, p=0.3)

    # ------------------------------------------------ III · Crayons (F major, music box, hope)
    c0 = SHOT["crayons"]["start"]
    cbars = [(c0, "F"), (C["box"], "C/E"), (C["day1"], "Dm"), (C["day2"], "Bb"), (C["day3"], "F/A"),
             (C["day3"] + 3.0, "C"), (C["chart"], "F"), (C["inside_out"], "Bb"), (C["inside_out"] + 1.6, "C")]
    for i, (t, ch) in enumerate(cbars):
        t1 = cbars[i + 1][0] if i + 1 < len(cbars) else SHOT["science"]["start"]
        rolled(music, t, ch, t1 - t + 0.3, vel=0.3, top=3)
        pad(music, t, t1 + 0.2, ch, vel=0.28, att=1.6, rel=1.8, bright=2000, seed=20 + i)
    mb = [(C["box"] + 0.3, ["G5", "C6"]), (C["day1"] + 0.5, ["D5", "F5", "A5"]), (C["day2"] + 0.5, ["F5", "D5", "Bb4"]),
          (C["day3"] + 0.5, ["A5", "G5", "F5"]), (C["day3"] + 3.2, ["G5", "E5", "C5"])]
    for t, notes in mb:
        for k, nm in enumerate(notes):
            music.add(bell(nm, 0.3), t + k * 0.58, p=0.3)
    for k, nm in enumerate(["A5", "C6", "D6", "F6"]):  # the chart: 9 → 5 → 3 → 1, rising light
        music.add(bell(nm, 0.36, 2.2), C["chart"] + 0.15 + k * 0.5, p=-0.2 + 0.15 * k)
    sfx.add(paper_slide(0.6, 41, 0.45), c0 + 0.1, p=-0.1)
    sfx.add(paper_slide(0.45, 42, 0.5), C["box"] + 0.05, p=0.3)
    for k in range(9):  # crayons rattle in the box
        sfx.add(click(0.12 + 0.05 * (k % 3), 2600 + 300 * (k % 4)), C["box"] + 0.35 + k * 0.045, p=0.3)
    draws = [(C["day1"] + 0.45, C["day2"] - 0.25, 7.5, 0.26), (C["day2"] + 0.55, C["day3"] - 0.25, 5.0, 0.2),
             (C["day3"] + 0.55, C["chart"] - 0.3, 4.2, 0.22)]
    for k, (t, t1, rate, vel) in enumerate(draws):
        sfx.add(crayon(t1 - t, seed=50 + k, rate=rate, vel=vel), t, p=0.1)
    for cue in ("day2", "day3"):
        sfx.add(paper_slide(0.5, 60 + len(cue), 0.4), C[cue] - 0.05, p=-0.2)
    sfx.add(whoosh(1.3, 61, True, 0.35), C["inside_out"] + 1.7)

    # ------------------------------------------------ IV · The science (100 bpm glass arpeggio)
    s0 = SHOT["science"]["start"]
    sci = [(s0, "F", 0.0), (C["copy"], "C", 0.0), (C["weak"], "Dm", 0.4), (C["someone"], "Bb", 0.35),
           (C["lips"], "C", 0.0)]
    for i, (t, ch, drop) in enumerate(sci):
        t1 = sci[i + 1][0] if i + 1 < len(sci) else SHOT["title"]["start"]
        arp(music, t, t1, ch, step=0.3, vel=0.26, drop=drop, detune=0.35 if drop else 0, seed=70 + i)
        pad(music, t, t1 + 0.2, ch, vel=0.3, att=1.0, rel=1.2, bright=1600, seed=30 + i)
    sfx.add(whoosh(0.6, 71, True, 0.25), C["copy"] + 1.0, p=0.3)
    sfx.add(blip(1760, 0.08, 0.12), C["copy"] + 3.3, p=0.4)
    for k in range(6):  # broken copy: stutters
        sfx.add(blip(1760 - 140 * k, 0.05, 0.06), C["weak"] + 1.6 + k * 0.11, p=0.4)
    for k in range(14):  # lip EMG crackle
        sfx.add(click(0.08, 2000 + 140 * k), C["lips"] + 0.8 + k * 0.07 + 0.03 * np.sin(k), p=0.15)

    # ------------------------------------------------ V · Title + the machine (groove)
    t0 = SHOT["title"]["start"]
    sfx.add(whoosh(1.0, 81, True, 0.45), t0 - 0.95)
    sfx.add(boom(0.3), t0)
    music.add(strings(PAD["Fadd9"] + ["C5"], SHOT["machine"]["start"] - t0 + 0.8, att=0.6, rel=2.5, bright=3200),
              t0, gain=0.42)
    for k, nm in enumerate(["F6", "A6", "C7", "G6"]):
        music.add(bell(nm, 0.12, 2.4), t0 + 0.2 + k * 0.33, p=-0.4 + 0.25 * k)
    rolled(music, t0 + 0.05, "Fadd9", 3.8, vel=0.32)

    g0, g1 = SHOT["machine"]["start"], C["verdict"] + 0.05
    beat = 0.6
    loop = ["F", "C", "Dm", "Bb"]
    t, b = g0, 0
    while t < g1:
        ch = loop[(b // 8) % 4]
        music.add(kick(0.26 if b % 2 == 0 else 0.17), t)
        if b % 8 == 0:
            music.add(sub(CH[ch][0][0], beat * 8 - 0.1, 0.16), t)
            pad(music, t, min(t + beat * 8, g1 + 0.6), ch, vel=0.22, att=0.6, rel=1.0, bright=2400, seed=90 + b)
        t += beat
        b += 1
    arp_t, k = g0, 0
    while arp_t < g1:
        ch = loop[int((arp_t - g0) / (beat * 8)) % 4]
        arp(music, arp_t, min(arp_t + beat * 8, g1), ch, step=beat / 2, vel=0.22, seed=100 + k,
            pattern=(0, 2, 4, 3, 1, 3, 2, 4))
        arp_t += beat * 8
        k += 1
    for cue, f in (("electrodes", 1320), ("myoware", 1480), ("esp32", 1760)):
        sfx.add(blip(f, 0.16), C[cue] + 0.1, p=-0.2)
    tb = C["esp32"] + 1.3
    while tb < SHOT["detector"]["start"] - 0.3:  # BLE notifications, 10 per second
        sfx.add(click(0.07, 6500), tb, p=0.55)
        tb += 0.1
    # detector
    n_cal = S(2.6)
    tt = np.arange(n_cal) / 48000
    scan = np.sin(2 * np.pi * np.cumsum(520 + 160 * tt / 2.6) / 48000) * np.sin(np.pi * tt / 2.6) ** 2 * 0.05
    sfx.add(scan, C["calib"] + 0.1, p=0.0)
    for cue, dt in (("calib", 0.25), ("murmur", 0.25), ("swallow", 0.05), ("chew", 0.05)):  # the cursor's clicks
        sfx.add(click(0.3, 2200), C[cue] + dt, p=0.35)
    sfx.add(chime(("A5", "C6", "F6"), 0.15), C["murmur"] + 1.55, p=0.1)
    sfx.add(blip(220, 0.1, 0.25), C["swallow"] + 0.25, p=-0.1)
    for k in range(3):
        sfx.add(sub("A1", 0.12, 0.13, rel=0.1), C["chew"] + k * 0.32)
    sfx.add(blip(196, 0.09, 0.25), C["chew"] + 1.0, p=0.1)
    # outside
    sfx.add(click(0.35, 1200), C["mic"] + 0.05, p=0.4)
    sfx.add(whoosh(1.6, 91, False, 0.15), C["mic"] + 1.0, p=0.4)
    sfx.add(click(0.4, 900), C["norec"] + 0.1, p=0.0)
    sfx.add(click(0.3, 1400), C["norec"] + 0.16, p=0.0)
    v_end = SHOT["imagine"]["start"]
    music.add(strings(PAD["F"] + ["C5"], v_end - C["verdict"] + 0.2, att=0.4, rel=1.6, bright=2600),
              C["verdict"], gain=0.3)
    rolled(music, C["verdict"] + 0.02, "F", v_end - C["verdict"] + 0.6, vel=0.3)
    sfx.add(chime(("F5", "A5", "C6", "F6"), 0.13, 0.09), C["verdict"] - 0.25)

    # ------------------------------------------------ VI · Imagine
    i0, i1 = SHOT["imagine"]["start"], SHOT["promise"]["start"]
    amb.add(crickets(i1 - i0 + 0.5, seed=7, density=0.8), i0, gain=0.7)
    rolled(music, i0 + 0.1, "Dm", C["emg"] - i0, vel=0.28)
    motif(music, i0 + 0.9, ["A4", "G4", "F4"], vel=0.27)
    music.add(drone(["D2", "Eb2"], C["taps"] - C["emg"], vel=0.22, att=2.4, rel=0.2), C["emg"])
    music.add(strings(["D5", "Eb5"], C["taps"] - C["emg"] - 0.2, att=2.2, rel=0.25, bright=3800, detune=12),
              C["emg"] + 0.2, gain=0.18)
    for k in range(10):
        sfx.add(click(0.06, 1900 + 160 * k), C["emg"] + 0.3 + k * 0.09, p=0.1)
    sfx.add(click(0.45, 2400), C["press"] + 0.35, p=0.25)
    sfx.add(chime(("C6", "F6"), 0.18, 0.06), C["press"] + 0.75, p=0.25)
    sfx.add(motor_tap(0.65), C["taps"], p=0.05)
    sfx.add(motor_tap(0.65), C["taps"] + 0.27, p=0.05)
    # resolution: F major
    res = [(C["taps"] + 0.05, "F"), (C["hum"] - 0.2, "F"), (word_time("L47", "voice", C["hum"] + 2.4), "C/E"),
           (C["diary"], "Dm"), (C["diary"] + 2.1, "Bb")]
    for i, (t, ch) in enumerate(res):
        t1 = res[i + 1][0] if i + 1 < len(res) else i1
        pad(music, t, t1 + 0.3, ch, vel=0.45, att=0.9 if i else 0.25, rel=1.8, bright=2300, seed=120 + i)
        rolled(music, t, ch, t1 - t + 0.4, vel=0.27, top=3)
    sfx.add(hum(2.25, 220.0, 0.42), C["hum"], p=-0.05)
    sfx.add(whoosh(1.4, 131, False, 0.06), C["hum"] + 1.4, p=0.3)
    sfx.add(paper_slide(0.4, 133, 0.3), C["diary"] + 0.2, p=0.3)
    sfx.add(crayon(0.9, seed=134, rate=9, vel=0.25), C["diary"] + 0.6, p=0.3)

    # ------------------------------------------------ VII · The promise
    p0 = SHOT["promise"]["start"]
    pr = [(C["p1"], "Bb"), (C["p2"], "F"), (C["p3"], "C/E"), (C["p4"], "Dm"), (C["p4"] + 2.3, "C")]
    for i, (t, ch) in enumerate(pr):
        t1 = pr[i + 1][0] if i + 1 < len(pr) else SHOT["close"]["start"]
        rolled(music, t, ch, t1 - t + 0.5, vel=0.3, top=3)
        pad(music, t, t1 + 0.3, ch, vel=0.3, att=0.8, rel=1.5, bright=2000, seed=140 + i)
        sfx.add(click(0.12, 1800), t + 0.02, p=-0.3 + 0.2 * i)

    # ------------------------------------------------ Epilogue
    e0 = SHOT["close"]["start"]
    amb.add(crickets(END - e0 + 2, seed=9, density=0.7), e0, gain=0.55)
    ep = [(e0, "Dm", ["A4", "G4", "F4"]), (e0 + 2.2, "Bb", ["F4", "D4", None]),
          (TL["whispers"][-1]["start"] - 0.05, "F", ["C5", "A4", None]),
          (word_time("L53", "come", e0 + 4.3), "C", [None, "G4", "E4"])]
    for i, (t, ch, mel) in enumerate(ep):
        t1 = ep[i + 1][0] if i + 1 < len(ep) else SHOT["end"]["start"]
        rolled(music, t, ch, t1 - t + 0.4, vel=0.32)
        motif(music, t + 0.7, mel, vel=0.3)
        pad(music, t, t1 + 0.4, ch, vel=0.4, att=1.2, rel=1.8, bright=2200, seed=150 + i)
    fin = SHOT["end"]["start"]
    rolled(music, fin, "Fadd9", 6.5, vel=0.34, top=5)
    music.add(strings(PAD["Fadd9"] + ["C5", "F5"], 4.6, att=1.0, rel=2.4, bright=2400), fin, gain=0.6)
    music.add(bell("F6", 0.22, 2.6), fin + 1.6, p=0.3)
    music.add(bell("C6", 0.16, 2.6), fin + 2.4, p=-0.3)
    return music, sfx, amb


def render():
    music, sfx, amb = build()
    hall = make_ir(2.8, seed=41, bright=0.45)
    room = make_ir(1.1, seed=43, bright=0.6)
    m = reverb(music.x, hall, wet=0.42)
    s = reverb(sfx.x, room, wet=0.18)
    a = amb.x
    n = int((END + 4) * 48000)
    return m[:n], s[:n], a[:n]


if __name__ == "__main__":
    import soundfile as sf
    m, s, a = render()
    for name, x in (("music", m), ("sfx", s), ("amb", a)):
        sf.write(os.path.join(HERE, "build", f"{name}.wav"), x.astype(np.float32), 48000)
        print(name, "peak", round(float(np.max(np.abs(x))), 3), "rms dB", round(20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-12), 1))
