# Real voice or inner voice? Feasibility and design of an on-device check

Companion to the paper *You, Yourself* (v2, November 2026) and its build and study plan.
Research prototype. Not a medical device. It does not diagnose anything.

## 1. The short answer

**No device can hear a voice that happens inside someone's head, so no model can label a voice "real" or "imagined".** A voice that the brain makes produces no sound waves for a microphone and no signal that any wearable can read as "that was a hallucination".

What a small device *can* do is check two outside facts at the moment the person presses "I hear a voice":

| Question | Sensor | How well it can be answered |
|---|---|---|
| Was anyone nearby actually speaking? | Microphone + voice activity detection | **Well.** Mature, cheap and fast. Works on an ESP32 today. |
| Were your own speech muscles active? | MyoWare 2.0 EMG below the lower lip (optional: under the chin) | **Unknown.** Mouthing and whispering are easy to see. Motionless inner speech may be too small for a hobby sensor. This is hypothesis H1 in the paper and must be tested first. |

Put together, those two facts give one of the paper's four outcomes (Table 5), always worded as "probably" or "can't tell". The most useful honest sentence the device can say is *"nobody near you was speaking just now"*. The muscle channel may add *"and your speech muscles were active"* for some people, some of the time.

So the project is feasible as an **assistive cue**, not as a real-vs-imagined classifier. That distinction is what will make a psychiatrist and a judge trust it.

### Why not train one model that outputs "real" or "imagined"?

1. **There is no ground truth.** The only label is the person's own report, and the inner-speech account covers some voices only (about 4 in 10 voice-hearers describe voices more like replayed memories). A model trained on button presses would learn the person's pressing habits.
2. **The voice leaves no trace on the mic.** "No speech nearby" is all the mic can say. It cannot turn that into "so it was your brain".
3. **A wrong answer can hurt.** Telling someone a real voice was imagined, or that a voice is definitely theirs, is the "false 'this is you'" and "distress from the result" hazards in the paper's Table 7.

The design below therefore uses small models for the two *measurable* things and a fixed, auditable rule to combine them.

## 2. What each signal can and cannot tell

### 2.1 Outside channel: is there real speech nearby?

- **Method in the prototype:** energy in the 300-3400 Hz band against an adaptive noise floor. Speech when at least 250 ms of the last 512 ms is 12 dB above the floor. This is the paper's rule, loosened slightly so normal gaps between syllables don't reset it. It needs no training and keeps two numbers per 32 ms frame. No audio is stored or sent.
- **Upgrade if real rooms show too many false alarms** (fans, traffic, music): a tiny speech/non-speech CNN on log-mel features (int8 TensorFlow Lite Micro, about 20-60 KB, same shape as the `micro_speech` example), trained on public datasets. On a Raspberry Pi, Silero VAD or WebRTC VAD work out of the box.
- **Limits to state openly:**
  - A TV, radio, phone call or video *is* real outside sound, so it counts as speech. The wording "real speech near you" is still true.
  - Quiet speech in the next room, or speech below the noise floor, can be missed. "Nobody was speaking" really means "the mic didn't pick up speech".
  - If the person wears earphones, the mic cannot hear what plays in them. The app should ask about earphones during setup.
  - If the person speaks aloud, the mic hears speech and the EMG is active. The device returns "can't separate the two", which is correct.
- **Stretch: where is the sound coming from?** Two I2S microphones (for example a pair of INMP441) can estimate direction and near-field level. The wearer's own mouth is close and in a fixed direction, while other people are farther away. This could split "you talking aloud" from "someone else talking". It is a nice extra, not needed for the core.

### 2.2 Inside channel: were the speech muscles active?

- **Sensor:** MyoWare 2.0 ENV output, read on an ADC1 pin and averaged to a 100 Hz envelope, as in the paper.
- **Model:** nine features from each 2 s window, computed every 0.5 s against the person's own 30 s rest baseline (median and MAD). The features are mean, peak and spread of the signal, time above threshold, longest run, burst count and length, and how regular the bursts are, since chewing is rhythmic. A 9 → 16 → 4 network classifies each window as rest, speech-motor, swallow or chew. That is 228 weights (under 1 KB) and a few microseconds per window, with no ML runtime. It replaces the paper's hand-tuned duration rules only if real recordings show the rules are too crude. Both can run side by side.
- **Contact check:** a flat or railed trace means an electrode has lifted. The window then counts as *no information*, never as silence and never as speech.
- **Limits to state openly:**
  - Mouthing is easy. Motionless inner speech may be invisible to this sensor (H1). Run the decisive test on your own lip before anything else: count silently with the mouth still and see whether anything rises above baseline.
  - Smiling, talking, chewing gum, head movement and medication side effects (for example tremor or dyskinesia) all move these muscles.
  - **Order is unknowable.** Many people answer their voices under their breath. Active muscles may follow the voice instead of causing it.
  - Silence from the sensor says nothing about where a voice came from. This will be the most common result.

### 2.3 Signals that are not worth adding for this question

- **Consumer EEG** can't measure the N1 suppression effect outside a lab, and the corollary-discharge evidence comes from averaging many trials.
- **Heart rate and skin conductance** show arousal or distress, not where a voice came from. They could support the distress diary later, but they don't help the source question.

### 2.4 How the two are combined

At a button press the device looks back 10 s:

| | Mic: no speech | Mic: speech |
|---|---|---|
| **Muscles active** (≥ 2 consecutive windows with p(speech-motor) ≥ 0.6) | "Your speech muscles were active and no one near you was speaking. This voice may be your own inner speech." Two-tap cue **only if earned** | "There was real speech near you, and your speech muscles were active. This check can't separate the two." |
| **Nothing detected** | "The sensor picked up nothing this time. That is common, and it says nothing about where the voice came from." | "The microphone heard real speech near you." |
| **Electrode off** | "The muscle sensor isn't reading properly right now…" | "The microphone heard real speech near you." |
| **Mic off** | No claim about the room. No tap. | (not applicable) |

