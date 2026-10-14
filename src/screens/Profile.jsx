import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db";
import { BENCHMARKS, SHOW_PLACEHOLDER_NOTICE } from "../benchmarks";
import { computeKreedex, testHistory, band } from "../scoring";
import { useT } from "../lang";

const LOCALES = { en: "en-IN", gu: "gu-IN", hi: "hi-IN" };
const round1 = (x) => Math.round(x * 10) / 10;

// A small line chart of results over time, drawn as plain SVG.
function Spark({ values }) {
  if (values.length < 2) return null;
  const w = 260;
  const h = 56;
  const pad = 8;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const x = (i) => pad + (i * (w - 2 * pad)) / (values.length - 1);
  const y = (v) => (max === min ? h / 2 : h - pad - ((v - min) / (max - min)) * (h - 2 * pad));
  const pts = values.map((v, i) => `${x(i)},${y(v)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="spark" role="img" aria-label="Progress over time">
      <polyline points={pts} fill="none" stroke="#0b3954" strokeWidth="2" />
      {values.map((v, i) => (
        <circle
          key={i}
          cx={x(i)}
          cy={y(v)}
          r={i === values.length - 1 ? 4 : 3}
          fill={i === values.length - 1 ? "#ea580c" : "#0b3954"}
        />
      ))}
    </svg>
  );
}

export default function Profile({ childId, onBack, onRunTest }) {
  const { t, lang } = useT();
  const child = useLiveQuery(() => db.children.get(childId), [childId]);
  const results = useLiveQuery(
    () => db.results.where("childId").equals(childId).toArray(),
    [childId]
  );

  const fmtDate = (ts) =>
    new Date(ts).toLocaleDateString(LOCALES[lang] || "en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  if (!child || !results) {
    return (
      <section className="panel">
        <button className="link" onClick={onBack}>{t("back")}</button>
        <p className="muted">{t("loading")}</p>
      </section>
    );
  }

  const k = computeKreedex(child, results);
  const tests = Object.entries(BENCHMARKS).map(([id, bm]) => ({
    id,
    bm,
    hist: testHistory(child, results, id),
  }));

  async function removeResult(id) {
    if (window.confirm(t("pf.deleteConfirm"))) {
      await db.results.delete(id);
    }
  }

  return (
    <section className="panel">
      <button className="link noprint" onClick={onBack}>{t("back")}</button>

      <div>
        <h2>
          {child.name}
          {child.demo && <span className="tag">{t("tag.sample")}</span>}
        </h2>
        <p className="muted">
          {child.id} · {child.age} · {t("gender." + child.gender)}
          {child.heightCm ? ` · ${child.heightCm} cm` : ""}
        </p>
        <p className="muted">{child.school}, {child.district}</p>
      </div>

      {SHOW_PLACEHOLDER_NOTICE && <p className="note">{t("notice.placeholder")}</p>}

      <div className="scorebox">
        {k.overall == null ? (
          <span className="muted">{t("ch.noResults")}</span>
        ) : (
          <div className="scorerow">
            <span className="scorenum" style={{ color: k.band.color }}>{k.overall}</span>
            <span className="scoretext">
              <strong>{t("ch.score")}</strong>
              <span style={{ color: k.band.color }}>{t("band." + k.band.label)}</span>
              <span className="muted">{t("ch.basedOn", { n: k.count, total: k.total })}</span>
            </span>
          </div>
        )}
      </div>

      {tests.map(({ id, bm, hist }) => {
        const latest = hist[hist.length - 1];
        const prev = hist.length > 1 ? hist[hist.length - 2] : null;
        const delta = latest && prev ? round1(latest.value - prev.value) : null;
        const b = latest ? band(latest.score) : null;

        return (
          <div className="testcard" key={id}>
            <div className="testhead">
              <strong>{t("test." + id)}</strong>
              <span className="muted">{t("index." + bm.index)}</span>
            </div>

            {!latest ? (
              <p className="muted">{t("pf.notTested")}</p>
            ) : (
              <>
                <div className="testnums">
                  <span className="testval">{latest.value} {bm.unit}</span>
                  <span style={{ color: b.color, fontWeight: 600 }}>
                    {latest.score} · {t("band." + b.label)}
                  </span>
                </div>

                {delta != null && (
                  <p className="muted">
                    {t("pf.change", { v: (delta > 0 ? "+" : "") + delta, unit: bm.unit })}
                  </p>
                )}

                <Spark values={hist.map((h) => h.value)} />

                <div className="hist">
                  {[...hist].reverse().map((h) => (
                    <div className="histrow" key={h.id}>
                      <span>{fmtDate(h.createdAt)}</span>
                      <span>{h.value} {bm.unit} · {t("pf.score")} {h.score}</span>
                      <button className="link danger noprint" onClick={() => removeResult(h.id)}>
                        {t("ch.delete")}
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        );
      })}

      <p className="muted">{t("pf.disclaimer")}</p>

      <div className="row noprint">
        <button className="btn primary" onClick={onRunTest}>{t("home.test")}</button>
        <button className="btn" onClick={() => window.print()}>{t("pf.print")}</button>
      </div>
    </section>
  );
}