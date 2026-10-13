import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db";
import PoseCamera from "./PoseCamera";

export default function RunTest({ onBack }) {
  const children = useLiveQuery(
    () => db.children.orderBy("createdAt").reverse().toArray(),
    []
  );
  const [child, setChild] = useState(null);
  const [on, setOn] = useState(false);
  const [facing, setFacing] = useState("environment");

  if (!child) {
    return (
      <section className="panel">
        <button className="link" onClick={onBack}>← Back</button>
        <h2>Run a test</h2>
        <p className="muted">Select the child who will take the test.</p>

        {children && children.length === 0 && (
          <p className="muted">No children registered yet. Register one first.</p>
        )}

        <div className="list">
          {children?.map((c) => (
            <button className="child pick" key={c.id} onClick={() => setChild(c)}>
              <div>
                <strong>{c.name}</strong>
                <span className="muted">{c.id} · {c.age} yrs · {c.gender}</span>
              </div>
            </button>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="panel">
      <button
        className="link"
        onClick={() => {
          setOn(false);
          setChild(null);
        }}
      >
        ← Change child
      </button>
      <h2>Camera check</h2>
      <p className="muted">
        {child.name} ({child.id}). Stand 2-3 metres from the phone so the whole body is visible.
        Video stays on this device and is not saved.
      </p>

      {!on ? (
        <button className="btn primary" onClick={() => setOn(true)}>Start camera</button>
      ) : (
        <>
          <PoseCamera facing={facing} />
          <div className="row">
            <button
              className="btn"
              onClick={() => setFacing(facing === "environment" ? "user" : "environment")}
            >
              Switch camera
            </button>
            <button className="btn" onClick={() => setOn(false)}>Stop</button>
          </div>
        </>
      )}
    </section>
  );
}