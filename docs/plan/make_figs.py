"""Draws the figures for the You, Yourself edge plan. Fig 4 uses SYNTHETIC signals."""
import sys
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from matplotlib.patches import Circle, FancyBboxPatch, FancyArrowPatch, Rectangle

HERE = Path(__file__).parent
OUT = HERE / "figs"
OUT.mkdir(exist_ok=True)
sys.path.insert(0, str(HERE.parents[1] / "edge" / "python"))

INK, MUTED, TEAL, TEAL_L = "#1B1F2A", "#555B6B", "#1F6F6B", "#E6EFEE"
SKIN, SHIRT, ELEC, WARN = "#F2D9C4", "#DCE3E8", "#C2553A", "#B7791F"
plt.rcParams["font.family"] = "DejaVu Sans"


def spline(pts, n=14, closed=True):
    P = np.array(pts, float)
    m = len(P)
    out = []
    rng = range(m) if closed else range(m - 1)
    for i in rng:
        p0, p1, p2, p3 = P[(i - 1) % m], P[i], P[(i + 1) % m], P[(i + 2) % m]
        if not closed:
            p0 = P[max(i - 1, 0)]
            p3 = P[min(i + 2, m - 1)]
        for t in np.linspace(0, 1, n, endpoint=False):
            out.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t ** 2
                              + (-p0 + 3 * p1 - 3 * p2 + p3) * t ** 3))
    if not closed:
        out.append(P[-1])
    return np.array(out)


HEAD = [(-0.55, -1.7), (-0.55, -0.95), (-0.95, -0.4), (-1.0, 0.3), (-0.6, 0.95), (0.0, 1.15),
        (0.65, 0.9), (0.9, 0.45), (0.95, 0.2), (1.0, 0.05), (1.25, -0.25), (1.0, -0.35),
        (1.02, -0.5), (0.97, -0.6), (1.0, -0.72), (0.92, -0.85), (0.95, -1.05), (0.72, -1.18),
        (0.35, -1.2), (0.3, -1.7)]


def person(ax, collar=True):
    ax.add_patch(plt.Polygon([(-0.6, -1.6), (-1.7, -2.1), (-1.85, -3.1), (1.7, -3.1), (1.5, -2.0), (0.35, -1.6)],
                             closed=True, fc=SHIRT, ec=MUTED, lw=1.2, zorder=1))
    h = spline(HEAD)
    ax.fill(h[:, 0], h[:, 1], fc=SKIN, ec=INK, lw=1.6, zorder=2)
    ax.add_patch(matplotlib.patches.Ellipse((-0.15, -0.2), 0.24, 0.42, fc=SKIN, ec=INK, lw=1.2, zorder=3))
    ax.add_patch(Circle((0.78, 0.2), 0.03, fc=INK, zorder=3))
    ax.plot([0.97, 0.88], [-0.6, -0.6], color=INK, lw=1.2, zorder=3)
    if collar:
        ax.plot([-0.55, -0.1, 0.3], [-1.62, -1.95, -1.62], color=MUTED, lw=1.4, zorder=3)


def elec(ax, x, y, r=0.065, c=ELEC):
    ax.add_patch(Circle((x, y), r, fc=c, ec="white", lw=1, zorder=6))


def box(ax, x, y, w, h, fc=TEAL, label=None, fs=7, tc="white", z=6):
    ax.add_patch(FancyBboxPatch((x - w / 2, y - h / 2), w, h, boxstyle="round,pad=0.02,rounding_size=0.06",
                                fc=fc, ec=INK, lw=1, zorder=z))
    if label:
        ax.text(x, y, label, ha="center", va="center", fontsize=fs, color=tc, zorder=z + 1)


def note(ax, xy, xytext, text, fs=7.5):
    ax.annotate(text, xy=xy, xytext=xytext, fontsize=fs, color=INK, ha="center", va="center", zorder=9,
                arrowprops=dict(arrowstyle="-", color=MUTED, lw=0.9),
                bbox=dict(boxstyle="round,pad=0.25", fc="white", ec=MUTED, lw=0.6))


def dots(n):
    return "●" * n + "○" * (5 - n)


