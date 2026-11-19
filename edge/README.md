# You, Yourself: edge prototype

Both channels on one ESP32-S3: MyoWare 2.0 EMG (inside) and microphone voice
activity detection (outside), combined into the paper's four outcomes when the
person presses "I hear a voice". Design and limits: [`../docs/real-vs-imagined-voice.md`](../docs/real-vs-imagined-voice.md).

**Research prototype. Not a medical device. All current results are from synthetic signals.**

## Layout

```
python/yy/emg_features.py   features from the 100 Hz envelope + contact check
python/yy/vad.py            band-energy voice activity detection (no audio kept)
python/yy/fusion.py         four outcomes, wording, gated tap, coupling test
python/yy/mlp.py            9 -> 16 -> 4 network in numpy, exports a C header
python/yy/synth.py          SYNTHETIC signal generators for testing only
python/train_emg.py         train on --synthetic or --data <folder of CSVs>
python/tests/               pytest suite
firmware/you_yourself_edge/ Arduino sketch (XIAO ESP32S3 Sense) + portable C core
host_test/                  compiles the C core on a PC, checks parity with Python and the simulator
```

## Run

```bash
pip install numpy pytest
cd python && python -m pytest -q tests        # 10 tests
python train_emg.py --synthetic                # writes firmware/.../emg_model.h
cd ../host_test && make                        # C core vs Python parity + safety rules
```

With real recordings (one CSV per session, columns `env,label`, labels
`rest|speech_motor|swallow|chew`, at least 10 s of `rest`):

```bash
python train_emg.py --data ../recordings/     # prints leave-one-session-out accuracy
```

Then open `firmware/you_yourself_edge/` in the Arduino IDE (ESP32 core 3.x,
board "XIAO_ESP32S3"), flash, and open the serial monitor at 115200.
Serial commands for bench work: `cal`, `cue on`, `cue off`, `lang id`, `lang en`, and `sim`.
`sim` replays four scripted scenarios (quiet room, silent mouthing, someone else speaking, electrode lifted)
through the same code as a demo backup. Its output is labelled SIMULATED, never taps, and saves nothing.
Output is Indonesian by default; the Indonesian sentences are a DRAFT for your psychiatrist to edit.

## Wiring (XIAO ESP32S3 Sense)

| From | To |
|---|---|
| MyoWare VIN / GND | 3V3 / GND |
| MyoWare ENV | A0 (GPIO1, ADC1) |
| Button | D1 to GND (internal pull-up) |
| D2 | 1 kΩ → NPN base; motor on collector with 1N4148 flyback diode |
| Microphone | on the Sense board (PDM, GPIO42 clock / GPIO41 data) |

Battery power only while electrodes are on skin. Never wear while charging.

## Not done yet

- The sketch has not been compiled with the ESP32 toolchain or run on a board.
- The contact-check limits are placeholders until bench recordings exist.
- Control prompts, the diary and the coping coach live in the phone app, not here.
