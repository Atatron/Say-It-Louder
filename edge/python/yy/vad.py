"""Outside channel: is anyone speaking nearby?

Band-energy voice activity detection, as specified in the paper (section 5.5):
energy in 300-3400 Hz against an adaptive noise floor, 12 dB margin, 250 ms.
One change from the paper: speech is declared when at least 250 ms of the
last 512 ms (8 of 16 frames) are above the margin, not 250 ms unbroken,
because real speech has short gaps between syllables. Only two numbers per frame
are kept (band level and floor). No audio is stored or sent.

Mirrored in yy_core.c (yy_vad_*). The filter is two RBJ biquads.
"""
from __future__ import annotations

import math

import numpy as np

FS = 16000
FRAME = 512                 # 32 ms
MARGIN_DB = 12.0
MIN_SPEECH_MS = 250
MIN_FRAMES = math.ceil(MIN_SPEECH_MS / (1000 * FRAME / FS))   # 8
SPAN = 16                   # frames looked at (512 ms)
FLOOR_UP = 0.005            # slow rise (about 6 s time constant)
FLOOR_DOWN = 0.5            # fast fall


def _biquad(kind: str, f0: float, fs: float, q: float = 0.7071):
    w = 2 * math.pi * f0 / fs
    c, s = math.cos(w), math.sin(w)
    alpha = s / (2 * q)
    if kind == "hp":
        b = [(1 + c) / 2, -(1 + c), (1 + c) / 2]
    else:
        b = [(1 - c) / 2, 1 - c, (1 - c) / 2]
    a0 = 1 + alpha
    a = [-2 * c, 1 - alpha]
    return [x / a0 for x in b], [x / a0 for x in a]


HP = _biquad("hp", 300.0, FS)
LP = _biquad("lp", 3400.0, FS)


class VAD:
    def __init__(self):
        self.zh = [0.0, 0.0]
        self.zl = [0.0, 0.0]
        self.floor_db = None
        self.hist = 0                # bit i = frame i ago was above margin

    @staticmethod
    def _step(coef, z, x):
        (b0, b1, b2), (a1, a2) = coef
        y = b0 * x + z[0]
        z[0] = b1 * x - a1 * y + z[1]
        z[1] = b2 * x - a2 * y
        return y

    def frame(self, samples) -> tuple[bool, float, float]:
        """Process one frame of float samples in [-1, 1].

        Returns (speech, band_db, floor_db). Nothing else is kept.
        """
        acc = 0.0
        for x in samples:
            y = self._step(LP, self.zl, self._step(HP, self.zh, float(x)))
            acc += y * y
        db = 10 * math.log10(acc / len(samples) + 1e-12)
        if self.floor_db is None:
            self.floor_db = db
        elif db < self.floor_db:
            self.floor_db += FLOOR_DOWN * (db - self.floor_db)
        else:
            self.floor_db += FLOOR_UP * (db - self.floor_db)
        above = db > self.floor_db + MARGIN_DB
        self.hist = ((self.hist << 1) | int(above)) & ((1 << SPAN) - 1)
        return bin(self.hist).count("1") >= MIN_FRAMES, db, self.floor_db


def run(audio: np.ndarray) -> list[bool]:
    v = VAD()
    return [v.frame(audio[i:i + FRAME])[0]
            for i in range(0, len(audio) - FRAME + 1, FRAME)]