def fig_wearables():
    fig, axes = plt.subplots(1, 4, figsize=(17, 6.3))
    titles = ["A  Under-chin patch + collar cable", "B  Behind-ear and jaw band",
              "C  Soft neckband (dry electrodes)", "D  Lip patch (paper's design)"]
    subs = ["Recommended for the hackathon", "Looks like a headset", "Version 2, needs testing", "Clinic sessions only"]
    rate = [(4, 1, 5), (4, 1, 3), (5, 1, 2), (1, 2, 5)]
    for k, ax in enumerate(axes):
        ax.set_xlim(-2.0, 2.3); ax.set_ylim(-4.0, 1.5); ax.set_aspect("equal"); ax.axis("off")
        person(ax)
        ax.set_title(titles[k], fontsize=11, fontweight="bold", color=INK, loc="left")
        ax.text(-2.0, 1.28, subs[k], fontsize=8.5, color=TEAL if k == 0 else MUTED, fontweight="bold" if k == 0 else None)
        d, e, b = rate[k]
        ax.text(-2.0, -3.45, f"Hidden   {dots(d)}", fontsize=8.5, color=INK, family="DejaVu Sans Mono")
        ax.text(-2.0, -3.7, f"Evidence {dots(e)}", fontsize=8.5, color=INK, family="DejaVu Sans Mono")
        ax.text(-2.0, -3.95, f"Easy     {dots(b)}", fontsize=8.5, color=INK, family="DejaVu Sans Mono")
    # A
    ax = axes[0]
    elec(ax, 0.52, -1.22); elec(ax, 0.38, -1.23)
    cable = spline([(0.45, -1.27), (0.36, -1.5), (0.3, -1.9), (0.25, -2.3)], closed=False)
    ax.plot(cable[:, 0], cable[:, 1], color=INK, lw=1.6, zorder=5)
    ax.plot([-0.3, 0.0, 0.0], [-1.7, -2.3, -2.45], color=MUTED, lw=1, zorder=4)
    ax.plot([0.3, 0.55, 0.5], [-1.65, -2.3, -2.45], color=MUTED, lw=1, zorder=4)
    box(ax, 0.25, -2.65, 0.8, 0.5, label="pendant", fs=7)
    note(ax, (0.45, -1.23), (1.55, -0.9), "2 electrodes on the\nmidline under the chin")
    note(ax, (0.3, -1.95), (1.4, -1.9), "cable hidden\nin the collar")
    note(ax, (0.55, -2.7), (1.45, -3.3), "board, battery, mic,\nbutton, vibration motor")
    # B
    ax = axes[1]
    band = spline([(0.2, -1.0), (-0.05, -0.92), (-0.3, -0.6), (-0.4, -0.2), (-0.35, 0.18), (-0.15, 0.2), (0.05, 0.05)], closed=False)
    ax.plot(band[:, 0], band[:, 1], color=TEAL, lw=4, solid_capstyle="round", zorder=5)
    elec(ax, -0.35, -0.55); elec(ax, 0.0, -0.93)
    box(ax, -0.42, 0.02, 0.28, 0.2, label="", z=7)
    note(ax, (-0.42, 0.02), (-1.45, 0.75), "module behind the ear")
    note(ax, (0.0, -0.93), (1.45, -0.55), "jaw-muscle electrode")
    note(ax, (-0.35, -0.55), (-1.4, -1.1), "reference electrode\non the bone")
    ax.plot([0.15, 0.28], [-1.62, -2.0], color=INK, lw=0)  # keep bounds
    # C
    ax = axes[2]
    ax.add_patch(plt.Polygon([(-0.56, -1.3), (0.33, -1.3), (0.31, -1.5), (-0.56, -1.5)], closed=True,
                             fc=TEAL, ec=INK, lw=1, zorder=5))
    for x in (0.2, 0.08):
        ax.add_patch(Rectangle((x - 0.045, -1.34), 0.09, 0.07, fc=ELEC, ec="white", lw=0.8, zorder=7))
    box(ax, -0.62, -1.4, 0.3, 0.3, label="", z=7)
    note(ax, (0.14, -1.3), (1.5, -0.95), "dry electrodes in the\nband (noisier)")
    note(ax, (-0.62, -1.4), (-1.35, -1.0), "module at the back")
    # D
    ax = axes[3]
    elec(ax, 1.0, -0.8); elec(ax, 0.96, -0.94); elec(ax, 0.0, -0.93, c=MUTED)
    cable = spline([(1.0, -0.95), (1.35, -1.3), (1.4, -1.9), (1.2, -2.4)], closed=False)
    ax.plot(cable[:, 0], cable[:, 1], color=INK, lw=1.6, zorder=5)
    box(ax, 1.2, -2.6, 0.7, 0.45, label="box", fs=7)
    note(ax, (1.0, -0.88), (1.65, 0.0), "electrodes below\nthe lower lip")
    note(ax, (0.0, -0.93), (-1.2, -1.15), "reference on\nthe jaw angle")
    fig.text(0.01, 0.01, "Ratings are my judgement, 1 to 5. Evidence = published patient data for that site "
             "(only the lip site has any: 11 patients, Rapin 2013). Concept sketches, not built.",
             fontsize=8.5, color=MUTED)
    fig.tight_layout(rect=(0, 0.03, 1, 1))
    fig.savefig(OUT / "fig_wearables.png", dpi=170); plt.close(fig)


