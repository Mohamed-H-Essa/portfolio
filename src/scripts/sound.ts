// Interface sound, synthesised with Web Audio: no files, nothing to license,
// every sound shaped to sit quietly under the motion. Silent until the first
// click/key (browsers require a gesture anyway, and nobody wants a page that
// starts talking); the speaker toggle remembers the choice. Each sound is a
// tiny recipe: filtered noise for air and paper, sines for the glassy and the
// low, all through one soft room reverb and a master level kept very low.

type Name = 'tick' | 'tap' | 'whoosh' | 'unfold' | 'flip' | 'swell';
interface Opts { dir?: 1 | -1; level?: number }

const KEY = 'sound';
const MASTER = 0.22;
let ctx: AudioContext | null = null;
let out: GainNode;
let wet: GainNode;
let noise: AudioBuffer;
let unlocked = false;
const last: Partial<Record<Name, number>> = {};
const MIN_GAP: Record<Name, number> = { tick: 70, tap: 60, whoosh: 160, unfold: 300, flip: 70, swell: 900 };

const pref = () => { try { return localStorage.getItem(KEY) !== 'off'; } catch { return true; } };
export const soundOn = () => unlocked && pref();

function boot() {
  if (ctx) return;
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  out = ctx.createGain();
  out.gain.value = MASTER;
  // keep everything soft at the top end
  const shelf = ctx.createBiquadFilter();
  shelf.type = 'highshelf';
  shelf.frequency.value = 7000;
  shelf.gain.value = -9;
  out.connect(shelf).connect(ctx.destination);
  // a small dark room: noise impulse with an exponential tail
  const len = Math.floor(ctx.sampleRate * 1.6);
  const ir = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = ir.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
  }
  const verb = ctx.createConvolver();
  verb.buffer = ir;
  wet = ctx.createGain();
  wet.gain.value = 0.28;
  wet.connect(verb).connect(out);
  // one second of white noise, reused by every airy sound
  noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const n = noise.getChannelData(0);
  for (let i = 0; i < n.length; i++) n[i] = Math.random() * 2 - 1;
}

/** route a node to the dry bus and (a little) to the room */
function send(node: AudioNode, room = 1) {
  node.connect(out);
  if (room > 0) {
    const g = ctx!.createGain();
    g.gain.value = room;
    node.connect(g).connect(wet);
  }
}
function env(g: GainNode, t: number, peak: number, attack: number, decay: number) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
}
function noiseSrc(t: number, dur: number) {
  const s = ctx!.createBufferSource();
  s.buffer = noise;
  s.start(t, Math.random() * 0.5, dur + 0.05);
  return s;
}
function tone(freq: number, t: number, peak: number, attack: number, decay: number, type: OscillatorType = 'sine', room = 1) {
  const o = ctx!.createOscillator();
  o.type = type;
  o.frequency.value = freq;
  const g = ctx!.createGain();
  env(g, t, peak, attack, decay);
  o.connect(g);
  send(g, room);
  o.start(t);
  o.stop(t + attack + decay + 0.05);
  return o;
}

