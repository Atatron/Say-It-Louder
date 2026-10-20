# You, Yourself (INI AKU · “it’s me”)

A prosthetic “this is me” signal for people who hear voices: a lip-muscle sensor (inside channel) plus the phone
microphone (outside channel), with a gentle two-channel verdict, a humming coach and a diary.

- `index.html` – the workboard: overview, products, **simulator** (runs the real `detector.js`), method, code, board
- `ide.html` – Virtual Breadboard: the wearable circuit, simulated
- `deck/` – pitch deck (`deck/index.html`, `deck/slides.json`, `deck/You_Yourself_Pitch.pptx`)
- `film/` – the film: video player with chapters (`film/index.html`), frame renderer (`film/render.html`, `film/js/`), `timeline.json`, and the MP4
- `firmware/ini_aku_esp32/` – ESP32 firmware (Arduino-ESP32; not yet flashed on a board)
- `detector.js`, `vad.js`, `live.js` – inside-channel detector, outside-channel VAD, Web Bluetooth link

Run locally: `python -m http.server 8765` (or `start.bat` on Windows), then open http://localhost:8765/.
The Code tab, Bluetooth and the microphone need http://localhost or https.

Rebuild the PPTX after editing `deck/slides.json`: `python3 tools/make_pptx.py` (needs `python-pptx`).

Research prototype. Not a medical device. No clinical claims; simulated data are labelled as such.

## The film

A short film, based on a true story: an anonymised, published nursing case report. It tells the case,
not the person: "Senja" is not her real name, and identifying details (age, dates, places, family
specifics, the report's patient code) are left out. Fully in English, with English captions. The
"imagine" scene is labelled as an imagined scenario with a simulated signal.

Voice first, picture second. `tools/film/edl.py` is the script (narration + captions); everything else is
generated from it:

1. `tools/film/voice.py` – narration with Kokoro TTS (`af_heart`), the "come home" voice, locks `film/timeline.json`
2. `tools/film/check_voice.py` – transcribes every line with Whisper to catch mispronunciations
3. `tools/film/mix.py` – original score + sound design (`score.py`, `dsp.py`), ducking, −16 LUFS master
4. `node tools/film/capture.js` – renders every frame of `film/render.html` at 24 fps with motion blur (180° shutter)
5. `python3 tools/film/encode.py` – the film look (halation, mist, the `lut.py` grade, grain) + audio → `film/you-yourself-film.mp4`

The story scenes are live action, made with AI. One still per shot (`tools/film/shotlist.md`) comes either
from Canva's image generator or from `tools/film/genstills.py`, which runs an open photoreal model locally.
`tools/film/parallax.py` estimates depth and turns each still into a slow camera move, and `tools/film/plates.py`
lists the results in `tools/film/plates.json`. The renderer draws them under the captions and callouts.
Her face is never shown, and the opening card and the credits say the scenes are a dramatization with
AI-generated imagery.

`film/index.html` plays the finished MP4 with chapters; `film/render.html?t=<seconds>` shows any single frame.
The Python tools need a Python 3.12 venv with `kokoro soundfile scipy misaki[en] faster-whisper pyloudnorm`;
the capture needs Playwright + Chromium and the site served on `localhost:8765`.
