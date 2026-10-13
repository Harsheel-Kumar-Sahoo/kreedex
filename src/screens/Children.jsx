import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db";

export default function Children({ onBack }) {
  const children = useLiveQuery(
    () => db.children.orderBy("createdAt").reverse().toArray(),
    []
  );

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

      {!children && <p className="muted">Loading…</p>}
      {children && children.length === 0 && (
        <p className="muted">No children registered yet.</p>
      )}

      <div className="list">
        {children?.map((c) => (
          <div className="child" key={c.id}>
            <div>
              <strong>{c.name}</strong>
              <span className="muted">
                {c.id} · {c.age} yrs · {c.gender}
                {c.heightCm ? ` · ${c.heightCm} cm` : ""}
              </span>
              <span className="muted">{c.school}, {c.district}</span>
            </div>
            <button className="link danger" onClick={() => remove(c)}>Delete</button>
          </div>
        ))}
      </div>
    </section>
  );
}