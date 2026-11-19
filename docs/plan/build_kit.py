"""Builds the pitch kit and the draft letter to the psychiatrist."""
from pathlib import Path
from docgen import new_document, para, heading, bullets, table, figure, boxed, header_footer, MUTED

HERE = Path(__file__).parent
F = lambda n: str(HERE / "figs" / n)

# ===================================================================== pitch kit
doc = new_document("Calibri", 10.5, 2.0)
header_footer(doc, "You, Yourself · Pitch kit · Research prototype, not a medical device")
para(doc, "**You, Yourself**", size=24, after=0)
para(doc, "Pitch kit: slides, 60-second pitch, honest results slide, demo and judge Q&A", size=13, color=MUTED, after=4)
para(doc, "Indonesian first, English second. The Indonesian is my draft and should be read by a native speaker and, for any wording about voices, by your psychiatrist.", size=9, color=MUTED)

boxed(doc, "**Fill in before you present (I don't know these yet):** hackathon name and pitch length; team names; "
      "your real test numbers (the bracketed [ ] items); your psychiatrist's name if they agree to be named; your e-mail. "
      "**Rule for every slide: delete any claim you have not measured.** A judge who finds one unsupported claim will doubt the rest.", 17.0, fill="F8EFEC")

heading(doc, "1. The 60-second pitch")
heading(doc, "Bahasa Indonesia", 2)
para(doc, "Sekitar 27 juta orang hidup dengan skizofrenia, dan banyak dari mereka mendengar suara. "
     "Saat suara itu datang, mereka tidak punya cara untuk memeriksa dari mana suara itu berasal. "
     "You, Yourself tidak berdebat dengan suara itu. Alat ini memberi dua fakta dari luar, tepat saat tombol ditekan: "
     "apakah ada orang di dekat Anda yang benar-benar berbicara, dan apakah otot bicara Anda aktif. "
     "Satu perangkat kecil, dua model kecil yang berjalan di dalam alat, dan aturan yang jelas dan bisa dibaca. "
     "Alat ini tidak pernah mengatakan suara itu \"tidak nyata\". Kalau tidak bisa memastikan, alat ini mengatakannya. "
     "Semua diproses di perangkat: tidak ada audio yang disimpan, tidak ada yang diunggah. "
     "Ini prototipe riset, bukan alat medis. Hari ini kami tunjukkan alat ini bekerja pada sukarelawan sehat: [ISI ANGKA NYATA]. "
     "Langkah berikutnya: persetujuan komite etik bersama psikiater kami, lalu sesi terawasi. "
     "You, Yourself: sebuah petunjuk dari luar, supaya Anda tidak sendirian menghadapi suara itu.")
heading(doc, "English", 2)
para(doc, "About 27 million people live with schizophrenia, and many of them hear voices. "
     "When a voice arrives, they have no way to check where it came from. "
     "You, Yourself doesn't argue with the voice. It gives two outside facts at the moment a button is pressed: "
     "did anyone near you actually speak, and were your own speech muscles active. "
     "One small device, two tiny models that run on the device, and plain, readable rules. "
     "It never says a voice is 'not real'. When it can't tell, it says so. "
     "Everything is processed on the device: no audio is stored and nothing is uploaded. "
     "It is a research prototype, not a medical device. Today we show it working on a healthy volunteer: [FILL IN REAL NUMBERS]. "
     "Next: ethics approval with our psychiatrist, then supervised sessions. "
     "You, Yourself: an outside cue, so you are not alone with the voice.")
para(doc, "Timing: about 150 words, 60 seconds at a calm pace. For 3 minutes, add the demo (section 4) after the sentence 'Today we show it working'.", size=9, color=MUTED)

