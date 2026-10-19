# You, Yourself (INI AKU · “it’s me”)

A prosthetic “this is me” signal for people who hear voices: a lip-muscle sensor (inside channel) plus the phone
microphone (outside channel), with a gentle two-channel verdict, a humming coach and a diary.

- `index.html` – the workboard: overview, products, **simulator** (runs the real `detector.js`), method, code, board
- `ide.html` – Virtual Breadboard: the wearable circuit, simulated
- `deck/` – pitch deck (`deck/index.html`, `deck/slides.json`, `deck/You_Yourself_Pitch.pptx`)
- `film/` – the 3-minute film: interactive player (`film/index.html`), renderer (`film/js/`), `timeline.json`, audio, and the MP4
- `firmware/ini_aku_esp32/` – ESP32 firmware (Arduino-ESP32; not yet flashed on a board)
- `detector.js`, `vad.js`, `live.js` – inside-channel detector, outside-channel VAD, Web Bluetooth link

Run locally: `python -m http.server 8765` (or `start.bat` on Windows), then open http://localhost:8765/.
The Code tab, Bluetooth and the microphone need http://localhost or https.

Rebuild the PPTX after editing `deck/slides.json`: `python3 tools/make_pptx.py` (needs `python-pptx`).

Research prototype. Not a medical device. No clinical claims; simulated data are labelled as such.

## The film

Voice first, picture second. `tools/film/edl.py` is the script (English narration + Indonesian subtitles);
everything else is generated from it:

1. `tools/film/voice.py` – narration with Kokoro TTS (`af_heart`), the "ayo pulang" voice, locks `film/timeline.json`
2. `tools/film/check_voice.py` – transcribes every line with Whisper to catch mispronunciations
3. `tools/film/mix.py` – original score + sound design (`score.py`, `dsp.py`), ducking, −16 LUFS master
4. `node tools/film/capture.js` – renders every frame of `film/index.html?render=1` and encodes the MP4

The Python tools need a Python 3.12 venv with `kokoro soundfile scipy misaki[en] faster-whisper pyloudnorm`;
the capture needs Playwright + Chromium and the site served on `localhost:8765`.
The story is dramatised from a published, anonymised case report (Amelia, Rafiyah & Widianti, 2025);
"Senja" is our name for "Ny. G". The "imagine" scene is labelled as imagined, with a simulated signal.
