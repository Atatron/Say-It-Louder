"""Builds You_Yourself_Build_Guide.docx: parts list, wiring, steps and code."""
from pathlib import Path
from docgen import new_document, para, heading, bullets, table, figure, boxed, header_footer, MUTED

HERE = Path(__file__).parent
F = lambda n: str(HERE / "figs" / n)
doc = new_document("Calibri", 10.5, 2.0)
header_footer(doc, "You, Yourself · Build guide: parts, wiring, steps and code · Research prototype, not a medical device")


def code(text):
    from docx.shared import Pt, Cm
    from docgen import _shade
    tbl = doc.add_table(rows=1, cols=1)
    tbl.style = "Table Grid"
    cell = tbl.rows[0].cells[0]
    cell.width = Cm(17)
    _shade(cell, "F3F4F6")
    par = cell.paragraphs[0]
    par.paragraph_format.space_after = Pt(0)
    for i, line in enumerate(text.strip("\n").split("\n")):
        if i:
            par.add_run().add_break()
        r = par.add_run(line)
        r.font.name = "Consolas"
        r.font.size = Pt(8.5)
    doc.add_paragraph().paragraph_format.space_after = Pt(2)


para(doc, "**You, Yourself**", size=24, after=0)
para(doc, "Build guide: the exact parts to buy, wiring, step by step, and the code", size=13, color=MUTED, after=4)
para(doc, "Prepared for Ata · 20 November 2026 · Research prototype. Not a medical device. "
     "All code so far is tested on a PC with synthetic signals. The ESP32 sketch passes a syntax check only: it has not been compiled with the ESP32 toolchain or run on a board. "
     "Steps marked with an asterisk (*) depend on details of your exact boards; follow the maker's own guide for those.", size=9, color=MUTED)

heading(doc, "1. What you are building")
para(doc, "One thumb-sized board (XIAO ESP32S3 Sense) reads a MyoWare 2.0 muscle sensor and its own built-in microphone. "
     "When you press a button, it says in Indonesian whether it heard real speech nearby and whether your speech muscles were active. "
     "It never says a voice is 'real' or 'imagined'. A small vibration motor can tap, but only after a clinician switches that on. "
     "No audio is stored and nothing is uploaded.")

