"""The decisive test (H1): does silent inner speech with the mouth still rise above rest?

  python analyze_h1.py ../recordings

For each session CSV: baseline from the first 30 s of rest, then compare
non-overlapping 2 s windows of inner_count / inner_read against later rest
windows. Prints AUROC (0.5 = no difference) and a permutation p-value.
Also prints the mouthing-vs-rest AUROC as a sanity check (should be near 1).

Caveats printed with the result: windows from one session are autocorrelated,
so the p-value is a screening rule, and one person is not a population.
"""
from __future__ import annotations

import argparse
import csv
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).parent))
from yy import emg_features as F   # noqa: E402

PURITY = 0.9
AUROC_PASS = 0.65
METRICS = {"mean_z": 0, "log_max_z": 1, "std_z": 2, "frac_above": 3}


def load(path):
    env, lab = [], []
    with open(path, newline="") as f:
        for row in csv.DictReader(f):
            env.append(float(row["env"])); lab.append(row["label"].strip())
    return np.array(env), np.array(lab)


def auroc(pos, neg):
    pos, neg = np.asarray(pos, float), np.asarray(neg, float)
    allv = np.concatenate([pos, neg])
    order = allv.argsort(kind="mergesort")
    ranks = np.empty(len(allv))
    sorted_v = allv[order]
    i = 0
    while i < len(sorted_v):                      # average ranks for ties
        j = i
        while j + 1 < len(sorted_v) and sorted_v[j + 1] == sorted_v[i]:
            j += 1
        ranks[order[i:j + 1]] = (i + j) / 2 + 1
        i = j + 1
    r_pos = ranks[:len(pos)].sum()
    return (r_pos - len(pos) * (len(pos) + 1) / 2) / (len(pos) * len(neg))


def perm_p(pos, neg, n=2000, seed=0):
    rng = np.random.default_rng(seed)
    obs = auroc(pos, neg)
    allv = np.concatenate([pos, neg])
    k = len(pos)
    hits = 0
    for _ in range(n):
        rng.shuffle(allv)
        hits += auroc(allv[:k], allv[k:]) >= obs
    return (hits + 1) / (n + 1)


def windows(env, lab, med, sigma, want, skip_idx):
    out = []
    for s in range(0, len(env) - F.WIN + 1, F.WIN):       # non-overlapping
        seg = lab[s:s + F.WIN]
        if (seg == want).mean() < PURITY:
            continue
        if skip_idx is not None and s < skip_idx:
            continue
        if not F.contact_ok(env[s:s + F.WIN]):
            continue
        out.append(F.features(env[s:s + F.WIN], med, sigma))
    return np.array(out)


def analyse(path):
    env, lab = load(path)
    rest_idx = np.where(lab == "rest")[0]
    cal = rest_idx[:F.FS * 30]
    if len(cal) < F.FS * 10:
        return None
    med, sigma = F.calibrate(env[cal])
    skip = int(cal[-1]) + 1
    rest = windows(env, lab, med, sigma, "rest", skip)
    res = {"file": path.name, "n_rest": len(rest)}
    for name in ("inner_count", "inner_read", "speech_motor"):
        w = windows(env, lab, med, sigma, name, None)
        res[name] = {"n": len(w)}
        if len(w) >= 5 and len(rest) >= 5:
            for m, k in METRICS.items():
                a = auroc(w[:, k], rest[:, k])
                res[name][m] = a
            res[name]["p"] = perm_p(w[:, 0], rest[:, 0])
    return res


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("folder", type=Path)
    args = ap.parse_args()
    files = sorted(args.folder.glob("*.csv"))
    if not files:
        sys.exit("no CSV files found")
    verdicts = []
    for f in files:
        r = analyse(f)
        if r is None:
            print(f"{f.name}: needs at least 10 s of rest"); continue
        print(f"\n{r['file']}  (rest windows: {r['n_rest']})")
        for name in ("speech_motor", "inner_count", "inner_read"):
            d = r[name]
            if "mean_z" not in d:
                print(f"  {name:13s} too few windows ({d['n']})"); continue
            print(f"  {name:13s} n={d['n']:3d}  AUROC mean_z={d['mean_z']:.2f}  frac_above={d['frac_above']:.2f}  "
                  f"std_z={d['std_z']:.2f}   permutation p={d['p']:.3f}")
        inner = [r[k]["mean_z"] for k in ("inner_count", "inner_read") if "mean_z" in r[k]]
        pv = [r[k]["p"] for k in ("inner_count", "inner_read") if "p" in r[k]]
        if inner:
            verdicts.append((np.mean(inner), min(pv)))
    if verdicts:
        a = float(np.mean([v[0] for v in verdicts]))
        pmin = max(v[1] for v in verdicts)
        ok = a >= AUROC_PASS and pmin < 0.05
        print("\n=== H1 verdict (silent inner speech, mouth still) ===")
        print(f"mean AUROC {a:.2f} (pass needs >= {AUROC_PASS}); weakest session p = {pmin:.3f}")
        print("SUPPORTED in these sessions. Repeat on volunteers before claiming it." if ok else
              "NOT SUPPORTED. Report this honestly: the sensor sees mouthing, not motionless inner speech.")
        print("Caveats: windows are autocorrelated, so p is a screening rule; one person is not a population.")


if __name__ == "__main__":
    main()
