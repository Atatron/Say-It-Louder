/*
 * You, Yourself: edge prototype. Both channels on one board, no phone needed.
 *
 * Board:  Seeed Studio XIAO ESP32S3 Sense (built-in PDM microphone).
 *         Arduino core for ESP32 3.x (uses ESP_I2S.h).
 * Inside: MyoWare 2.0 ENV -> A0. Sampled at 1 kHz, averaged to 100 Hz,
 *         2 s windows every 0.5 s -> features -> tiny MLP (emg_model.h).
 * Outside: on-board mic at 16 kHz -> band-energy VAD. Audio is processed
 *         frame by frame in RAM and discarded. Nothing is recorded or sent.
 * Button: "I hear a voice". Looks back 10 s on both channels and gives one of
 *         the paper's outcomes over Serial and Bluetooth LE.
 * Tap:    only for "muscles active, nobody speaking", and only if the cue was
 *         enabled after the person's coupling test and their clinician's OK.
 *
 * RESEARCH PROTOTYPE. Not a medical device. It cannot tell whether a voice is
 * "real"; it reports two outside facts and says when it cannot tell.
 * Battery power only while electrodes are on skin. Never wear while charging.
 *
 * Status: the portable core (yy_core.c) is tested on a PC. This sketch has
 * not yet been compiled or run on hardware.
 */
#include <Arduino.h>
#include <BLE2902.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <ESP_I2S.h>
#include <Preferences.h>

#include "yy_core.h"

// ---- pins (XIAO ESP32S3) ----
const int ENV_PIN = A0;      // MyoWare ENV. GPIO1 is on ADC1, which works with the radio on
const int BUTTON_PIN = D1;   // to GND, internal pull-up
const int MOTOR_PIN = D2;    // 1 kOhm -> NPN base; motor + flyback diode on collector
const int MIC_CLK = 42, MIC_DATA = 41;   // Sense expansion board PDM mic

// ---- BLE (one notify characteristic, short text) ----
#define SVC_UUID "6e400001-b5a3-f393-e0a9-e50e24dcca9e"
#define TX_UUID  "6e400003-b5a3-f393-e0a9-e50e24dcca9e"
BLECharacteristic *tx = nullptr;

I2SClass i2s;
Preferences prefs;

// ---- shared state ----
volatile bool speechThisHop = false;   // set by the mic task, cleared every hop
static float env[YY_WIN];              // last 2 s of 100 Hz envelope
static int envFill = 0, sinceHop = 0;
static float baseMed = 0, baseSigma = 1;
static bool calibrated = false, cueEnabled = false, micOk = false;
static yy_history_t hist;

// ---------------------------------------------------------------- mic task
void micTask(void *) {
  static int16_t raw[YY_FRAME];
  static float frame[YY_FRAME];
  yy_vad_t vad;
  yy_vad_init(&vad);
  for (;;) {
    size_t got = i2s.readBytes((char *)raw, sizeof raw);
    int n = got / sizeof(int16_t);
    if (n < YY_FRAME) continue;
    for (int i = 0; i < n; i++) frame[i] = raw[i] / 32768.0f;
    if (yy_vad_frame(&vad, frame, n)) speechThisHop = true;
    // raw[] and frame[] are overwritten by the next read. No audio leaves RAM.
  }
}

// ---------------------------------------------------------------- helpers
void say(const char *msg) {
  Serial.println(msg);
  if (tx) { tx->setValue((uint8_t *)msg, strlen(msg)); tx->notify(); }
}

void tap(int times) {
  for (int i = 0; i < times; i++) {
    digitalWrite(MOTOR_PIN, HIGH); delay(120);
    digitalWrite(MOTOR_PIN, LOW);  delay(150);
  }
}

float sample100Hz() {
  // 10 readings at 1 kHz, averaged (paper, section 5.5)
  uint32_t t = micros();
  long acc = 0;
  for (int i = 0; i < 10; i++) {
    acc += analogRead(ENV_PIN);
    while (micros() - t < (uint32_t)(i + 1) * 1000) {}
  }
  return acc / 10.0f;
}

