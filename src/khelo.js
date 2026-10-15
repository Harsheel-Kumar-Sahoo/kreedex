// Official Khelo India benchmark levels, transcribed from:
// Fit India Mission, "Fitness Protocols and Guidelines for Age 5-18 Years",
// section 7 (baseline for academic year 2020-21).
//
// Each row holds seven thresholds, one per level L1..L7.
//   dir "up"   (more is better): a result earns level k if it is MORE than threshold k.
//   dir "down" (less is better): a result earns level k if it is LESS than threshold k.
// The highest level earned is the result. A result that earns no level is shown as Level 1.
//
// Known problems in the printed tables (see the README):
//  - Some bands are empty ("13 to 13"), so a few levels cannot be earned.
//  - 600 m for ages 14+ has inverted bands and implausible times, so it is left out.
//  - 600 m at ages 12-13 differs sharply from neighbouring ages.

export const KHELO_ORDER = ["curl_up", "push_up", "sit_reach", "run_600", "dash_50"];

export const LEVELS = [
  { n: 1, points: 2 },
  { n: 2, points: 4 },
  { n: 3, points: 6 },
  { n: 4, points: 7 },
  { n: 5, points: 8 },
  { n: 6, points: 9 },
  { n: 7, points: 10 },
];

export const LEVEL_COLORS = [
  "#64748b", "#d97706", "#ca8a04", "#2563eb", "#16a34a", "#15803d", "#166534",
];

