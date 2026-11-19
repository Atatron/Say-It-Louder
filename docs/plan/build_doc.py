"""Builds You_Yourself_Edge_Plan.docx from the figures in figs/."""
from pathlib import Path
from docgen import (new_document, para, heading, bullets, table, figure, boxed, header_footer, MUTED)

HERE = Path(__file__).parent
F = lambda n: str(HERE / "figs" / n)
doc = new_document("Calibri", 10.5, 2.0)
header_footer(doc, "You, Yourself · Edge plan: hardware, AI model and hackathon · Research prototype, not a medical device")

para(doc, "**You, Yourself**", size=24, after=0)
para(doc, "Edge plan: how the device works, how it can look, the AI model plan, and a hackathon schedule", size=13, color=MUTED, after=4)
para(doc, "Prepared for Ata · 20 November 2026 · Companion to the paper (v2) and the build and study plan (v2). "
     "Status: the code in the repository runs on synthetic signals only. No real recording, no hardware run and no human data yet.", size=9, color=MUTED)

heading(doc, "1. The answer to your question")
boxed(doc, "**Can a model tell whether a voice is a real person outside, or only your own inner voice?** "
      "Not directly. A voice that the brain makes leaves no sound and no signal that any wearable can label 'imagined'. "
      "What the device can do is check two outside facts at the moment you press the button: "
      "(1) did the microphone hear real speech nearby, and (2) were your own speech muscles active. "
      "It then says one of four careful sentences, always 'probably' or 'can't tell'. "
      "The AI models in this plan detect those two facts. They never output 'real' or 'imagined'.", 17.0)
bullets(doc, [
    "**Outside speech** is a solved problem for a microphone. Good accuracy is realistic.",
    "**Speech-muscle activity** is the open question. Mouthing is easy to see. Motionless inner speech may be invisible to a MyoWare. Your first experiment answers this.",
    "**Silence from the muscle sensor means nothing.** It will be the most common result, and the wording says so.",
    "**It is an assistive aid, not a diagnosis or a medical device.** All processing stays on the device.",
])
figure(doc, F("fig_system.png"), 16.5, "Fig. 1. Two sensors, two small models, and fixed readable rules. The model never decides 'real' or 'imagined'.")

heading(doc, "2. What it looks like: wearable ideas")
para(doc, "The electronics fit in one matchbox-sized pendant. The only thing on the body is two small electrodes and a thin cable. "
     "Four ways to wear it are sketched below. Fig. 3 shows what is inside the pendant.")
figure(doc, F("fig_wearables.png"), 17.0, "Fig. 2. Wearable concepts. A is recommended for the hackathon. Sketches only; none is built.")
table(doc, ["Concept", "Good", "Risk / what to test", "Use for"], [
    ["A. Under-chin patch + collar cable", "Nothing visible on the face. Parts you will already have.", "No patient evidence for the under-chin site. Test it on your own muscles first.", "Hackathon demo"],
    ["B. Behind-ear and jaw band", "Looks like a headset.", "Jaw muscles are less specific to speech. Needs a mechanical design.", "Next version"],
    ["C. Soft neckband, dry electrodes", "Most like a normal wearable.", "Dry electrodes are noisy and need a firm fit. The contact check will refuse often.", "Later, if A works"],
    ["D. Lip patch (paper's design)", "The only site with patient data (11 patients, Rapin 2013).", "Conspicuous. Clinic only.", "Clinic and research"],
], [3.8, 4.6, 5.6, 3.0], caption="Table 1. Wearable options.")
figure(doc, F("fig_pendant.png"), 13.5, "Fig. 3. Inside the pendant. Slide switch is a real off switch. Battery only; never worn while charging.")
para(doc, "**Make it look good, cheaply:** a 70 x 45 x 20 mm project box or 3D print; a skin-tone or matte-grey finish; a neutral name and icon "
     "(the paper already requires this for privacy); the cable run inside a shirt collar; a short lanyard. For the demo film, shoot the pendant on a plain background and the electrode patch in close-up.")

