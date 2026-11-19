"""SYNTHETIC signal generators.

Everything in this file is made up. It exists so the pipeline (features ->
model -> C header -> firmware) can be built and tested before any real
recording exists. A model trained only on this data has learned the
generator, not a human lip. Never report its accuracy as a result.
"""
from __future__ import annotations

import numpy as np

from .emg_features import FS, WIN

CLASSES = ["rest", "speech_motor", "swallow", "chew"]
BASE = 300.0


def _base(n: int, rng: np.random.Generator) -> np.ndarray:
    drift = np.cumsum(rng.normal(0, 0.15, n))
    return BASE + rng.normal(0, 6.0, n) + drift - drift.mean()


def rest(rng, n=WIN):
    return _base(n, rng)


def speech_motor(rng, n=WIN):
    x = _base(n, rng)
    dur = int(rng.uniform(0.9, 2.0) * FS)
    start = int(rng.integers(0, max(n - dur, 1)))
    amp = rng.uniform(40, 160)
    t = np.arange(dur) / FS
    syll = 0.6 + 0.4 * np.abs(np.sin(2 * np.pi * rng.uniform(2.0, 3.0) * t))
    x[start:start + dur] += amp * syll
    return x


def swallow(rng, n=WIN):
    x = _base(n, rng)
    dur = int(rng.uniform(0.4, 0.85) * FS)
    start = int(rng.integers(0, max(n - dur, 1)))
    amp = rng.uniform(220, 500)
    x[start:start + dur] += amp * np.hanning(dur)
    return x


def chew(rng, n=WIN):
    x = _base(n, rng)
    period = rng.uniform(0.5, 0.9) * FS
    dur = int(rng.uniform(0.2, 0.35) * FS)
    amp = rng.uniform(80, 250)
    t0 = rng.uniform(0, period)
    while t0 + dur < n:
        s = int(t0)
        x[s:s + dur] += amp * np.hanning(dur) * rng.uniform(0.8, 1.2)
        t0 += period * rng.uniform(0.92, 1.08)
    return x


GEN = [rest, speech_motor, swallow, chew]


def dataset(n_per_class: int, seed: int = 0):
    rng = np.random.default_rng(seed)
    X, y = [], []
    for label, g in enumerate(GEN):
        for _ in range(n_per_class):
            X.append(np.round(g(rng)))
            y.append(label)
    return np.array(X), np.array(y)


def rest_recording(seconds: float = 30.0, seed: int = 1):
    rng = np.random.default_rng(seed)
    return np.round(_base(int(seconds * FS), rng))


# ---- outside channel ----------------------------------------------------

def audio_noise(seconds: float, fs: int, level: float, seed: int = 2):
    rng = np.random.default_rng(seed)
    return rng.normal(0, level, int(seconds * fs))


def audio_speechlike(seconds: float, fs: int, level: float, seed: int = 3):
    """Harmonic buzz, 120-220 Hz pitch, gated at a 4 Hz syllable rate.

    Not speech. Good enough to exercise the band-energy detector only.
    """
    rng = np.random.default_rng(seed)
    n = int(seconds * fs)
    t = np.arange(n) / fs
    f0 = rng.uniform(120, 220)
    sig = sum(np.sin(2 * np.pi * k * f0 * t) / k for k in range(1, 20))
    gate = (np.sin(2 * np.pi * 4.0 * t) > -0.3).astype(float)
    return level * sig * gate