const RECIPES: Record<Name, (t: number, o: Opts) => void> = {
  // tiny glassy blip for hover
  tick(t, o) {
    tone(2400 + Math.random() * 300, t, 0.05 * (o.level ?? 1), 0.004, 0.05, 'sine', 0.4);
  },
  // a soft, felt press: a short band of noise + a low thump
  tap(t, o) {
    const s = noiseSrc(t, 0.05);
    const bp = ctx!.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1700;
    bp.Q.value = 1.2;
    const g = ctx!.createGain();
    env(g, t, 0.16 * (o.level ?? 1), 0.002, 0.04);
    s.connect(bp).connect(g);
    send(g, 0.5);
    tone(170, t, 0.12 * (o.level ?? 1), 0.004, 0.08, 'sine', 0.2);
  },
  // air moving past: noise through a sweeping band (up for forward, down for back)
  whoosh(t, o) {
    const dur = 0.42;
    const s = noiseSrc(t, dur);
    const bp = ctx!.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 0.9;
    const [a, b] = (o.dir ?? 1) > 0 ? [380, 1500] : [1500, 380];
    bp.frequency.setValueAtTime(a, t);
    bp.frequency.exponentialRampToValueAtTime(b, t + dur);
    const g = ctx!.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.11 * (o.level ?? 1), t + dur * 0.45);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(bp).connect(g);
    send(g, 0.9);
  },
  // paper unfolding: a few fine crinkles scattered over a soft low swell
  unfold(t, o) {
    const k = o.level ?? 1;
    for (let i = 0; i < 7; i++) {
      const at = t + 0.02 + Math.random() * 0.26;
      const s = noiseSrc(at, 0.02);
      const hp = ctx!.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 2200 + Math.random() * 1800;
      const g = ctx!.createGain();
      env(g, at, (0.03 + Math.random() * 0.05) * k, 0.001, 0.012 + Math.random() * 0.02);
      s.connect(hp).connect(g);
      send(g, 0.6);
    }
    const s = noiseSrc(t, 0.5);
    const lp = ctx!.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 520;
    const g = ctx!.createGain();
    env(g, t, 0.07 * k, 0.12, 0.38);
    s.connect(lp).connect(g);
    send(g, 1);
  },
  // a page flick: short noise falling from bright to soft
  flip(t, o) {
    const s = noiseSrc(t, 0.07);
    const bp = ctx!.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 1.4;
    bp.frequency.setValueAtTime(4200, t);
    bp.frequency.exponentialRampToValueAtTime(1300, t + 0.07);
    const g = ctx!.createGain();
    env(g, t, 0.09 * (o.level ?? 1), 0.003, 0.065);
    s.connect(bp).connect(g);
    send(g, 0.5);
  },
  // the low, distant tone of something arriving (the ∞ closing, a world opening)
  swell(t, o) {
    const k = o.level ?? 1;
    tone(55, t, 0.09 * k, 0.6, 1.6, 'sine', 1.2);
    tone(82.4, t + 0.05, 0.05 * k, 0.7, 1.5, 'sine', 1.2);
    tone(659, t + 0.25, 0.012 * k, 0.4, 1.4, 'triangle', 1.5);
  },
};

export function play(name: Name, o: Opts = {}) {
  if (!soundOn() || !ctx) return;
  const now = performance.now();
  if (now - (last[name] ?? 0) < MIN_GAP[name]) return;
  last[name] = now;
  if (ctx.state === 'suspended') void ctx.resume();
  RECIPES[name](ctx.currentTime + 0.005, o);
}

/** Wire the unlock-on-first-gesture and every [data-sound-toggle] button. Call once per page. */
export function initSound() {
  const unlock = () => {
    if (unlocked) return;
    unlocked = true;
    boot();
    void ctx?.resume();
    removeEventListener('pointerdown', unlock, true);
    removeEventListener('keydown', unlock, true);
  };
  addEventListener('pointerdown', unlock, true);
  addEventListener('keydown', unlock, true);

  const sync = () =>
    document.querySelectorAll<HTMLButtonElement>('[data-sound-toggle]').forEach((b) => {
      b.setAttribute('aria-pressed', String(pref()));
      b.classList.toggle('is-off', !pref());
    });
  document.addEventListener('click', (e) => {
    const b = (e.target as Element).closest('[data-sound-toggle]');
    if (!b) return;
    try { localStorage.setItem(KEY, pref() ? 'off' : 'on'); } catch { /* private mode: stays on for the page */ }
    sync();
    unlock();
    play('tap');
  });
  sync();

  // generic: every button and link press gets a soft tap; hovering controls ticks
  document.addEventListener('pointerdown', (e) => {
    const el = (e.target as Element).closest('a, button, [role="button"]');
    if (el && !el.closest('[data-sound-toggle], [data-sound-own]')) requestAnimationFrame(() => play('tap', { level: 0.7 }));
  });
  document.addEventListener('pointerover', (e) => {
    if ((e as PointerEvent).pointerType !== 'mouse') return;
    const el = (e.target as Element).closest('.btn, .switch__opt, .hud__tick, .ctl, .node, .to-map, .lb__btn, .rail__year, .gallery__shot, .langs a, .sound-toggle');
    const from = (e as PointerEvent).relatedTarget as Element | null;
    if (el && !(from && el.contains(from))) play('tick', { level: 0.6 });
  });
}