heading(doc, "3. The AI and machine learning plan")
heading(doc, "3.1 What exactly the models detect", 2)
table(doc, ["Task", "Input", "Output", "Why this and not 'real vs imagined'"], [
    ["Inside: muscle state", "2 s window of the 100 Hz EMG envelope (optionally 1 kHz raw)", "rest / speech-motor / swallow / chew (+ 'other movement' later)", "Ground truth is known in scripted sessions, so it can be trained and checked."],
    ["Contact quality", "Same window", "ok / lead off", "A lifted electrode must never count as silence or as speech."],
    ["Outside: speech nearby", "16 kHz audio frames, never stored", "speech / no speech", "Mature task. Ground truth is easy."],
    ["Fusion", "Look-back of 10 s from both", "One of the four outcomes", "Fixed rules, so every output can be explained and audited. No learned weights."],
    ["Personal coupling test", "Voice windows vs control windows, per person", "pass / not yet", "Statistics (Fisher exact test at 30, 55, 80 windows), not ML. Decides whether the 'this is you' tap may be switched on."],
], [3.0, 4.4, 4.0, 5.6], caption="Table 2. The tasks. 'Real vs imagined' is deliberately not a task.")
boxed(doc, "**Why not train one model to output 'real' or 'imagined'?** There is no ground truth for it. The only label would be what a person says, "
      "and some voices are not inner speech at all (about 4 in 10 voice-hearers describe replayed-memory voices). "
      "The microphone cannot hear a voice that has no sound. And a wrong answer can frighten or mislead someone. "
      "A model like that would learn how people press the button, not where voices come from.", 17.0, fill="F8EFEC")

heading(doc, "3.2 Which models, in order", 2)
figure(doc, F("fig_ml_roadmap.png"), 16.8, "Fig. 4. Start simple. Move up a step only when the data show the simpler step is too crude.")
table(doc, ["Step", "Model", "Size and speed on an ESP32-S3", "Tools"], [
    ["1", "Threshold and duration rules (paper section 5.5)", "A few bytes, instant", "Already in the repo"],
    ["2", "9 features -> logistic regression, gradient-boosted trees or a 9-16-4 MLP", "MLP: 228 weights (under 1 KB), microseconds. Already built and exported to C.", "numpy, scikit-learn; export with the repo's header writer, emlearn or micromlgen"],
    ["3", "1D-CNN or small GRU on the raw 1 kHz EMG stream, int8", "About 20-60 KB, a few ms per window. Needs the raw stream (a firmware change).", "TensorFlow or PyTorch -> TFLite int8 -> TFLite Micro with ESP-NN"],
    ["4", "Personal calibration: per-person median/MAD baseline, threshold, optional few-shot fine-tune of the last layer", "Adds 30 s at start of each session", "On device"],
    ["Audio A", "Band-energy VAD with adaptive noise floor", "Tiny, no training. Built and tested.", "Already in the repo"],
    ["Audio B", "Small log-mel CNN speech detector", "About 20-60 KB, like the micro_speech example", "Train on public data (LibriSpeech, Speech Commands, MUSAN, ESC-50)"],
    ["Audio C", "Silero VAD or WebRTC VAD on a Raspberry Pi", "Pi only", "pip install"],
    ["Stretch", "Own voice vs other voice with two microphones (level and delay differences)", "Two I2S mics, a few features", "Only if time allows"],
], [1.4, 5.8, 5.2, 4.6], caption="Table 3. Model options and what fits where.")
para(doc, "**Where to train:** on your laptop. The device only runs the finished model. **Easiest alternative for a hackathon:** Edge Impulse collects "
     "data from the board, trains and exports an Arduino library. It uploads recordings to the cloud, so use it only for your own data and for healthy volunteers who agreed to that in writing, never for anyone's private audio.")

heading(doc, "3.3 Data you need and how to collect it", 2)
bullets(doc, [
    "**Only you and consenting healthy adults. No patient data.** The paper's stage 0 and stage 1.",
    "**EMG sessions.** One CSV per session, one row per 100 Hz sample, columns env,label. Script on screen: 60 s rest; 10 silent mouthings; 10 swallows; 30 s chewing; 10 spoken sentences; 30 s humming; then the **decisive test**: count silently 1 to 20 with the mouth still, and read a paragraph silently.",
    "**How much.** 10 or more sessions on you across several days and electrode placements; then 5-10 volunteers. Fewer, long, varied sessions beat many near-identical ones.",
    "**Add a raw 1 kHz recording** of the same sessions. You need it if you reach step 3.",
    "**Extra classes to record:** talking to someone, smiling, yawning, drinking, head turning. These are the main false-alarm sources.",
    "**Audio testing:** quiet room, fan, traffic, TV, cafe; a person speaking at 1 m, 3 m and from the next room. Save only the per-frame band levels, not the audio.",
    "**Labels:** written by the session script itself, not by hand afterwards. Keep a log of electrode placement, skin prep and date for each session.",
], size=10)