def fig_pendant():
    fig, ax = plt.subplots(figsize=(9, 5.6))
    ax.set_xlim(0, 10); ax.set_ylim(0, 6.2); ax.axis("off"); ax.set_aspect("equal")
    ax.add_patch(FancyBboxPatch((1.2, 0.8), 5.6, 4.2, boxstyle="round,pad=0.05,rounding_size=0.5", fc="#F6F8F8", ec=INK, lw=2))
    ax.text(4.0, 5.35, "Pendant unit, about 70 x 45 x 20 mm (cut-away)", ha="center", fontsize=11, fontweight="bold")
    box(ax, 3.0, 3.6, 2.2, 1.1, fc=TEAL, label="XIAO ESP32S3 Sense\n(board + mic + BLE)", fs=8)
    box(ax, 3.0, 1.9, 2.2, 0.9, fc="#8FA9C7", label="LiPo 500 mAh\n(protected)", fs=8, tc=INK)
    box(ax, 5.55, 3.6, 1.0, 0.7, fc="#E9C46A", label="MyoWare 2.0\nENV in", fs=7.5, tc=INK)
    box(ax, 5.55, 2.5, 1.0, 0.7, fc="#D9B3A6", label="vibration\nmotor", fs=7.5, tc=INK)
    ax.add_patch(Circle((1.9, 4.35), 0.13, fc=INK, zorder=6))
    ax.add_patch(Circle((1.9, 1.35), 0.2, fc=WARN, ec=INK, zorder=6))
    for x, y, t, tx, ty in [(1.9, 4.35, "mic hole (audio never stored)", 8.3, 5.0),
                            (1.9, 1.35, "'I hear a voice' button", 8.3, 1.4),
                            (6.8, 3.6, "3.5 mm jack to electrode cable", 8.4, 3.9),
                            (5.55, 2.5, "taps twice when allowed", 8.4, 2.7),
                            (3.0, 1.9, "slide switch = real OFF", 8.4, 0.6)]:
        note(ax, (x, y), (tx, ty), t, fs=8)
    ax.text(0.2, 0.15, "Battery only. Never worn while charging. Concept sketch, not built.", fontsize=8.5, color=MUTED)
    fig.savefig(OUT / "fig_pendant.png", dpi=170, bbox_inches="tight"); plt.close(fig)


def arrow(ax, a, b, c=MUTED):
    ax.add_patch(FancyArrowPatch(a, b, arrowstyle="-|>", mutation_scale=14, color=c, lw=1.5, zorder=3))