heading(doc, "2. Shopping list: the real one")
para(doc, "Prices are the estimates from your plan for Indonesian marketplaces. **Check every listing before paying.** The MyoWare was a pre-order item with about 3 weeks of delivery.")
heading(doc, "2.1 Must buy", 2)
table(doc, ["#", "Part (search for this)", "Qty", "What it is for", "Est. Rp"], [
    ["1", "MyoWare 2.0 Muscle Sensor, SparkFun DEV-21265", "1", "The muscle amplifier. Output pins: ENV (use this), RAW, RECT.", "1.2-1.4 M"],
    ["2", "MyoWare 2.0 Cable Shield, SparkFun DEV-18386", "1", "Gives a 3.5 mm jack so electrodes can sit on the face while the board is in a pocket.", "150-350 k"],
    ["3", "3-lead electrode cable, 3.5 mm jack to snaps (sold with AD8232 ECG kits; SparkFun CAB-12970)", "1-2", "Carries the signal from three electrodes.", "30-80 k"],
    ["4", "Ag/AgCl gel snap electrodes, small (24-30 mm, paediatric), pack of 50", "1-2 packs", "Skin contact. Single use.", "60-150 k"],
    ["5", "Seeed Studio XIAO ESP32S3 **Sense** (the Sense version, with the camera/mic expansion board)", "1", "The brain, Bluetooth, battery charger and the microphone, all in one. The plain XIAO ESP32S3 has NO microphone.", "check listing (Sense costs more than the plain board, 200-360 k)"],
    ["6", "Coin vibration motor 10 mm, 3 V (type 1027)", "2", "The tap. Buy a spare.", "5-15 k each"],
    ["7", "NPN transistor 2N2222A or S8050; 1 kΩ resistors; 1N4148 diodes; 100 µF capacitor", "5 each", "Motor driver, protection diode, supply smoothing.", "10-25 k"],
    ["8", "LiPo 3.7 V 500-600 mAh **with protection board**", "1", "Battery. The person is never connected to mains.", "40-90 k"],
    ["9", "Tactile button 12 mm with cap; slide switch SS12D00", "2 each", "'I hear a voice' button and a real power-off switch.", "10-20 k"],
    ["10", "Breadboard 830 points + jumper wires (male-male and male-female)", "1 set", "Bench build.", "30-60 k"],
    ["11", "70% alcohol swabs (box of 100); 3M Micropore tape", "1 each", "Skin preparation; holding cables.", "30-55 k"],
    ["12", "USB isolator (ADuM3160 or ADuM4160 based)", "1", "Isolation whenever the board is on USB and electrodes are on skin.", "100-250 k"],
    ["13", "USB-C data cable (not charge-only)", "1", "Programming and serial.", "10-30 k"],
], [0.7, 5.6, 1.4, 6.3, 3.0], size=8.5, caption="Table 1. Must buy. Estimated total with the optional items below: about Rp 2.0-3.2 million, as in your plan.")
heading(doc, "2.2 For the wearable version (after the bench build works)", 2)
table(doc, ["Part", "Qty", "What it is for", "Est. Rp"], [
    ["Perfboard 5x7 cm, pin headers, 26 AWG silicone wire, heat-shrink", "1 set", "Soldered build", "40-80 k"],
    ["Small ABS project box about 70x45x20 mm (or a 3D print); lanyard or clip", "1", "The pendant", "20-60 k"],
    ["Soldering iron 30-60 W, solder, flux, multimeter (only if you do not own them)", "1 set", "Soldering the battery to the board and the sensor pins", "160-400 k"],
], [8.5, 1.5, 5.0, 2.0], size=8.5)
heading(doc, "2.3 Optional, later", 2)
bullets(doc, [
    "Second MyoWare 2.0 + cable shield + cable (Rp 1.4-1.8 M): the second channel, only after the decisive test on your own lip or chin.",
    "MPU-6050 (GY-521) motion sensor (Rp 20-35 k): flags head movement so it is not mistaken for speech.",
    "A second I2S microphone (INMP441): only for the stretch goal of telling your own voice from another's.",
], size=10)
heading(doc, "2.4 Do not buy (these were in older lists)", 2)
bullets(doc, [
    "ESP32 DevKit V1, TP4056 charger and MT3608 boost module: not needed. The XIAO charges its own battery. (The DevKit also has no microphone; the code would need changes for an external mic.)",
    "AD8232 ECG board: a different sensor. Only the 3-lead cable from its kit is useful.",
    "Any 'brain' or EEG headband: it cannot answer this question (see the feasibility doc).",
], size=10)

heading(doc, "3. Software to install (free)")
table(doc, ["Tool", "Version", "Used for"], [
    ["Arduino IDE", "2.x", "Compile and flash the board"],
    ["Arduino-ESP32 core (board package 'esp32' by Espressif)", "3.x. Add https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json under Settings > Additional boards manager URLs", "Board support, Bluetooth, microphone (ESP_I2S)"],
    ["Python", "3.10 or newer", "Recording, training, analysis"],
    ["Python packages", "pip install numpy pytest pyserial matplotlib", "Same"],
    ["C compiler (optional)", "gcc or clang. On Windows, install MSYS2 or use WSL", "Run the C core tests on the PC. Skippable."],
    ["Git (optional)", "any", "Get the code from GitHub. Otherwise use the zip."],
], [4.5, 7.0, 5.5], size=8.5)