bool calibrate() {
  const int N = 30 * YY_FS;                 // 30 s rest
  static float rest[30 * YY_FS];
  say("CAL Sit still, mouth relaxed, for 30 seconds.");
  for (int i = 0; i < N; i++) rest[i] = sample100Hz();
  for (int s = 0; s + YY_WIN <= N; s += YY_WIN)
    if (!yy_contact_ok(rest + s, YY_WIN)) {
      say("CAL refused: an electrode seems to be off. Check the pads and try again.");
      return false;
    }
  yy_calibrate(rest, N, &baseMed, &baseSigma);
  char buf[96];
  snprintf(buf, sizeof buf, "CAL ok median=%.1f sigma=%.2f", baseMed, baseSigma);
  say(buf);
  return true;
}

void onVoiceButton() {
  yy_inside_t in = yy_inside_state(&hist);
  if (!micOk) {
    // Without the microphone we must not imply that nobody was speaking.
    say(in == YY_IN_ACTIVE
          ? "OUTCOME 5 Your speech muscles were active. The microphone is off, so this check can't say whether anyone nearby was speaking."
          : "OUTCOME 5 The microphone is off and the muscle sensor picked up nothing, so this check can't tell anything this time.");
    return;   // never tap without both channels
  }
  bool outside = yy_outside_any(&hist);
  yy_outcome_t o = yy_decide(in, outside);
  char buf[256];
  snprintf(buf, sizeof buf, "OUTCOME %d %s", (int)o, yy_wording(o));
  say(buf);
  if (yy_tap(o, cueEnabled)) tap(2);
  // The coping coach (hum one soft note for 30 s) and the diary live in the app.
}

void handleSerial() {
  // In the full system the app sets this after the coupling test passes and
  // the clinician agrees. Serial control is for bench work only.
  if (!Serial.available()) return;
  String cmd = Serial.readStringUntil('\n');
  cmd.trim();
  if (cmd == "cue on")  { cueEnabled = true;  prefs.putBool("cue", true);  say("CUE enabled"); }
  if (cmd == "cue off") { cueEnabled = false; prefs.putBool("cue", false); say("CUE disabled"); }
  if (cmd == "cal")     { calibrated = calibrate(); }
}

// ---------------------------------------------------------------- setup/loop
void setup() {
  Serial.begin(115200);
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  pinMode(MOTOR_PIN, OUTPUT);
  analogReadResolution(12);
  prefs.begin("yy", false);
  cueEnabled = prefs.getBool("cue", false);   // off by default, always

  BLEDevice::init("YouYourself");
  BLEServer *srv = BLEDevice::createServer();
  BLEService *svc = srv->createService(SVC_UUID);
  tx = svc->createCharacteristic(TX_UUID, BLECharacteristic::PROPERTY_NOTIFY);
  tx->addDescriptor(new BLE2902());
  svc->start();
  BLEDevice::getAdvertising()->addServiceUUID(SVC_UUID);
  BLEDevice::startAdvertising();

  i2s.setPinsPdmRx(MIC_CLK, MIC_DATA);
  if (!i2s.begin(I2S_MODE_PDM_RX, YY_AUDIO_FS, I2S_DATA_BIT_WIDTH_16BIT, I2S_SLOT_MODE_MONO)) {
    say("MIC failed to start. The outside channel is off; outcomes will not use it.");
  } else {
    micOk = true;
    xTaskCreatePinnedToCore(micTask, "mic", 8192, nullptr, 1, nullptr, 0);
  }

  delay(2000);
  calibrated = calibrate();
}

void loop() {
  handleSerial();

  // shift in one 100 Hz sample
  float v = sample100Hz();
  if (envFill < YY_WIN) env[envFill++] = v;
  else { memmove(env, env + 1, sizeof(float) * (YY_WIN - 1)); env[YY_WIN - 1] = v; }

  if (envFill == YY_WIN && ++sinceHop >= YY_HOP) {
    sinceHop = 0;
    float p[YY_NCLASS] = {0};
    bool ok = calibrated && yy_contact_ok(env, YY_WIN);
    if (ok) {
      float f[YY_NFEAT];
      yy_features(env, YY_WIN, baseMed, baseSigma, f);
      yy_mlp_proba(f, p);
    }
    bool outside = speechThisHop;
    speechThisHop = false;
    yy_history_push(&hist, p[YY_CLASS_SPEECH], ok, outside);
  }

  static bool last = HIGH;
  static uint32_t lastChange = 0;
  bool b = digitalRead(BUTTON_PIN);
  if (b != last && millis() - lastChange > 40) {
    lastChange = millis();
    last = b;
    if (b == LOW) onVoiceButton();
  }
}
