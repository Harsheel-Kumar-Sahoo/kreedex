// Camera push-up counter.
// MediaPipe landmark indexes (left / right):
// 11/12 shoulder, 13/14 elbow, 15/16 wrist, 23/24 hip, 25/26 knee, 27/28 ankle
//
// All numbers below can be tuned. The Measurements panel on the test screen
// shows the live elbow, body and tilt angles to help with that.

export const CFG = {
  DESCEND: 135,        // elbow angle below this starts a rep
  DOWN: 100,           // the elbow must bend to this angle or less (about 90 degrees, with some allowance)
  UP: 150,             // the elbow must straighten to at least this angle to finish a rep
  STRAIGHT: 150,       // minimum shoulder-hip-lower-body angle for a straight body
  PLANK_TILT: 30,      // standard: shoulder-to-ankle line within this many degrees of horizontal
  PLANK_TILT_MOD: 38,  // modified: shoulder-to-knee line
  HOLD_MS: 1000,       // time held in the starting position before counting begins
  IDLE_MS: 6000,       // no rep for this long ends the attempt
  IDLE_FIRST_MS: 10000, // more time allowed for the first rep
  MAX_MS: 180000,      // longest attempt
  LOST_MS: 1500,       // body out of view for this long ends the attempt
  BROKEN_MS: 1500,     // body position lost for this long ends the attempt
  BAD_FRAMES: 4,       // frames of poor body line during a rep before it is rejected
};

const IDX = {
  L: { sh: 11, el: 13, wr: 15, hip: 23, knee: 25, ank: 27 },
  R: { sh: 12, el: 14, wr: 16, hip: 24, knee: 26, ank: 28 },
};

const avg = (a) => a.reduce((s, x) => s + x, 0) / a.length;

function pushHist(a, v) {
  a.push(v);
  if (a.length > 3) a.shift();
}

// Angle at point b between the lines b-a and b-c, in degrees.
function angle(a, b, c) {
  const v1x = a.x - b.x;
  const v1y = a.y - b.y;
  const v2x = c.x - b.x;
  const v2y = c.y - b.y;
  const m = Math.hypot(v1x, v1y) * Math.hypot(v2x, v2y);
  if (!m) return null;
  const cos = Math.max(-1, Math.min(1, (v1x * v2x + v1y * v2y) / m));
  return (Math.acos(cos) * 180) / Math.PI;
}

// The camera sees the child from the side, so one side of the body is clearer.
export function pickSide(pose, variant) {
  const score = (s) => {
    const k = IDX[s];
    const low = variant === "modified" ? k.knee : k.ank;
    return [k.sh, k.el, k.wr, k.hip, low].reduce((sum, i) => sum + (pose[i].visibility ?? 0), 0);
  };
  return score("L") >= score("R") ? "L" : "R";
}

// Returns { elbow, body, tilt } in degrees, or null if the landmarks are not clear enough.
// x values are multiplied by the video aspect ratio so angles are not distorted.
export function readSide(pose, side, aspect, variant) {
  if (!pose) return null;
  const k = IDX[side];
  const lowIdx = variant === "modified" ? k.knee : k.ank;
  for (const i of [k.sh, k.el, k.wr, k.hip, lowIdx]) {
    if ((pose[i].visibility ?? 0) < 0.4) return null;
  }
  const P = (i) => ({ x: pose[i].x * aspect, y: pose[i].y });
  const sh = P(k.sh);
  const el = P(k.el);
  const wr = P(k.wr);
  const hip = P(k.hip);
  const low = P(lowIdx);

  const elbow = angle(sh, el, wr);
  const body = angle(sh, hip, low);
  if (elbow == null || body == null) return null;

  // 0 = body line is flat, 90 = upright
  const tilt =
    (Math.atan2(Math.abs(low.y - sh.y), Math.abs(low.x - sh.x)) * 180) / Math.PI;

  return { elbow, body, tilt };
}

