// You, Yourself outside channel: was anyone near you actually speaking?
// On-device voice-activity detection with the Web Audio API. Nothing is recorded or uploaded:
// the analyser only exposes the current spectrum, which is reduced to two numbers per frame.

class OutsideVAD {
  constructor({ windowMs = 5000, minSpeechMs = 250 } = {}) {
    this.windowMs = windowMs;
    this.minSpeechMs = minSpeechMs;
    this.noiseFloor = null;
    this.speechSince = null;
    this.lastSpeechAt = -Infinity;
    this.level = 0;
    this.ratio = 0;
    this.running = false;
  }

  async start() {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: false, autoGainControl: false },
    });
    this.ctx = new AudioContext();
    const src = this.ctx.createMediaStreamSource(this.stream);
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.5;
    src.connect(this.analyser);
    this.bins = new Float32Array(this.analyser.frequencyBinCount);
    this.running = true;
    this.tick();
  }

  stop() {
    this.running = false;
    if (this.stream) this.stream.getTracks().forEach((t) => t.stop());
    if (this.ctx) this.ctx.close();
  }

  // Speech energy sits mostly between 300 and 3400 Hz. A frame counts as speech when that band is
  // well above the room's noise floor AND holds most of the total energy (rules out thumps and hum).
  tick() {
    if (!this.running) return;
    this.analyser.getFloatFrequencyData(this.bins);
    const hzPerBin = this.ctx.sampleRate / this.analyser.fftSize;
    let band = 0, total = 0;
    for (let i = 1; i < this.bins.length; i++) {
      const p = Math.pow(10, this.bins[i] / 10); // dB -> power
      total += p;
      const hz = i * hzPerBin;
      if (hz >= 300 && hz <= 3400) band += p;
    }
    const bandDb = 10 * Math.log10(band + 1e-12);
    this.ratio = band / (total + 1e-12);

    // Noise floor follows quiet frames slowly and loud frames very slowly.
    if (this.noiseFloor === null) this.noiseFloor = bandDb;
    const rate = bandDb < this.noiseFloor ? 0.05 : 0.002;
    this.noiseFloor += (bandDb - this.noiseFloor) * rate;
    this.level = bandDb - this.noiseFloor;

    const now = performance.now();
    const speechy = this.level > 12 && this.ratio > 0.55;
    if (speechy) {
      if (this.speechSince === null) this.speechSince = now;
      if (now - this.speechSince >= this.minSpeechMs) this.lastSpeechAt = now;
    } else {
      this.speechSince = null;
    }
    // setTimeout rather than requestAnimationFrame: rAF pauses when the screen is hidden.
    setTimeout(() => this.tick(), 30);
  }

  speechRecently() {
    return performance.now() - this.lastSpeechAt <= this.windowMs;
  }
}

if (typeof module !== "undefined") module.exports = { OutsideVAD };
