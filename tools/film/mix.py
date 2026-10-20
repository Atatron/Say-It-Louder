"""Final mix: narrator + whispers + score + sound design → tools/film/build/master.wav (encode.py muxes it).

Run: /home/user/.venvs/film/bin/python tools/film/mix.py
"""
import json, os
import numpy as np
import soundfile as sf
import pyloudnorm as pyln
from scipy.linalg import solve_toeplitz
from scipy.signal import lfilter, resample
from dsp import S, SR, Bus, pan, hp, lp, bp, make_ir, reverb, follow, limiter, rng
import score

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
BUILD = os.path.join(HERE, "build")
TL = json.load(open(os.path.join(ROOT, "film", "timeline.json")))
END = TL["duration"]


def lpc_whisper(x, order=22, frame=0.03, hop=0.0075, seed=1):
    """Keep the vocal-tract shape (LPC), replace the voice with breath noise."""
    N, H = S(frame), S(hop)
    w = np.hanning(N)
    out = np.zeros(len(x) + N)
    norm = np.zeros(len(x) + N)
    r = rng(seed)
    for i in range(0, len(x) - N, H):
        seg = x[i:i + N] * w
        e = np.sqrt(np.mean(seg ** 2))
        if e < 1e-4:
            continue
        ac = np.correlate(seg, seg, "full")[N - 1:N + order]
        ac[0] *= 1.0001
        a = solve_toeplitz(ac[:order], ac[1:order + 1])
        y = lfilter([1.0], np.concatenate([[1.0], -a]), r.standard_normal(N))
        y *= e / (np.sqrt(np.mean(y ** 2)) + 1e-9)
        out[i:i + N] += y * w
        norm[i:i + N] += w * w
    return (out / np.maximum(norm, 1e-3))[: len(x)]


def shift(x, semitones):
    """Resample-style pitch shift (also changes formants: a slightly older, darker voice)."""
    if not semitones:
        return x
    return resample(x, int(len(x) * 2 ** (-semitones / 12)))


STYLE = {  # semitones, whisper mix, reverb wet, hall?, gain dB
    "far": (-1.0, 0.78, 0.8, True, -5.0),
    "near": (-1.0, 0.82, 0.5, True, -3.0),
    "close": (-1.0, 0.86, 0.28, False, -1.0),
    "warm": (-0.5, 0.35, 0.38, True, -3.0),
}


def whisper_bus():
    bus = Bus(END + 6)
    hall, room = make_ir(3.4, predelay=0.03, seed=51, bright=0.35), make_ir(0.9, seed=53, bright=0.5)
    for w in TL["whispers"]:
        dry, _ = sf.read(os.path.join(BUILD, w["id"] + ".wav"), dtype="float64")
        st, mixw, wet, use_hall, gdb = STYLE[w["style"]]
        v = shift(dry, st)
        wh = lpc_whisper(v, seed=hash(w["id"]) % 1000)
        y = mixw * hp(wh, 300) + (1 - mixw) * v
        y = bp(y, 180, 7500)
        y /= np.sqrt(np.mean(y ** 2)) + 1e-9
        y *= 10 ** ((-24 + gdb) / 20)
        if w["style"] == "close":  # doubled, slightly detuned, inside the head
            y2 = shift(y, 0.12)[: len(y)]
            st_sig = np.zeros((len(y) + S(0.02), 2))
            st_sig[: len(y), 0] += y
            st_sig[S(0.018): S(0.018) + len(y2), 1] += y2
            sig = st_sig * 0.85 + pan(np.pad(y, (0, S(0.02))), w["pan"]) * 0.3
        else:
            sig = pan(y, w["pan"])
        tail = np.zeros((S(4.0), 2))
        sig = np.vstack([sig, tail])
        sig = reverb(sig, hall if use_hall else room, wet)
        if w["style"] == "far":  # a reversed-reverb swell that breathes into the first word
            rv = reverb(pan(y, w["pan"]), hall, 1.0)[::-1][-S(1.4):] * 0.35
            bus.add(rv, w["start"] - 1.4 + 0.08)
        bus.add(sig, w["start"])
    return bus.x


