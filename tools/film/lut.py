"""Write the film's colour grade as a 33-point 3D LUT (tools/film/build/film.cube).

A gentle print-film look on top of the painted frames: a soft toe (lifted, slightly
cool blacks), a long shoulder (highlights roll off instead of clipping), warm
highlights, and a touch less saturation at the extremes.
Run: python3 tools/film/lut.py
"""
import os
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "build", "film.cube")
N = 33


def tone(x):
    # gentle print S-curve (logistic, pivot near mid-grey), lifted toe, soft ceiling
    k, p, toe, ceil = 3.0, 0.45, 0.006, 0.975
    sig = lambda v: 1 / (1 + np.exp(-k * (v - p)))
    y = (sig(x) - sig(0.0)) / (sig(1.0) - sig(0.0))
    return toe + (ceil - toe) * y


def grade(rgb):
    lum = rgb @ np.array([0.2126, 0.7152, 0.0722])
    out = tone(rgb)
    l2 = out @ np.array([0.2126, 0.7152, 0.0722])
    # saturation: a little less in deep shadows and bright highlights
    sat = 0.96 - 0.10 * np.clip((0.12 - l2) / 0.12, 0, 1) - 0.14 * np.clip((l2 - 0.8) / 0.2, 0, 1)
    out = l2[..., None] + (out - l2[..., None]) * sat[..., None]
    # split tone: cool shadows, warm highlights
    sh = (np.clip((0.35 - lum) / 0.35, 0, 1) * np.clip((lum - 0.01) / 0.08, 0, 1))[..., None]  # pure black stays black
    hl = np.clip((lum - 0.55) / 0.45, 0, 1)[..., None]
    out = out + sh * np.array([-0.010, 0.004, 0.018]) + hl * np.array([0.022, 0.008, -0.020])
    return np.clip(out, 0, 1)


def main():
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    g = np.linspace(0, 1, N)
    b, gg, r = np.meshgrid(g, g, g, indexing="ij")          # .cube order: red fastest
    rgb = np.stack([r, gg, b], -1).reshape(-1, 3)
    out = grade(rgb)
    with open(OUT, "w") as f:
        f.write('TITLE "You, Yourself film"\nLUT_3D_SIZE %d\n' % N)
        for v in out:
            f.write("%.6f %.6f %.6f\n" % tuple(v))
    probe = np.array([[0, 0, 0], [0.05, 0.05, 0.05], [0.18, 0.18, 0.18], [0.46, 0.46, 0.46], [0.8, 0.8, 0.8], [1, 1, 1], [0.95, 0.75, 0.45]])
    for p, q in zip(probe, grade(probe)):
        print(np.round(p, 3), "->", np.round(q, 3))
    print("wrote", OUT)


if __name__ == "__main__":
    main()