heading(doc, "2. Slide outline (10 slides)")
table(doc, ["#", "Slide title", "On the slide", "What you say", "Visual"], [
    ["1", "You, Yourself", "Name, one-line promise: 'An outside cue, not a verdict.'", "Introduce yourself and the problem in one sentence.", "Logo or film still"],
    ["2", "The moment that has no tools", "27 million (1 in 300). Voices persist for many despite medication. In the moment, no objective cue. [Verify numbers in the paper before showing.]", "People are alone with the voice and have nothing to check it against.", "Film still"],
    ["3", "The idea", "Two outside facts at one button press: Was anyone nearby speaking? Were my speech muscles active?", "We don't argue with voices. We give facts.", "Fig. 1 system"],
    ["4", "How it works", "Muscle sensor + microphone -> two tiny on-device models -> fixed readable rules -> one of four plain sentences.", "The models detect signals. The rules decide the sentence, so every result can be explained.", "fig_system.png"],
    ["5", "Safe by design", "Never says 'not real'. Silence = 'can't tell'. Tap stays locked until your own data pass a test and a clinician agrees. On-device only. No audio stored.", "Each of these is a deliberate limit.", "4 icons"],
    ["6", "What we tested, and what we did not", "Use the table in section 3. Only real numbers.", "Say the limits before a judge does.", "Table"],
    ["7", "Live demo", "Four moves (section 4). Backup: the sim command.", "Narrate each result in plain words.", "Live or video"],
    ["8", "It can look like a normal wearable", "Pendant + under-chin patch + collar cable. Next: behind-ear band, neckband.", "Honest about evidence: only the lip site has patient data.", "fig_wearables.png"],
    ["9", "What's next", "Ethics committee -> co-design -> supervised session -> 4-week N-of-1. Psychiatrist as responsible clinician.", "Safety first, then evidence.", "Timeline"],
    ["10", "Close", "'An outside cue, so you are not alone with the voice.' + e-mail + repo link.", "Thank the judges; invite questions.", "Name + QR to repo"],
], [0.7, 3.0, 5.6, 4.9, 2.8], size=8.2, caption="Table 1. Slide outline.")
figure(doc, F("fig_system.png"), 14.5, "Use this on slide 4.")

heading(doc, "3. The honest results slide")
para(doc, "Put only measured items in the left column. If an item is not measured yet, move it to the right column. Targets come from the paper's stage 1.")
table(doc, ["What we tested (healthy adults, n = [ ])", "What we did NOT test"], [
    ["Silent mouthing detected: [ ]% of events (target 80% or more)", "Anyone who hears voices. No patient has used the device."],
    ["False events at rest: [ ] per hour (target under 2)", "Whether silent inner speech with the mouth still is detectable by people who hear voices"],
    ["Swallowing and chewing wrongly flagged: [ ]%", "Whether the cue reduces distress"],
    ["Microphone finds speech at 1 m: [ ]% of tries; false alarms [ ] per hour in [room]", "Noisy places beyond [rooms you tried]"],
    ["Decisive test (silent inner speech, mouth still): [SUPPORTED / NOT SUPPORTED], AUROC [ ]", "Long-term wearing comfort and stigma"],
    ["Press to sentence: [ ] seconds (target under 1)", "Other languages, accents, children"],
], [8.5, 8.5], size=9, caption="Table 2. Fill with real numbers only.")
para(doc, "If the decisive test is NOT SUPPORTED, say it plainly: **'Our sensor sees silent mouthing, not motionless inner speech. So we added the room check and designed the muscle cue as optional, per person.'** That is a strong answer, not a weak one.")

heading(doc, "4. Live demo, four moves")
bullets(doc, [
    "Quiet room. Mouth a sentence silently, press the button. Result: muscles active, no one speaking.",
    "A teammate speaks. Press. Result: the microphone heard real speech nearby.",
    "Sit still. Press. Result: 'The sensor picked up nothing this time. That is common, and it says nothing about where the voice came from.'",
    "Lift an electrode. Press. Result: the device refuses to make a muscle claim.",
    "**Backup:** type sim. The same code replays the four cases, labelled SIMULATED. Say 'this is the recorded scenario'.",
], numbered=True, size=10)
para(doc, "Say before you start: 'This is a healthy presenter. It shows two sensors working. It does not detect hallucinations.'")

