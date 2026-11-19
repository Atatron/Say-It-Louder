"""Record one labelled session from the board (or simulate one).

  python record_session.py --port COM5 --name me_day1 --placement "under chin, 2 cm apart" --out ../recordings
  python record_session.py --simulate --name fake1 --out /tmp/fake        # SYNTHETIC, no hardware

The board must be flashed with you_yourself_edge.ino. This script sends
"stream on"; the board then prints one envelope number per line at 100 Hz.
Output: <name>.csv with columns env,label, and <name>.meta.json.
Only the muscle envelope is recorded. No audio.
"""
from __future__ import annotations

import argparse
import json
import sys
import time
from datetime import datetime
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).parent))
from session_script import FS, build_script, total_seconds   # noqa: E402


def simulate_block(label: str, n: int, rng, inner_effect: float):
    from yy import synth
    if label in ("rest", ""):
        return synth.rest(rng, n)
    if label == "speech_motor":
        return synth.speech_motor(rng, n)
    if label == "swallow":
        return synth.swallow(rng, n)
    if label == "chew":
        return synth.chew(rng, n)
    if label == "hum":
        return synth.rest(rng, n) + 25 * (0.5 + 0.5 * np.sin(np.arange(n) / FS * 2 * np.pi * 1.0))
    if label.startswith("inner_"):
        x = synth.rest(rng, n)
        if inner_effect > 0:       # SYNTHETIC coupling, for testing the analysis only
            for _ in range(int(n / FS / 4)):
                s = int(rng.integers(0, max(n - 60, 1)))
                x[s:s + 60] += inner_effect * rng.uniform(0.7, 1.3)
        return x
    raise ValueError(label)


def read_numbers(ser, count):
    out = []
    while len(out) < count:
        line = ser.readline().decode(errors="ignore").strip()
        if line.lstrip("-").isdigit():
            out.append(int(line))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--port")
    ap.add_argument("--name", required=True)
    ap.add_argument("--placement", default="", help="where the electrodes were, e.g. 'under chin'")
    ap.add_argument("--out", type=Path, default=Path("../recordings"))
    ap.add_argument("--simulate", action="store_true", help="SYNTHETIC data, no hardware")
    ap.add_argument("--inner-effect", type=float, default=0.0, help="simulate only: fake coupling amplitude")
    ap.add_argument("--no-decisive", action="store_true")
    args = ap.parse_args()

    script = build_script(not args.no_decisive)
    print(f"{len(script)} blocks, about {total_seconds(script) / 60:.0f} minutes. Ctrl+C to stop; nothing is saved then.")
    rows = []
    rng = np.random.default_rng(abs(hash(args.name)) % (2 ** 32))
    ser = None
    if not args.simulate:
        import serial                       # pip install pyserial
        ser = serial.Serial(args.port, 115200, timeout=1)
        print("Waiting for the board (it calibrates for 30 s after power-up)...")
        t0 = time.time()
        while True:
            ser.write(b"stream on\n")
            line = ser.readline().decode(errors="ignore").strip()
            if line.lstrip("-").isdigit():
                break
            if time.time() - t0 > 120:
                sys.exit("No numbers from the board. Check the port, baud 115200 and the sketch.")
    for i, (prompt, label, sec) in enumerate(script, 1):
        n = int(sec * FS)
        print(f"[{i}/{len(script)}] {sec:>3d}s  {prompt}", flush=True)
        if label:
            print("\a", end="")
        if args.simulate:
            vals = np.round(simulate_block(label, n, rng, args.inner_effect)).astype(int).tolist()
        else:
            vals = read_numbers(ser, n)
        rows += [(v, label) for v in vals]
    if ser:
        ser.write(b"stream off\n")
    args.out.mkdir(parents=True, exist_ok=True)
    csv_path = args.out / f"{args.name}.csv"
    with open(csv_path, "w") as f:
        f.write("env,label\n")
        f.writelines(f"{v},{l}\n" for v, l in rows)
    (args.out / f"{args.name}.meta.json").write_text(json.dumps({
        "name": args.name, "placement": args.placement, "fs_hz": FS,
        "recorded": datetime.now().isoformat(timespec="seconds"),
        "simulated": args.simulate, "inner_effect": args.inner_effect if args.simulate else None,
    }, indent=2))
    print(f"saved {csv_path} ({len(rows)} samples)")


if __name__ == "__main__":
    main()
