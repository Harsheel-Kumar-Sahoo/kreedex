import { useRef, useState } from "react";
import { db } from "../db";
import PoseCamera from "./PoseCamera";
import { readFrame, calibrate, analyze } from "../jump";
import { useT } from "../lang";

const CAL_MS = 2000;   // stand-still time for calibration
const MAX_MS = 6000;   // longest time allowed for the jump
const MAX_ATTEMPTS = 3;

export default function JumpTest({ child, onBack }) {
  const { t } = useT();
  const [on, setOn] = useState(false);
  const [facing, setFacing] = useState("environment");
  const [phase, setPhase] = useState("idle"); // idle | calibrate | jump
  const [hint, setHint] = useState("cue.still"); // a string key
  const [last, setLast] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [saved, setSaved] = useState(false);

  const phaseRef = useRef("idle");
  const calRef = useRef({ samples: [], start: 0, pauseUntil: 0 });
  const recRef = useRef(null);
  const baseRef = useRef(null);

  function go(p) {
    phaseRef.current = p;
    setPhase(p);
  }

  function startAttempt() {
    calRef.current = { samples: [], start: 0, pauseUntil: 0 };
    setLast(null);
    setHint("cue.still");
    go("calibrate");
  }

  function finishJump() {
    const result = analyze(recRef.current, baseRef.current);
    setLast(result);
    if (result.ok) {
      setAttempts((a) => [...a, result.cm]);
      setSaved(false);
    }
    go("idle");
  }

  function onFrame(pose, now) {
    const p = phaseRef.current;

    if (p === "calibrate") {
      const c = calRef.current;
      if (now < c.pauseUntil) return; // let the person read the message

      const f = readFrame(pose);
      if (!f) {
        c.samples = [];
        c.start = 0;
        setHint("cue.step");
        return;
      }

      setHint("cue.still");
      if (!c.start) c.start = now;
      c.samples.push(f);

      if (now - c.start >= CAL_MS) {
        const cal = calibrate(c.samples, child.heightCm);
        if (!cal.ok) {
          c.samples = [];
          c.start = 0;
          c.pauseUntil = now + 2500;
          setHint(cal.reason);
          return;
        }
        baseRef.current = cal;
        recRef.current = { samples: [], total: 0, start: now, peaked: false, settleStart: 0 };
        if (navigator.vibrate) navigator.vibrate(150);
        go("jump");
      }
      return;
    }

    if (p === "jump") {
      const r = recRef.current;
      const cal = baseRef.current;
      r.total++;

      const f = readFrame(pose);
      if (f) {
        r.samples.push({ t: now, ...f });
        const rise = cal.baseHip - f.hip;
        if (rise > 0.05 * cal.bodyNorm) r.peaked = true;
        if (r.peaked) {
          if (Math.abs(rise) < 0.03 * cal.bodyNorm) {
            if (!r.settleStart) r.settleStart = now;
          } else {
            r.settleStart = 0;
          }
        }
      }

      const settled = r.settleStart && now - r.settleStart > 600;
      if (settled || now - r.start > MAX_MS) finishJump();
    }
  }

  function stop() {
    go("idle");
    setOn(false);
  }

  function resetAttempts() {
    setAttempts([]);
    setLast(null);
    setSaved(false);
  }

  const best = attempts.length ? Math.max(...attempts) : null;

  async function saveBest() {
    await db.results.add({
      childId: child.id,
      test: "vertical_jump",
      valueCm: best,
      attempts,
      createdAt: Date.now(),
    });
    setSaved(true);
  }

  const overlay =
    phase === "calibrate" ? (
      <div className="ov">
        <div className="ov-big">{t(hint)}</div>
      </div>
    ) : phase === "jump" ? (
      <div className="ov">
        <div className="ov-big go">{t("cue.jump")}</div>
        <div className="ov-sm">{t("cue.then")}</div>
      </div>
    ) : null;

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
      <h2>{t("test.vertical_jump")}</h2>
      <p className="muted">
        {child.name} · {child.id} · {child.heightCm} cm
      </p>

      <ol className="steps">
        <li>{t("jump.s1")}</li>
        <li>{t("jump.s2")}</li>
        <li>{t("jump.s3")}</li>
        <li>{t("jump.s4")}</li>
      </ol>

      {!on ? (
        <button className="btn primary" onClick={() => setOn(true)}>{t("cam.start")}</button>
      ) : (
        <>
          <PoseCamera facing={facing} onFrame={onFrame} overlay={overlay} />

          <button
            className="btn primary"
            disabled={phase !== "idle" || attempts.length >= MAX_ATTEMPTS}
            onClick={startAttempt}
          >
            {attempts.length >= MAX_ATTEMPTS
              ? t("attempt.done", { max: MAX_ATTEMPTS })
              : t("attempt.start", { n: attempts.length + 1, max: MAX_ATTEMPTS })}
          </button>

          <div className="row">
            <button
              className="btn"
              disabled={phase !== "idle"}
              onClick={() => setFacing(facing === "environment" ? "user" : "environment")}
            >
              {t("cam.switch")}
            </button>
            <button className="btn" onClick={stop}>{t("cam.stop")}</button>
          </div>
        </>
      )}

      {last && phase === "idle" &&
        (last.ok ? (
          <div className="result good">
            <div className="num">{last.cm} cm</div>
            <div>{t("res.recorded", { n: attempts.length })}</div>
          </div>
        ) : (
          <div className="result bad">
            <strong>{t("res.notCounted")}</strong>
            <div>{t(last.reason)}</div>
          </div>
        ))}

      {attempts.length > 0 && (
        <>
          <div className="attempts">
            {attempts.map((a, i) => (
              <span key={i} className={"chip" + (a === best ? " best" : "")}>
                #{i + 1}: {a} cm
              </span>
            ))}
          </div>
          <p className="muted">{t("res.best", { v: best + " cm" })}</p>

          <div className="row">
            <button className="btn primary" disabled={saved} onClick={saveBest}>
              {saved ? t("res.saved") : t("res.save")}
            </button>
            <button className="btn" onClick={resetAttempts}>{t("res.clear")}</button>
          </div>
        </>
      )}
    </section>
  );
}