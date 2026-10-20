"""Ingest live-action clips as plates for the renderer.

Put each clip at tools/film/build/clips/<id>.mp4 (ids from tools/film/shotlist.md), then run:
    python3 tools/film/plates.py            # every clip present
    python3 tools/film/plates.py A1 D3      # just these
Each clip becomes a 24 fps, 1920x1080 JPEG sequence in tools/film/build/plates/<id>/, and
tools/film/plates.json (read by film/js/plates.js) lists the plates with their windows on the
film's timeline. Windows follow the narration cues, so they move if the voice is re-recorded.
Per-plate tweaks (where in the clip to start, a slow push, a reframe) live in TUNE below.
"""
import json, os, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
CLIPS, PLATES = os.path.join(HERE, "build", "clips"), os.path.join(HERE, "build", "plates")
TL = json.load(open(os.path.join(ROOT, "film", "timeline.json")))
C, SHOT = TL["cues"], {s["name"]: s for s in TL["shots"]}
LINE = {l["id"]: l for l in TL["lines"]}
FPS = 24


def windows():
    """id -> (shot, start, end), from the timeline."""
    sh = lambda n: (SHOT[n]["start"], SHOT[n]["end"])
    return {
        "A1": ("class", *sh("class")),
        "B1": ("family", SHOT["family"]["start"], C["father"]),
        "B2": ("family", C["father"], SHOT["family"]["end"]),
        "C1": ("weight", *sh("weight")),
        "D1": ("voice", SHOT["voice"]["start"], LINE["L10"]["start"] - 0.1),
        "D2": ("voice", LINE["L10"]["start"] - 0.1, C["ears"] - 0.04),
        "D3": ("voice", C["ears"] - 0.04, SHOT["voice"]["end"]),
        "E1": ("hospital", *sh("hospital")),
        "F1": ("crayons", SHOT["crayons"]["start"], C["day1"]),
        "G1": ("crayons", C["day1"], C["day1"] + 1.55),
        "G3": ("crayons", C["day3"], C["day3"] + 1.77),
        "M1": ("crayons", C["day3"] + 1.77, C["day3"] + 4.27),
        "H1": ("imagine", SHOT["imagine"]["start"], C["emg"] - 0.08),
        "H2": ("imagine", C["emg"] - 0.08, C["press"] - 0.1),
        "H3": ("imagine", C["press"] - 0.1, C["hum"]),
        "H4": ("imagine", C["hum"], SHOT["imagine"]["end"]),
        "I1": ("close", SHOT["close"]["start"], LINE["L53"]["start"] - 0.06),
    }


# per-plate tweaks: src = seconds into the clip where the window starts; push = slow zoom from→to;
# offset = [x, y] reframe in pixels
TUNE = {}


def extract(pid):
    src, out = os.path.join(CLIPS, pid + ".mp4"), os.path.join(PLATES, pid)
    os.makedirs(out, exist_ok=True)
    for f in os.listdir(out):
        os.remove(os.path.join(out, f))
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", src, "-an",
                    "-vf", f"fps={FPS},scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,setsar=1",
                    "-q:v", "2", os.path.join(out, "f%04d.jpg")], check=True)
    return len([f for f in os.listdir(out) if f.endswith(".jpg")])


def main():
    win = windows()
    want = sys.argv[1:] or (sorted(p[:-4] for p in os.listdir(CLIPS) if p.endswith(".mp4")) if os.path.isdir(CLIPS) else [])
    for pid in want:
        if pid not in win:
            sys.exit(f"unknown plate id {pid}; known: {', '.join(win)}")
        n = extract(pid)
        print(f"{pid}: {n} frames ({n / FPS:.1f} s) for a {win[pid][2] - win[pid][1]:.2f} s window")
    plates = []
    for pid, (shot, a, b) in win.items():
        d = os.path.join(PLATES, pid)
        n = len([f for f in os.listdir(d) if f.endswith(".jpg")]) if os.path.isdir(d) else 0
        if n:
            plates.append({"id": pid, "shot": shot, "start": round(a, 3), "end": round(b, 3), "frames": n,
                           "src": 0.0, **TUNE.get(pid, {})})
    json.dump({"fps": FPS, "root": "../tools/film/build/plates", "plates": plates},
              open(os.path.join(HERE, "plates.json"), "w"), indent=1)
    print(f"plates.json: {len(plates)} plate(s): {', '.join(p['id'] for p in plates) or 'none'}")


if __name__ == "__main__":
    main()
