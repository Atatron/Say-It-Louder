# You, Yourself (INI AKU · “it’s me”)

A prosthetic “this is me” signal for people who hear voices: a lip-muscle sensor (inside channel) plus the phone
microphone (outside channel), with a gentle two-channel verdict, a humming coach and a diary.

- `index.html` – the workboard: overview, products, **simulator** (runs the real `detector.js`), method, code, board
- `ide.html` – Virtual Breadboard: the wearable circuit, simulated
- `deck/` – pitch deck (`deck/index.html`, `deck/slides.json`, `deck/You_Yourself_Pitch.pptx`)
- `firmware/ini_aku_esp32/` – ESP32 firmware (Arduino-ESP32; not yet flashed on a board)
- `detector.js`, `vad.js`, `live.js` – inside-channel detector, outside-channel VAD, Web Bluetooth link

Run locally: `python -m http.server 8765` (or `start.bat` on Windows), then open http://localhost:8765/.
The Code tab, Bluetooth and the microphone need http://localhost or https.

Rebuild the PPTX after editing `deck/slides.json`: `python3 tools/make_pptx.py` (needs `python-pptx`).

Research prototype. Not a medical device. No clinical claims; simulated data are labelled as such.
