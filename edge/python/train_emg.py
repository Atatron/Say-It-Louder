"""Train the inside-channel classifier and export it for the ESP32.

Two modes:

  python train_emg.py --synthetic
      Builds the whole pipeline from made-up signals. Use this to check that
      everything compiles and runs. The accuracy it prints is meaningless.

  python train_emg.py --data recordings/
      Trains on real sessions. Each CSV has one row per 100 Hz envelope
      sample with columns  env,label  where label is one of
      rest, speech_motor, swallow, chew  (blank or "other" rows are skipped).
      The first 30 s labelled rest in each file are that session's baseline.
      Reports leave-one-session-out accuracy, which is the honest number.

Outputs edge/firmware/you_yourself_edge/emg_model.h and the parity vectors
in edge/host_test/vectors.csv.
"""
from __future__ import annotations

import argparse
import csv
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).parent))
from yy import emg_features as F           # noqa: E402
from yy import synth                       # noqa: E402
from yy.mlp import MLP                     # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
HEADER = ROOT / "firmware" / "you_yourself_edge" / "emg_model.h"
VECTORS = ROOT / "host_test" / "vectors.csv"
CLASSES = synth.CLASSES
PURITY = 0.8


def load_session(path: Path):
    env, lab = [], []
    with open(path, newline="") as f:
        for row in csv.DictReader(f):
            env.append(float(row["env"]))
            lab.append(row.get("label", "").strip())
    env = np.array(env)
    rest_idx = [i for i, l in enumerate(lab) if l == "rest"][: 30 * F.FS]
    if len(rest_idx) < 10 * F.FS:
        raise SystemExit(f"{path}: need at least 10 s labelled rest for calibration")
    med, sigma = F.calibrate(env[rest_idx])
    X, y = [], []
    for start, w in F.sliding_windows(env):
        labs = lab[start:start + F.WIN]
        top = max(set(labs), key=labs.count)
        if top not in CLASSES or labs.count(top) < PURITY * F.WIN:
            continue
        if not F.contact_ok(w):
            continue
        X.append(F.features(w, med, sigma))
        y.append(CLASSES.index(top))
    return np.array(X), np.array(y), (med, sigma)


def confusion(model, X, y):
    pred = model.proba(X).argmax(axis=1)
    cm = np.zeros((len(CLASSES), len(CLASSES)), dtype=int)
    for t, p in zip(y, pred):
        cm[t, p] += 1
    return cm


def print_cm(cm, title):
    print(title)
    print("true \\ pred".ljust(14) + "".join(c[:8].rjust(10) for c in CLASSES))
    for i, c in enumerate(CLASSES):
        print(c.ljust(14) + "".join(str(v).rjust(10) for v in cm[i]))
    print(f"accuracy {np.trace(cm) / cm.sum():.3f}\n")


def main():
    ap = argparse.ArgumentParser()
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--synthetic", action="store_true")
    g.add_argument("--data", type=Path)
    ap.add_argument("--epochs", type=int, default=800)
    args = ap.parse_args()

    if args.synthetic:
        med, sigma = F.calibrate(synth.rest_recording())
        raw, y = synth.dataset(300, seed=0)
        X = np.array([F.features(w, med, sigma) for w in raw])
        model = MLP(F.N_FEATURES, 16, len(CLASSES)).fit(X, y, epochs=args.epochs)
        raw_t, y_t = synth.dataset(100, seed=99)
        X_t = np.array([F.features(w, med, sigma) for w in raw_t])
        print("SYNTHETIC DATA. These numbers only show the code runs.\n")
        print_cm(confusion(model, X_t, y_t), "held-out synthetic windows")
        provenance = "SYNTHETIC signals from yy/synth.py. Not a real model."
        vec_raw, vec_cal = raw_t[::25], (med, sigma)
    else:
        files = sorted(args.data.glob("*.csv"))
        if len(files) < 2:
            raise SystemExit("need at least 2 session files for leave-one-out")
        sessions = [load_session(p) for p in files]
        total = np.zeros((len(CLASSES), len(CLASSES)), dtype=int)
        for i, (Xi, yi, _) in enumerate(sessions):
            Xtr = np.vstack([s[0] for j, s in enumerate(sessions) if j != i])
            ytr = np.concatenate([s[1] for j, s in enumerate(sessions) if j != i])
            m = MLP(F.N_FEATURES, 16, len(CLASSES)).fit(Xtr, ytr, epochs=args.epochs)
            total += confusion(m, Xi, yi)
        print_cm(total, "leave-one-session-out (the honest number)")
        X = np.vstack([s[0] for s in sessions])
        y = np.concatenate([s[1] for s in sessions])
        model = MLP(F.N_FEATURES, 16, len(CLASSES)).fit(X, y, epochs=args.epochs)
        provenance = f"{len(files)} real sessions from {args.data.name}"
        rng = np.random.default_rng(0)
        vec_raw = np.round(np.vstack([synth.GEN[k](rng) for k in range(4) for _ in range(5)]))
        vec_cal = F.calibrate(synth.rest_recording())

    HEADER.write_text(model.to_c_header(CLASSES, provenance))
    print(f"wrote {HEADER.relative_to(ROOT.parent)}")

    VECTORS.parent.mkdir(parents=True, exist_ok=True)
    med, sigma = vec_cal
    with open(VECTORS, "w", newline="") as f:
        w = csv.writer(f)
        for x in vec_raw:
            feats = F.features(x, med, sigma)
            p = model.proba(feats)[0]
            w.writerow([f"{med:.6f}", f"{sigma:.6f}"] + [int(v) for v in x]
                       + [f"{v:.6f}" for v in feats] + [f"{v:.6f}" for v in p])
    print(f"wrote {VECTORS.relative_to(ROOT.parent)} ({len(vec_raw)} vectors)")


if __name__ == "__main__":
    main()