def fig_system():
    fig, ax = plt.subplots(figsize=(11, 5.4))
    ax.set_xlim(0, 11); ax.set_ylim(0, 6); ax.axis("off")
    ax.add_patch(FancyBboxPatch((0.15, 0.2), 10.6, 5.5, boxstyle="round,pad=0.05,rounding_size=0.2", fc="#FAFCFC", ec=TEAL, lw=1.5, ls="--"))
    ax.text(0.4, 5.4, "Everything in the dashed box runs on your own devices (wearable, optional phone). Nothing is uploaded.", fontsize=9, color=TEAL, fontweight="bold")
    box(ax, 1.4, 4.2, 2.1, 0.9, fc="#E9C46A", label="Muscle sensor\n(EMG envelope, 100 Hz)", fs=8, tc=INK)
    box(ax, 1.4, 1.9, 2.1, 0.9, fc="#8FA9C7", label="Microphone\n(16 kHz, kept in RAM)", fs=8, tc=INK)
    box(ax, 4.3, 4.2, 2.2, 0.9, fc=TEAL, label="Windows + features\n+ tiny classifier", fs=8)
    box(ax, 4.3, 1.9, 2.2, 0.9, fc=TEAL, label="Band-energy VAD\n(or small CNN)", fs=8)
    box(ax, 7.1, 3.05, 2.0, 1.2, fc=INK, label="Fixed, readable\nrules (fusion)", fs=8.5)
    box(ax, 9.7, 4.2, 1.7, 0.8, fc="#F6F8F8", label="One of 4 plain\noutcomes", fs=8, tc=INK)
    box(ax, 9.7, 3.05, 1.7, 0.6, fc="#F6F8F8", label="Optional tap", fs=8, tc=INK)
    box(ax, 9.7, 1.9, 1.7, 0.8, fc="#F6F8F8", label="Diary + coping\ncoach (phone)", fs=8, tc=INK)
    arrow(ax, (2.45, 4.2), (3.2, 4.2)); arrow(ax, (2.45, 1.9), (3.2, 1.9))
    arrow(ax, (5.4, 4.2), (6.1, 3.4)); arrow(ax, (5.4, 1.9), (6.1, 2.7))
    arrow(ax, (8.1, 3.4), (8.85, 4.1)); arrow(ax, (8.1, 3.05), (8.85, 3.05)); arrow(ax, (8.1, 2.7), (8.85, 2.0))
    ax.text(4.3, 3.05, "Does a muscle\nsignal exist?", ha="center", fontsize=7.5, color=MUTED)
    ax.text(4.3, 0.85, "Is anyone nearby speaking?", ha="center", fontsize=7.5, color=MUTED)
    ax.text(7.1, 1.55, "The tap needs: muscles active,\nno speech, test passed,\nclinician switched it on.", ha="center", fontsize=7.2, color=INK)
    ax.text(0.4, 0.5, "The model never decides 'real' or 'imagined'. It reports two outside facts, or says it can't tell.",
            fontsize=9, color=INK, fontweight="bold")
    fig.savefig(OUT / "fig_system.png", dpi=170, bbox_inches="tight"); plt.close(fig)


def fig_ml_roadmap():
    fig, ax = plt.subplots(figsize=(12, 5.6))
    ax.set_xlim(0, 12.6); ax.set_ylim(0, 6); ax.axis("off")
    cols = [("Step 1\nRules", "Threshold + duration\nrules from the paper", "no training\nneeds: 30 s rest", "#F6F8F8", INK),
            ("Step 2\nFeatures + small model", "9 features ->\nlogistic regression /\ntiny MLP (<1 KB)", "needs: labelled\nsessions (CSV)", TEAL_L, INK),
            ("Step 3\n1D-CNN on raw EMG", "1 kHz raw stream,\nint8, TFLite Micro\n(20-60 KB)", "only if step 2 is\ntoo crude on real data", "#CFE0DE", INK),
            ("Step 4\nPersonal calibration", "per-person baseline,\nthreshold, coupling\ntest (statistics)", "30 s rest + control\nmoments", TEAL, "white")]
    for i, (t, m, n, fc, tc) in enumerate(cols):
        x = 0.4 + i * 3.1
        ax.add_patch(FancyBboxPatch((x, 2.2), 2.8, 3.1, boxstyle="round,pad=0.04,rounding_size=0.15", fc=fc, ec=INK, lw=1.2))
        ax.text(x + 1.4, 4.85, t, ha="center", va="center", fontsize=10, fontweight="bold", color=tc)
        ax.text(x + 1.4, 3.6, m, ha="center", va="center", fontsize=8.5, color=tc)
        ax.text(x + 1.4, 2.6, n, ha="center", va="center", fontsize=7.8, color=tc, style="italic")
        if i < 3:
            arrow(ax, (x + 2.85, 3.75), (x + 3.05, 3.75))
    ax.text(0.4, 1.55, "Audio side:", fontsize=9, fontweight="bold")
    ax.text(1.9, 1.55, "band-energy VAD  ->  small log-mel CNN (TFLite Micro)  ->  on a Pi: Silero VAD   |   stretch: own-voice vs other-voice with two mics",
            fontsize=8.5, color=INK)
    ax.text(0.4, 0.95, "Promotion rule:", fontsize=9, fontweight="bold")
    ax.text(2.2, 0.95, "move to the next step only if it beats the previous one on leave-one-subject-out data, by a margin that survives a permutation test.",
            fontsize=8.5, color=INK)
    ax.text(0.4, 0.35, "Always on top: contact check (lead off = no claim), an 'abstain' output, and the fixed fusion rules. No model sees the 'real or imagined' label.",
            fontsize=8.5, color=INK)
    fig.savefig(OUT / "fig_ml_roadmap.png", dpi=170, bbox_inches="tight"); plt.close(fig)


