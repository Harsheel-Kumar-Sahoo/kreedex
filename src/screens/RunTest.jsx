import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db";
import PoseCamera from "./PoseCamera";
import JumpTest from "./JumpTest";
import BalanceTest from "./BalanceTest";
import FlamingoTest from "./FlamingoTest";
import PushupTest from "./PushupTest";
import ManualTests from "./ManualTests";
import { useT } from "../lang";

function HeightForm({ child, onSaved, onBack }) {
  const { t } = useT();
  const [h, setH] = useState("");
  const [err, setErr] = useState(false);

  async function save(e) {
    e.preventDefault();
    const v = Number(h);
    if (!v || v < 90 || v > 210) return setErr(true);
    await db.children.update(child.id, { heightCm: v });
    onSaved({ ...child, heightCm: v });
  }

  return (
    <section className="panel">
      <button className="link" onClick={onBack}>{t("rt.changeChild")}</button>
      <h2>{t("rt.heightTitle")}</h2>
      <p className="muted">{t("rt.heightBody", { name: child.name })}</p>
      <form className="form" onSubmit={save}>
        <label>
          {t("reg.height")}
          <input
            type="number"
            inputMode="numeric"
            value={h}
            onChange={(e) => setH(e.target.value)}
          />
        </label>
        {err && <p className="error">{t("rt.heightErr")}</p>}
        <button className="btn primary" type="submit">{t("rt.heightSave")}</button>
      </form>
    </section>
  );
}

function CameraCheck({ child, onBack }) {
  const { t } = useT();
  const [on, setOn] = useState(false);
  const [facing, setFacing] = useState("environment");

  return (
    <section className="panel">
      <button className="link" onClick={onBack}>{t("back")}</button>
      <h2>{t("rt.cam")}</h2>
      <p className="muted">{t("cam.body", { name: child.name, id: child.id })}</p>

      {!on ? (
        <button className="btn primary" onClick={() => setOn(true)}>{t("cam.start")}</button>
      ) : (
        <>
          <PoseCamera facing={facing} />
          <div className="row">
            <button
              className="btn"
              onClick={() => setFacing(facing === "environment" ? "user" : "environment")}
            >
              {t("cam.switch")}
            </button>
            <button className="btn" onClick={() => setOn(false)}>{t("cam.stop")}</button>
          </div>
        </>
      )}
    </section>
  );
}

export default function RunTest({ onBack }) {
  const { t } = useT();
  const children = useLiveQuery(
    () => db.children.orderBy("createdAt").reverse().toArray(),
    []
  );
  const [child, setChild] = useState(null);
  // null | "jump" | "balance" | "flamingo" | "push" | "khelo" | "camera"
  const [mode, setMode] = useState(null);

  if (!child) {
    return (
      <section className="panel">
        <button className="link" onClick={onBack}>{t("back")}</button>
        <h2>{t("home.test")}</h2>
        <p className="muted">{t("rt.pick")}</p>

        {children && children.length === 0 && (
          <p className="muted">{t("rt.noChildren")}</p>
        )}

        <div className="list">
          {children?.filter((c) => !c.demo).map((c) => (
            <button className="child pick" key={c.id} onClick={() => setChild(c)}>
              <div>
                <strong>{c.name}</strong>
                <span className="muted">{c.id} · {c.age} · {t("gender." + c.gender)}</span>
              </div>
            </button>
          ))}
        </div>
      </section>
    );
  }

  // These do not need the child's height.
  if (mode === "khelo") {
    return <ManualTests child={child} onBack={() => setMode(null)} />;
  }
  if (mode === "push") {
    return <PushupTest child={child} onBack={() => setMode(null)} />;
  }
  if (mode === "flamingo") {
    return <FlamingoTest child={child} onBack={() => setMode(null)} />;
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
      <button className="link" onClick={() => setChild(null)}>{t("rt.changeChild")}</button>
      <h2>{t("rt.choose")}</h2>
      <p className="muted">{child.name} · {child.id} · {child.heightCm} cm</p>

      <div className="cards">
        <button className="card" onClick={() => setMode("jump")}>
          <strong>{t("test.vertical_jump")}</strong>
          <span>{t("rt.jumpSub")}</span>
        </button>
        <button className="card" onClick={() => setMode("balance")}>
          <strong>{t("test.single_leg_balance")}</strong>
          <span>{t("rt.balanceSub")}</span>
        </button>
        <button className="card" disabled={child.age > 8} onClick={() => setMode("flamingo")}>
          <strong>{t("rt.flamingo")}</strong>
          <span>{child.age > 8 ? t("fl.onlyYoung") : t("rt.flamingoSub")}</span>
        </button>
        <button className="card" onClick={() => setMode("push")}>
          <strong>{t("rt.push")}</strong>
          <span>{t("rt.pushSub")}</span>
        </button>
        <button className="card" onClick={() => setMode("khelo")}>
          <strong>{t("rt.khelo")}</strong>
          <span>{t("rt.kheloSub")}</span>
        </button>
        <button className="card" disabled>
          <strong>{t("rt.broad")}</strong>
          <span>{t("rt.broadSub")}</span>
        </button>
        <button className="card" onClick={() => setMode("camera")}>
          <strong>{t("rt.cam")}</strong>
          <span>{t("rt.camSub")}</span>
        </button>
      </div>
    </section>
  );
}