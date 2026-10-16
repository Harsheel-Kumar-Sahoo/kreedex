// Flamingo balance counter (camera version, child facing the phone).
// MediaPipe landmark indexes: 0 nose, 23/24 hips, 25/26 knees, 27/28 ankles
//
// The official test counts falls (losses of balance) during 60 seconds of balancing.
// The balance clock pauses at each fall and runs again when the child is back in position.
//
// All numbers below can be tuned. The Measurements panel on the test screen shows
// the live values: lift, fold and move.

export const CFG = {
  TARGET_MS: 60000,     // balancing time that completes the test
  CAL_MS: 1500,         // stand-still time on both feet
  LIFT_UP: 0.05,        // ankle height difference (share of body height) that counts as a raised foot
  FOLD_HELD: 0.3,       // raised ankle at least this far above its own knee (share of thigh) = foot held up behind
  FOLD_RELEASE: 0.1,    // below this the foot has been let go
  DOWN: 0.03,           // raised ankle within this of the standing ankle height = touched the floor
  MOVE: 0.08,           // standing ankle moved this far (share of body height) = stepped or hopped
  READY_MS: 600,        // position must be held this long to start or restart the clock
  FALL_MS: 250,         // a loss of balance must last this long to count as a fall
  LOST_MS: 2000,        // body out of view for this long ends the attempt
  WAIT_FIRST_MS: 20000, // time allowed to get into the first position
  WAIT_AFTER_MS: 20000, // time allowed to get back into position after a fall
  MAX_TOTAL_MS: 300000, // longest whole attempt
  EARLY_FALLS: 15,      // more than this many falls ...
  EARLY_MS: 30000,      // ... within this much balancing time ends the test
  MIN_FREE_VIS: 0.15,   // below this the raised leg is too hidden to judge its fold
  MIN_STAND_VIS: 0.4,
  TICK_EVERY_MS: 20000, // spoken time updates
};

const median = (a) => {
  const s = [...a].sort((x, y) => x - y);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

const std = (a) => {
  const m = a.reduce((s, x) => s + x, 0) / a.length;
  return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / a.length);
};

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

// x values are multiplied by the video aspect ratio so x and y use the same units.
export function readFrame(pose, aspect) {
  if (!pose) return null;
  const P = (i) => ({ x: pose[i].x * aspect, y: pose[i].y, v: pose[i].visibility ?? 0 });
  return {
    nose: P(0),
    hipL: P(23),
    hipR: P(24),
    kneeL: P(25),
    kneeR: P(26),
    ankL: P(27),
    ankR: P(28),
  };
}

// For calibration every point must be clearly visible.
export function strictOk(f) {
  return [f.nose, f.hipL, f.hipR, f.kneeL, f.kneeR, f.ankL, f.ankR].every((p) => p.v >= 0.5);
}

// Uses the stand-still frames to measure body height and thigh length in the image.
// "reason" values are translation keys (see strings.js).
export function calibrate(samples) {
  const ankY = samples.map((f) => (f.ankL.y + f.ankR.y) / 2);
  const bodyNorm = median(samples.map((f, i) => ankY[i] - f.nose.y));
  const thigh = median(
    samples.map((f) => (dist(f.hipL, f.kneeL) + dist(f.hipR, f.kneeR)) / 2)
  );
  const diff = median(samples.map((f) => Math.abs(f.ankL.y - f.ankR.y)));
  const hipX = samples.map((f) => (f.hipL.x + f.hipR.x) / 2);

  if (std(hipX) > 0.015 || std(ankY) > 0.01) return { ok: false, reason: "bal.r.moved" };
  if (bodyNorm < 0.35 || thigh < 0.03) return { ok: false, reason: "r.far" };
  if (bodyNorm > 0.85) return { ok: false, reason: "r.close" };
  if (diff > 0.04 * bodyNorm) return { ok: false, reason: "bal.r.bothfeet" };

  return { ok: true, bodyNorm, thigh };
}

