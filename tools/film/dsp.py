"""Small synthesis + DSP toolkit for the film score. Everything is generated, nothing sampled."""
from functools import lru_cache
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve, lfilter
from scipy.ndimage import maximum_filter1d

SR = 48000
_rng = np.random.default_rng(20240604)
NAMES = {"C": 0, "C#": 1, "Db": 1, "D": 2, "D#": 3, "Eb": 3, "E": 4, "F": 5, "F#": 6, "Gb": 6,
         "G": 7, "G#": 8, "Ab": 8, "A": 9, "A#": 10, "Bb": 10, "B": 11}


def rng(seed):
    return np.random.default_rng(seed)


def midi(name):
    """'D4' -> 62, 'Bb2' -> 46"""
    p, o = name[:-1], int(name[-1])
    return 12 * (o + 1) + NAMES[p]


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def S(sec):
    return int(round(sec * SR))


def tvec(n):
    return np.arange(n) / SR


def _sos(kind, f, order):
    return butter(order, f, kind, fs=SR, output="sos")


def lp(x, f, order=2):
    return sosfilt(_sos("low", min(f, SR / 2 - 100), order), x, axis=0)


def hp(x, f, order=2):
    return sosfilt(_sos("high", f, order), x, axis=0)


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, min(hi, SR / 2 - 100)], "band", fs=SR, output="sos"), x, axis=0)


def pan(mono, p=0.0):
    """Constant-power pan, p in [-1, 1] -> (n, 2)."""
    a = (p + 1) * np.pi / 4
    return np.stack([mono * np.cos(a), mono * np.sin(a)], axis=1)


class Bus:
    """A stereo track you can drop sounds into at a time."""

    def __init__(self, seconds):
        self.x = np.zeros((S(seconds), 2), np.float64)

    def add(self, sig, t, gain=1.0, p=0.0):
        if sig.ndim == 1:
            sig = pan(sig, p)
        i = S(t)
        if i < 0:
            sig, i = sig[-i:], 0
        n = min(len(sig), len(self.x) - i)
        if n > 0:
            self.x[i:i + n] += sig[:n] * gain


def fade(x, fin=0.0, fout=0.0):
    n = len(x)
    g = np.ones(n)
    a, b = S(fin), S(fout)
    if a:
        g[:a] = np.linspace(0, 1, a) ** 2
    if b:
        g[n - b:] = np.minimum(g[n - b:], np.linspace(1, 0, b) ** 2)
    return x * (g[:, None] if x.ndim == 2 else g)


def env_ar(n, att, rel, curve=2.0):
    """Attack/hold/release envelope across n samples."""
    t = np.arange(n) / SR
    dur = n / SR
    up = np.clip(t / max(att, 1e-4), 0, 1) ** curve
    down = np.clip((dur - t) / max(rel, 1e-4), 0, 1) ** curve
    return np.minimum(up, down)


def saw(freq, n=None):
    """Band-limited (polyBLEP) sawtooth. freq: scalar or per-sample array."""
    if np.isscalar(freq):
        freq = np.full(n, float(freq))
    dt = freq / SR
    ph = np.cumsum(dt) % 1.0
    y = 2 * ph - 1
    m = ph < dt
    x = ph[m] / dt[m]
    y[m] -= x + x - x * x - 1
    m = ph > 1 - dt
    x = (ph[m] - 1) / dt[m]
    y[m] -= x * x + x + x + 1
    return y


# ---------------------------------------------------------------- instruments

@lru_cache(maxsize=512)
def _piano(m, ring, vel):
    """Felt piano note: inharmonic partials, two detuned strings, two-stage decay, soft hammer."""
    f0 = mtof(m)
    tail = float(np.interp(m, [21, 60, 96], [5.0, 3.2, 1.6]))
    n = S(ring + tail)
    t = tvec(n)
    tau = float(np.interp(m, [21, 48, 72, 96], [9.0, 6.0, 3.2, 1.4]))
    B = float(np.interp(m, [21, 60, 96], [0.00008, 0.00035, 0.0012]))
    r = rng(m * 31 + int(vel * 100))
    out = np.zeros(n)
    bright = 0.10 + 0.22 * (1 - vel)  # softer = darker (felt)
    for k in range(1, 20):
        fk = k * f0 * np.sqrt(1 + B * k * k)
        if fk > 9000:
            break
        amp = (1 / k ** 1.15) * np.exp(-bright * 1.6 * (k - 1))
        tk = tau / (1 + 0.45 * (k - 1))
        dec = 0.62 * np.exp(-t / (tk * 0.22)) + 0.38 * np.exp(-t / tk)
        ph1, ph2 = r.uniform(0, 2 * np.pi, 2)
        det = 1 + 0.00045 * (1 + 0.3 * k)
        out += amp * dec * (np.sin(2 * np.pi * fk * t + ph1) + 0.55 * np.sin(2 * np.pi * fk * det * t + ph2))
    # damper after `ring`
    r0 = S(ring)
    out[r0:] *= np.exp(-(t[r0:] - ring) / 0.35)
    out *= np.minimum(1, t / 0.006)
    # felt hammer: a soft low thump
    hn = S(0.04)
    thump = lp(r.standard_normal(hn) * np.exp(-np.arange(hn) / S(0.008)), 700) * 0.35
    out[:hn] += thump
    return (out * vel * 0.32).astype(np.float64)


