import { useEffect, useRef, useState } from "react";
import { db } from "../db";
import PoseCamera from "./PoseCamera";
import { createCounter, pickSide, readSide } from "../pushup";
import { levelFor } from "../khelo";
import { useT } from "../lang";
import { useSettings } from "../settings";

export default function PushupTest({ child, onBack }) {
  const { t } = useT();
  const { say, cue, silence, prime } = useSettings();

  // The official tables exist for boys and girls. For "other", the teacher chooses.
  const [table, setTable] = useState(
    child.gender === "male" || child.gender === "female" ? child.gender : ""
  );
  const [on, setOn] = useState(false);
  const [facing, setFacing] = useState("environment");
  const [phase, setPhase] = useState("idle"); // idle | position | count | done
  const [reps, setReps] = useState(0);
  const [hint, setHint] = useState("pu.hint.visible"); // a string key
  const [feedback, setFeedback] = useState(""); // a string key
  const [result, setResult] = useState(null);
  const [saved, setSaved] = useState(false);
  const [live, setLive] = useState(null);

  const phaseRef = useRef("idle");
  const counterRef = useRef(null);
  const liveAt = useRef(0);
  const fbTimer = useRef(0);

  const variant = table === "female" ? "modified" : "standard";

  useEffect(
    () => () => {
      silence();
      clearTimeout(fbTimer.current);
    },
    [silence]
  );

  function go(p) {
    phaseRef.current = p;
    setPhase(p);
  }

  function showFeedback(key) {
    setFeedback(key);
    clearTimeout(fbTimer.current);
    fbTimer.current = setTimeout(() => setFeedback(""), 2500);
  }

  function endAttempt(e) {
    setResult({ reps: e.reps, why: e.why });
    setSaved(false);
    if (e.reps > 0) {
      cue("ok");
      say(t("pu.done", { n: e.reps }));
    } else {
      cue("bad");
      say(t("pu.none"));
    }
    go("done");
  }

  function handleEvents(events) {
    for (const e of events) {
      if (e.type === "ready") {
        cue("go");
        say(t("pu.cue.go"));
        setReps(0);
        go("count");
      } else if (e.type === "rep") {
        setReps(e.n);
        cue("tick");
        say(String(e.n));
      } else if (e.type === "partial" || e.type === "form") {
        const key = e.type === "partial" ? "pu.fb.low" : "pu.fb.straight";
        cue("bad");
        say(t(key));
        showFeedback(key);
      } else if (e.type === "end") {
        endAttempt(e);
      }
    }
  }

  function startAttempt() {
    prime();
    counterRef.current = createCounter(variant);
    setResult(null);
    setReps(0);
    setFeedback("");
    setHint("pu.hint.visible");
    setSaved(false);
    say(t("pu.cue.position"));
    go("position");
  }

  function finishNow() {
    if (phaseRef.current !== "count" || !counterRef.current) return;
    handleEvents(counterRef.current.finish("manual"));
  }

  function onFrame(pose, now, aspect) {
    const p = phaseRef.current;

    // Outside an attempt, just show the live measurements (useful for setup and tuning).
    if (p === "idle" || p === "done") {
      if (pose && now - liveAt.current > 300) {
        liveAt.current = now;
        const side = pickSide(pose, variant);
        const f = readSide(pose, side, aspect, variant);
        setLive(
          f
            ? { elbow: Math.round(f.elbow), body: Math.round(f.body), tilt: Math.round(f.tilt), state: "-" }
            : null
        );
      }
      return;
    }

    const c = counterRef.current;
    handleEvents(c.update(pose, now, aspect));

    if (now - liveAt.current > 200) {
      liveAt.current = now;
      const s = c.s;
      setLive(
        s.last
          ? {
              elbow: Math.round(s.last.elbow),
              body: Math.round(s.last.body),
              tilt: Math.round(s.last.tilt),
              state: s.state,
            }
          : null
      );
      if (s.phase === "position") setHint(c.hint());
    }
  }

  function stop() {
    silence();
    counterRef.current = null;
    go("idle");
    setOn(false);
  }

  async function save() {
    const lv = levelFor("push_up", table, child.age, result.reps);
    await db.results.add({
      childId: child.id,
      test: "push_up",
      value: result.reps,
      age: child.age,
      tableGender: table,
      level: lv ? lv.n : null,
      points: lv ? lv.points : null,
      source: "camera",
      variant,
      createdAt: Date.now(),
    });
    setSaved(true);
  }

  const lv = result && result.reps > 0 ? levelFor("push_up", table, child.age, result.reps) : null;

  const overlay =
    phase === "position" ? (
      <div className="ov" role="status" aria-live="polite">
        <div className="ov-big">{t(hint)}</div>
      </div>
    ) : phase === "count" ? (
      <div className="ov">
        <div className="ov-big go">{reps}</div>
        <div className="ov-sm">{feedback ? t(feedback) : t("pu.reps")}</div>
      </div>
    ) : null;

  const busy = phase === "position" || phase === "count";

  return (
    <section className="panel">
      <button
        className="link"
        onClick={() => {
          stop();
          onBack();
        }}
      >
        {t("back")}
      </button>
      <h2>{t("pu.title")}</h2>
      <p className="muted">{child.name} · {child.id} · {child.age}</p>

      {child.gender === "other" && !on && (
        <div className="form">
          <label>
            {t("kh.table")}
            <select value={table} onChange={(e) => setTable(e.target.value)}>
              <option value="">{t("reg.select")}</option>
              <option value="male">{t("kh.table.male")}</option>
              <option value="female">{t("kh.table.female")}</option>
            </select>
          </label>
          {!table && <p className="muted">{t("pu.tablePick")}</p>}
        </div>
      )}

      {table && <p className="muted">{t("pu.variant." + variant)}</p>}
      <p className="note">{t("pu.safety")}</p>

      <ol className="steps">
        <li>{t("pu.s1")}</li>
        <li>{t("pu.s2")}</li>
        <li>{t("pu.s3")}</li>
        <li>{t("pu.s4")}</li>
      </ol>

      {!on ? (
        <button
          className="btn primary"
          disabled={!table}
          onClick={() => {
            prime();
            setOn(true);
          }}
        >
          {t("cam.start")}
        </button>
      ) : (
        <>
          <PoseCamera facing={facing} onFrame={onFrame} overlay={overlay} />

          <button className="btn primary" disabled={busy} onClick={startAttempt}>
            {phase === "done" ? t("pu.again") : t("pu.start")}
          </button>

          {phase === "count" && (
            <button className="btn" onClick={finishNow}>{t("pu.finish")}</button>
          )}

          <div className="row">
            <button
              className="btn"
              disabled={busy}
              onClick={() => setFacing(facing === "environment" ? "user" : "environment")}
            >
              {t("cam.switch")}
            </button>
            <button className="btn" onClick={stop}>{t("cam.stop")}</button>
          </div>

          <details>
            <summary>{t("pu.tech")}</summary>
            <p className="muted">
              {live
                ? `elbow ${live.elbow}°, body ${live.body}°, tilt ${live.tilt}°, state ${live.state}`
                : "no pose"}
            </p>
          </details>
        </>
      )}

      {phase === "done" && result &&
        (result.reps > 0 ? (
          <div className="result good" role="status">
            <div className="num">{t("pu.result", { n: result.reps })}</div>
            <div>{t("pu.end." + result.why)}</div>
            {lv && (
              <div>
                {t("kh.level", { n: lv.n })} · {t("lvl." + lv.n)} · {t("kh.points", { p: lv.points })}
              </div>
            )}
            {lv && lv.below && <div>{t("kh.below")}</div>}
            {!lv && <div>{t("pu.noTable", { age: child.age })}</div>}
          </div>
        ) : (
          <div className="result bad" role="status">
            <strong>{t("res.notCounted")}</strong>
            <div>{t("pu.none")}</div>
          </div>
        ))}

      {phase === "done" && result && result.reps > 0 && (
        <>
          <p className="muted">{t("pu.check")}</p>
          <button className="btn primary" disabled={saved} onClick={save}>
            {saved ? t("res.saved") : t("res.save")}
          </button>
        </>
      )}
    </section>
  );
}