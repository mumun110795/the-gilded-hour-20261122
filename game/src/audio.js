// audio.js — a pocket synthesiser. Every sound in the game is a small
// shape of oscillators: the tick of a thrown pebble, the groan of a loose
// board, the two-note sting of being seen. No audio files, nothing fetched.
// The context is only ever created after a human gesture, and every entry
// point quietly does nothing outside a browser (or while muted).

let ctx = null;
let muted = false;

export function ensureAudio() {
  if (typeof window === 'undefined') return;
  if (!ctx) {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) ctx = new AC();
    } catch {
      ctx = null;
    }
  }
  if (ctx && ctx.state === 'suspended') ctx.resume();
}

export function setMuted(m) { muted = !!m; }
export function isMuted() { return muted; }

function tone(freq, dur, { type = 'sine', gain = 0.04, delay = 0, slideTo = null } = {}) {
  if (!ctx) return;
  const t0 = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  amp.gain.setValueAtTime(0, t0);
  amp.gain.linearRampToValueAtTime(gain, t0 + 0.012);
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(amp).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

export function sfx(name) {
  if (muted || typeof window === 'undefined') return;
  ensureAudio();
  if (!ctx) return;
  switch (name) {
    case 'step':
      tone(82, 0.06, { type: 'triangle', gain: 0.012 });
      break;
    case 'creak':
      tone(170, 0.2, { type: 'sawtooth', gain: 0.025, slideTo: 68 });
      break;
    case 'pebble':
      tone(1500, 0.05, { gain: 0.035 });
      tone(1150, 0.07, { gain: 0.03, delay: 0.07 });
      break;
    case 'suspicion':
      tone(392, 0.12, { type: 'triangle', gain: 0.03 });
      break;
    case 'spot':
      tone(740, 0.14, { type: 'square', gain: 0.035 });
      tone(392, 0.3, { type: 'square', gain: 0.035, delay: 0.12 });
      break;
    case 'pickup':
      tone(660, 0.09, { gain: 0.035 });
      tone(880, 0.09, { gain: 0.035, delay: 0.08 });
      tone(1320, 0.14, { gain: 0.03, delay: 0.16 });
      break;
    case 'locked':
      tone(196, 0.12, { type: 'triangle', gain: 0.03 });
      tone(185, 0.16, { type: 'triangle', gain: 0.03, delay: 0.1 });
      break;
    case 'caught':
      tone(330, 0.25, { type: 'sawtooth', gain: 0.04, slideTo: 110 });
      break;
    case 'win':
      [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.16, { gain: 0.035, delay: i * 0.11 }));
      break;
    default:
      break;
  }
}
