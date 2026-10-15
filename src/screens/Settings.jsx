import { useEffect, useState } from "react";
import { useT } from "../lang";
import { useSettings } from "../settings";
import { speechSupported, loadVoices, pickVoice } from "../speech";

function Toggle({ label, sub, checked, onChange }) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        <strong>{label}</strong>
        {sub && <span className="muted">{sub}</span>}
      </span>
    </label>
  );
}

export default function Settings({ onBack }) {
  const { t, lang } = useT();
  const { settings, setSetting, say, cue } = useSettings();
  const [found, setFound] = useState(null);

  useEffect(() => {
    let alive = true;
    if (speechSupported()) {
      loadVoices().then((voices) => {
        if (!alive) return;
        const v = pickVoice(lang, voices);
        setFound({ lang, status: v ? (v.localService ? "local" : "online") : "none" });
      });
    }
    return () => {
      alive = false;
    };
  }, [lang]);

  const status = !speechSupported()
    ? "unsupported"
    : found && found.lang === lang
    ? found.status
    : "checking";

  return (
    <section className="panel">
      <button className="link" onClick={onBack}>{t("back")}</button>
      <h2>{t("set.title")}</h2>

      <Toggle
        label={t("set.voice")}
        sub={t("set.voiceSub")}
        checked={settings.voice}
        onChange={(v) => setSetting("voice", v)}
      />
      <p className="muted">{t("set.vs." + status)}</p>
      <button
        className="btn"
        onClick={() => say(t("set.sample"), { force: true })}
        disabled={status === "unsupported"}
      >
        {t("set.testVoice")}
      </button>

      <Toggle
        label={t("set.beeps")}
        sub={t("set.beepsSub")}
        checked={settings.beeps}
        onChange={(v) => setSetting("beeps", v)}
      />
      <button className="btn" onClick={() => cue("ok", { force: true })}>
        {t("set.testSound")}
      </button>

      <Toggle
        label={t("set.large")}
        checked={settings.large}
        onChange={(v) => setSetting("large", v)}
      />
      <Toggle
        label={t("set.contrast")}
        checked={settings.contrast}
        onChange={(v) => setSetting("contrast", v)}
      />

      <p className="muted">{t("set.note")}</p>
    </section>
  );
}