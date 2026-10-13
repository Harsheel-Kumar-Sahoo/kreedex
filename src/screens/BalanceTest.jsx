import { useRef, useState } from "react";
import { db } from "../db";
import PoseCamera from "./PoseCamera";
import { readFrame, calibrate, detectLift, holdStatus, summarize } from "../balance";

const CAL_MS = 1500;          // standing-still time for calibration
const WAIT_MS = 10000;        // time allowed to lift a foot after the cue
const MAX_HOLD_MS = 60000;    // longest hold that is timed
const LIFT_CONFIRM_MS = 200;  // a lift must last this long to count
const END_CONFIRM_MS = 250;   // touch-down or foot movement must last this long to end the test
const LOST_MS = 1000;         // body out of view for this long cancels the attempt
const MAX_ATTEMPTS = 3;

const ENDED = {
  down: "Raised foot touched down",
  moved: "Standing foot moved",
  max: "Reached the 60 second limit",
};

export default function BalanceTest({ child, onBack }) {
  const [on, setOn] = useState(false);
  const [facing, setFacing] = useState("environment");
  const [phase, setPhase] = useState("idle"); // idle | calibrate | lift | hold
  const [hint, setHint] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [last, setLast] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [saved, setSaved] = useState(false);

  const phaseRef = useRef("idle");
  const calRef = useRef({ samples: [], start: 0, pauseUntil: 0 });
  const baseRef = useRef(null);
  const waitRef = useRef({ start: 0, side: null, since: 0 });
  const holdRef = useRef(null);

  function go(p) {
    phaseRef.current = p;
    setPhase(p);
  }

  function startAttempt() {
    calRef.current = { samples: [], start: 0, pauseUntil: 0 };
    setLast(null);
    setElapsed(0);
    setHint("Stand on both feet…");
    go("calibrate");
  }

  function fail(reason) {
    setLast({ ok: false, reason });
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
        setHint("Step back until your whole body is visible");
        return;
      }

      setHint("Stand on both feet…");
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
        waitRef.current = { start: now, side: null, since: 0 };
        if (navigator.vibrate) navigator.vibrate(150);
        go("lift");
      }
      return;
    }

    if (p === "lift") {
      const w = waitRef.current;
      if (now - w.start > WAIT_MS) {
        fail("No foot lift was detected. Lift one foot clearly off the ground and try again.");
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
        };
        setElapsed(0);
        go("hold");
      }
      return;
    }

    if (p === "hold") {
      const h = holdRef.current;
      const cal = baseRef.current;

      if (!f) {
        if (now - h.lastSeen > LOST_MS) {
          fail("The body went out of view during the hold. Keep the whole body visible.");
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

      const tick = Math.floor((now - h.startT) / 200);
      if (tick !== h.lastTick) {
        h.lastTick = tick;
        setElapsed((now - h.startT) / 1000);
      }
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

  const overlay =
    phase === "calibrate" ? (
      <div className="ov">
        <div className="ov-big">{hint}</div>
      </div>
    ) : phase === "lift" ? (
      <div className="ov">
        <div className="ov-big go">LIFT ONE FOOT</div>
        <div className="ov-sm">and hold it up</div>
      </div>
    ) : phase === "hold" ? (
      <div className="ov">
        <div className="ov-big go">{elapsed.toFixed(1)} s</div>
        <div className="ov-sm">keep holding</div>
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
        ← Back
      </button>
      <h2>Single-leg balance</h2>
      <p className="muted">
        {child.name} · {child.id} · {child.heightCm} cm
      </p>

      <p className="note">
        Safety: an adult should stand nearby, the floor should be flat and not slippery,
        and the area around the child should be clear. The child can stop at any time.
      </p>

      <ol className="steps">
        <li>Rest the phone steady at about waist height, 2-3 metres away, facing the child.</li>
        <li>The whole body must be visible, including both feet.</li>
        <li>Tap Start attempt and stand on both feet for about 2 seconds.</li>
        <li>When the screen says LIFT ONE FOOT, lift either foot and hold as long as possible.</li>
        <li>The test stops when the raised foot touches down, the standing foot moves, or after 60 seconds.</li>
      </ol>

      {!on ? (
        <button className="btn primary" onClick={() => setOn(true)}>Start camera</button>
      ) : (
        <>
          <PoseCamera facing={facing} onFrame={onFrame} overlay={overlay} />

          <button
            className="btn primary"
            disabled={phase !== "idle" || attempts.length >= MAX_ATTEMPTS}
            onClick={startAttempt}
          >
            {attempts.length >= MAX_ATTEMPTS
              ? "3 attempts done"
              : `Start attempt ${attempts.length + 1} of ${MAX_ATTEMPTS}`}
          </button>

          <div className="row">
            <button
              className="btn"
              disabled={phase !== "idle"}
              onClick={() => setFacing(facing === "environment" ? "user" : "environment")}
            >
              Switch camera
            </button>
            <button className="btn" onClick={stop}>Stop camera</button>
          </div>
        </>
      )}

      {last && phase === "idle" &&
        (last.ok ? (
          <div className="result good">
            <div className="num">{last.sec} s</div>
            <div>Attempt {attempts.length} recorded · {last.ended}</div>
            {last.swayCm != null && (
              <div>Sway: {last.swayCm} cm ({last.rating})</div>
            )}
          </div>
        ) : (
          <div className="result bad">
            <strong>Attempt not counted</strong>
            <div>{last.reason}</div>
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
            Best: {best.sec} s
            {best.swayCm != null ? ` · sway ${best.swayCm} cm (${best.rating})` : ""}
          </p>

          <div className="row">
            <button className="btn primary" disabled={saved} onClick={saveBest}>
              {saved ? "Saved" : "Save best result"}
            </button>
            <button className="btn" onClick={resetAttempts}>Clear attempts</button>
          </div>
        </>
      )}
    </section>
  );
}