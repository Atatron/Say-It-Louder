// You, Yourself inside-channel detector.
// Input: MyoWare ENV samples (ESP32 ADC units, 0-4095) at 100 Hz.
// Output: events classified as speech-motor activity, chewing, swallowing or noise.
// The same code runs in the simulator and on live Bluetooth data, so the demo shows the real logic.

const SAMPLE_HZ = 100;

const DEFAULTS = {
  k: 3,                  // threshold = baseline mean + k * baseline SD
  minDelta: 25,          // ...but never closer than this many ADC units to the mean
  minSpeechMs: 300,      // a speech-motor event must stay above threshold this long
  swallowFactor: 6,      // peak above (threshold-delta * this) and short => swallow; chewing bursts stay below it
  swallowMaxMs: 900,
  chewWindowMs: 3000,    // 3+ short bursts with regular gaps inside this window => chewing
  chewMinBursts: 3,
  chewBurstMaxMs: 450,
  insideWindowMs: 5000,  // "your speech muscles were active" looks back this far
};

class Detector {
  constructor(opts = {}) {
    this.o = Object.assign({}, DEFAULTS, opts);
    this.mean = null;
    this.sd = null;
    this.calib = [];
    this.calibrating = false;
    this.t = 0;              // ms since start
    this.run = null;         // the above-threshold run in progress
    this.recentBursts = [];  // short runs, kept for chewing detection
    this.events = [];        // classified events
    this.listeners = [];
  }

  onEvent(fn) { this.listeners.push(fn); }

  startCalibration() { this.calib = []; this.calibrating = true; }

  // Rest calibration: mean and SD of the person's own resting signal.
  finishCalibration() {
    this.calibrating = false;
    if (this.calib.length < SAMPLE_HZ) throw new Error("Calibration needs at least 1 second of rest data");
    const n = this.calib.length;
    const mean = this.calib.reduce((a, b) => a + b, 0) / n;
    const sd = Math.sqrt(this.calib.reduce((a, b) => a + (b - mean) ** 2, 0) / n);
    this.mean = mean;
    this.sd = sd;
    return { mean, sd, threshold: this.threshold() };
  }

  isCalibrated() { return this.mean !== null; }

  threshold() {
    if (!this.isCalibrated()) return null;
    return this.mean + Math.max(this.o.k * this.sd, this.o.minDelta);
  }

  push(value) {
    const dt = 1000 / SAMPLE_HZ;
    this.t += dt;
    if (this.calibrating) { this.calib.push(value); return; }
    if (!this.isCalibrated()) return;

    const thr = this.threshold();
    if (value > thr) {
      if (!this.run) this.run = { start: this.t, peak: value };
      else this.run.peak = Math.max(this.run.peak, value);
    } else if (this.run) {
      this.closeRun(this.run, this.t);
      this.run = null;
    }
  }

  closeRun(run, end) {
    const o = this.o;
    const dur = end - run.start;
    const thr = this.threshold();
    const delta = thr - this.mean;
    let type;

    if (run.peak > this.mean + delta * o.swallowFactor && dur <= o.swallowMaxMs) {
      type = "swallow";
    } else if (dur <= o.chewBurstMaxMs) {
      // Short bursts are only interesting when several arrive in a rhythm (chewing).
      this.recentBursts = this.recentBursts.filter((b) => end - b.end < o.chewWindowMs);
      this.recentBursts.push({ start: run.start, end });
      type = this.recentBursts.length >= o.chewMinBursts && this.isRhythmic(this.recentBursts) ? "chewing" : "noise";
      if (type === "chewing") this.relabelRecent("chewing");
    } else if (dur >= o.minSpeechMs) {
      type = "speech";
    } else {
      type = "noise";
    }

    const ev = { type, start: run.start, end, durMs: Math.round(dur), peak: Math.round(run.peak) };
    this.events.push(ev);
    if (this.events.length > 200) this.events.shift();
    this.listeners.forEach((fn) => fn(ev));
  }

  // Chewing gaps are fairly even (about 0.4-1.2 s). Speech-motor bursts are not.
  isRhythmic(bursts) {
    const starts = bursts.map((b) => b.start);
    const gaps = starts.slice(1).map((s, i) => s - starts[i]);
    if (gaps.length < 2) return false;
    const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    const spread = Math.max(...gaps) - Math.min(...gaps);
    return mean >= 350 && mean <= 1200 && spread <= mean * 0.6;
  }

  relabelRecent(type) {
    const since = this.t - this.o.chewWindowMs;
    this.events.forEach((e) => { if (e.end >= since && (e.type === "noise" || e.type === "speech")) e.type = type; });
  }

  // Was there real speech-motor activity in the last few seconds (and no chewing at the same time)?
  insideActive() {
    const since = this.t - this.o.insideWindowMs;
    const recent = this.events.filter((e) => e.end >= since);
    const ongoing = this.run && this.t - this.run.start >= this.o.minSpeechMs;
    return (recent.some((e) => e.type === "speech") || !!ongoing) && !recent.some((e) => e.type === "chewing");
  }
}

// Two-channel verdict. Wording is deliberately probabilistic and never mentions "thoughts".
function verdict(insideActive, outsideSpeech) {
  if (insideActive && !outsideSpeech) return {
    key: "inner",
    title: "Probably your own inner speech.",
    detail: "Your speech muscles were active and no one near you was speaking.",
    action: "Try humming one soft note for 30 seconds.",
  };
  if (!insideActive && outsideSpeech) return {
    key: "outside",
    title: "Someone nearby is actually speaking.",
    detail: "The phone heard real speech around you.",
    action: "If you're unsure what they said, it's fine to ask.",
  };
  if (insideActive && outsideSpeech) return {
    key: "both",
    title: "Real speech nearby, and your speech muscles were active.",
    detail: "You may have been talking or repeating words. This check can't separate the two.",
    action: "Note it in your diary and look again in a quieter moment.",
  };
  return {
    key: "neither",
    title: "No speech nearby and no muscle activity detected.",
    detail: "This check can't explain this voice. Not every voice is inner speech.",
    action: "Write it in your diary so you can talk it through with your clinician.",
  };
}

if (typeof module !== "undefined") module.exports = { Detector, verdict, SAMPLE_HZ, DEFAULTS };
