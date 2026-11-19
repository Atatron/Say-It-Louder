"""Inside channel: features from the MyoWare 2.0 ENV output, sampled at 100 Hz.

The feature definitions here are mirrored line for line in
edge/firmware/you_yourself_edge/yy_core.c. If you change one, change both and
re-run edge/host_test (it checks that Python and C agree).

Input is one window of envelope samples in raw ADC units plus the person's
own rest baseline (median and MAD from a 30 s calibration, as specified in the
paper, section 5.5).
"""
from __future__ import annotations

import math

import numpy as np

FS = 100                  # envelope sample rate, Hz
WIN = 200                 # 2.0 s window
HOP = 50                  # 0.5 s hop
THR_SIGMAS = 3.0          # threshold = median + 3 sigma ...
THR_FLOOR = 25.0          # ... but at least 25 ADC units above the median
MIN_BURST = 3             # samples; shorter excursions are noise
N_FEATURES = 9

FEATURE_NAMES = [
    "mean_z", "log_max_z", "std_z", "frac_above", "longest_run_s",
    "n_bursts", "mean_burst_s", "log_peak_ratio", "ibi_cv",
]


def calibrate(rest: np.ndarray) -> tuple[float, float]:
    """Median and robust sigma (1.4826 * MAD) of a rest recording."""
    rest = np.asarray(rest, dtype=np.float64)
    med = float(np.median(rest))
    mad = float(np.median(np.abs(rest - med)))
    return med, max(1.4826 * mad, 1.0)


def threshold(med: float, sigma: float) -> float:
    return med + max(THR_SIGMAS * sigma, THR_FLOOR)


def _runs(above: np.ndarray) -> list[tuple[int, int]]:
    """(start, length) of each run of True values."""
    runs, start = [], None
    for i, a in enumerate(above):
        if a and start is None:
            start = i
        elif not a and start is not None:
            runs.append((start, i - start))
            start = None
    if start is not None:
        runs.append((start, len(above) - start))
    return runs


def features(x: np.ndarray, med: float, sigma: float) -> np.ndarray:
    x = np.asarray(x, dtype=np.float64)
    n = len(x)
    thr = threshold(med, sigma)
    z = (x - med) / sigma
    above = x > thr
    runs = _runs(above)
    bursts = [r for r in runs if r[1] >= MIN_BURST]

    mean_z = z.sum() / n
    max_z = min(max(z.max(), 0.0), 50.0)
    std_z = math.sqrt(max((z * z).sum() / n - mean_z * mean_z, 0.0))
    frac_above = above.sum() / n
    longest = max((r[1] for r in runs), default=0) / FS
    n_b = float(len(bursts))
    mean_b = (sum(r[1] for r in bursts) / len(bursts) / FS) if bursts else 0.0
    peak_ratio = min(max((x.max() - med) / (thr - med), 0.0), 50.0)
    if len(bursts) >= 3:
        onsets = [r[0] for r in bursts]
        ibi = np.diff(onsets).astype(np.float64)
        m = ibi.sum() / len(ibi)
        sd = math.sqrt(max((ibi * ibi).sum() / len(ibi) - m * m, 0.0))
        ibi_cv = sd / m if m > 0 else 1.0
    else:
        ibi_cv = 1.0

    return np.array([
        mean_z, math.log1p(max_z), std_z, frac_above, longest,
        n_b, mean_b, math.log1p(peak_ratio), ibi_cv,
    ], dtype=np.float64)


def contact_ok(x: np.ndarray, adc_max: int = 4095) -> bool:
    """False when the electrode has probably lifted.

    A lifted electrode shows as a flat line near zero or a trace pinned at the
    rail. These limits are placeholders until bench recordings exist (paper,
    stage 0). A bad window must never be counted as speech or as silence.
    """
    x = np.asarray(x, dtype=np.float64)
    mean = x.mean()
    sd = x.std()
    if mean < 5 and sd < 0.5:
        return False
    if mean > adc_max - 20:
        return False
    return True


def sliding_windows(env: np.ndarray, win: int = WIN, hop: int = HOP):
    for start in range(0, len(env) - win + 1, hop):
        yield start, env[start:start + win]