heading(doc, "3.4 Training and evaluation, done honestly", 2)
bullets(doc, [
    "**Split by session and by person, never by window.** Windows overlap, so a random split leaks. Report **leave-one-session-out** while it is only you, and **leave-one-person-out** once you have volunteers. The repo's trainer already prints leave-one-session-out.",
    "**Metrics that matter:** event sensitivity (did each mouthing event get flagged), false events per hour at rest, a confusion matrix, balanced accuracy, and latency from event to flag. Not plain accuracy.",
    "**Baseline first.** Compare every model to the step 1 rules and to 'always rest'. A model that doesn't beat the rules by a margin that survives a permutation test (shuffle the labels 1,000 times) is dropped.",
    "**Augmentation:** amplitude scaling of 0.6 to 1.6, baseline offset and slow drift, added noise, small time shifts, short dropouts, and mixing in movement artifacts.",
    "**Calibrate and abstain:** temperature-scale the probabilities. If the top probability is under 0.6, or contact is bad, the model says 'can't tell' and the device makes no muscle claim.",
    "**Choose thresholds from the false-alarm budget**, not from accuracy. Paper target: under 2 false events per hour at rest.",
    "**Never show synthetic accuracy as a result.** Fig. 5 is synthetic and labelled so.",
], size=10)
figure(doc, F("fig_synthetic_demo.png"), 16.0, "Fig. 5. The pipeline on SYNTHETIC signals: mouthing flagged, swallow and chewing ignored, a lifted electrode gives no claim. Real data will be messier.")

heading(doc, "3.5 Go and no-go rules", 2)
table(doc, ["Question", "Pass", "If it fails"], [
    ["H1: Does inner speech with the mouth still rise above baseline?", "Subject-level AUROC of 0.65 or more against rest, beating a permutation test, on you and at least 3 volunteers", "Drop the 'inner speech' claim. Keep detection of mouthing and the room check. Say so."],
    ["Does the model detect silent mouthing?", "At least 80% of events found; under 2 false events per hour", "Tune features, add the under-chin channel or a motion sensor"],
    ["Does it reject swallowing and chewing?", "Under 10% of swallows or chews flagged", "Add features or the 'other movement' class"],
    ["Is the microphone reliable?", "Speech at 1 m found in over 95% of tries; under 1 false alarm per hour in your quiet room", "Switch to the CNN detector; add a second mic"],
    ["Is it fast?", "Press to outcome in under 1 s", "Shrink the model or the window"],
], [5.5, 6.0, 5.5], caption="Table 4. Thresholds are my suggestions. Adjust them with your clinician and supervisor.")

heading(doc, "3.6 Putting the model on the device", 2)
bullets(doc, [
    "**Steps 1-2 and the VAD already run as plain C.** yy_core.c is the same code that the PC tests check against Python. Retrain, regenerate emg_model.h, and flash.",
    "**Step 3 (CNN):** train in Python, convert to int8 TFLite, run with TFLite Micro on the ESP32-S3 (ESP-NN speeds it up). Keep the model under about 100 KB and the arena under 100 KB of RAM.",
    "**Raspberry Pi version:** the same Python modules run directly; add Silero VAD. Good for a desk demo, too heavy for all-day wear.",
    "**Privacy by design:** audio is overwritten frame by frame. Only the outcome code leaves the board, over BLE, to the person's own phone. No account, no cloud.",
    "**Simulator mode:** a serial command that replays a recorded or synthetic session through the same code, so a demo survives a loose electrode.",
], size=10)

heading(doc, "3.7 ML risks to name before a judge does", 2)
table(doc, ["Risk", "What you do"], [
    ["Tiny, one-person dataset", "Say so. Report leave-one-session-out. Collect volunteers early."],
    ["Overlapping windows leak test data", "Split by session and by person."],
    ["Electrode placement, skin, hair and sweat change the signal", "Per-person calibration; contact check; record placement metadata; test on varied volunteers."],
    ["Movement and facial expression look like speech", "'Other movement' class; optional MPU-6050; the 'can't tell' output."],
    ["Muscle activity may follow the voice, not cause it", "The device never claims the order. Wording says 'may be'."],
    ["A model that sounds more certain than it is", "Calibrated probabilities, abstain option, fixed readable rules on top."],
    ["Synthetic-trained model mistaken for a real one", "The header file records its training data; the paper's status table says 'synthetic'."],
], [6.2, 10.8], caption="Table 5. ML risks.")