The two-tap cue stays off until that person's own data pass the coupling test (paper §5.7: ≥ 30 voice and 30 control windows, tested only at 30, 55 and 80, one-sided Fisher p < 0.05, at least a twofold rate) **and** their clinician switches it on. The coping coach is offered after every outcome.

## 3. What runs where

| Option | Fits | Notes |
|---|---|---|
| **Seeed XIAO ESP32S3 Sense** (recommended) | Both channels on one thumb-sized board: built-in PDM mic, LiPo charging, 8 MB PSRAM | The prototype sketch targets this. VAD uses a few % of one core and the MLP is negligible. Room for a TFLM CNN later. |
| ESP32 DevKit V1 + INMP441 I2S mic | Same, on a breadboard | Needs the 5 V boost noted in the build plan if run from a LiPo. |
| Raspberry Pi Zero 2 W / Pi 4 | Silero VAD, TFLite, Python | Easiest for ML experiments. Too power-hungry for daily wear, but fine as a desk demo. |
| Phone (the paper's current design) | Web Audio VAD in the browser; ESP32 streams EMG over BLE | Already implemented in the web demo. The edge version adds a no-phone option. |

**Privacy:** audio is processed frame by frame in RAM and overwritten. Only the outcome code, and later the diary entry, leaves the board, and only over BLE to the person's own phone.

## 4. Data needed

**For the hackathon, no patient data at all.** Only you and consenting healthy adults.

**Inside channel (EMG):**

1. Your own lip, using the scripted session from the build plan: 60 s rest, 10 silent mouthings, 10 swallows, 30 s chewing, 10 spoken sentences, 30 s humming, then the decisive test (silent counting and silent reading with the mouth still).
2. Save each session as a CSV with one row per 100 Hz sample: `env,label`. Labels are `rest`, `speech_motor`, `swallow`, `chew`, or blank. A simple on-screen timer that tells you what to do and writes the label is enough.
3. Aim for 10 or more sessions over several days, then 5-10 volunteers. `train_emg.py --data` reports **leave-one-session-out** accuracy, which is the number to quote.
4. Targets from the paper's stage 1: at least 80% of mouthing events detected, under 2 false events per hour at rest. Report the silent-inner-speech result whatever it is.

**Outside channel (mic):**

- The DSP detector needs no training data, but it does need **testing**: a quiet room, a fan, traffic, a TV, a café, and a person speaking at 1 m, at 3 m and from the next room. Count misses and false alarms per hour. Only the per-frame numbers need saving, not audio.
- If you later train a CNN, use public data (LibriSpeech or Speech Commands for speech; MUSAN or ESC-50 for noise) so that no one's private audio is collected.

## 5. Hackathon prototype plan

**What this repository now contains** (see `edge/README.md`):

- `edge/python/`: reference implementation (features, VAD, fusion, coupling test), trainer, C-header export and 10 tests.
- `edge/firmware/you_yourself_edge/`: ESP32-S3 sketch with a portable C core (`yy_core.c`) and the generated model header.
- `edge/host_test/`: compiles the C core on a PC and checks that it matches the Python reference.

**Status:** everything runs on **synthetic** signals only. The Python tests pass, and the C core matches Python to within 1e-6 on the EMG windows and frame for frame on the VAD. The sketch passes a C++ syntax check against stub headers but **has not been compiled with the ESP32 toolchain or run on a board**. The current model header is trained on made-up data and must be retrained on real recordings.

**Suggested schedule (about 4 days once parts arrive):**

| Day | Do | Done when |
|---|---|---|
| 0 | Order the MyoWare 2.0, cable shield, electrodes and XIAO ESP32S3 **Sense** (the Sense version has the mic). | Parts ordered |
| 1 | Flash the sketch. Forearm test first, then your lip. Record the scripted sessions. **Run the decisive test.** | Saved CSVs and an honest yes or no on silent inner speech |
| 2 | `train_emg.py --data`, flash the real header, then test the VAD in 5 rooms. | Leave-one-out table and VAD false-alarm count |
| 3 | 3-5 volunteers. Make the demo video with a live trace. | First real numbers |
| 4 | Slides: what is tested, on whom, and what is not. Rehearse. | |

**Live demo script (healthy presenter, not a patient):**

1. Quiet room, mouth a sentence silently, press → "muscles active, no one speaking".
2. A teammate talks, press → "the microphone heard real speech".
3. Sit still, press → "the sensor picked up nothing… says nothing about where the voice came from".
4. Lift an electrode, press → the device refuses to make a muscle claim.

Then say plainly: *"This shows two sensors working on a healthy person. It does not detect hallucinations, and it has not been tested with anyone who hears voices."*

## 6. Honest limits (put these on a slide)

- It never says a voice is real or not real. It reports whether there was outside speech and whether the speech muscles moved.
- Silence from the muscle sensor is uninformative, and it will be the most common result.
- Muscle activity may be the person answering the voice. The device can't tell which came first.
- Motionless inner speech may not be detectable with this sensor at all (H1, untested).
- "No speech nearby" means "the mic didn't hear speech". It does not cover earphones, very quiet speech or speech in other rooms.
- All current numbers come from synthetic signals.
- It is an add-on introduced by a clinician, never a stand-alone tool, and never a medical device. Any use with people who hear voices needs ethics approval, written consent and a responsible psychiatrist (paper §7).
