"""Transcribe every narrator line and whisper with Whisper ASR, flag lines that don't match the script."""
import json, os, re, sys
import numpy as np, soundfile as sf
from scipy.signal import resample_poly
from faster_whisper import WhisperModel
HERE = os.path.dirname(os.path.abspath(__file__))
tl = json.load(open(os.path.join(HERE, "..", "..", "film", "timeline.json")))
narr, sr = sf.read(os.path.join(HERE, "build", "narration.wav"), dtype="float32")
m = WhisperModel("small.en", device="cpu", compute_type="int8")
norm = lambda s: re.sub(r"[^a-z0-9 ]", "", s.lower().replace("-", " ")).split()
def asr(a):
    a16 = resample_poly(a, 1, 3).astype(np.float32)
    segs, _ = m.transcribe(a16, beam_size=5, language="en")
    return " ".join(s.text.strip() for s in segs)
bad = 0
for ln in tl["lines"]:
    a = narr[int(ln["start"] * sr): int(ln["end"] * sr)]
    heard = asr(a)
    exp, got = norm(ln["en"]), norm(heard)
    same = sum(1 for w in exp if w in got) / max(1, len(exp))
    flag = "" if same >= 0.8 else "  <-- CHECK"
    bad += bool(flag)
    print(f"{ln['id']} {same:4.0%} | {ln['en']}  ==>  {heard}{flag}")
for w in tl["whispers"]:
    a, _ = sf.read(os.path.join(HERE, "build", w["id"] + ".wav"), dtype="float32")
    print(w["id"], w["style"], "==>", asr(a))
print("flagged:", bad)
