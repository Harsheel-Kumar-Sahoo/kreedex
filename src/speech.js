// Speech (text-to-speech) and short beeps, both using features built into the browser.

const synth =
  typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis : null;

export const speechSupported = () => !!synth;

const BCP = { en: "en-IN", gu: "gu-IN", hi: "hi-IN" };
export const speechLang = (lang) => BCP[lang] || "en-IN";

let voicesCache = [];

// Voices often load a moment after the page opens, so wait for them (up to 1.5 s).
export function loadVoices() {
  return new Promise((resolve) => {
    if (!synth) return resolve([]);
    const now = synth.getVoices();
    if (now.length) {
      voicesCache = now;
      return resolve(now);
    }
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      synth.removeEventListener("voiceschanged", finish);
      voicesCache = synth.getVoices();
      resolve(voicesCache);
    };
    synth.addEventListener("voiceschanged", finish);
    setTimeout(finish, 1500);
  });
}

// Prefers an exact language match (for example gu-IN), then any voice for the
// language, and within those a voice installed on the phone over an online one.
export function pickVoice(lang, voices = voicesCache) {
  const want = speechLang(lang).toLowerCase();
  const base = want.split("-")[0];
  const norm = (v) => v.lang.toLowerCase().replace("_", "-");
  const exact = voices.filter((v) => norm(v) === want);
  const same = voices.filter((v) => norm(v).split("-")[0] === base);
  const pool = exact.length ? exact : same;
  if (!pool.length) return null;
  return pool.find((v) => v.localService) || pool[0];
}

export function speak(text, lang, opts = {}) {
  if (!synth || !text) return false;
  const clean = String(text).replace(/[…→←]/g, " ").replace(/\s+/g, " ").trim();
  if (!clean) return false;
  const u = new SpeechSynthesisUtterance(clean);
  u.lang = speechLang(lang);
  const v = pickVoice(lang);
  if (v) u.voice = v;
  u.rate = opts.rate || 0.95;
  synth.cancel(); // a new cue replaces any older one that is still being read
  synth.speak(u);
  return true;
}

export function stopSpeech() {
  if (synth) synth.cancel();
}

// ----- Beeps -----
let ctx = null;

function audio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

// Call from a tap or click so the browser allows sound later in the test.
export function primeAudio() {
  audio();
}

function tone(c, freq, start, dur, type, vol) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  const t0 = c.currentTime + start;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g);
  g.connect(c.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

export function beep(kind) {
  const c = audio();
  if (!c) return;
  if (kind === "ready") {
    tone(c, 660, 0, 0.12, "sine", 0.25);
    tone(c, 660, 0.18, 0.12, "sine", 0.25);
  } else if (kind === "go") {
    tone(c, 988, 0, 0.35, "square", 0.15);
  } else if (kind === "ok") {
    tone(c, 523, 0, 0.12, "sine", 0.25);
    tone(c, 784, 0.14, 0.22, "sine", 0.25);
  } else if (kind === "bad") {
    tone(c, 180, 0, 0.35, "sawtooth", 0.18);
  } else if (kind === "tick") {
    tone(c, 880, 0, 0.06, "sine", 0.2);
  }
}