heading(doc, "4. Get the code")
code('''git clone https://github.com/Atatron/Say-It-Louder.git
cd Say-It-Louder
git checkout claude/project-thread-qmcj8y      # until the pull request is merged
# or: unzip You_Yourself_Edge_Code.zip, which holds the same edge/ folder''')
table(doc, ["Folder or file", "What it does"], [
    ["edge/firmware/you_yourself_edge/you_yourself_edge.ino", "The sketch. Open this in the Arduino IDE."],
    ["edge/firmware/you_yourself_edge/yy_core.c, yy_core.h, emg_model.h", "The portable core: features, tiny model, voice detection, outcomes, simulator. emg_model.h is the trained model (right now trained on SYNTHETIC data)."],
    ["edge/python/record_session.py", "Records a labelled muscle session from the board (or simulates one)."],
    ["edge/python/analyze_h1.py", "The decisive test: can the sensor see silent inner speech with the mouth still?"],
    ["edge/python/train_emg.py", "Trains the model on your recordings and writes emg_model.h."],
    ["edge/host_test/", "Checks on the PC that the C code matches the Python reference."],
], [7.5, 9.5], size=8.5)

heading(doc, "5. Wiring")
figure(doc, F("fig_wiring.png"), 16.5, "Fig. 1. Bench wiring. Concept diagram; check each part's own pinout.")
table(doc, ["From", "To", "Note"], [
    ["MyoWare VIN (+V)", "XIAO 3V3", "3.3 V keeps the output inside the ADC range"],
    ["MyoWare GND", "XIAO GND", ""],
    ["MyoWare ENV", "XIAO A0 (GPIO1)", "ADC1, which keeps working while Bluetooth is on"],
    ["Button, one leg", "XIAO D1 (GPIO2)", "The other leg to GND. The code uses the internal pull-up"],
    ["XIAO D2 (GPIO3)", "1 kΩ resistor, then NPN base", "Check the pin order of YOUR transistor in its datasheet"],
    ["NPN emitter", "GND", ""],
    ["NPN collector", "Motor -", ""],
    ["Motor +", "3V3", "1N4148 across the motor, stripe toward + (protects against voltage spikes)"],
    ["LiPo +, through the slide switch", "XIAO BAT+ pad (back of the board)", "Switch in the + wire only. Check polarity twice."],
    ["LiPo -", "XIAO BAT- pad", ""],
    ["Microphone", "Nothing to wire", "It is on the Sense expansion board (clock GPIO42, data GPIO41)"],
], [5.0, 5.2, 6.8], size=8.5, caption="Table 2. Pin table.")
boxed(doc, "**Electrode sites.** Under chin: two electrodes on the midline about 2 cm apart, parallel to the jaw. Lip site (paper): two electrodes below the lower lip about 2 cm apart. "
      "Reference electrode: a bony, quiet spot such as the mastoid or the angle of the jaw. **Never** on the front of the neck over the pulse. Clean the skin with alcohol; use each electrode once; stop at any redness.", 17.0)

