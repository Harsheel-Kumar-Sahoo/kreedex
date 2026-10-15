import { useEffect, useMemo, useRef, useState } from "react";
import { SettingsContext, DEFAULT_SETTINGS } from "./settings";
import { useT } from "./lang";
import { speak, stopSpeech, beep, primeAudio, loadVoices } from "./speech";

const KEY = "kreedex-settings";

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    /* storage not available */
  }
  return DEFAULT_SETTINGS;
}

export default function SettingsProvider({ children }) {
  const { lang } = useT();
  const [settings, setSettings] = useState(load);

  // The helper functions below read the latest settings from here.
  const latest = useRef({ settings, lang });
  useEffect(() => {
    latest.current = { settings, lang };
  }, [settings, lang]);

  useEffect(() => {
    const el = document.documentElement;
    el.classList.toggle("a11y-large", settings.large);
    el.classList.toggle("a11y-contrast", settings.contrast);
    try {
      localStorage.setItem(KEY, JSON.stringify(settings));
    } catch {
      /* ignore */
    }
  }, [settings]);

  // Warm up the voice list so the first spoken cue is not delayed.
  useEffect(() => {
    loadVoices();
  }, []);

  const api = useMemo(
    () => ({
      setSetting: (key, value) => setSettings((s) => ({ ...s, [key]: value })),
      // text is already translated; opts.force speaks even when voice is switched off
      say: (text, opts = {}) => {
        const { settings: s, lang: l } = latest.current;
        if (opts.force || s.voice) speak(text, l, opts);
      },
      cue: (kind, opts = {}) => {
        if (opts.force || latest.current.settings.beeps) beep(kind);
      },
      silence: () => stopSpeech(),
      prime: () => primeAudio(),
    }),
    []
  );

  return (
    <SettingsContext.Provider value={{ settings, ...api }}>
      {children}
    </SettingsContext.Provider>
  );
}