import { useState } from "react";
import { useT } from "../lang";
import { useAuth, SHOW_DEMO_PINS, DEMO_PINS } from "../auth";
import { DISTRICTS } from "../districts";

export default function Login() {
  const { t } = useT();
  const { accounts, signIn, createAccount, resetAccounts, notice } = useAuth();

  const [mode, setMode] = useState("signin"); // signin | create
  const [role, setRole] = useState("teacher");
  const [pick, setPick] = useState("");
  const [pin, setPin] = useState("");
  const [err, setErr] = useState(null); // { key, vars }
  const [busy, setBusy] = useState(false);

  const [f, setF] = useState({
    role: "teacher",
    name: "",
    school: "",
    district: "",
    scope: "state",
    pin: "",
    pin2: "",
  });
  const setField = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const setDigits = (k) => (e) => setF({ ...f, [k]: e.target.value.replace(/\D/g, "").slice(0, 4) });

  const list = accounts.filter((a) => a.role === role);
  const chosen = list.some((a) => a.id === pick) ? pick : list.length ? list[0].id : "";

  const label = (a) =>
    a.role === "teacher"
      ? `${a.name} · ${a.school}`
      : `${a.name} · ${a.scope === "state" ? t("auth.scope.state") : a.scope}`;

  async function submitSignIn(e) {
    e.preventDefault();
    setErr(null);
    if (!chosen) return setErr({ key: "auth.e.pick" });
    setBusy(true);
    const r = await signIn(chosen, pin);
    setBusy(false);
    if (!r.ok) {
      setErr({ key: r.reason, vars: { s: r.wait } });
      setPin("");
    }
  }

  async function submitCreate(e) {
    e.preventDefault();
    setErr(null);
    if (f.pin !== f.pin2) return setErr({ key: "auth.e.mismatch" });
    setBusy(true);
    const r = await createAccount({
      role: f.role,
      name: f.name,
      pin: f.pin,
      school: f.school,
      district: f.district,
      scope: f.scope,
    });
    setBusy(false);
    if (!r.ok) setErr({ key: r.reason });
  }

  async function onReset() {
    if (window.confirm(t("auth.resetConfirm"))) {
      await resetAccounts();
      setErr(null);
    }
  }

  return (
    <>
      <header className="hero">
        <div className="logo">K</div>
        <h1>Kreedex</h1>
        <p className="tagline">{t("home.tagline")}</p>
      </header>

      {notice && <p className="note">{t(notice)}</p>}

      {mode === "signin" ? (
        <section className="panel">
          <h2>{t("auth.title")}</h2>
          <p className="muted">{t("auth.sub")}</p>

          <div className="tabs" role="group" aria-label={t("auth.role")}>
            {["teacher", "official"].map((r) => (
              <button
                type="button"
                key={r}
                className={"tab" + (role === r ? " on" : "")}
                onClick={() => {
                  setRole(r);
                  setErr(null);
                }}
              >
                {t("role." + r)}
              </button>
            ))}
          </div>

          {list.length === 0 ? (
            <p className="muted">{t("auth.none")}</p>
          ) : (
            <form className="form" onSubmit={submitSignIn}>
              <label>
                {t("auth.account")}
                <select value={chosen} onChange={(e) => setPick(e.target.value)}>
                  {list.map((a) => (
                    <option key={a.id} value={a.id}>{label(a)}</option>
                  ))}
                </select>
              </label>
              <label>
                {t("auth.pin")}
                <input
                  type="password"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                />
              </label>
              {err && <p className="error">{t(err.key, err.vars)}</p>}
              <button className="btn primary" type="submit" disabled={busy}>
                {t("auth.signIn")}
              </button>
            </form>
          )}

          {SHOW_DEMO_PINS && (
            <p className="muted">
              {t("auth.demoHint", { teacher: DEMO_PINS.teacher, official: DEMO_PINS.official })}
            </p>
          )}

          <button
            className="link"
            onClick={() => {
              setMode("create");
              setErr(null);
            }}
          >
            {t("auth.create")}
          </button>
          <button className="link" onClick={onReset}>{t("auth.reset")}</button>

          <p className="note">{t("auth.demoNote")}</p>
        </section>
      ) : (
        <section className="panel">
          <button
            className="link"
            onClick={() => {
              setMode("signin");
              setErr(null);
            }}
          >
            {t("back")}
          </button>
          <h2>{t("auth.create")}</h2>
          <p className="muted">{t("auth.createNote")}</p>

          <form className="form" onSubmit={submitCreate}>
            <label>
              {t("auth.role")}
              <select value={f.role} onChange={setField("role")}>
                <option value="teacher">{t("role.teacher")}</option>
                <option value="official">{t("role.official")}</option>
              </select>
            </label>

            <label>
              {t("auth.name")}
              <input value={f.name} onChange={setField("name")} autoComplete="off" />
            </label>

            {f.role === "teacher" ? (
              <>
                <label>
                  {t("auth.school")}
                  <input value={f.school} onChange={setField("school")} autoComplete="off" />
                </label>
                <label>
                  {t("auth.district")}
                  <input list="login-districts" value={f.district} onChange={setField("district")} />
                  <datalist id="login-districts">
                    {DISTRICTS.map((d) => <option key={d} value={d} />)}
                  </datalist>
                </label>
              </>
            ) : (
              <label>
                {t("auth.scope")}
                <select value={f.scope} onChange={setField("scope")}>
                  <option value="state">{t("auth.scope.state")}</option>
                  {DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </label>
            )}

            <div className="row">
              <label>
                {t("auth.pin")}
                <input
                  type="password"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={4}
                  value={f.pin}
                  onChange={setDigits("pin")}
                />
              </label>
              <label>
                {t("auth.pin2")}
                <input
                  type="password"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={4}
                  value={f.pin2}
                  onChange={setDigits("pin2")}
                />
              </label>
            </div>

            {err && <p className="error">{t(err.key)}</p>}
            <button className="btn primary" type="submit" disabled={busy}>
              {t("auth.create")}
            </button>
          </form>
        </section>
      )}
    </>
  );
}