def main():
    n = S(END + 4)
    narr, _ = sf.read(os.path.join(BUILD, "narration.wav"), dtype="float64")
    narr = np.pad(narr, (0, max(0, n - len(narr))))[:n]
    narr = hp(narr, 75, 2)
    voice = reverb(pan(narr, 0.0), make_ir(0.5, seed=61, bright=0.4), 0.07)

    music, sfx, amb = score.render()
    music, sfx, amb = (np.pad(x, ((0, max(0, n - len(x))), (0, 0)))[:n] for x in (music, sfx, amb))
    wh = whisper_bus()
    wh = np.pad(wh, ((0, max(0, n - len(wh))), (0, 0)))[:n]

    # stem levels (RMS over the parts where the stem plays)
    def active_rms_db(x):
        e = np.sqrt(np.convolve(np.mean(x ** 2, axis=1), np.ones(S(0.4)) / S(0.4), "same"))
        on = e > np.max(e) * 0.05
        return 20 * np.log10(np.sqrt(np.mean(np.mean(x[on] ** 2, axis=1))) + 1e-12)

    music *= 10 ** ((-25.0 - active_rms_db(music)) / 20)
    amb *= 10 ** ((-36.0 - active_rms_db(amb)) / 20)
    sfx *= 10 ** (-1.5 / 20)

    # duck music + ambience under the narrator and the whispers
    talk = follow(narr, release=0.35, hold=0.25) + follow(wh.mean(1), release=0.35, hold=0.2) * 1.5
    ref = np.percentile(talk[talk > 1e-4], 60)
    active = np.clip(talk / ref, 0, 1)
    k = np.exp(-1 / (0.12 * SR))
    active = lfilter([1 - k], [1, -k], active)
    music_g = 10 ** (-12.0 * active / 20)
    amb_g = 10 ** (-4.0 * active / 20)
    sfx_g = 10 ** (-4.0 * active / 20)
    mixd = voice + wh + music * music_g[:, None] + amb * amb_g[:, None] + sfx * sfx_g[:, None]
    mixd = hp(mixd, 28, 2)

    meter = pyln.Meter(SR)
    lufs = meter.integrated_loudness(mixd)
    mixd *= 10 ** ((-16.0 - lufs) / 20)
    mixd = limiter(mixd, ceiling=10 ** (-1.2 / 20))
    # fade out with the picture and end exactly where the film ends
    mixd = mixd[:S(END)]
    f = S(3.0)
    mixd[-f:] *= np.linspace(1, 0, f)[:, None] ** 2
    final_lufs = meter.integrated_loudness(mixd)

    out = os.path.join(BUILD, "master.wav")
    sf.write(out, mixd.astype(np.float32), SR, subtype="FLOAT")

    # report: what the ear hears (K-weighted) — narrator vs everything else, line by line
    g = 10 ** ((-16.0 - lufs) / 20)
    bg = (wh + music * music_g[:, None] + amb * amb_g[:, None] + sfx * sfx_g[:, None]) * g
    def kw(x):
        x = lfilter([1.53512485958697, -2.69169618940638, 1.19839281085285], [1, -1.69065929318241, 0.73248077421585], x, axis=0)
        return lfilter([1.0, -2.0, 1.0], [1, -1.99004745483398, 0.99007225036621], x, axis=0)
    kv, kb = kw(voice * g), kw(bg)
    def lk(x, a, b):
        return -0.691 + 10 * np.log10(np.mean(np.sum(x[S(a):S(b)] ** 2, axis=1)) + 1e-12)
    worst = []
    for ln in TL["lines"]:
        d = lk(kv, ln["start"], ln["end"]) - lk(kb, ln["start"], ln["end"])
        worst.append((d, ln["id"], ln["en"][:48]))
    worst.sort()
    print("voice-over-background (LU), worst 12:")
    for d, i, s in worst[:12]:
        print(f"   {d:5.1f}  {i}  {s}")
    print(f"   median {np.median([w[0] for w in worst]):.1f} LU")
    print(f"integrated {final_lufs:.1f} LUFS  peak {20 * np.log10(np.max(np.abs(mixd))):.1f} dBFS")
    for s in TL["shots"]:
        a, b = S(s["start"]), S(s["end"])
        def db(x):
            return 20 * np.log10(np.sqrt(np.mean(x[a:b] ** 2)) + 1e-12)
        g = 10 ** ((-16.0 - lufs) / 20)
        print(f"  {s['name']:<9} voice {db(voice * g):6.1f}  whisper {db(wh * g):6.1f}  "
              f"music {db(music * music_g[:, None] * g):6.1f}  sfx {db(sfx * g):6.1f}  amb {db(amb * g):6.1f}")


if __name__ == "__main__":
    main()
