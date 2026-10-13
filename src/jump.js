// MediaPipe landmark indexes: 0 nose, 23/24 hips, 29/30 heels
const NEEDED = [0, 23, 24, 29, 30];

// Approximate distance from nose tip to heel as a share of standing height.
// This is an estimate and should be checked against real measurements.
const NOSE_TO_HEEL = 0.9;

const median = (a) => {
  const s = [...a].sort((x, y) => x - y);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

const std = (a) => {
  const m = a.reduce((s, x) => s + x, 0) / a.length;
  return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / a.length);
};

const smooth = (a) =>
  a.map((_, i) => {
    const w = a.slice(Math.max(0, i - 1), i + 2);
    return w.reduce((s, x) => s + x, 0) / w.length;
  });

// Returns the key heights for one frame, or null if the body is not fully visible.
export function readFrame(pose) {
  if (!pose) return null;
  for (const i of NEEDED) {
    if ((pose[i].visibility ?? 0) < 0.5) return null;
  }
  return {
    nose: pose[0].y,
    hip: (pose[23].y + pose[24].y) / 2,
    heel: (pose[29].y + pose[30].y) / 2,
  };
}

// Uses ~2 seconds of standing-still frames to set the baseline and the scale.
export function calibrate(samples, heightCm) {
  const hip = samples.map((s) => s.hip);
  const heel = samples.map((s) => s.heel);
  const baseNose = median(samples.map((s) => s.nose));
  const bodyNorm = median(samples.map((s) => s.heel - s.nose));

  if (std(hip) > 0.01 || std(heel) > 0.01) {
    return { ok: false, reason: "You moved. Stand still and try again." };
  }
  if (bodyNorm < 0.35) {
    return { ok: false, reason: "Too far away. Move the phone closer." };
  }
  if (bodyNorm > 0.72) {
    return { ok: false, reason: "Too close. Move the phone back." };
  }
  if (baseNose < 0.12) {
    return { ok: false, reason: "Leave space above the head for the jump. Move the phone back." };
  }

  return {
    ok: true,
    baseHip: median(hip),
    baseHeel: median(heel),
    bodyNorm,
    cmPerUnit: (NOSE_TO_HEEL * heightCm) / bodyNorm,
  };
}

// Turns the recorded jump frames into a height in cm, or a reason it was rejected.
export function analyze({ samples, total }, cal) {
  if (samples.length < 15) {
    return { ok: false, reason: "Too few frames were captured. Try again." };
  }
  if (samples.length / total < 0.7) {
    return {
      ok: false,
      reason: "The body was partly out of view. Keep the whole body visible, including the feet.",
    };
  }

  const hip = smooth(samples.map((s) => s.hip));
  const rise = cal.baseHip - Math.min(...hip);
  const cm = rise * cal.cmPerUnit;

  // After landing the child should be standing back at the start position.
  const tEnd = samples[samples.length - 1].t;
  const tail = samples.filter((s) => s.t > tEnd - 500).map((s) => s.hip);
  if (tail.length < 5) {
    return { ok: false, reason: "Not enough frames after landing. Try again." };
  }
  if (Math.abs(median(tail) - cal.baseHip) > 0.07 * cal.bodyNorm) {
    return {
      ok: false,
      reason: "The phone or the child moved during the attempt. Keep the phone steady and stand still after landing.",
    };
  }

  if (cm < 5) {
    return { ok: false, reason: "No jump detected. Jump as high as you can with both feet." };
  }
  if (cm > 90) {
    return { ok: false, reason: "That reading is not realistic. Check the height entered and try again." };
  }

  return { ok: true, cm: Math.round(cm * 10) / 10 };
}