heading(doc, "4. Hackathon schedule")
para(doc, "I don't yet know your dates, so this is a **7-day plan**. Compress it to 4 days by cutting volunteer testing to 3 people and skipping the CNN. Tell me the date and I'll cut it to fit.")
table(doc, ["Day", "Do", "Done when"], [
    ["0", "Order the MyoWare 2.0, cable shield, cable, electrodes, XIAO ESP32S3 **Sense**, motor, transistor, button, switch, LiPo. Keep the USB isolator in the order. Build the pendant box design.", "Parts ordered"],
    ["1-2 (while waiting)", "Run the PC pipeline end to end. Write the session recorder. Practise the demo with the simulator. Draft the slides and the 'what is and isn't tested' slide.", "Simulated demo runs"],
    ["3", "Power check. Flash the sketch. Forearm test, then your own lip. Record scripted sessions.", "A real trace on screen"],
    ["4", "**Decisive test** on your lip and under the chin. train_emg.py --data. Save the table, whichever way it goes.", "Honest answer to H1; leave-one-session-out table"],
    ["5", "Test the microphone in 5 rooms. 3-5 volunteers with written consent.", "Real sensitivity and false-alarm numbers"],
    ["6", "Pendant box and collar cable. Film the demo and close-ups. Update slides with real numbers.", "Film and slides agree with the paper and site"],
    ["7", "Rehearse twice with the simulator as backup. Prepare the Q&A sheet.", "Demo works with and without electrodes"],
], [2.5, 10.2, 4.3], caption="Table 6. Seven-day plan.")
heading(doc, "Live demo script (healthy presenter, not a patient)", 2)
bullets(doc, [
    "Quiet room. Mouth a sentence silently, press the button: 'muscles active, no one speaking'.",
    "A teammate speaks. Press: 'the microphone heard real speech near you'.",
    "Sit still. Press: 'the sensor picked up nothing this time... says nothing about where the voice came from'.",
    "Lift an electrode. Press: the device refuses to make a muscle claim.",
    "Say it plainly: 'This shows two sensors working on a healthy person. It does not detect hallucinations. It has not been tested with anyone who hears voices.'",
], numbered=True, size=10)

heading(doc, "5. Questions judges will ask")
table(doc, ["Question", "Answer"], [
    ["Can it tell if a voice is real?", "No. It reports whether anyone nearby was speaking and whether your speech muscles moved, and says when it can't tell."],
    ["What if someone answers the voice under their breath?", "Their muscles will be active because of the voice. The device can't tell the order, and its wording says 'may be'."],
    ["Does a TV count as real speech?", "Yes. It is real sound in the room, and the sentence says so."],
    ["What does the AI do?", "Two small models detect muscle state and speech in the room. Fixed rules combine them, so every result can be explained."],
    ["Where does the data go?", "Nowhere. Processing is on the device, audio is overwritten, and any export is the person's own action."],
    ["Has it been tested on patients?", "No, and it won't be until an ethics committee approves. Here is what we tested, on whom."],
    ["Is it a medical device?", "No. It is a research prototype and says so."],
], [6.0, 11.0], caption="Table 7. Short answers.")

heading(doc, "6. Safety and limits")
bullets(doc, [
    "Never says a voice is 'not real'. Wording is probabilistic; a psychiatrist must review the Indonesian text.",
    "A missing or unreadable muscle signal is never evidence about where a voice came from.",
    "The 'this is you' tap stays off until the person's own data pass the coupling test and a clinician switches it on.",
    "Battery power only with electrodes on skin; never worn while charging; single-use pads; never over the front of the neck; stop at any redness.",
    "Not for people who believe devices monitor or control them. Any study with patients needs ethics approval, written consent and a responsible psychiatrist.",
    "All numbers so far come from synthetic signals. The ESP32 sketch passes a syntax check only; it has not been compiled with the ESP32 toolchain or run on a board.",
], size=10)

heading(doc, "7. What is in the repository and what to do next")
table(doc, ["Item", "Where", "Status"], [
    ["Feasibility doc", "docs/real-vs-imagined-voice.md", "Written"],
    ["Python reference: features, VAD, fusion, coupling test, trainer", "edge/python/", "10 tests pass (synthetic)"],
    ["Portable C core and parity test", "edge/firmware/you_yourself_edge/yy_core.c, edge/host_test/", "Matches Python within 1e-6"],
    ["ESP32-S3 sketch", "edge/firmware/you_yourself_edge/you_yourself_edge.ino", "Syntax-checked only; not run on hardware"],
    ["This plan, its figures and builder", "docs/plan/", "This file"],
], [6.2, 7.0, 3.8])
bullets(doc, [
    "**This week:** order parts; decide the dates; send your psychiatrist the paper and bring the question list in section 8.",
    "**First experiment:** the decisive test on your own lip. Everything else depends on it.",
    "**Still open from your plan:** the film's source citation, the website's Vercel account (blocked), and whether to rename the repository to match the product.",
], size=10)

