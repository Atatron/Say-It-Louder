"""Record the narration and the whispers, then lock the timeline.

Run with the film venv:  /home/user/.venvs/film/bin/python tools/film/voice.py
Outputs
  tools/film/build/narration.wav   mono 48 kHz, narrator only, placed on the timeline
  tools/film/build/w*.wav          dry whisper takes (processed later in mix.py)
  film/timeline.json               shots, chapters, cues, lines (+ word timings), whispers
"""
import hashlib, json, os, re, sys
import numpy as np
import soundfile as sf
from scipy.signal import resample_poly

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
BUILD = os.path.join(HERE, "build")
CACHE = os.path.join(BUILD, "cache")
os.makedirs(CACHE, exist_ok=True)
sys.path.insert(0, HERE)
from edl import EDL, WHISPER_TEXT, WHISPER_CAPTION  # noqa: E402

SR_TTS, SR = 24000, 48000
NARRATOR, MOTHER = "af_heart", "af_bella"
WHISPER_SPEED = {"far": 0.80, "near": 0.84, "close": 0.86, "warm": 0.90}

_pipe = None
def pipeline():
    global _pipe
    if _pipe is None:
        from kokoro import KPipeline
        _pipe = KPipeline(lang_code="a", repo_id="hexgrad/Kokoro-82M")
    return _pipe

def tts(text, voice, speed):
    """Return (audio float32 @24k, words [(text, start, end)]) with caching."""
    key = hashlib.sha1(f"{text}|{voice}|{speed}".encode()).hexdigest()[:16]
    wav, meta = os.path.join(CACHE, key + ".wav"), os.path.join(CACHE, key + ".json")
    if os.path.exists(wav) and os.path.exists(meta):
        a, _ = sf.read(wav, dtype="float32")
        return a, [tuple(w) for w in json.load(open(meta))]
    chunks, words, off = [], [], 0.0
    for r in pipeline()(text, voice=voice, speed=speed):
        a = r.audio.numpy().astype(np.float32)
        for tk in (r.tokens or []):
            if tk.start_ts is not None and tk.text.strip() and any(c.isalnum() for c in tk.text):
                words.append((tk.text, off + tk.start_ts, off + (tk.end_ts or tk.start_ts)))
        chunks.append(a); off += len(a) / SR_TTS
    a = np.concatenate(chunks)
    sf.write(wav, a, SR_TTS); json.dump(words, open(meta, "w"))
    return a, words

def trim(a, sr, thresh_db=-48, pad=0.03):
    """Trim leading/trailing silence; return (audio, seconds removed from the start)."""
    env = np.convolve(np.abs(a), np.ones(int(sr * 0.01)) / (sr * 0.01), mode="same")
    on = np.where(env > 10 ** (thresh_db / 20))[0]
    if len(on) == 0:
        return a, 0.0
    s = max(0, on[0] - int(pad * sr)); e = min(len(a), on[-1] + int(pad * sr))
    return a[s:e], s / sr

def level(a, target_rms_db=-20.0):
    """Even out loudness across lines (RMS over voiced parts)."""
    frame = 1024
    n = len(a) // frame
    if n == 0:
        return a
    rms = np.sqrt(np.mean(a[: n * frame].reshape(n, frame) ** 2, axis=1))
    voiced = rms[rms > np.max(rms) * 0.1]
    cur = 20 * np.log10(np.sqrt(np.mean(voiced ** 2)) + 1e-9)
    return a * 10 ** ((target_rms_db - cur) / 20)

def up(a):
    return resample_poly(a, SR // SR_TTS, 1).astype(np.float32)

def main():
    t = 0.0
    shots, chapters, cues, lines, whispers = [], [], {}, [], []
    placed = []  # (start_seconds, audio@48k)
    for item in EDL:
        kind = item[0]
        if kind == "chapter":
            chapters.append({"label": item[1], "t": round(t, 3)})
        elif kind == "shot":
            if shots:
                shots[-1]["end"] = round(t, 3)
            shots.append({"name": item[1], "start": round(t, 3)})
        elif kind == "cue":
            cues[item[1]] = round(t, 3)
        elif kind == "gap":
            t += item[1]
        elif kind == "say":
            _, lid, text, sub, opts = item
            a, words = tts(text, NARRATOR, opts.get("speed", 1.0))
            a, cut = trim(a, SR_TTS)
            a = level(a)
            dur = len(a) / SR_TTS
            placed.append((t, up(a)))
            lines.append({
                "id": lid, "start": round(t, 3), "end": round(t + dur, 3),
                "en": re.sub(r"\[([^\]]+)\]\(/[^)]*/\)", r"\1", text),
                "sub": sub,  # the on-screen English caption
                "words": [{"w": w, "s": round(t + s - cut, 3), "e": round(t + e - cut, 3)} for w, s, e in words],
            })
            t += dur
        elif kind == "whisper":
            _, wid, opts = item
            style = opts.get("style", "near")
            a, words = tts(WHISPER_TEXT, MOTHER, WHISPER_SPEED[style])
            a, cut = trim(a, SR_TTS)
            a = level(a)
            sf.write(os.path.join(BUILD, f"{wid}.wav"), up(a), SR)
            dur = len(a) / SR_TTS
            whispers.append({"id": wid, "start": round(t, 3), "end": round(t + dur, 3), "style": style,
                             "pan": opts.get("pan", 0.0),
                             "words": [{"w": w, "s": round(t + s - cut, 3), "e": round(t + e - cut, 3)} for w, s, e in words]})
            t += dur
        else:
            raise ValueError(item)
    shots[-1]["end"] = round(t, 3)
    total = round(t, 3)

    # Captions: one per narrator line (and one per whisper, in italics), held a little past the
    # line, never overlapping the next caption.
    cues_ = sorted([(ln["start"], ln["end"], ln["sub"], False) for ln in lines if ln["sub"]] +
                   [(w["start"], w["end"], WHISPER_CAPTION, True) for w in whispers])
    subs = []
    for i, (st, en, text, italic) in enumerate(cues_):
        nxt = cues_[i + 1][0] if i + 1 < len(cues_) else total
        end = min(max(en + 0.35, st + 1.3), nxt - 0.08)
        subs.append({"start": round(st - 0.05, 3), "end": round(end, 3), "text": text, "italic": italic})

    narr = np.zeros(int((total + 1) * SR), np.float32)
    for st, a in placed:
        i = int(st * SR); narr[i:i + len(a)] += a
    sf.write(os.path.join(BUILD, "narration.wav"), narr, SR)

    tl = {"duration": total, "fps": 24, "shots": shots, "chapters": chapters, "cues": cues,
          "lines": lines, "whispers": whispers, "subs": subs}
    json.dump(tl, open(os.path.join(ROOT, "film", "timeline.json"), "w"), indent=1, ensure_ascii=False)
    print(f"total {total:.2f}s  ({int(total // 60)}:{total % 60:04.1f})  lines {len(lines)}  shots {len(shots)}")
    for s in shots:
        print(f"  {s['name']:<10} {s['start']:7.2f} → {s['end']:7.2f}  ({s['end'] - s['start']:.1f}s)")

if __name__ == "__main__":
    main()
