// You, Yourself live mode: connect to the real wearable over Web Bluetooth (Chrome on Android or desktop).
// Feeds the same Detector the simulator uses, and can send the "this is me" tap back to the device.

const INI_AKU = {
  service: "6e1a0001-7c3b-4b8f-9a35-1a2b3c4d5e6f",
  emg: "6e1a0002-7c3b-4b8f-9a35-1a2b3c4d5e6f",
  haptic: "6e1a0003-7c3b-4b8f-9a35-1a2b3c4d5e6f",
};

class LiveDevice {
  constructor(onSamples) {
    this.onSamples = onSamples;
    this.hapticChar = null;
  }

  static supported() { return !!(navigator.bluetooth && window.isSecureContext); }

  async connect() {
    const device = await navigator.bluetooth.requestDevice({ filters: [{ services: [INI_AKU.service] }] });
    device.addEventListener("gattserverdisconnected", () => this.onDisconnect && this.onDisconnect());
    const server = await device.gatt.connect();
    const service = await server.getPrimaryService(INI_AKU.service);
    const emg = await service.getCharacteristic(INI_AKU.emg);
    this.hapticChar = await service.getCharacteristic(INI_AKU.haptic);
    emg.addEventListener("characteristicvaluechanged", (e) => {
      const v = e.target.value; // DataView: 10 little-endian uint16 samples
      const samples = [];
      for (let i = 0; i + 1 < v.byteLength; i += 2) samples.push(v.getUint16(i, true));
      this.onSamples(samples);
    });
    await emg.startNotifications();
    this.device = device;
    return device.name;
  }

  async tap(pattern = 1) {
    if (this.hapticChar) await this.hapticChar.writeValueWithoutResponse(new Uint8Array([pattern]));
  }

  disconnect() { if (this.device && this.device.gatt.connected) this.device.gatt.disconnect(); }
}

if (typeof module !== "undefined") module.exports = { LiveDevice, INI_AKU };