export const KHELO = {
  curl_up: {
    dir: "up", unit: "reps", decimals: 0, min: 0, max: 100,
    male: {
      9: [9, 13, 13, 18, 20, 21, 23],
      10: [11, 15, 15, 20, 22, 23, 25],
      11: [13, 16, 16, 22, 23, 24, 26],
      12: [14, 16, 16, 22, 24, 25, 27],
      13: [14, 18, 18, 23, 24, 26, 28],
      14: [15, 19, 19, 24, 25, 27, 29],
      15: [17, 20, 20, 25, 26, 28, 30],
      16: [18, 20, 20, 26, 27, 29, 30],
      17: [18, 22, 22, 27, 28, 29, 31],
    },
    female: {
      9: [9, 13, 13, 18, 19, 21, 23],
      10: [10, 14, 14, 19, 20, 22, 24],
      11: [11, 15, 15, 20, 21, 22, 24],
      12: [12, 15, 15, 20, 21, 23, 24],
      13: [12, 15, 15, 20, 21, 23, 24],
      14: [12, 16, 16, 20, 21, 23, 24],
      15: [13, 16, 16, 21, 22, 23, 25],
      16: [13, 16, 16, 21, 22, 23, 25],
      17: [13, 17, 17, 21, 22, 23, 25],
    },
  },

  // Boys: standard push-ups. Girls: modified push-ups (knees on the ground).
  push_up: {
    dir: "up", unit: "reps", decimals: 0, min: 0, max: 100,
    male: {
      9: [4, 5, 6, 7, 8, 9, 10],
      10: [5, 6, 7, 8, 9, 10, 11],
      11: [6, 7, 8, 9, 10, 11, 13],
      12: [7, 8, 9, 10, 11, 13, 15],
      13: [8, 9, 10, 11, 13, 15, 16],
      14: [9, 10, 11, 13, 15, 16, 17],
      15: [13, 15, 17, 19, 21, 23, 28],
      16: [15, 17, 19, 21, 23, 28, 33],
      17: [17, 19, 21, 23, 28, 33, 37],
    },
    female: {
      9: [3, 4, 6, 7, 7, 8, 8],
      10: [4, 6, 7, 7, 8, 8, 9],
      11: [6, 7, 7, 8, 8, 9, 10],
      12: [7, 7, 8, 8, 9, 10, 12],
      13: [7, 8, 8, 9, 10, 12, 14],
      14: [10, 11, 13, 15, 16, 17, 19],
      15: [11, 13, 15, 16, 17, 19, 21],
      16: [13, 15, 16, 17, 19, 21, 22],
      17: [15, 16, 17, 19, 21, 22, 24],
    },
  },

  sit_reach: {
    dir: "up", unit: "cm", decimals: 1, min: 0, max: 80,
    male: {
      9: [6.0, 10.7, 14.4, 17.6, 19.4, 21.4, 26.8],
      10: [6.0, 10.8, 14.4, 17.7, 19.4, 21.5, 26.9],
      11: [6.0, 10.8, 14.4, 17.7, 19.4, 21.5, 26.9],
      12: [6.0, 10.8, 14.5, 17.8, 19.6, 21.7, 27.1],
      13: [6.1, 11.1, 14.8, 18.2, 20.0, 22.2, 27.7],
      14: [6.7, 12.1, 16.2, 19.9, 21.9, 24.2, 30.3],
      15: [7.7, 13.7, 18.3, 22.4, 24.6, 27.2, 34.0],
      16: [8.4, 14.6, 19.3, 23.6, 25.9, 28.6, 35.6],
      17: [9.1, 15.5, 20.4, 24.8, 27.2, 30.0, 37.2],
    },
    female: {
      9: [7.9, 13.1, 16.9, 20.3, 22.1, 24.2, 29.6],
      10: [8.5, 13.7, 17.5, 20.9, 22.7, 24.8, 30.1],
      11: [9.4, 14.5, 18.4, 21.7, 23.5, 25.6, 31.0],
      12: [10.6, 15.8, 19.7, 23.1, 24.9, 27.1, 32.5],
      13: [11.9, 17.3, 21.3, 24.8, 26.7, 28.9, 34.4],
      14: [13.1, 18.6, 22.7, 26.3, 28.2, 30.4, 36.1],
      15: [13.9, 19.5, 23.6, 27.2, 29.1, 31.3, 37.0],
      16: [14.4, 20.0, 24.1, 27.6, 29.5, 31.8, 37.5],
      17: [14.7, 20.3, 24.4, 27.9, 29.8, 32.1, 37.8],
    },
  },

  // Times in seconds. Ages 9-13 only (see the note above).
  run_600: {
    dir: "down", unit: "s", decimals: 1, min: 60, max: 1200,
    male: {
      9: [210.0, 204.6, 200.4, 197.4, 196.2, 195.6, 195.0],
      10: [213.6, 208.8, 202.2, 197.4, 195.0, 192.6, 192.0],
      11: [207.6, 202.8, 196.2, 191.4, 189.0, 186.6, 186.0],
      12: [186.0, 186.0, 172.2, 163.2, 159.0, 151.2, 150.6],
      13: [138.0, 134.4, 128.4, 124.8, 123.0, 120.6, 120.0],
    },
    female: {
      9: [255.0, 246.6, 234.6, 225.6, 221.4, 216.0, 215.4],
      10: [246.0, 237.0, 224.4, 214.8, 210.6, 204.6, 204.0],
      11: [240.6, 231.6, 218.4, 208.8, 204.6, 198.6, 198.0],
      12: [210.0, 204.0, 194.4, 187.8, 184.8, 180.6, 180.0],
      13: [180.0, 169.8, 154.8, 144.0, 139.2, 132.6, 132.0],
    },
  },

  dash_50: {
    dir: "down", unit: "s", decimals: 1, min: 4, max: 40,
    male: {
      9: [10.8, 10.3, 9.8, 9.3, 9.1, 9.0, 8.6],
      10: [10.4, 10.0, 9.5, 9.1, 8.9, 8.3, 8.3],
      11: [10.1, 9.7, 9.2, 8.8, 8.6, 8.1, 8.1],
      12: [9.8, 9.4, 8.9, 8.5, 8.3, 7.8, 7.8],
      13: [9.4, 9.1, 8.7, 8.3, 8.0, 7.7, 7.7],
      14: [9.1, 8.9, 8.5, 8.0, 7.8, 7.5, 7.6],
      15: [8.9, 8.7, 8.3, 7.8, 7.7, 7.3, 7.4],
      16: [8.7, 8.5, 8.0, 7.7, 7.6, 7.2, 7.2],
      17: [8.5, 8.3, 7.8, 7.6, 7.5, 7.1, 7.1],
    },
    female: {
      9: [11.1, 10.6, 9.9, 9.5, 9.3, 9.1, 8.8],
      10: [10.7, 10.2, 9.7, 9.3, 9.1, 8.8, 8.5],
      11: [10.3, 9.5, 9.0, 8.6, 8.4, 8.5, 8.3],
      12: [10.0, 9.5, 9.0, 8.6, 8.4, 8.2, 8.0],
      13: [9.5, 9.2, 8.8, 8.4, 8.1, 8.0, 7.8],
      14: [9.2, 9.0, 8.6, 8.1, 7.9, 7.8, 7.6],
      15: [9.0, 8.8, 8.4, 7.9, 7.6, 7.7, 7.4],
      16: [8.8, 8.6, 8.1, 7.6, 7.4, 7.5, 7.2],
      17: [8.6, 8.4, 7.9, 7.4, 7.3, 7.4, 7.0],
    },
  },
};

export function hasTable(testId, gender, age) {
  const t = KHELO[testId];
  return !!(t && t[gender] && t[gender][age]);
}

// Returns { n, points, below } or null when there is no table for this test, gender and age.
export function levelFor(testId, gender, age, value) {
  const t = KHELO[testId];
  const row = t && t[gender] && t[gender][age];
  if (!row) return null;

  let level = 0;
  for (let i = 0; i < 7; i++) {
    const earned = t.dir === "up" ? value > row[i] : value < row[i];
    if (earned) level = i + 1;
  }
  const below = level === 0;
  const n = below ? 1 : level;
  return { n, points: LEVELS[n - 1].points, below };
}

// Formats a stored value for display (600 m as m:ss.s).
export function fmt(testId, v) {
  if (testId === "run_600") {
    const tenths = Math.round(v * 10);
    const m = Math.floor(tenths / 600);
    const s = (tenths - m * 600) / 10;
    return m + ":" + s.toFixed(1).padStart(4, "0");
  }
  return Number(v).toFixed(KHELO[testId].decimals);
}