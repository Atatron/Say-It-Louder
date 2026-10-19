// You, Yourself wearable firmware (ESP32 + MyoWare 2.0 muscle sensor + coin vibration motor)
//
// - Samples the MyoWare ENV output at 1 kHz on GPIO34 (ADC1, safe to use alongside radio).
// - Averages every 10 samples -> 100 Hz envelope, the rate detector.js expects.
// - Sends 10 samples (100 ms) per Bluetooth LE notification as little-endian uint16.
// - The phone writes 1 byte to the haptic characteristic to buzz the "this is me" tap.
// Nothing is stored on the device. Board: "ESP32 Dev Module", Arduino-ESP32 core 2.x or 3.x.

#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

#define EMG_PIN 34          // MyoWare ENV -> GPIO34
#define MOTOR_PIN 25        // GPIO25 -> 1k resistor -> NPN base; motor on collector with a flyback diode
#define LED_PIN 2           // on-board LED: on while a phone is connected

#define SERVICE_UUID   "6e1a0001-7c3b-4b8f-9a35-1a2b3c4d5e6f"
#define EMG_CHAR_UUID  "6e1a0002-7c3b-4b8f-9a35-1a2b3c4d5e6f"   // notify: 10 x uint16 envelope samples
#define HAPTIC_UUID    "6e1a0003-7c3b-4b8f-9a35-1a2b3c4d5e6f"   // write: pattern id (1 = tag, 2 = calm pulse)

BLECharacteristic *emgChar;
volatile bool connected = false;
volatile uint8_t hapticRequest = 0;

class ServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer *s) override { connected = true; digitalWrite(LED_PIN, HIGH); }
  void onDisconnect(BLEServer *s) override {
    connected = false;
    digitalWrite(LED_PIN, LOW);
    BLEDevice::startAdvertising();   // let the phone reconnect without a reset
  }
};

class HapticCallbacks : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *c) override {
    // getData() avoids the String/std::string type change between core 2.x and 3.x
    if (c->getLength() > 0) hapticRequest = c->getData()[0];
  }
};

// Short, gentle patterns. Never long or startling.
void playHaptic(uint8_t pattern) {
  if (pattern == 1) {              // "this is me": two soft taps
    for (int i = 0; i < 2; i++) { digitalWrite(MOTOR_PIN, HIGH); delay(60); digitalWrite(MOTOR_PIN, LOW); delay(90); }
  } else if (pattern == 2) {       // humming coach: one slow pulse
    digitalWrite(MOTOR_PIN, HIGH); delay(250); digitalWrite(MOTOR_PIN, LOW);
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(MOTOR_PIN, OUTPUT);
  pinMode(LED_PIN, OUTPUT);
  analogReadResolution(12);                  // 0..4095
  analogSetPinAttenuation(EMG_PIN, ADC_11db); // full 0..~3.1 V range for the 3.3 V-powered sensor

  BLEDevice::init("INI-AKU");
  BLEServer *server = BLEDevice::createServer();
  server->setCallbacks(new ServerCallbacks());
  BLEService *service = server->createService(SERVICE_UUID);

  emgChar = service->createCharacteristic(EMG_CHAR_UUID, BLECharacteristic::PROPERTY_NOTIFY);
  emgChar->addDescriptor(new BLE2902());

  BLECharacteristic *haptic = service->createCharacteristic(HAPTIC_UUID, BLECharacteristic::PROPERTY_WRITE);
  haptic->setCallbacks(new HapticCallbacks());

  service->start();
  BLEAdvertising *adv = BLEDevice::getAdvertising();
  adv->addServiceUUID(SERVICE_UUID);
  adv->setScanResponse(true);
  BLEDevice::startAdvertising();
  Serial.println("You, Yourself ready, advertising as INI-AKU");
}

void loop() {
  static uint32_t nextSampleUs = micros();
  static uint32_t acc = 0;
  static uint8_t accCount = 0;
  static uint16_t packet[10];
  static uint8_t packetCount = 0;

  // 1 kHz sampling paced by micros(), so BLE work in between doesn't drift the rate.
  if ((int32_t)(micros() - nextSampleUs) >= 0) {
    nextSampleUs += 1000;
    acc += analogRead(EMG_PIN);
    if (++accCount == 10) {                   // 10 ms -> one 100 Hz sample
      packet[packetCount++] = acc / 10;
      acc = 0; accCount = 0;
      if (packetCount == 10) {                // 100 ms -> one notification
        if (connected) {
          emgChar->setValue((uint8_t *)packet, sizeof(packet));  // ESP32 is little-endian
          emgChar->notify();
        }
        packetCount = 0;
      }
    }
  }

  if (hapticRequest) {
    uint8_t p = hapticRequest;
    hapticRequest = 0;
    playHaptic(p);
    nextSampleUs = micros();                  // the haptic delay is a gap, not a burst of catch-up samples
  }
}