// A counter holds the state of one attempt. Feed it frames with update().
// update() returns events: ready, rep, partial, form, end.
export function createCounter(variant) {
  const tiltMax = variant === "modified" ? CFG.PLANK_TILT_MOD : CFG.PLANK_TILT;

  const s = {
    phase: "position", // position | count | done
    side: null,
    reps: 0,
    state: "up", // up | going
    minElbow: 180,
    badFrames: 0,
    posSince: 0,
    startedAt: 0,
    lastRepAt: 0,
    lostSince: 0,
    brokenSince: 0,
    hist: { elbow: [], body: [] },
    last: null,
    endReason: null,
  };

  function finish(why) {
    if (s.phase === "done") return [];
    s.phase = "done";
    s.endReason = why;
    return [{ type: "end", why, reps: s.reps }];
  }

  return {
    s,
    finish,

    // Why the starting position is not accepted yet (a translation key).
    hint() {
      const f = s.last;
      if (!f) return "pu.hint.visible";
      if (f.tilt > tiltMax) return "pu.hint.flat";
      if (f.elbow < CFG.UP) return "pu.hint.arms";
      if (f.body < CFG.STRAIGHT) return "pu.hint.back";
      return "pu.hint.still";
    },

    update(pose, now, aspect) {
      const ev = [];
      if (s.phase === "done") return ev;

      const side = s.phase === "count" ? s.side : pose ? pickSide(pose, variant) : null;
      const raw = side ? readSide(pose, side, aspect, variant) : null;

      let f = null;
      if (raw) {
        pushHist(s.hist.elbow, raw.elbow);
        pushHist(s.hist.body, raw.body);
        f = { elbow: avg(s.hist.elbow), body: avg(s.hist.body), tilt: raw.tilt };
      } else {
        s.hist.elbow.length = 0;
        s.hist.body.length = 0;
      }
      s.last = f;

      // ----- Waiting for the starting position -----
      if (s.phase === "position") {
        const ready =
          f && f.tilt <= tiltMax && f.elbow >= CFG.UP && f.body >= CFG.STRAIGHT;
        if (!ready) {
          s.posSince = 0;
          return ev;
        }
        if (!s.posSince) s.posSince = now;
        if (now - s.posSince >= CFG.HOLD_MS) {
          s.phase = "count";
          s.side = side;
          s.startedAt = now;
          s.lastRepAt = now;
          s.state = "up";
          ev.push({ type: "ready" });
        }
        return ev;
      }

      // ----- Counting -----
      if (!f) {
        if (!s.lostSince) s.lostSince = now;
        if (now - s.lostSince > CFG.LOST_MS) ev.push(...finish("lost"));
        return ev;
      }
      s.lostSince = 0;

      if (f.tilt > tiltMax + 12) {
        if (!s.brokenSince) s.brokenSince = now;
        if (now - s.brokenSince > CFG.BROKEN_MS) {
          ev.push(...finish("broken"));
          return ev;
        }
      } else {
        s.brokenSince = 0;
      }

      if (s.state === "up") {
        if (f.elbow < CFG.DESCEND) {
          s.state = "going";
          s.minElbow = f.elbow;
          s.badFrames = 0;
        }
      } else {
        s.minElbow = Math.min(s.minElbow, f.elbow);
        if (f.elbow < CFG.DOWN + 20 && f.body < CFG.STRAIGHT) s.badFrames++;

        if (f.elbow > CFG.UP) {
          if (s.minElbow > CFG.DOWN) {
            ev.push({ type: "partial" });
          } else if (s.badFrames >= CFG.BAD_FRAMES) {
            ev.push({ type: "form" });
          } else {
            s.reps++;
            s.lastRepAt = now;
            ev.push({ type: "rep", n: s.reps });
          }
          s.state = "up";
        }
      }

      const limit = s.reps === 0 ? CFG.IDLE_FIRST_MS : CFG.IDLE_MS;
      if (now - s.lastRepAt > limit) {
        ev.push(...finish("idle"));
        return ev;
      }
      if (now - s.startedAt > CFG.MAX_MS) ev.push(...finish("max"));
      return ev;
    },
  };
}