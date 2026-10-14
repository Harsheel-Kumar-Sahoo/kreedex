// MediaPipe landmark indexes:
// 0 nose, 11/12 shoulders, 23/24 hips, 27/28 ankles
const NEEDED = [0, 11, 12, 23, 24, 27, 28];

// Approximate nose-to-ankle distance as a share of standing height.
// This is an estimate and should be checked against real measurements.
const NOSE_TO_ANKLE = 0.87;

// Sway ratings are placeholder cut-offs for the prototype, not published norms.
// The English words are stored with the result and translated when shown.
const rate = (cm) => (cm < 2 ? "Steady" : cm < 4 ? "Some sway" : "Unsteady");

const round1 = (x) => Math.round(x * 10) / 10;

const median = (a) => {
  const s = [...a].sort((x, y) => x - y);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

const std = (a) => {
  const m = a.reduce((s, x) => s + x, 0) / a.length;
  return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / a.length);
};

// All x values are multiplied by the video aspect ratio so that x and y
// are in the same units (a share of the frame height).
export function readFrame(pose, aspect) {
  if (!pose) return null;
  for (const i of NEEDED) {
    if ((pose[i].visibility ?? 0) < 0.5) return null;
  }
  return {
    noseY: pose[0].y,
    hipX: ((pose[23].x + pose[24].x) / 2) * aspect,
    ankleLX: pose[27].x * aspect,
    ankleLY: pose[27].y,
    ankleRX: pose[28].x * aspect,
    ankleRY: pose[28].y,
  };
}

// Uses ~1.5 seconds of standing on both feet to set the starting position and scale.
// "reason" values are translation keys (see strings.js).
export function calibrate(samples, heightCm) {
  const ankleAvg = samples.map((s) => (s.ankleLY + s.ankleRY) / 2);
  const bodyNorm = median(samples.map((s, i) => ankleAvg[i] - s.noseY));
  const diff = median(samples.map((s) => Math.abs(s.ankleLY - s.ankleRY)));

  if (std(samples.map((s) => s.hipX)) > 0.015 || std(ankleAvg) > 0.01) {
    return { ok: false, reason: "bal.r.moved" };
  }
  if (bodyNorm < 0.35) {
    return { ok: false, reason: "r.far" };
  }
  if (bodyNorm > 0.85) {
    return { ok: false, reason: "r.close" };
  }
  if (diff > 0.04 * bodyNorm) {
    return { ok: false, reason: "bal.r.bothfeet" };
  }

  return {
    ok: true,
    bodyNorm,
    cmPerUnit: (NOSE_TO_ANKLE * heightCm) / bodyNorm,
    baseL: {
      x: median(samples.map((s) => s.ankleLX)),
      y: median(samples.map((s) => s.ankleLY)),
    },
    baseR: {
      x: median(samples.map((s) => s.ankleRX)),
      y: median(samples.map((s) => s.ankleRY)),
    },
  };
}

// Returns "L" or "R" (the foot that has been lifted), or null if both feet are down.
export function detectLift(f, cal) {
  const d = f.ankleLY - f.ankleRY; // positive: left ankle is lower, so the right foot is up
  if (Math.abs(d) > 0.06 * cal.bodyNorm) return d > 0 ? "R" : "L";
  return null;
}

// Checks one frame during the hold: "ok", "down" (raised foot touched down)
// or "moved" (standing foot shifted).
export function holdStatus(f, cal, raised) {
  const standing = raised === "L" ? "R" : "L";
  const rY = raised === "L" ? f.ankleLY : f.ankleRY;
  const sY = standing === "L" ? f.ankleLY : f.ankleRY;
  const sX = standing === "L" ? f.ankleLX : f.ankleRX;
  const base = standing === "L" ? cal.baseL : cal.baseR;

  if (Math.abs(rY - sY) < 0.025 * cal.bodyNorm) return "down";
  if (Math.hypot(sX - base.x, sY - base.y) > 0.08 * cal.bodyNorm) return "moved";
  return "ok";
}

// Turns a finished hold into seconds plus a sway reading.
export function summarize({ startT, endT, hipXs }, cal) {
  const sec = (endT - startT) / 1000;
  if (sec < 1) {
    return { ok: false, reason: "bal.r.short" };
  }
  const xs = hipXs.filter((p) => p.t >= startT && p.t <= endT).map((p) => p.x);
  const swayCm = xs.length >= 5 ? round1(std(xs) * cal.cmPerUnit) : null;
  return {
    ok: true,
    sec: round1(sec),
    swayCm,
    rating: swayCm == null ? null : rate(swayCm),
  };
}