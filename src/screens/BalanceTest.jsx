import { useEffect, useRef, useState } from "react";
import { db } from "../db";
import PoseCamera from "./PoseCamera";
import { readFrame, calibrate, detectLift, holdStatus, summarize } from "../balance";
import { useT } from "../lang";
import { useSettings } from "../settings";

const CAL_MS = 1500;          // standing-still time for calibration
const WAIT_MS = 10000;        // time allowed to lift a foot after the cue
const MAX_HOLD_MS = 60000;    // longest hold that is timed
const LIFT_CONFIRM_MS = 200;  // a lift must last this long to count
const END_CONFIRM_MS = 250;   // touch-down or foot movement must last this long to end the test
const LOST_MS = 1000;         // body out of view for this long cancels the attempt
const MAX_ATTEMPTS = 3;

const ENDED = {
  down: "bal.end.down",
  moved: "bal.end.moved",
  max: "bal.end.max",
};

export default function BalanceTest({ child, onBack }) {
  const { t } = useT();
  const { say, cue, silence, prime } = useSettings();
  const [on, setOn] = useState(false);
  const [facing, setFacing] = useState("environment");
  const [phase, setPhase] = useState("idle"); // idle | calibrate | lift | hold
  const [hint, setHint] = useState("bal.cue.both"); // a string key
  const [elapsed, setElapsed] = useState(0);
  const [last, setLast] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [saved, setSaved] = useState(false);

  const phaseRef = useRef("idle");
  const calRef = useRef({ samples: [], start: 0, pauseUntil: 0 });
  const baseRef = useRef(null);
  const waitRef = useRef({ start: 0, side: null, since: 0 });
  const holdRef = useRef(null);
  const spokenRef = useRef("");

  // Stop any speech when leaving this screen.
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
    setLast(null);
    setElapsed(0);
    setHint("bal.cue.both");
    go("calibrate");
  }

  function fail(reason) {
    setLast({ ok: false, reason });
    cue("bad");
    say(t("sp.rejected", { reason: t(reason) }));
    go("idle");
  }

  function endHold(endT, why) {
    const h = holdRef.current;
    const result = summarize(
      { startT: h.startT, endT, hipXs: h.hipXs },
      baseRef.current
    );
    if (result.ok) {
      result.ended = ENDED[why];
      setAttempts((a) => [
        ...a,
        { sec: result.sec, swayCm: result.swayCm, rating: result.rating },
      ]);
      setSaved(false);
      cue("ok");
      say(t("sp.balResult", { v: result.sec }));
    } else {
      cue("bad");
      say(t("sp.rejected", { reason: t(result.reason) }));
    }
    setLast(result);
    go("idle");
  }

  function onFrame(pose, now, aspect) {
    const p = phaseRef.current;
    if (p === "idle") return;

    const f = readFrame(pose, aspect);

    if (p === "calibrate") {
      const c = calRef.current;
      if (now < c.pauseUntil) return; // let the person read the message

      if (!f) {
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

      if (now - c.start >= CAL_MS) {
        const cal = calibrate(c.samples, child.heightCm);
        if (!cal.ok) {
          c.samples = [];
          c.start = 0;
          c.pauseUntil = now + 2500;
          setHint(cal.reason);
          speakHint(cal.reason);
          return;
        }
        baseRef.current = cal;
        waitRef.current = { start: now, side: null, since: 0 };
        if (navigator.vibrate) navigator.vibrate(150);
        cue("ready");
        say(t("bal.cue.lift") + ". " + t("bal.cue.liftSub"));
        go("lift");
      }
      return;
    }

    if (p === "lift") {
      const w = waitRef.current;
      if (now - w.start > WAIT_MS) {
        fail("bal.r.nolift");
        return;
      }
      if (!f) {
        w.side = null;
        w.since = 0;
        return;
      }
      const side = detectLift(f, baseRef.current);
      if (!side) {
        w.side = null;
        w.since = 0;
        return;
      }
      if (side !== w.side) {
        w.side = side;
        w.since = now;
        return;
      }
      if (now - w.since >= LIFT_CONFIRM_MS) {
        holdRef.current = {
          raised: side,
          startT: w.since,
          lastSeen: now,
          bad: null,
          hipXs: [],
          lastTick: -1,
          lastSaid: 0,
        };
        setElapsed(0);
        cue("tick");
        go("hold");
      }
      return;
    }

    if (p === "hold") {
      const h = holdRef.current;
      const cal = baseRef.current;

      if (!f) {
        if (now - h.lastSeen > LOST_MS) {
          fail("bal.r.lost");
        }
        return;
      }

      h.lastSeen = now;
      h.hipXs.push({ t: now, x: f.hipX });

      const status = holdStatus(f, cal, h.raised);
      if (status === "ok") {
        h.bad = null;
      } else {
        if (!h.bad || h.bad.reason !== status) h.bad = { reason: status, since: now };
        if (now - h.bad.since >= END_CONFIRM_MS) {
          endHold(h.bad.since, status);
          return;
        }
      }

      if (now - h.startT >= MAX_HOLD_MS) {
        endHold(now, "max");
        return;
      }

      // Say the time every 10 seconds.
      const secs = Math.floor((now - h.startT) / 1000);
      if (secs >= 10 && secs % 10 === 0 && h.lastSaid !== secs) {
        h.lastSaid = secs;
        say(t("sp.seconds", { n: secs }));
      }

      const tick = Math.floor((now - h.startT) / 200);
      if (tick !== h.lastTick) {
        h.lastTick = tick;
        setElapsed((now - h.startT) / 1000);
      }
    }
  }

  function stop() {
    silence();
    go("idle");
    setOn(false);
  }

  function resetAttempts() {
    setAttempts([]);
    setLast(null);
    setSaved(false);
  }

  const best = attempts.reduce((b, a) => (!b || a.sec > b.sec ? a : b), null);

  async function saveBest() {
    await db.results.add({
      childId: child.id,
      test: "single_leg_balance",
      valueSec: best.sec,
      swayCm: best.swayCm,
      rating: best.rating,
      attempts,
      createdAt: Date.now(),
    });
    setSaved(true);
  }

  // The running timer is not a live region, so screen readers are not flooded.
  const overlay =
    phase === "calibrate" ? (
      <div className="ov" role="status" aria-live="polite">
        <div className="ov-big">{t(hint)}</div>
      </div>
    ) : phase === "lift" ? (
      <div className="ov" role="status" aria-live="polite">
        <div className="ov-big go">{t("bal.cue.lift")}</div>
        <div className="ov-sm">{t("bal.cue.liftSub")}</div>
      </div>
    ) : phase === "hold" ? (
      <div className="ov">
        <div className="ov-big go">{elapsed.toFixed(1)} s</div>
        <div className="ov-sm">{t("bal.cue.hold")}</div>
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
      <h2>{t("test.single_leg_balance")}</h2>
      <p className="muted">
        {child.name} · {child.id} · {child.heightCm} cm
      </p>

      <p className="note">{t("bal.safety")}</p>

      <ol className="steps">
        <li>{t("bal.s1")}</li>
        <li>{t("bal.s2")}</li>
        <li>{t("bal.s3")}</li>
        <li>{t("bal.s4")}</li>
        <li>{t("bal.s5")}</li>
      </ol>

      {!on ? (
        <button
          className="btn primary"
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
          <div className="result good" role="status">
            <div className="num">{last.sec} s</div>
            <div>{t("res.recorded", { n: attempts.length })} · {t(last.ended)}</div>
            {last.swayCm != null && (
              <div>{t("bal.sway", { v: last.swayCm, r: t("rating." + last.rating) })}</div>
            )}
          </div>
        ) : (
          <div className="result bad" role="status">
            <strong>{t("res.notCounted")}</strong>
            <div>{t(last.reason)}</div>
          </div>
        ))}

      {attempts.length > 0 && (
        <>
          <div className="attempts">
            {attempts.map((a, i) => (
              <span key={i} className={"chip" + (a === best ? " best" : "")}>
                #{i + 1}: {a.sec} s
              </span>
            ))}
          </div>
          <p className="muted">
            {t("res.best", { v: best.sec + " s" })}
            {best.swayCm != null
              ? " · " + t("bal.swayShort", { v: best.swayCm, r: t("rating." + best.rating) })
              : ""}
          </p>

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