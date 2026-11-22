// Synthesised sound: no files. A low pulse that tightens with the alarm, plus one-shot effects.
let ac = null;
let master = null;
let pulseTimer = 0;

export function startAudio() {
  if (ac) return;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return;
  ac = new Ctx();
  master = ac.createGain();
  master.gain.value = 0.35;
  master.connect(ac.destination);
}

function tone(freq, dur, type = 'square', vol = 0.2, slideTo = null) {
  if (!ac) return;
  const t = ac.currentTime;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.connect(g).connect(master);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function hiss(dur, vol = 0.15, cutoff = 2000) {
  if (!ac) return;
  const len = Math.floor(ac.sampleRate * dur);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ac.createBufferSource();
  src.buffer = buf;
  const filter = ac.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = cutoff;
  const g = ac.createGain();
  g.gain.value = vol;
  src.connect(filter).connect(g).connect(master);
  src.start();
}

const EFFECTS = {
  coin: () => { tone(1800, 0.08, 'triangle', 0.2); setTimeout(() => tone(2300, 0.1, 'triangle', 0.15), 90); },
  smoke: () => hiss(1.2, 0.25, 900),
  emp: () => tone(900, 0.4, 'sawtooth', 0.15, 60),
  tick: () => tone(2600, 0.03, 'square', 0.06),
  loot: () => { tone(660, 0.12, 'triangle', 0.2); setTimeout(() => tone(990, 0.2, 'triangle', 0.2), 110); },
  spotted: () => { tone(220, 0.25, 'sawtooth', 0.25); tone(233, 0.25, 'sawtooth', 0.2); },
  camera: () => { tone(1200, 0.1, 'square', 0.15); setTimeout(() => tone(1200, 0.1, 'square', 0.15), 150); },
  lockdown: () => tone(440, 1.2, 'sawtooth', 0.2, 880),
  escape: () => [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.3, 'triangle', 0.2), i * 120)),
  caught: () => tone(300, 0.9, 'sawtooth', 0.25, 70),
};

export function playEffects(names) {
  names.forEach((n) => EFFECTS[n] && EFFECTS[n]());
}

// The heartbeat score: slow and soft when calm, fast and sharp as the alarm climbs.
export function updateMusic(alarm, lockdown, dt) {
  if (!ac) return;
  pulseTimer -= dt;
  if (pulseTimer > 0) return;
  const tension = lockdown > 0 ? 1 : alarm / 100;
  pulseTimer = 0.9 - tension * 0.55;
  tone(55 + tension * 30, 0.25, 'sine', 0.18 + tension * 0.1);
  if (lockdown > 0) tone(660, 0.18, 'square', 0.05, 880);
}
