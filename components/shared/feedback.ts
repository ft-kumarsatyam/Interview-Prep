"use client";

export type FeedbackKind = "tick" | "pass" | "fail" | "complete";

interface Tone {
  freq: number;
  /** Seconds after the cue starts. */
  at: number;
  dur: number;
  gain?: number;
  type?: OscillatorType;
}

export const FEEDBACK: Record<FeedbackKind, { tones: Tone[]; vibrate: number[] }> = {
  tick: { tones: [{ freq: 1046.5, at: 0, dur: 0.07, gain: 0.08 }], vibrate: [12] },
  pass: {
    tones: [
      { freq: 659.25, at: 0, dur: 0.14 },
      { freq: 987.77, at: 0.11, dur: 0.24 },
    ],
    vibrate: [18, 60, 18],
  },
  fail: {
    tones: [
      { freq: 349.23, at: 0, dur: 0.16, type: "triangle", gain: 0.14 },
      { freq: 261.63, at: 0.14, dur: 0.26, type: "triangle", gain: 0.14 },
    ],
    vibrate: [70],
  },
  complete: {
    tones: [
      { freq: 523.25, at: 0, dur: 0.2 },
      { freq: 659.25, at: 0.09, dur: 0.2 },
      { freq: 783.99, at: 0.18, dur: 0.22 },
      { freq: 1046.5, at: 0.27, dur: 0.45, gain: 0.16 },
    ],
    vibrate: [25, 50, 25, 50, 90],
  },
};

const STORAGE_KEY = "prepos:feedback";
const CHANGE_EVENT = "prepos:feedback-change";
/** A day-complete fanfare swallows any smaller cue that lands right after it (the quiz pass that completed the day). */
const COMPLETE_HOLD_MS = 1500;

let ctx: AudioContext | null = null;
let lastComplete = 0;

export function feedbackOn(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== "off";
  } catch {
    return true;
  }
}

export function setFeedbackOn(on: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, on ? "on" : "off");
  } catch {
    return;
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function subscribeFeedback(onChange: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function audio(): AudioContext | null {
  if (ctx) return ctx;
  const Ctor = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  ctx = new Ctor();
  return ctx;
}

/** iOS only lets audio start inside a tap, and cues often play after an awaited Server Action, so wake the context on every tap. */
function unlock() {
  if (!feedbackOn()) return;
  const c = audio();
  if (!c || c.state === "running") return;
  void c.resume();
  const silent = c.createBufferSource();
  silent.buffer = c.createBuffer(1, 1, 22050);
  silent.connect(c.destination);
  silent.start(0);
}

if (typeof window !== "undefined") window.addEventListener("pointerdown", unlock, { capture: true, passive: true });

function schedule(c: AudioContext, tones: Tone[]) {
  const t0 = c.currentTime + 0.01;
  for (const t of tones) {
    const osc = c.createOscillator();
    const gain = c.createGain();
    const start = t0 + t.at;
    osc.type = t.type ?? "sine";
    osc.frequency.value = t.freq;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(t.gain ?? 0.18, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + t.dur);
    osc.connect(gain).connect(c.destination);
    osc.start(start);
    osc.stop(start + t.dur + 0.03);
  }
}

function play(tones: Tone[]) {
  const c = audio();
  if (!c) return;
  if (c.state === "running") schedule(c, tones);
  else c.resume().then(() => schedule(c, tones), () => undefined);
}

const isIos = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent));

/** iOS has no Vibration API; since iOS 18 toggling a native switch control gives one system haptic tap (needs a recent tap). */
function iosHaptic() {
  const label = document.createElement("label");
  label.ariaHidden = "true";
  label.style.display = "none";
  const input = document.createElement("input");
  input.type = "checkbox";
  input.setAttribute("switch", "");
  label.appendChild(input);
  document.head.appendChild(label);
  label.click();
  label.remove();
}

function buzz(pattern: number[]) {
  if (typeof navigator.vibrate === "function") navigator.vibrate(pattern);
  else if (isIos()) iosHaptic();
}

/** A short sound and haptic for a key moment. Silent when the owner turned feedback off on this device. */
export function feedback(kind: FeedbackKind): void {
  if (typeof window === "undefined" || !feedbackOn()) return;
  const now = Date.now();
  if (kind === "complete") lastComplete = now;
  else if (now - lastComplete < COMPLETE_HOLD_MS) return;
  try {
    play(FEEDBACK[kind].tones);
    buzz(FEEDBACK[kind].vibrate);
  } catch {
    // Sound and haptics are a nicety; a browser that refuses them must never break the action.
  }
}