def piano(name_or_midi, ring=2.0, vel=0.5):
    m = midi(name_or_midi) if isinstance(name_or_midi, str) else name_or_midi
    return _piano(int(m), round(float(ring), 2), round(float(vel), 2))


def strings(notes, dur, att=1.4, rel=2.2, bright=2200, voices=5, detune=9.0, vib=0.0028, seed=3):
    """Ensemble pad from detuned band-limited saws, slow attack, vibrato."""
    n = S(dur + rel)
    t = tvec(n)
    r = rng(seed)
    out = np.zeros(n)
    for nm in notes:
        f = mtof(nm if isinstance(nm, int) else midi(nm))
        for v in range(voices):
            c = (v - (voices - 1) / 2) / max(1, (voices - 1) / 2) * detune
            vibr = 1 + vib * np.sin(2 * np.pi * r.uniform(4.6, 5.6) * t + r.uniform(0, 6)) * np.minimum(1, t / 1.5)
            out += saw(f * 2 ** (c / 1200) * vibr)
    out = lp(out, bright, 4) / (voices * max(1, len(notes)) ** 0.7)
    e = np.minimum(1 - np.exp(-t / (att / 3)), 1.0)
    d = np.clip((dur + rel - t) / rel, 0, 1) ** 1.5
    return out * e * d * 0.5


def bell(name_or_midi, vel=0.4, decay=1.8):
    """Music-box / celesta: tuned-bar partials, bright tick, long-ish decay."""
    m = midi(name_or_midi) if isinstance(name_or_midi, str) else name_or_midi
    f = mtof(m)
    n = S(decay * 2.5)
    t = tvec(n)
    out = (np.sin(2 * np.pi * f * t) * np.exp(-t / decay)
           + 0.22 * np.sin(2 * np.pi * f * 2.0 * t) * np.exp(-t / (decay * 0.4))
           + 0.07 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t / (decay * 0.12)))
    out *= np.minimum(1, t / 0.002)
    return out * vel * 0.35


def pluck(name_or_midi, vel=0.4, decay=0.45, seed=0):
    """Soft glassy pluck for the science/machine arpeggio."""
    m = midi(name_or_midi) if isinstance(name_or_midi, str) else name_or_midi
    f = mtof(m)
    n = S(decay * 4)
    t = tvec(n)
    out = np.zeros(n)
    for k, a in zip((1, 2, 3, 4, 6), (1.0, 0.42, 0.2, 0.1, 0.04)):
        out += a * np.sin(2 * np.pi * f * k * t * (1 + 0.0007 * k)) * np.exp(-t / (decay / (0.6 + 0.5 * k)))
    out *= np.minimum(1, t / 0.003)
    return out * vel * 0.3


def kick(vel=0.5):
    n = S(0.45)
    t = tvec(n)
    f = 42 + 70 * np.exp(-t / 0.035)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t / 0.16) * vel


def sub(name_or_midi, dur, vel=0.4, att=0.02, rel=0.3):
    m = midi(name_or_midi) if isinstance(name_or_midi, str) else name_or_midi
    n = S(dur + rel)
    t = tvec(n)
    y = np.sin(2 * np.pi * mtof(m) * t) + 0.18 * np.sin(4 * np.pi * mtof(m) * t)
    return y * env_ar(n, att, rel) * vel


# ---------------------------------------------------------------- sound design

def noise(n, seed=0):
    return rng(seed).standard_normal(n)


def heartbeat(vel=0.6):
    def thump(d, f):
        n = S(d)
        t = tvec(n)
        ff = f * (1 + 0.6 * np.exp(-t / 0.02))
        return np.sin(2 * np.pi * np.cumsum(ff) / SR) * np.exp(-t / (d / 4)) * np.minimum(1, t / 0.004)
    lub, dub = thump(0.16, 52), thump(0.13, 44) * 0.7
    out = np.zeros(S(0.5))
    out[:len(lub)] += lub
    out[S(0.19):S(0.19) + len(dub)] += dub
    return lp(out, 160, 2) * vel * 1.6