heading(doc, "5. Words to use and not to use")
table(doc, ["Say", "Do not say"], [
    ["'outside cue', 'two outside facts', 'probably', 'can't tell'", "'detects hallucinations', 'diagnoses', 'cures', 'treats'"],
    ["'speech muscles were active'", "'reads your thoughts', 'decodes inner speech'"],
    ["'research prototype, not a medical device'", "'proves the voice is not real' or 'proves it is you'"],
    ["'tested on healthy volunteers'", "'works for patients' or 'clinically validated'"],
    ["'about [ ] people, [ ] sessions'", "Any number you did not measure"],
], [8.5, 8.5], size=9)

heading(doc, "6. Judge Q&A")
table(doc, ["Question", "Answer"], [
    ["Can it tell if a voice is real?", "No. It reports whether anyone nearby was speaking and whether the speech muscles moved, and says when it can't tell."],
    ["Does it work on patients?", "Not tested, and not until an ethics committee approves with a psychiatrist responsible. Here is what we tested, on whom."],
    ["What if someone answers the voice under their breath?", "Their muscles will be active because of the voice. The device can't tell the order, so its wording says 'may be'."],
    ["Does a TV count as real speech?", "Yes. It is real sound in the room, and the sentence says so."],
    ["Where does the AI come in?", "Two small models detect muscle state and speech. Fixed rules combine them, so every result is explainable. We deliberately did not build a 'real vs imagined' model."],
    ["Why not just an app?", "A similar unguided app showed no benefit in a trial of 89 people. Ours adds body and room signals and is clinician-guided."],
    ["Where does the data go?", "Nowhere. Processing is on the device, audio is overwritten, export is the person's own action."],
    ["What if the sensor shows nothing?", "That is the most common result, and the device says it says nothing about where the voice came from."],
    ["Is it a medical device?", "No. A product would need Ministry of Health registration, which is years away."],
    ["What does it cost?", "About Rp 2-3 million per unit in parts, estimated."],
    ["What if the first result is negative?", "Then we report it. The room check, diary and coping coach still help and need no electrodes."],
    ["Why should we trust the numbers?", "We report leave-one-session-out results, name the sample size, and list what we did not test."],
], [5.5, 11.5], size=8.8, caption="Table 3. Practice these out loud.")
figure(doc, F("fig_wearables.png"), 17.0, "Use this on slide 8.")
doc.save(HERE / "You_Yourself_Pitch_Kit.docx")

# ===================================================================== letter
L = new_document("Calibri", 10.5, 2.2)
header_footer(L, "DRAFT letter for Ata to edit and send. Not sent.")
para(L, "**Draft for you to edit.** I have not sent this to anyone. Replace everything in [brackets]. "
     "Because I don't know whether your psychiatrist also treats you, one sentence is marked optional: keep it only if it applies.", size=9, color=MUTED)