heading(doc, "6. Step by step")
steps = [
 ("Step 0. Safety rules, before anything is plugged in",
  ["Electrodes on skin means battery power, or the USB isolator in line with a laptop that is unplugged from its charger.",
   "Never wear it while the battery is charging. Never connect it to a mains-powered device while electrodes are on you.",
   "Never place electrodes on the front of the neck. Use each electrode once. Stop at any redness that lasts."]),
 ("Step 1. Install the software (30 minutes)",
  ["Install Arduino IDE 2, add the ESP32 board URL from section 3, and install the 'esp32' board package.",
   "Tools > Board > esp32 > XIAO_ESP32S3. Set **USB CDC On Boot: Enabled** (needed for Serial over USB) and **PSRAM: OPI PSRAM*** (as Seeed's Sense guide says).",
   "Install Python 3.10+ and run: pip install numpy pytest pyserial matplotlib."]),
 ("Step 2. Run the PC checks, while the parts are still on their way",
  ["This proves the code works before any hardware does."]),
]
for title, items in steps:
    heading(doc, title, 2)
    bullets(doc, items, size=10)
    if title.startswith("Step 2"):
        code('''cd edge/python
python -m pytest -q tests                 # expect: 12 passed
python record_session.py --simulate --name fake1 --out ../recordings_fake
python analyze_h1.py ../recordings_fake   # SYNTHETIC data: expect "NOT SUPPORTED"
cd ../host_test && make                   # expect: all host tests passed''')
steps2 = [
 ("Step 3. First power-up with NO sensor attached",
  ["Solder the pin headers to the XIAO if they are not attached*. Attach the Sense expansion board.",
   "Plug the XIAO into the laptop. Open edge/firmware/you_yourself_edge/you_yourself_edge.ino. Click Upload.",
   "Open the Serial Monitor at 115200 baud, line ending 'Newline'. At boot it tries a 30 s calibration and says 'CAL refused' because no sensor is connected. That is correct.",
   "Type sim and press Enter. You should see four scenarios in Indonesian, labelled SIMULATED: quiet room, silent mouthing, someone else speaking, electrode lifted. **This is your demo backup and it needs no electrodes.**",
   "Type lang en to switch to English, lang id to switch back."]),
 ("Step 4. Button and vibration motor on the breadboard",
  ["Wire the button (D1 to GND) and the motor circuit (D2, 1 kΩ, NPN, motor, diode) as in Fig. 1.",
   "Type buzz in the Serial Monitor. The motor should buzz twice. If it does not, check the transistor pin order and the diode direction.",
   "Press the button. You should get a sentence ('Sensor otot belum terbaca...' because there is no sensor). That is correct and safe."]),
 ("Step 5. Muscle sensor on your forearm (not your face yet)",
  ["Power the MyoWare from 3V3 and GND, and connect ENV to A0. Put it on your own forearm with electrodes*, following SparkFun's hookup guide for the Cable Shield.",
   "Use battery power, or the USB isolator with the laptop unplugged from its charger.",
   "In the Serial Monitor type stream on. You should see about 100 numbers per second. Make a fist: the numbers must jump. Type stream off.",
   "If the trace does not jump, fix this before going near the face."]),
 ("Step 6. Calibrate and test the microphone",
  ["Sit still with relaxed muscles and type cal. Stay still for 30 seconds. You should see 'CAL ok median=... sigma=...'.",
   "Speak near the board, then press the button: 'Mikrofon mendengar ada orang berbicara...'. Stay silent and still, press the button: the 'Sensor tidak menangkap apa pun...' sentence.",
   "Lift one electrode and press the button: you must NOT get a muscle claim. It says the sensor is not reading properly."]),
 ("Step 7. Battery and switch (only once steps 3-6 work)",
  ["Solder the LiPo to the BAT+ and BAT- pads on the back of the XIAO, with the slide switch in the + wire*. Check polarity with a multimeter first: a reversed battery can destroy the board.",
   "From now on, when electrodes are on skin, run from the battery. Charge only when nothing is attached to you."]),
 ("Step 8. Record your own sessions (about 15 minutes each)",
  ["Prepare the skin: clean with alcohol, let it dry, press the electrodes on. Note the placement.",
   "Run the recorder. It prints one instruction at a time and beeps. Follow it exactly. Do at least 3 sessions on different days."]),
]
for title, items in steps2:
    heading(doc, title, 2)
    bullets(doc, items, size=10)
    if title.startswith("Step 8"):
        code('''cd edge/python
python record_session.py --port COM5 --name me_day1 --placement "under chin, 2 cm apart" --out ../recordings
# on Mac or Linux the port looks like /dev/ttyACM0''')
steps3 = [
 ("Step 9. The decisive test: can the sensor see silent inner speech?",
  ["The session ends with 'count silently with the mouth still' and 'read silently' blocks. This is hypothesis H1 in your paper.",
   "Run the analysis. It prints an AUROC (0.5 means no difference from rest) and a verdict.",
   "**Write the result down whichever way it goes.** 'NOT SUPPORTED' is a valid and useful result: it means the sensor sees mouthing, not motionless inner speech, and you say so in the pitch."]),
 ("Step 10. Train on your real recordings and put the model on the board",
  ["Train with at least 2 session files. It prints a leave-one-session-out table: this is the honest number to quote.",
   "Re-run the C check, then upload the sketch again so it carries the new emg_model.h.",
   "If the table is poor for swallow or chew, record more sessions before changing the model."]),
 ("Step 11. Make it wearable",
  ["Move to a perfboard, put the board, battery, button, motor and switch in the 70x45x20 mm box. Cut small holes for the button and the microphone, and a slot for the USB-C port.",
   "Run the cable from the electrodes inside your shirt collar to the box on a lanyard (the under-chin concept in the plan).",
   "Measure and write down: battery life, and the time from button press to sentence (target under 1 second)."]),
 ("Step 12. Rehearse the demo",
  ["Four moves: mouth silently, press; a teammate speaks, press; sit still, press; lift an electrode, press.",
   "Keep sim ready as a backup if an electrode fails on stage.",
   "Say plainly: 'This shows two sensors working on a healthy person. It does not detect hallucinations, and it has not been tested with anyone who hears voices.'"]),
]
for title, items in steps3:
    heading(doc, title, 2)
    bullets(doc, items, size=10)
    if title.startswith("Step 9"):
        code("python analyze_h1.py ../recordings")
    if title.startswith("Step 10"):
        code('''python train_emg.py --data ../recordings        # leave-one-session-out table, writes emg_model.h
cd ../host_test && make clean && make          # C core must still match Python
# then upload the sketch again from the Arduino IDE''')

