import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db";
import { computeKreedex } from "../scoring";
import { SHOW_PLACEHOLDER_NOTICE, PLACEHOLDER_NOTICE } from "../benchmarks";

export default function Children({ onBack, onOpen }) {
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
    if (window.confirm(`Delete ${c.name} (${c.id}) and all their results? This cannot be undone.`)) {
      await db.results.where("childId").equals(c.id).delete();
      await db.children.delete(c.id);
    }
  }

  return (
    <section className="panel">
      <button className="link" onClick={onBack}>← Back</button>
      <h2>Registered children</h2>

      {SHOW_PLACEHOLDER_NOTICE && <p className="note">{PLACEHOLDER_NOTICE}</p>}

      {!children && <p className="muted">Loading…</p>}
      {children && children.length === 0 && (
        <p className="muted">No children registered yet.</p>
      )}

      <div className="list">
        {children?.map((c) => {
          const k = computeKreedex(c, byChild[c.id] || []);
          return (
            <div className="childcard" key={c.id}>
              <div className="child">
                <div>
                  <strong>{c.name}{c.demo && <span className="tag">SAMPLE</span>}</strong>
                  <span className="muted">
                    {c.id} · {c.age} yrs · {c.gender}
                    {c.heightCm ? ` · ${c.heightCm} cm` : ""}
                  </span>
                  <span className="muted">{c.school}, {c.district}</span>
                </div>
                <button className="link danger" onClick={() => remove(c)}>Delete</button>
              </div>

              <div className="scorebox">
                {k.overall == null ? (
                  <span className="muted">No test results saved yet.</span>
                ) : (
                  <>
                    <div className="scorerow">
                      <span className="scorenum" style={{ color: k.band.color }}>
                        {k.overall}
                      </span>
                      <span className="scoretext">
                        <strong>Kreedex Score</strong>
                        <span style={{ color: k.band.color }}>{k.band.label}</span>
                        <span className="muted">
                          Based on {k.count} of {k.total} tests
                        </span>
                      </span>
                    </div>
                    <div className="attempts">
                      {k.tests.map((t) => (
                        <span className="chip" key={t.id}>
                          {t.index}: {t.score}
                          <span className="chipsub"> ({t.value} {t.unit})</span>
                        </span>
                      ))}
                    </div>
                  </>
                )}
                <button className="btn" onClick={() => onOpen(c.id)}>View profile</button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}