def fig_synth_demo():
    from yy import emg_features as F, synth
    from yy.mlp import MLP
    med, sigma = F.calibrate(synth.rest_recording())
    raw, y = synth.dataset(300, seed=0)
    X = np.array([F.features(w, med, sigma) for w in raw])
    model = MLP(F.N_FEATURES, 16, 4).fit(X, y, epochs=800)
    rng = np.random.default_rng(7)
    n = 52 * F.FS
    x = synth._base(n, rng)
    def add(t0, w):
        s = int(t0 * F.FS); x[s:s + len(w)] += w
    for t0, d in ((10, 1.6), (15, 2.0), (20, 1.2)):
        tt = np.arange(int(d * F.FS)) / F.FS
        add(t0, 110 * (0.6 + 0.4 * np.abs(np.sin(2 * np.pi * 2.5 * tt))))
    add(27, 380 * np.hanning(60))
    t0 = 32.0
    while t0 < 38:
        add(t0, 170 * np.hanning(28)); t0 += 0.72
    x[45 * F.FS:49 * F.FS] = 0.0
    x = np.round(x)
    ts, p, ok = [], [], []
    for s, w in F.sliding_windows(x):
        ts.append((s + F.WIN) / F.FS)
        good = F.contact_ok(w)
        ok.append(good)
        p.append(model.proba(F.features(w, med, sigma))[0][1] if good else np.nan)
    ts, p, ok = np.array(ts), np.array(p), np.array(ok)
    fig, axs = plt.subplots(3, 1, figsize=(11, 6.4), sharex=True, gridspec_kw={"height_ratios": [2.2, 1.6, 0.6]})
    t = np.arange(n) / F.FS
    axs[0].plot(t, x, color=INK, lw=0.9)
    axs[0].axhline(F.threshold(med, sigma), color=ELEC, ls="--", lw=1)
    axs[0].set_ylabel("EMG envelope\n(ADC units)")
    for a, b, lab in ((10, 22, "silent mouthing"), (26.5, 28, "swallow"), (32, 38.2, "chewing"), (45, 49, "electrode\nlifted")):
        axs[0].axvspan(a, b, color=TEAL_L if lab != "electrode\nlifted" else "#F3DCD5", zorder=0)
        axs[0].text((a + b) / 2 + (2.2 if lab == 'swallow' else 0), 560 if lab != 'electrode\nlifted' else 720, lab, ha="center", va="top", fontsize=8, color=MUTED)
    axs[1].plot(ts, p, color=TEAL, lw=1.6)
    axs[1].axhline(0.6, color=ELEC, ls="--", lw=1)
    axs[1].text(51.8, 0.63, "speech-motor threshold 0.6", ha="right", fontsize=8, color=ELEC)
    axs[1].set_ylim(-0.05, 1.05); axs[1].set_ylabel("p(speech-motor)\nfrom the model")
    state = np.where(~ok, 2, (np.nan_to_num(p) >= 0.6).astype(int))
    cmap = {0: "#E6EBEB", 1: TEAL, 2: "#C9C9C9"}
    for i in range(len(ts) - 1):
        axs[2].axvspan(ts[i], ts[i + 1], color=cmap[state[i]], lw=0)
    axs[2].set_yticks([])
    axs[2].set_xlabel("seconds\n\nstrip: dark teal = muscles active    pale = nothing detected    grey = no contact, so no claim", fontsize=8.5)
    fig.suptitle("SYNTHETIC signals. Shows the pipeline working, not real accuracy.", fontsize=10.5, color=ELEC, fontweight="bold")
    fig.tight_layout()
    fig.savefig(OUT / "fig_synthetic_demo.png", dpi=170); plt.close(fig)


if __name__ == "__main__":
    fig_wearables(); fig_pendant(); fig_system(); fig_ml_roadmap(); fig_synth_demo()
    print("ok")
