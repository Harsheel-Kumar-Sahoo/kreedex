import { useState } from "react";
import { db, newChildId } from "../db";
import { DISTRICTS } from "../districts";
import { useT } from "../lang";

const empty = {
  name: "",
  age: "",
  gender: "",
  height: "",
  school: "",
  district: "",
  guardian: "",
  consent: false,
};

export default function Register({ onBack }) {
  const { t } = useT();
  const [f, setF] = useState(empty);
  const [error, setError] = useState(""); // holds a string key
  const [savedId, setSavedId] = useState("");

  const set = (key) => (e) =>
    setF({ ...f, [key]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError("");

    const age = Number(f.age);
    const height = Number(f.height);
    if (!f.name.trim()) return setError("reg.e.name");
    if (!age || age < 6 || age > 17) return setError("reg.e.age");
    if (!f.gender) return setError("reg.e.gender");
    if (!height || height < 90 || height > 210) return setError("reg.e.height");
    if (!f.school.trim()) return setError("reg.e.school");
    if (!f.district.trim()) return setError("reg.e.district");
    if (!f.guardian.trim()) return setError("reg.e.guardian");
    if (!f.consent) return setError("reg.e.consent");

    const id = newChildId();
    await db.children.add({
      id,
      name: f.name.trim(),
      age,
      gender: f.gender,
      heightCm: height,
      school: f.school.trim(),
      district: f.district.trim(),
      guardian: f.guardian.trim(),
      consentAt: new Date().toISOString(),
      createdAt: Date.now(),
    });
    setSavedId(id);
    setF(empty);
  }

  if (savedId) {
    return (
      <section className="panel">
        <h2>{t("reg.done")}</h2>
        <p>{t("reg.childId")}</p>
        <div className="big-id">{savedId}</div>
        <p className="muted">{t("reg.noteId")}</p>
        <button className="btn primary" onClick={() => setSavedId("")}>
          {t("reg.another")}
        </button>
        <button className="btn" onClick={onBack}>{t("reg.home")}</button>
      </section>
    );
  }

  return (
    <section className="panel">
      <button className="link" onClick={onBack}>{t("back")}</button>
      <h2>{t("home.register")}</h2>

      <form onSubmit={submit} className="form">
        <label>
          {t("reg.name")}
          <input value={f.name} onChange={set("name")} autoComplete="off" />
        </label>

        <div className="row">
          <label>
            {t("reg.age")}
            <input type="number" inputMode="numeric" value={f.age} onChange={set("age")} />
          </label>
          <label>
            {t("reg.gender")}
            <select value={f.gender} onChange={set("gender")}>
              <option value="">{t("reg.select")}</option>
              <option value="female">{t("gender.female")}</option>
              <option value="male">{t("gender.male")}</option>
              <option value="other">{t("gender.other")}</option>
            </select>
          </label>
        </div>

        <label>
          {t("reg.height")}
          <input
            type="number"
            inputMode="numeric"
            value={f.height}
            onChange={set("height")}
            placeholder={t("reg.heightPh")}
          />
        </label>

        <label>
          {t("reg.school")}
          <input value={f.school} onChange={set("school")} autoComplete="off" />
        </label>

        <label>
          {t("reg.district")}
          <input list="districts" value={f.district} onChange={set("district")} />
          <datalist id="districts">
            {DISTRICTS.map((d) => <option key={d} value={d} />)}
          </datalist>
        </label>

        <label>
          {t("reg.guardian")}
          <input value={f.guardian} onChange={set("guardian")} autoComplete="off" />
        </label>

        <label className="consent">
          <input type="checkbox" checked={f.consent} onChange={set("consent")} />
          <span>{t("reg.consent")}</span>
        </label>

        {error && <p className="error">{t(error)}</p>}

        <button className="btn primary" type="submit">{t("reg.save")}</button>
      </form>
    </section>
  );
}