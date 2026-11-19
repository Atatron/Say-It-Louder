"""Write a synthetic audio clip and the Python VAD's per-frame decisions,
so test_core.c can check the C VAD gives the same answers."""
import sys
from pathlib import Path

import numpy as np

HERE = Path(__file__).parent
sys.path.insert(0, str(HERE.parent / "python"))
from yy import synth, vad  # noqa: E402

fs = vad.FS
noise = synth.audio_noise(8.0, fs, 0.01)
speech = synth.audio_speechlike(8.0, fs, 0.15)
audio = noise.copy()
audio[3 * fs:6 * fs] += speech[3 * fs:6 * fs]       # speech-like from 3 s to 6 s
audio = audio.astype(np.float32)
audio.tofile(HERE / "vad_audio.f32")
flags = vad.run(audio.astype(np.float64))
(HERE / "vad_expected.txt").write_text("".join("1" if f else "0" for f in flags))
print(f"{len(flags)} frames, {sum(flags)} speech")
