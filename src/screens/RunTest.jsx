import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db";
import PoseCamera from "./PoseCamera";
import JumpTest from "./JumpTest";
import BalanceTest from "./BalanceTest";

function HeightForm({ child, onSaved, onBack }) {
  const [h, setH] = useState("");
  const [err, setErr] = useState("");

  async function save(e) {
    e.preventDefault();
    const v = Number(h);
    if (!v || v < 90 || v > 210) return setErr("Enter the height in cm (90 to 210).");
    await db.children.update(child.id, { heightCm: v });
    onSaved({ ...child, heightCm: v });
  }

  return (
    <section className="panel">
      <button className="link" onClick={onBack}>← Change child</button>
      <h2>Height needed</h2>
      <p className="muted">
        {child.name} has no height saved. It is used to convert measurements into centimetres.
      </p>
      <form className="form" onSubmit={save}>
        <label>
          Height (cm)
          <input
            type="number"
            inputMode="numeric"
            value={h}
            onChange={(e) => setH(e.target.value)}
          />
        </label>
        {err && <p className="error">{err}</p>}
        <button className="btn primary" type="submit">Save height</button>
      </form>
    </section>
  );
}

function CameraCheck({ child, onBack }) {
  const [on, setOn] = useState(false);
  const [facing, setFacing] = useState("environment");

  return (
    <section className="panel">
      <button className="link" onClick={onBack}>← Back</button>
      <h2>Camera check</h2>
      <p className="muted">
        {child.name} ({child.id}). Stand 2-3 metres from the phone so the whole body is
        visible. Video stays on this device and is not saved.
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

export default function RunTest({ onBack }) {
  const children = useLiveQuery(
    () => db.children.orderBy("createdAt").reverse().toArray(),
    []
  );
  const [child, setChild] = useState(null);
  const [mode, setMode] = useState(null); // null | "jump" | "balance" | "camera"

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

  if (!child.heightCm) {
    return (
      <HeightForm
        child={child}
        onSaved={setChild}
        onBack={() => setChild(null)}
      />
    );
  }

  if (mode === "jump") {
    return <JumpTest child={child} onBack={() => setMode(null)} />;
  }
  if (mode === "balance") {
    return <BalanceTest child={child} onBack={() => setMode(null)} />;
  }
  if (mode === "camera") {
    return <CameraCheck child={child} onBack={() => setMode(null)} />;
  }

  return (
    <section className="panel">
      <button className="link" onClick={() => setChild(null)}>← Change child</button>
      <h2>Choose a test</h2>
      <p className="muted">{child.name} · {child.id} · {child.heightCm} cm</p>

      <div className="cards">
        <button className="card" onClick={() => setMode("jump")}>
          <strong>Vertical jump</strong>
          <span>Measures jump height in cm</span>
        </button>
        <button className="card" onClick={() => setMode("balance")}>
          <strong>Single-leg balance</strong>
          <span>Times how long one foot stays lifted</span>
        </button>
        <button className="card" disabled>
          <strong>Standing broad jump</strong>
          <span>Coming next in Chapter 5</span>
        </button>
        <button className="card" onClick={() => setMode("camera")}>
          <strong>Camera check</strong>
          <span>Check that the pose detection works</span>
        </button>
      </div>
    </section>
  );
}