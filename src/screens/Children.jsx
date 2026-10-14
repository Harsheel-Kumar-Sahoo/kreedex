import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db";
import { computeKreedex } from "../scoring";
import { SHOW_PLACEHOLDER_NOTICE } from "../benchmarks";
import { useT } from "../lang";

export default function Children({ onBack, onOpen }) {
  const { t } = useT();
  const children = useLiveQuery(
    () => db.children.orderBy("createdAt").reverse().toArray(),
    []
  );
  const results = useLiveQuery(() => db.results.toArray(), []);

  const byChild = {};
  for (const r of results || []) {
    if (!byChild[r.childId]) byChild[r.childId] = [];
    byChild[r.childId].push(r);
  }

  async function remove(c) {
    if (window.confirm(t("ch.confirm", { name: c.name, id: c.id }))) {
      await db.results.where("childId").equals(c.id).delete();
      await db.children.delete(c.id);
    }
  }

  return (
    <section className="panel">
      <button className="link" onClick={onBack}>{t("back")}</button>
      <h2>{t("home.children")}</h2>

      {SHOW_PLACEHOLDER_NOTICE && <p className="note">{t("notice.placeholder")}</p>}

      {!children && <p className="muted">{t("loading")}</p>}
      {children && children.length === 0 && (
        <p className="muted">{t("ch.empty")}</p>
      )}

      <div className="list">
        {children?.map((c) => {
          const k = computeKreedex(c, byChild[c.id] || []);
          return (
            <div className="childcard" key={c.id}>
              <div className="child">
                <div>
                  <strong>
                    {c.name}
                    {c.demo && <span className="tag">{t("tag.sample")}</span>}
                  </strong>
                  <span className="muted">
                    {c.id} · {c.age} · {t("gender." + c.gender)}
                    {c.heightCm ? ` · ${c.heightCm} cm` : ""}
                  </span>
                  <span className="muted">{c.school}, {c.district}</span>
                </div>
                <button className="link danger" onClick={() => remove(c)}>{t("ch.delete")}</button>
              </div>

              <div className="scorebox">
                {k.overall == null ? (
                  <span className="muted">{t("ch.noResults")}</span>
                ) : (
                  <>
                    <div className="scorerow">
                      <span className="scorenum" style={{ color: k.band.color }}>
                        {k.overall}
                      </span>
                      <span className="scoretext">
                        <strong>{t("ch.score")}</strong>
                        <span style={{ color: k.band.color }}>{t("band." + k.band.label)}</span>
                        <span className="muted">
                          {t("ch.basedOn", { n: k.count, total: k.total })}
                        </span>
                      </span>
                    </div>
                    <div className="attempts">
                      {k.tests.map((x) => (
                        <span className="chip" key={x.id}>
                          {t("index." + x.index)}: {x.score}
                          <span className="chipsub"> ({x.value} {x.unit})</span>
                        </span>
                      ))}
                    </div>
                  </>
                )}
                <button className="btn" onClick={() => onOpen(c.id)}>{t("ch.view")}</button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}