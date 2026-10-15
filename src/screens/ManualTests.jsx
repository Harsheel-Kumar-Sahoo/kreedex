import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db";
import { useT } from "../lang";
import { KHELO, KHELO_ORDER, LEVEL_COLORS, levelFor, hasTable, fmt } from "../khelo";

const showVal = (id, v, t) =>
  fmt(id, v) + (id === "run_600" ? "" : " " + t("kh.unit." + KHELO[id].unit));

export default function ManualTests({ child, onBack }) {
  const { t } = useT();
  const results = useLiveQuery(
    () => db.results.where("childId").equals(child.id).toArray(),
    [child.id]
  );

  // The official tables exist for boys and girls. For "other", the teacher chooses.
  const [table, setTable] = useState(
    child.gender === "male" || child.gender === "female" ? child.gender : ""
  );
  const [testId, setTestId] = useState(null);
  const [val, setVal] = useState("");
  const [mins, setMins] = useState("");
  const [secs, setSecs] = useState("");
  const [err, setErr] = useState(""); // a string key
  const [saved, setSaved] = useState(null);

  const latest = {};
  for (const r of [...(results || [])].sort((a, b) => b.createdAt - a.createdAt)) {
    if (KHELO[r.test] && !latest[r.test]) latest[r.test] = r;
  }

  function reset() {
    setTestId(null);
    setVal("");
    setMins("");
    setSecs("");
    setErr("");
    setSaved(null);
  }

  async function save(e) {
    e.preventDefault();
    setErr("");
    const def = KHELO[testId];

    let value;
    if (testId === "run_600") {
      if (mins === "" && secs === "") return setErr("kh.e.value");
      value = Number(mins || 0) * 60 + Number(secs || 0);
    } else {
      if (val === "") return setErr("kh.e.value");
      value = Number(val);
    }
    if (!Number.isFinite(value)) return setErr("kh.e.value");
    if (value < def.min || value > def.max) return setErr("kh.e.range");

    const lv = levelFor(testId, table, child.age, value);
    if (!lv) return setErr("kh.e.range");

    await db.results.add({
      childId: child.id,
      test: testId,
      value,
      age: child.age,
      tableGender: table,
      level: lv.n,
      points: lv.points,
      createdAt: Date.now(),
    });
    setSaved({ testId, value, lv });
  }

  // ----- After saving -----
  if (saved) {
    const color = LEVEL_COLORS[saved.lv.n - 1];
    return (
      <section className="panel">
        <h2>{t("kh.saved")}</h2>
        <p className="muted">
          {t("kh." + saved.testId)}: {showVal(saved.testId, saved.value, t)}
        </p>

        <div className="scorebox">
          <div className="scorerow">
            <span className="lvlbig" style={{ color }}>{saved.lv.n}</span>
            <span className="scoretext">
              <strong>{t("kh.level", { n: saved.lv.n })}</strong>
              <span style={{ color }}>{t("lvl." + saved.lv.n)}</span>
              <span className="muted">{t("kh.points", { p: saved.lv.points })}</span>
            </span>
          </div>
          {saved.lv.below && <p className="muted">{t("kh.below")}</p>}
          {saved.testId === "run_600" && (child.age === 12 || child.age === 13) && (
            <p className="note">{t("kh.caution600")}</p>
          )}
        </div>

        <button className="btn primary" onClick={reset}>{t("kh.another")}</button>
        <button className="btn" onClick={onBack}>{t("back")}</button>
      </section>
    );
  }

  // ----- Entry form -----
  if (testId) {
    const def = KHELO[testId];
    return (
      <section className="panel">
        <button className="link" onClick={reset}>{t("back")}</button>
        <h2>{t("kh." + testId)}</h2>
        <p className="muted">{child.name} · {child.id} · {child.age}</p>
        <p className="muted">{t("kh." + testId + ".how")}</p>

        <form className="form" onSubmit={save}>
          {testId === "run_600" ? (
            <div className="row">
              <label>
                {t("kh.min")}
                <input
                  type="number"
                  inputMode="numeric"
                  step="any"
                  value={mins}
                  onChange={(e) => setMins(e.target.value)}
                />
              </label>
              <label>
                {t("kh.sec")}
                <input
                  type="number"
                  inputMode="decimal"
                  step="any"
                  value={secs}
                  onChange={(e) => setSecs(e.target.value)}
                />
              </label>
            </div>
          ) : (
            <label>
              {t("kh.value")} ({t("kh.unit." + def.unit)})
              <input
                type="number"
                inputMode="decimal"
                step="any"
                value={val}
                onChange={(e) => setVal(e.target.value)}
              />
            </label>
          )}
          {err && <p className="error">{t(err)}</p>}
          <button className="btn primary" type="submit">{t("kh.save")}</button>
        </form>
      </section>
    );
  }

  // ----- List of tests -----
  return (
    <section className="panel">
      <button className="link" onClick={onBack}>{t("back")}</button>
      <h2>{t("kh.title")}</h2>
      <p className="muted">{child.name} · {child.id} · {child.age}</p>
      <p className="muted">{t("kh.intro")}</p>
      {child.age < 9 && <p className="note">{t("kh.young")}</p>}

      {child.gender === "other" && (
        <div className="form">
          <label>
            {t("kh.table")}
            <select value={table} onChange={(e) => setTable(e.target.value)}>
              <option value="">{t("reg.select")}</option>
              <option value="male">{t("kh.table.male")}</option>
              <option value="female">{t("kh.table.female")}</option>
            </select>
          </label>
          {!table && <p className="muted">{t("kh.tablePick")}</p>}
        </div>
      )}

      <div className="cards">
        {KHELO_ORDER.map((id) => {
          const ready = !!table;
          const ok = ready && hasTable(id, table, child.age);
          const last = latest[id];
          const lv = last
            ? levelFor(id, last.tableGender, last.age ?? child.age, last.value)
            : null;

          let sub = t("kh." + id + ".how");
          if (ready && !ok) {
            sub =
              id === "run_600" && child.age >= 14
                ? t("kh.noage600")
                : t("kh.noage", { age: child.age });
          }

          return (
            <button className="card" key={id} disabled={!ok} onClick={() => setTestId(id)}>
              <strong>{t("kh." + id)}</strong>
              <span>{sub}</span>
              {last && lv && (
                <span className="muted">
                  {t("kh.last", {
                    v: showVal(id, last.value, t),
                    lvl: t("kh.level", { n: lv.n }) + " " + t("lvl." + lv.n),
                  })}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}