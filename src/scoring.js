import { BENCHMARKS } from "./benchmarks";

// Error function approximation (Abramowitz and Stegun), used for the normal curve.
function erf(x) {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const poly =
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t +
      0.254829592) * t;
  return sign * (1 - poly * Math.exp(-ax * ax));
}

const cdf = (z) => 0.5 * (1 + erf(z / Math.SQRT2));

function interp(rows, age) {
  if (age <= rows[0][0]) return { mean: rows[0][1], sd: rows[0][2] };
  for (let i = 1; i < rows.length; i++) {
    if (age <= rows[i][0]) {
      const [a0, m0, s0] = rows[i - 1];
      const [a1, m1, s1] = rows[i];
      const k = (age - a0) / (a1 - a0);
      return { mean: m0 + k * (m1 - m0), sd: s0 + k * (s1 - s0) };
    }
  }
  const last = rows[rows.length - 1];
  return { mean: last[1], sd: last[2] };
}

// Reference mean and spread for a test, age and gender.
// For "other", the male and female references are averaged.
export function reference(testId, gender, age) {
  const b = BENCHMARKS[testId];
  if (gender === "male" || gender === "female") return interp(b[gender], age);
  const m = interp(b.male, age);
  const f = interp(b.female, age);
  return { mean: (m.mean + f.mean) / 2, sd: (m.sd + f.sd) / 2 };
}

// Converts one result to a 1-99 percentile-style score.
export function scoreTest(testId, value, child) {
  const r = reference(testId, child.gender, child.age);
  const z = (value - r.mean) / r.sd;
  return Math.round(Math.min(99, Math.max(1, cdf(z) * 100)));
}

export function band(score) {
  if (score >= 90) return { label: "Standout", color: "#15803d" };
  if (score >= 75) return { label: "Strong", color: "#16a34a" };
  if (score >= 50) return { label: "On track", color: "#2563eb" };
  if (score >= 25) return { label: "Developing", color: "#d97706" };
  return { label: "Building", color: "#64748b" };
}

// Builds the Kreedex Score for one child from their saved results.
// The most recent saved result for each test is used.
export function computeKreedex(child, results) {
  const latest = {};
  for (const r of [...results].sort((a, b) => b.createdAt - a.createdAt)) {
    if (!latest[r.test]) latest[r.test] = r;
  }

  const tests = [];
  for (const [id, b] of Object.entries(BENCHMARKS)) {
    const r = latest[id];
    const value = r ? r[b.field] : undefined;
    if (value == null) continue;
    tests.push({
      id,
      label: b.label,
      index: b.index,
      unit: b.unit,
      value,
      score: scoreTest(id, value, child),
    });
  }

  const total = Object.keys(BENCHMARKS).length;
  if (tests.length === 0) {
    return { overall: null, tests, count: 0, total, band: null };
  }

  const overall = Math.round(tests.reduce((s, t) => s + t.score, 0) / tests.length);
  return { overall, tests, count: tests.length, total, band: band(overall) };
}