heading(doc, "8. Questions to ask your psychiatrist about real patient data")
boxed(doc, "**Before anything else:** no recording, note, photo or measurement from a real patient should be collected, copied or shared until the "
      "ethics committee has approved the protocol and the person has given written consent. Real data should come from sessions the "
      "psychiatrist supervises (the paper's stages 3 and 4), not from existing medical records. Bring this list to the meeting and let "
      "the psychiatrist answer in their own words.", 17.0, fill="F8EFEC")
heading(doc, "A. Responsibility and approval", 2)
bullets(doc, [
    "Will you be the responsible clinician for any session in which a patient wears the device, and may you be named as an advisor or co-author?",
    "Which ethics committee reviews this (your hospital's, my university's, or both), and what does it need from me?",
    "Does it need a letter of support, a supervisor, a data-management plan or insurance cover, and who signs?",
    "How long does approval usually take? Is there a faster route for a low-risk feasibility study?",
    "Where does your own care of me end and this project begin, and how do you want to keep them separate?",
], size=10)
heading(doc, "B. Who can take part", 2)
bullets(doc, [
    "Out of the patients with persistent voices that you see, roughly how many describe voices as their own thoughts spoken aloud, and how many as something else?",
    "Would you change the inclusion and exclusion rules in the paper (section 7.1)? In particular, how do we screen out people who believe devices monitor or control them?",
    "How many suitable people could realistically be invited in a few weeks, and who invites them? Nobody is given to me; each person chooses.",
    "Who decides whether a person has capacity to consent, and how is that recorded?",
    "How do we make sure that saying no, or stopping at any time, has no effect on someone's care?",
], size=10)
heading(doc, "C. What data may be collected", 2)
bullets(doc, [
    "Which clinical details do you want recorded about each person (age band, years since first episode, medication, scales), and which would you never allow me to see?",
    "Which rating scales do you already use, and in which Indonesian versions (PANSS, PSYRATS, BAVQ-R, C-SSRS, SUS)?",
    "Is it acceptable to record the muscle signal and the per-frame sound levels only, with no audio saved, and does the committee agree?",
    "What do you need us to record about each voice episode: time, button press, how distressing (0 to 10), what helped?",
    "Do patients keep a voice diary or any recorded sessions already that could be used, with consent, instead of starting from nothing?",
    "How many sessions per person is reasonable, and how long can one session last before it tires or upsets someone?",
], size=10)
heading(doc, "D. Privacy and handling", 2)
bullets(doc, [
    "Should data be identified only by a code, and who keeps the key linking codes to names? It must not be me.",
    "Where may the data be stored (hospital server, encrypted laptop), for how long, and who can see it?",
    "What happens to a person's data if they withdraw?",
    "May anonymised signals be shared in a paper or public repository? Under Indonesia's Personal Data Protection Law, what do we need in the consent form?",
    "Who may be told about the study, for example family members or other staff?",
], size=10)
heading(doc, "E. Safety and wording", 2)
bullets(doc, [
    "What would make you stop a session immediately? Do you agree with the stop rules in the paper (section 7.4)?",
    "How should each of the four results be worded in Bahasa Indonesia so it is kind and cannot be misread? Please edit the sentences directly.",
    "How do we introduce the idea that a voice may be a person's own inner speech without causing shame or fear?",
    "How should we handle a participant who reports a new belief about the device, or any thought of self-harm?",
    "Should a nurse or you be present in the room every time, and for how long after a session?",
    "Is skin preparation and electrode use on the face acceptable for your patients, for example given allergies or skin conditions?",
], size=10)
heading(doc, "F. Study design and next steps", 2)
bullets(doc, [
    "Is a first session with 3 to 5 people and no medication changes a sensible size, and what would you want to see before a second one?",
    "What result would convince you it is worth continuing, and what would make you stop the project?",
    "Where in care could it fit: a clinic visit, a nurse-led session, or home use between visits?",
    "What coping strategies do your patients already use that work? Those belong in the coach.",
    "What do you want on the one-page summary, and what would you never have time to read?",
    "Who else should I speak to: a nurse, a psychologist, a person with lived experience, a statistician?",
    "Will you read the paper and add notes, and what is a realistic date for our next meeting?",
], size=10)

out = HERE / "You_Yourself_Edge_Plan.docx"
doc.save(out)
print("saved", out)