para(L, "**Surat (Bahasa Indonesia)**", size=13, after=6)
for t in [
    "[Tempat], [tanggal]",
    "Yth. dr. [Nama], Sp.KJ\n[Rumah sakit / klinik]",
    "**Perihal: Permohonan masukan dan dukungan klinis untuk proyek riset mahasiswa \"You, Yourself\"**",
    "Dengan hormat,",
    "Saya I Wayan Putra Riana Paramartha, mahasiswa Ilmu Komputer Universitas Bina Nusantara. Saya sedang mengembangkan prototipe riset berbiaya rendah bernama You, Yourself dan ingin meminta masukan serta dukungan klinis Dokter sebelum melangkah lebih jauh.",
    "**Apa itu.** Sebuah perangkat kecil yang, saat seseorang mendengar suara dan menekan satu tombol, memberi dua informasi dari luar: apakah ada orang di dekatnya yang benar-benar berbicara (dari mikrofon) dan apakah otot bicaranya aktif (dari sensor otot). Perangkat ini tidak pernah menyatakan bahwa suara itu \"tidak nyata\", tidak mendiagnosis, dan bukan alat medis. Semua diproses di dalam perangkat dan tidak ada audio yang disimpan.",
    "**Yang saya mohon.** (1) Pertemuan sekitar 30 menit untuk membahas gagasan ini. (2) Masukan Dokter atas kata-kata hasil yang akan dibaca pasien, supaya ramah dan tidak menimbulkan salah paham. (3) Kesediaan Dokter menjadi penasihat klinis dan, bila Dokter berkenan dan komite etik mensyaratkan, dokter penanggung jawab. (4) Arahan mengenai komite etik yang tepat dan syarat pengajuannya.",
    "**Yang tidak saya minta.** Saya tidak meminta data pasien, dan saya tidak akan melibatkan pasien sebelum ada persetujuan komite etik, persetujuan tertulis, dan Dokter hadir sebagai penanggung jawab. Pada tahap awal, perangkat hanya diuji pada diri saya dan sukarelawan dewasa sehat.",
    "[Opsional, hapus bila tidak berlaku: Saya menyadari Dokter juga merawat saya. Mohon arahan Dokter bagaimana memisahkan peran tersebut dari peran Dokter dalam proyek ini.]",
    "Terlampir: makalah rancangan dan protokol (v2), rencana pembuatan dan studi, serta daftar pertanyaan singkat. Saya bersedia menyesuaikan seluruh rencana dengan arahan Dokter.",
    "Hormat saya,\nI Wayan Putra Riana Paramartha\nIlmu Komputer, Universitas Bina Nusantara\n[Email] · [Telepon]",
]:
    para(L, t, after=6)
L.add_page_break()
para(L, "**Letter (English)**", size=13, after=6)
for t in [
    "[Place], [date]",
    "Dear Dr [Name], Sp.KJ\n[Hospital / clinic]",
    "**Subject: Request for advice and clinical support for the student research project 'You, Yourself'**",
    "Dear Dr [Name],",
    "I am I Wayan Putra Riana Paramartha, a Computer Science student at Bina Nusantara University. I am developing a low-cost research prototype called You, Yourself, and I would like your advice and clinical support before going further.",
    "**What it is.** A small device that, when a person hears a voice and presses one button, gives two outside facts: whether anyone nearby was really speaking (from a microphone) and whether the person's own speech muscles were active (from a muscle sensor). It never says a voice is 'not real', does not diagnose, and is not a medical device. Everything is processed on the device and no audio is stored.",
    "**What I am asking.** (1) A meeting of about 30 minutes to discuss the idea. (2) Your edits to the wording of the results that patients would read, so it is kind and cannot be misread. (3) Whether you would be willing to act as clinical advisor and, if you agree and the ethics committee requires it, as the responsible clinician. (4) Guidance on the right ethics committee and what it needs.",
    "**What I am not asking.** I am not asking for patient data, and I will not involve patients before ethics approval, written consent, and your presence as the responsible clinician. At first the device will be tested only on myself and healthy adult volunteers.",
    "[Optional, delete if it does not apply: I understand you also treat me. Please tell me how you would like to keep that role separate from your role in this project.]",
    "Enclosed: the design and protocol paper (v2), the build and study plan, and a short list of questions. I am happy to change the whole plan to follow your guidance.",
    "Yours sincerely,\nI Wayan Putra Riana Paramartha\nComputer Science, Bina Nusantara University\n[Email] · [Phone]",
]:
    para(L, t, after=6)
L.save(HERE / "You_Yourself_Letter_to_Psychiatrist_DRAFT.docx")
print("ok")