def crickets(dur, seed=5, density=1.0):
    """Evening field: chirp trains at a few pitches, plus soft air."""
    n = S(dur)
    t = tvec(n)
    r = rng(seed)
    out = np.zeros((n, 2))
    for c in range(4):
        f = r.uniform(3900, 5200)
        period = r.uniform(0.75, 1.15) / density
        p = r.uniform(-0.8, 0.8)
        gain = r.uniform(0.25, 0.6)
        ts = np.arange(r.uniform(0, period), dur, period)
        y = np.zeros(n)
        for s0 in ts:
            for k in range(3):
                i = S(s0 + k * 0.034)
                m = S(0.022)
                if i + m >= n:
                    break
                tt = tvec(m)
                y[i:i + m] += np.sin(2 * np.pi * f * tt) * np.sin(np.pi * tt / (m / SR)) ** 2
        out += pan(y * gain, p)
    air = lp(noise(n, seed + 1), 900, 2) * 0.05
    out += pan(air, 0.0) * 1.0
    return out * 0.08


def clock_ticks(dur, every=1.0, seed=9):
    n = S(dur)
    out = np.zeros(n)
    m = S(0.012)
    tick = bp(noise(m, seed), 1800, 4200) * np.exp(-np.arange(m) / S(0.002))
    for k, s0 in enumerate(np.arange(0.2, dur, every)):
        i = S(s0)
        if i + m < n:
            out[i:i + m] += tick * (1.0 if k % 2 else 0.8)
    return out * 0.25


def paper_slide(dur=0.55, seed=11, vel=0.5):
    n = S(dur)
    t = tvec(n)
    y = bp(noise(n, seed), 600, 5000) * np.sin(np.pi * t / dur) ** 1.5
    return y * vel * 0.25


def paper_tear(dur=0.75, seed=12):
    n = S(dur)
    r = rng(seed)
    y = np.zeros(n)
    for i in np.sort(r.integers(0, n - 300, 420)):
        y[i:i + 60] += r.standard_normal(60) * r.uniform(0.2, 1.0) * np.exp(-np.arange(60) / 15)
    y = bp(y, 900, 7000) * np.sin(np.pi * tvec(n) / dur) ** 0.6
    return y * 0.5


def crayon(dur, seed=13, rate=7.0, vel=0.5):
    """Wax on paper: band-passed grain, strokes pulsing at hand speed."""
    n = S(dur)
    t = tvec(n)
    r = rng(seed)
    grain = bp(noise(n, seed), 1400, 6500, 2)
    grain += 0.4 * bp((r.random(n) < 0.004) * r.standard_normal(n) * 3, 2500, 9000)
    strokes = 0.5 + 0.5 * np.sin(2 * np.pi * rate * t + 2 * np.sin(2 * np.pi * 0.7 * t)) ** 2
    return grain * strokes * env_ar(n, 0.08, 0.15) * vel * 0.16


def whoosh(dur=1.2, seed=15, up=True, vel=0.5):
    n = S(dur)
    t = tvec(n)
    y = noise(n, seed)
    shape = (t / dur) ** 2 if up else (1 - t / dur) ** 2
    out = np.zeros(n)
    # sweep with three overlapping band-passes
    for lo, hi, w in ((200, 800, 1.0), (800, 2500, 0.7), (2500, 7000, 0.4)):
        out += bp(y, lo, hi) * w
    return out * shape * env_ar(n, 0.05, 0.12) * vel * 0.5


def boom(vel=0.7):
    n = S(3.2)
    t = tvec(n)
    y = np.sin(2 * np.pi * (34 + 30 * np.exp(-t / 0.08)) * t) * np.exp(-t / 1.1)
    y += lp(noise(n, 17), 300) * np.exp(-t / 0.35) * 0.4
    return y * vel


def blip(freq=1320, vel=0.3, dur=0.18):
    n = S(dur)
    t = tvec(n)
    return np.sin(2 * np.pi * freq * t) * np.exp(-t / (dur / 4)) * np.minimum(1, t / 0.002) * vel


def chime(notes=("F5", "A5", "C6"), vel=0.35, spread=0.07):
    total = S(3.5)
    out = np.zeros(total)
    for i, nm in enumerate(notes):
        b = bell(nm, vel, 1.4)
        s = S(i * spread)
        out[s:s + len(b)] += b[: total - s]
    return out


def click(vel=0.4, freq=3000):
    n = S(0.02)
    return bp(noise(n, 21), freq * 0.6, freq * 1.6) * np.exp(-np.arange(n) / S(0.003)) * vel


def motor_tap(vel=0.6):
    """Coin vibration motor: ~180 Hz buzz with spin-up, plus the case rattle."""
    n = S(0.13)
    t = tvec(n)
    f = 120 + 70 * np.minimum(1, t / 0.03)
    ph = 2 * np.pi * np.cumsum(f) / SR
    y = np.tanh(3 * np.sin(ph)) * env_ar(n, 0.01, 0.04, 1.0)
    y += 0.25 * bp(noise(n, 23), 1500, 4000) * env_ar(n, 0.005, 0.05)
    return lp(y, 2500) * vel


