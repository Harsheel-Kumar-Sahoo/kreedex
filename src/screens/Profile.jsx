import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db";
import { BENCHMARKS, SHOW_PLACEHOLDER_NOTICE } from "../benchmarks";
import { computeKreedex, testHistory, band } from "../scoring";
import { KHELO, KHELO_ORDER, LEVEL_COLORS, levelFor, fmt, hasTable } from "../khelo";
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

  // Official Khelo India tests, newest result first, each with its level.
  const official = KHELO_ORDER.map((id) => ({
    id,
    hist: results
      .filter((r) => r.test === id)
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((r) => ({
        r,
        lv: levelFor(id, r.tableGender, r.age ?? child.age, r.value),
      })),
  }));
  const scoredOfficial = official.filter((o) => o.hist.length && o.hist[0].lv);
  const avgPts = scoredOfficial.length
    ? round1(scoredOfficial.reduce((s, o) => s + o.hist[0].lv.points, 0) / scoredOfficial.length)
    : null;
    // Show only the official tests that have results or that have a table for this age.
  const relevant = official.filter(
    (o) =>
      o.hist.length ||
      hasTable(o.id, "male", child.age) ||
      hasTable(o.id, "female", child.age)
  );
  const showOfficial = relevant.length > 0;

  const showVal = (id, v) =>
    fmt(id, v) + (id === "run_600" ? "" : " " + t("kh.unit." + KHELO[id].unit));

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

      <h3>{t("kh.camTitle")}</h3>

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

      {showOfficial && (
        <>
          <h3>{t("kh.profileTitle")}</h3>
          <p className="note">{t("kh.source")}</p>
          {avgPts != null && (
            <p><strong>{t("kh.avg", { p: avgPts, n: scoredOfficial.length })}</strong></p>
          )}

          {relevant.map(({ id, hist }) => {
            const top = hist[0];
            const lv = top ? top.lv : null;
            const color = lv ? LEVEL_COLORS[lv.n - 1] : null;

            return (
              <div className="testcard" key={id}>
                <div className="testhead">
                  <strong>{t("kh." + id)}</strong>
                </div>

                {!top ? (
                  <p className="muted">{t("pf.notTested")}</p>
                ) : (
                  <>
                    <div className="testnums">
                      <span className="testval">{showVal(id, top.r.value)}</span>
                      {lv && (
                        <span style={{ color, fontWeight: 600 }}>
                          {t("kh.level", { n: lv.n })} · {t("lvl." + lv.n)} ·{" "}
                          {t("kh.points", { p: lv.points })}
                        </span>
                      )}
                    </div>
                    {lv && lv.below && <p className="muted">{t("kh.below")}</p>}

                    <div className="hist">
                      {hist.map(({ r, lv: l }) => (
                        <div className="histrow" key={r.id}>
                          <span>{fmtDate(r.createdAt)}</span>
                          <span>
                            {showVal(id, r.value)}
                            {l ? " · " + t("kh.level", { n: l.n }) : ""}
                            {r.source === "camera" ? " · " + t("kh.viaCamera") : ""}
                          </span>
                          <button className="link danger noprint" onClick={() => removeResult(r.id)}>
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
        </>
      )}

      <p className="muted">{t("pf.disclaimer")}</p>

      <div className="row noprint">
        <button className="btn primary" onClick={onRunTest}>{t("home.test")}</button>
        <button className="btn" onClick={() => window.print()}>{t("pf.print")}</button>
      </div>
    </section>
  );
}