import { useEffect, useRef, useState } from "react";
import { db } from "../db";
import PoseCamera from "./PoseCamera";
import { CFG, readFrame, strictOk, calibrate, createFlamingo } from "../flamingo";
import { levelFor } from "../khelo";
import { useT } from "../lang";
import { useSettings } from "../settings";

export default function FlamingoTest({ child, onBack }) {
  const { t } = useT();
  const { say, cue, silence, prime } = useSettings();

  // The official tables exist for boys and girls. For "other", the teacher chooses.
  const [table, setTable] = useState(
    child.gender === "male" || child.gender === "female" ? child.gender : ""
  );
  const [on, setOn] = useState(false);
  const [facing, setFacing] = useState("environment");
  const [phase, setPhase] = useState("idle"); // idle | calibrate | wait | run | done
  const [hint, setHint] = useState("bal.cue.both"); // a string key
  const [balSec, setBalSec] = useState(0);
  const [falls, setFalls] = useState(0);
  const [lastWhy, setLastWhy] = useState(""); // a string key
  const [result, setResult] = useState(null);
  const [saved, setSaved] = useState(false);
  const [live, setLive] = useState(null);

  const phaseRef = useRef("idle");
  const calRef = useRef({ samples: [], start: 0, pauseUntil: 0 });
  const engineRef = useRef(null);
  const spokenRef = useRef("");
  const liveAt = useRef(0);

  useEffect(() => () => silence(), [silence]);

  function go(p) {
    phaseRef.current = p;
    setPhase(p);
  }

  // Speaks a cue once, not on every camera frame.
  function speakHint(key) {
    if (spokenRef.current === key) return;
    spokenRef.current = key;
    say(t(key));
  }

  function startAttempt() {
    prime();
    spokenRef.current = "";
    calRef.current = { samples: [], start: 0, pauseUntil: 0 };
    engineRef.current = null;
    setResult(null);
    setSaved(false);
    setFalls(0);
    setBalSec(0);
    setLastWhy("");
    setLive(null);
    setHint("bal.cue.both");
    go("calibrate");
  }

  function endAttempt(e) {
    const official = e.why === "complete" || e.why === "terminated";
    const res = {
      falls: e.falls,
      balanceSec: Math.round(e.balanceMs / 100) / 10,
      why: e.why,
      official,
    };
    setResult(res);
    setFalls(e.falls);
    setSaved(false);
    if (official) {
      cue("ok");
      say(t("fl.doneSay", { n: e.falls }));
    } else {
      cue("bad");
      say(t("res.notCounted"));
    }
    go("done");
  }

  function handleEvents(events) {
    for (const e of events) {
      if (e.type === "start" || e.type === "resume") {
        cue("go");
        say(t("fl.cue.go"));
        go("run");
      } else if (e.type === "fall") {
        setFalls(e.n);
        setLastWhy("fl.why." + e.why);
        setHint("fl.hint.lift");
        cue("bad");
        say(t("fl.fallSay", { n: e.n }));
        go("wait");
      } else if (e.type === "time") {
        say(t("sp.seconds", { n: e.sec }));
      } else if (e.type === "end") {
        endAttempt(e);
      }
    }
  }

  function onFrame(pose, now, aspect) {
    const p = phaseRef.current;
    if (p === "idle" || p === "done") return;

    if (p === "calibrate") {
      const c = calRef.current;
      if (now < c.pauseUntil) return; // let the person read the message

      const f = pose ? readFrame(pose, aspect) : null;
      if (!f || !strictOk(f)) {
        c.samples = [];
        c.start = 0;
        setHint("cue.step");
        speakHint("cue.step");
        return;
      }

      setHint("bal.cue.both");
      speakHint("bal.cue.both");
      if (!c.start) c.start = now;
      c.samples.push(f);

      if (now - c.start >= CFG.CAL_MS) {
        const cal = calibrate(c.samples);
        if (!cal.ok) {
          c.samples = [];
          c.start = 0;
          c.pauseUntil = now + 2500;
          setHint(cal.reason);
          speakHint(cal.reason);
          return;
        }
        engineRef.current = createFlamingo(cal);
        if (navigator.vibrate) navigator.vibrate(150);
        cue("ready");
        say(t("fl.cue.lift"));
        setHint("fl.hint.lift");
        go("wait");
      }
      return;
    }

    // wait or run
    const eng = engineRef.current;
    if (!eng) return;
    handleEvents(eng.update(pose, now, aspect));
    if (phaseRef.current === "done") return;

    if (now - liveAt.current > 150) {
      liveAt.current = now;
      const s = eng.s;
      setBalSec(s.balanceMs / 1000);
      if (s.phase === "wait") setHint(s.hintKey);
      setLive(
        s.last
          ? {
              lift: s.last.lift.toFixed(2),
              fold: s.last.fold.toFixed(2),
              move: s.last.move.toFixed(2),
            }
          : null
      );
    }
  }

  function finishNow() {
    const eng = engineRef.current;
    const p = phaseRef.current;
    if (!eng || (p !== "wait" && p !== "run")) return;
    handleEvents(eng.finish("manual"));
  }

  function stop() {
    silence();
    engineRef.current = null;
    go("idle");
    setOn(false);
  }

  async function save() {
    const lv = levelFor("flamingo", table, child.age, result.falls);
    await db.results.add({
      childId: child.id,
      test: "flamingo",
      value: result.falls,
      age: child.age,
      tableGender: table,
      level: lv ? lv.n : null,
      points: lv ? lv.points : null,
      source: "camera",
      balanceSec: result.balanceSec,
      terminated: result.why === "terminated",
      createdAt: Date.now(),
    });
    setSaved(true);
  }

  const lv =
    result && result.official ? levelFor("flamingo", table, child.age, result.falls) : null;
  const busy = phase === "calibrate" || phase === "wait" || phase === "run";

  const overlay =
    phase === "calibrate" ? (
      <div className="ov" role="status" aria-live="polite">
        <div className="ov-big">{t(hint)}</div>
      </div>
    ) : phase === "wait" ? (
      <div className="ov" role="status" aria-live="polite">
        <div className="ov-big">{t(hint)}</div>
        {falls > 0 && (
          <div className="ov-sm">
            {t("fl.falls", { n: falls })}
            {lastWhy ? " · " + t(lastWhy) : ""}
          </div>
        )}
      </div>
    ) : phase === "run" ? (
      <div className="ov">
        <div className="ov-big go">{balSec.toFixed(1)} s</div>
        <div className="ov-sm">{t("fl.falls", { n: falls })}</div>
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
      <h2>{t("fl.title")}</h2>
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
          {!table && <p className="muted">{t("kh.tablePick")}</p>}
        </div>
      )}

      <p className="note">{t("fl.safety")}</p>
      <p className="muted">{t("fl.floor")}</p>

      <ol className="steps">
        <li>{t("fl.s1")}</li>
        <li>{t("fl.s2")}</li>
        <li>{t("fl.s3")}</li>
        <li>{t("fl.s4")}</li>
        <li>{t("fl.s5")}</li>
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
            {phase === "done" ? t("fl.again") : t("fl.start")}
          </button>

          {(phase === "wait" || phase === "run") && (
            <button className="btn" onClick={finishNow}>{t("fl.finish")}</button>
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
                ? `lift ${live.lift}, fold ${live.fold}, move ${live.move}, falls ${falls}`
                : "no raised foot detected"}
            </p>
          </details>
        </>
      )}

      {phase === "done" && result &&
        (result.official ? (
          <div className="result good" role="status">
            <div className="num">{t("fl.result", { n: result.falls, s: result.balanceSec })}</div>
            <div>{t("fl.end." + result.why)}</div>
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
            <div>{t("fl.incomplete", { s: Math.round(result.balanceSec) })}</div>
            <div className="muted">{t("fl.end." + result.why)}</div>
          </div>
        ))}

      {phase === "done" && result && result.official && (
        <>
          <p className="muted">{t("fl.check")}</p>
          <button className="btn primary" disabled={saved} onClick={save}>
            {saved ? t("res.saved") : t("res.save")}
          </button>
        </>
      )}
    </section>
  );
}