def hum(dur, f0=220.0, vel=0.5, seed=25):
    """A soft human hum ('mmm'): glottal pulses through nasal formants, slow vibrato, breath."""
    n = S(dur)
    t = tvec(n)
    r = rng(seed)
    vib = 1 + 0.004 * np.sin(2 * np.pi * 5.1 * t) * np.minimum(1, t / 0.6)
    jitter = 1 + 0.002 * lp(r.standard_normal(n), 30)
    src = saw(f0 * vib * jitter)
    src = lp(src, 1800, 2)
    y = 1.0 * bp(src, 200, 330) + 0.35 * bp(src, 950, 1250) + 0.12 * bp(src, 2300, 2800)
    y += 0.03 * bp(noise(n, seed), 300, 3000)
    return y * env_ar(n, 0.35, 0.7, 1.5) * vel * 2.2


def tinnitus(dur, f=6200, vel=0.05):
    n = S(dur)
    t = tvec(n)
    return np.sin(2 * np.pi * f * t) * (0.7 + 0.3 * np.sin(2 * np.pi * 0.3 * t)) * env_ar(n, dur * 0.7, 0.05) * vel


def drone(notes, dur, vel=0.25, att=2.0, rel=1.5, seed=27):
    n = S(dur + rel)
    t = tvec(n)
    out = np.zeros(n)
    for nm in notes:
        f = mtof(nm if isinstance(nm, int) else midi(nm))
        out += np.sin(2 * np.pi * f * t + rng(seed).uniform(0, 6)) + 0.3 * np.sin(2 * np.pi * 2 * f * t)
    out += lp(noise(n, seed), 180) * 0.6
    e = (1 - np.exp(-t / (att / 3))) * np.clip((dur + rel - t) / rel, 0, 1)
    return out * e * vel / max(1, len(notes))


def reverse_swell(dur=1.8, seed=29, vel=0.5):
    n = S(dur)
    t = tvec(n)
    y = lp(noise(n, seed), 2500) * (t / dur) ** 3
    return y * vel


def hiss_room(dur, vel=0.02, seed=31):
    return lp(noise(S(dur), seed), 1200) * vel


def fluorescent(dur, vel=0.04):
    n = S(dur)
    t = tvec(n)
    y = sum(np.sin(2 * np.pi * 100 * k * t) / k for k in (1, 2, 3, 5)) + 0.3 * bp(noise(n, 33), 2000, 5000)
    return y * vel


# ---------------------------------------------------------------- spaces + dynamics

def make_ir(rt60=2.6, predelay=0.018, seed=41, bright=0.5):
    n = S(rt60 * 1.15)
    t = tvec(n)
    r = rng(seed)
    out = np.zeros((n, 2))
    for c in range(2):
        w = r.standard_normal(n)
        low = lp(w, 2600) * np.exp(-6.91 * t / rt60)
        high = hp(w, 2600) * np.exp(-6.91 * t / (rt60 * 0.35)) * bright
        out[:, c] = low + high
        for _ in range(14):
            d = r.uniform(0.004, 0.09)
            out[S(d), c] += r.uniform(-0.8, 0.8) * np.exp(-d * 14)
    out = np.vstack([np.zeros((S(predelay), 2)), out])
    out *= np.minimum(1, tvec(len(out)) / 0.01)[:, None]
    return out / np.sqrt(np.sum(out ** 2) / 2)


def reverb(x, ir, wet=0.3):
    if x.ndim == 1:
        x = pan(x)
    y = np.stack([fftconvolve(x[:, c], ir[:, c])[: len(x)] for c in range(2)], axis=1)
    return x * (1 - wet * 0.5) + y * wet


def follow(x, release=0.3, hold=0.0):
    """Envelope follower on |x| (mono): optional hold, then one-pole release."""
    a = np.abs(x if x.ndim == 1 else x.mean(1))
    if hold:
        a = maximum_filter1d(a, S(hold))
    k = np.exp(-1 / (release * SR))
    return lfilter([1 - k], [1, -k], a)


def limiter(x, ceiling=0.89, look=0.004, release=0.08):
    peak = maximum_filter1d(np.max(np.abs(x), axis=1), S(look) * 2 + 1)
    g = np.minimum(1.0, ceiling / np.maximum(peak, 1e-9))
    # smooth gain: fast down (already via lookahead max), slow up
    k = np.exp(-1 / (release * SR))
    gs = lfilter([1 - k], [1, -k], g - 1.0) + 1.0
    gs = np.minimum(gs, g)
    return x * gs[:, None]
