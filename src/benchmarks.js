// PLACEHOLDER reference values for the prototype.
// They are rough estimates, NOT official norms. Replace them with published
// values (e.g. national fitness test norms) before presenting scores as real.
// Each row is [age, mean, standard deviation].

export const SHOW_PLACEHOLDER_NOTICE = true;

export const PLACEHOLDER_NOTICE =
  "Scores use placeholder reference values for this prototype, not official norms.";

export const BENCHMARKS = {
  vertical_jump: {
    label: "Vertical jump",
    index: "Power",
    unit: "cm",
    field: "valueCm",
    male: [
      [6, 16, 4], [8, 20, 4.5], [10, 24, 5], [12, 28, 5.5],
      [14, 33, 6], [16, 38, 6.5], [17, 40, 6.5],
    ],
    female: [
      [6, 15, 4], [8, 19, 4.5], [10, 22, 5], [12, 25, 5],
      [14, 27, 5.5], [16, 28, 5.5], [17, 28, 5.5],
    ],
  },
  single_leg_balance: {
    label: "Single-leg balance",
    index: "Balance",
    unit: "s",
    field: "valueSec",
    male: [
      [6, 10, 6], [8, 14, 8], [10, 19, 10], [12, 24, 11],
      [14, 29, 12], [16, 33, 12], [17, 35, 12],
    ],
    female: [
      [6, 11, 6], [8, 16, 8], [10, 21, 10], [12, 26, 11],
      [14, 30, 12], [16, 33, 12], [17, 35, 12],
    ],
  },
};