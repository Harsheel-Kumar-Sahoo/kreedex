import { useEffect, useState } from "react";
import { useT } from "./lang";
import { getOfflineStatus, prepareOffline } from "./offline";

const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
const isStandalone =
  (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) ||
  navigator.standalone === true;

export default function OfflineBox() {
  const { t } = useT();
  const [status, setStatus] = useState(null);
  const [online, setOnline] = useState(navigator.onLine);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [err, setErr] = useState("");
  const [installEvt, setInstallEvt] = useState(null);

  const refresh = () => getOfflineStatus().then(setStatus);

  useEffect(() => {
    refresh();

    const on = () => setOnline(true);
    const off = () => setOnline(false);
    const bip = (e) => {
      e.preventDefault();
      setInstallEvt(e);
    };
    const installed = () => setInstallEvt(null);

    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    window.addEventListener("beforeinstallprompt", bip);
    window.addEventListener("appinstalled", installed);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
      window.removeEventListener("beforeinstallprompt", bip);
      window.removeEventListener("appinstalled", installed);
    };
  }, []);

  async function onPrepare() {
    setBusy(true);
    setErr("");
    setProgress({ done: 0, total: 0 });
    try {
      await prepareOffline((done, total) => setProgress({ done, total }));
    } catch (e) {
      setErr(e.message === "no-sw" ? "off.reload" : "off.err");
    }
    setBusy(false);
    refresh();
  }

  async function onInstall() {
    installEvt.prompt();
    await installEvt.userChoice;
    setInstallEvt(null);
  }

  const state = status ? status.state : null;
  const needsPrep = state && state !== "dev" && state !== "ready";
  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <div className={"offbox" + (state === "ready" ? " ready" : "")}>
      <div className="offhead">
        <strong>{t("off.title")}</strong>
        <span className={"pill " + (online ? "ok" : "warn")}>
          {online ? t("off.online") : t("off.offline")}
        </span>
      </div>

      {state === "dev" && <p className="muted">{t("off.dev")}</p>}

      {state === "ready" && (
        <>
          <p><strong>{t("off.ready")}</strong></p>
          <p className="muted">{t("off.readySub")}</p>
        </>
      )}

      {needsPrep && (
        <>
          {state === "no-sw" && <p className="muted">{t("off.reload")}</p>}
          {status.have > 0 && (
            <p className="muted">
              {t("off.partial", { have: status.have, total: status.total })}
            </p>
          )}
          <p className="muted">{t("off.desc", { mb: status.mb || 20 })}</p>

          {busy && (
            <>
              <div className="bar"><span style={{ width: pct + "%" }} /></div>
              <p className="muted">
                {t("off.progress", { done: progress.done, total: progress.total })}
              </p>
            </>
          )}
          {err && <p className="error">{t(err)}</p>}

          <button className="btn primary" onClick={onPrepare} disabled={busy || !online}>
            {t("off.prepare")}
          </button>
        </>
      )}

      {installEvt && (
        <button className="btn" onClick={onInstall}>{t("off.install")}</button>
      )}
      {isIos && !isStandalone && <p className="muted">{t("off.iosHint")}</p>}
    </div>
  );
}