heading(doc, "7. Serial command cheat sheet (115200 baud)")
table(doc, ["Type", "What happens"], [
    ["sim", "Replays four scripted scenarios through the real code. Labelled SIMULATED. Never taps."],
    ["cal", "30-second rest calibration. Refused if an electrode seems off."],
    ["buzz", "Vibrates the motor twice (bench test)."],
    ["stream on / stream off", "Prints one muscle number per line, 100 per second. Used by record_session.py."],
    ["lang id / lang en", "Indonesian (default) or English sentences."],
    ["cue on / cue off", "Allows or blocks the 'this is you' tap. Off by default. Only for bench work; in real use a clinician switches it on after the person's own data pass the test."],
    ["(press the button)", "Looks back 10 seconds on both channels and prints one outcome."],
], [4.5, 12.5], size=8.5)

heading(doc, "8. If something goes wrong")
table(doc, ["Problem", "Try this"], [
    ["Arduino IDE does not see the board", "Use a USB-C data cable. Hold BOOT while plugging in to enter the bootloader, then upload."],
    ["Nothing appears in the Serial Monitor", "Set 'USB CDC On Boot: Enabled', baud 115200, and press the reset button."],
    ["Compile errors about BLE or I2S", "Check the esp32 board package is 3.x. Tell me the exact error text and I will fix the sketch. It has not been compiled on the ESP32 toolchain yet."],
    ["'CAL refused: an electrode seems to be off'", "Check the electrodes and the cable; the ENV line is flat or pinned. Re-clean the skin."],
    ["The numbers never jump when you flex", "Check 3V3 and GND to the MyoWare, ENV to A0, and that the electrodes touch skin."],
    ["Numbers jump all the time", "Move away from chargers and mains cables, shorten wires, check the reference electrode is on bone."],
    ["Motor does not buzz", "Check the transistor pin order and the diode direction; try the spare motor."],
    ["Board resets when the motor runs or Bluetooth starts", "Add the 100 µF capacitor across 3V3 and GND; check the battery is charged."],
    ["Microphone hears nothing or everything", "Make sure you have the Sense expansion board attached and the board set to OPI PSRAM; test in a quiet room first."],
    ["The recorder says 'No numbers from the board'", "Wrong port, sketch not running, or the 30 s boot calibration is still running. Wait, then retry."],
], [5.5, 11.5], size=8.5)

heading(doc, "9. Be honest about what exists")
bullets(doc, [
    "The code runs and passes its tests on a PC with synthetic signals. The model in emg_model.h is trained on made-up data and must be retrained on your real recordings.",
    "The ESP32 sketch has passed a syntax check only. Expect a small fix or two on first compile; that is normal.",
    "The contact-check limits are placeholders until you have bench recordings.",
    "Nothing here has been tested on people who hear voices, and it must not be until an ethics committee approves.",
], size=10)
out = HERE / "You_Yourself_Build_Guide.docx"
doc.save(out)
print("saved", out)