// A counter holds the state of one attempt. Feed it frames with update().
// update() returns events: start, resume, fall, time, end.
export function createFlamingo(cal) {
  const s = {
    phase: "wait", // wait | run | done
    falls: 0,
    balanceMs: 0,
    startedAt: 0,
    waitSince: 0,
    lastT: 0,
    started: false,
    free: null, // "L" or "R": the raised foot
    cand: { side: null, okSince: 0, buf: [] },
    base: null, // standing ankle position when the clock started
    bad: null,
    lostSince: 0,
    nextTick: CFG.TICK_EVERY_MS,
    hintKey: "fl.hint.lift",
    last: null,
    reasons: [],
    endReason: null,
  };

  const resetCand = () => {
    s.cand = { side: null, okSince: 0, buf: [] };
  };

  function finish(why) {
    if (s.phase === "done") return [];
    s.phase = "done";
    s.endReason = why;
    return [{ type: "end", why, falls: s.falls, balanceMs: s.balanceMs }];
  }

  function metrics(f, side) {
    const knee = side === "L" ? f.kneeL : f.kneeR;
    const ank = side === "L" ? f.ankL : f.ankR;
    const st = side === "L" ? f.ankR : f.ankL;
    return {
      lift: (st.y - ank.y) / cal.bodyNorm, // how far the raised ankle is above the standing ankle
      fold: (knee.y - ank.y) / cal.thigh,  // how far the raised ankle is above its own knee
      st,
      freeVis: Math.min(knee.v, ank.v),
    };
  }

  // Which foot is raised, or null if both are on the ground.
  function raised(f) {
    const d = f.ankL.y - f.ankR.y; // positive: the left ankle is lower, so the right foot is up
    if (Math.abs(d) < CFG.LIFT_UP * cal.bodyNorm) return null;
    return d > 0 ? "R" : "L";
  }

  return {
    s,
    finish,

    update(pose, now, aspect) {
      const ev = [];
      if (s.phase === "done") return ev;

      if (!s.startedAt) {
        s.startedAt = now;
        s.waitSince = now;
        s.lastT = now;
      }
      const dt = Math.min(now - s.lastT, 150);
      s.lastT = now;

      if (now - s.startedAt > CFG.MAX_TOTAL_MS) {
        ev.push(...finish("max"));
        return ev;
      }

      const f = pose ? readFrame(pose, aspect) : null;
      const usable =
        f && f.nose.v >= 0.4 && Math.max(f.ankL.v, f.ankR.v) >= CFG.MIN_STAND_VIS;

      if (!usable) {
        if (!s.lostSince) s.lostSince = now;
        if (now - s.lostSince > CFG.LOST_MS) ev.push(...finish("lost"));
        if (s.phase === "wait") resetCand();
        return ev;
      }
      s.lostSince = 0;

      // ----- Waiting for the child to get into position -----
      if (s.phase === "wait") {
        const limit = s.started ? CFG.WAIT_AFTER_MS : CFG.WAIT_FIRST_MS;
        if (now - s.waitSince > limit) {
          ev.push(...finish("idle"));
          return ev;
        }

        const side = raised(f);
        if (!side) {
          resetCand();
          s.hintKey = "fl.hint.lift";
          s.last = null;
          return ev;
        }

        const m = metrics(f, side);
        if (side !== s.cand.side) s.cand = { side, okSince: 0, buf: [] };
        s.cand.buf.push({ x: m.st.x, y: m.st.y });
        if (s.cand.buf.length > 8) s.cand.buf.shift();

        // If the raised leg is too hidden to judge, accept the position and rely on
        // the touch-down and step checks instead.
        const held = m.freeVis < CFG.MIN_FREE_VIS || m.fold >= CFG.FOLD_HELD;
        s.last = { lift: m.lift, fold: m.fold, move: 0 };

        if (!held) {
          s.cand.okSince = 0;
          s.hintKey = "fl.hint.fold";
          return ev;
        }
        s.hintKey = "fl.hint.still";
        if (!s.cand.okSince) s.cand.okSince = now;

        if (now - s.cand.okSince >= CFG.READY_MS) {
          s.phase = "run";
          s.free = side;
          s.base = {
            x: median(s.cand.buf.map((p) => p.x)),
            y: median(s.cand.buf.map((p) => p.y)),
          };
          s.bad = null;
          ev.push({ type: s.started ? "resume" : "start" });
          s.started = true;
        }
        return ev;
      }

      // ----- Balancing: the clock runs while the position is held -----
      const m = metrics(f, s.free);
      const move = Math.hypot(m.st.x - s.base.x, m.st.y - s.base.y) / cal.bodyNorm;

      let why = "ok";
      if (m.lift < CFG.DOWN) why = "down";
      else if (m.freeVis >= CFG.MIN_FREE_VIS && m.fold < CFG.FOLD_RELEASE) why = "released";
      else if (move > CFG.MOVE) why = "moved";

      s.last = { lift: m.lift, fold: m.fold, move };

      if (why === "ok") {
        s.bad = null;
        s.balanceMs += dt;
      } else {
        if (!s.bad || s.bad.why !== why) s.bad = { why, since: now };
        if (now - s.bad.since >= CFG.FALL_MS) {
          s.falls++;
          s.reasons.push(why);
          ev.push({ type: "fall", n: s.falls, why });
          s.phase = "wait";
          s.free = null;
          s.bad = null;
          s.waitSince = now;
          s.hintKey = "fl.hint.lift";
          resetCand();
          if (s.falls > CFG.EARLY_FALLS && s.balanceMs <= CFG.EARLY_MS) {
            ev.push(...finish("terminated"));
          }
          return ev;
        }
      }

      if (s.balanceMs >= CFG.TARGET_MS) {
        ev.push(...finish("complete"));
        return ev;
      }
      if (s.balanceMs >= s.nextTick) {
        ev.push({ type: "time", sec: Math.round(s.nextTick / 1000) });
        s.nextTick += CFG.TICK_EVERY_MS;
      }
      return ev;
    },
  };
}