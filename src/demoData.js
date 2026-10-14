import { db } from "./db";
import { reference } from "./scoring";

// Only some districts get sample children, so the coverage view shows gaps.
const DEMO_DISTRICTS = [
  "Ahmedabad", "Vadodara", "Anand", "Bharuch", "Navsari",
  "Panchmahal", "Sabarkantha", "Devbhumi Dwarka", "Chhota Udepur", "Kachchh",
];

const DAY = 86400000;

// Small seeded random generator, so the sample data is the same every time.
function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export async function removeDemo() {
  const demo = await db.children.filter((c) => c.demo).toArray();
  const ids = demo.map((c) => c.id);
  if (!ids.length) return 0;
  await db.transaction("rw", db.children, db.results, async () => {
    await db.results.where("childId").anyOf(ids).delete();
    await db.children.bulkDelete(ids);
  });
  return ids.length;
}

export async function loadDemo(count = 60) {
  await removeDemo();

  const rng = mulberry32(20260);
  const gauss = () => {
    let u = 0;
    while (!u) u = rng();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
  };
  const round1 = (x) => Math.round(x * 10) / 10;

  const now = Date.now();
  const children = [];
  const results = [];

  for (let i = 1; i <= count; i++) {
    const id = "DEMO-" + String(i).padStart(3, "0");
    const age = 9 + Math.floor(rng() * 9); // 9 to 17
    const gender = rng() < 0.5 ? "male" : "female";
    // Skewed pick, so some districts have many children and some few.
    const district = DEMO_DISTRICTS[Math.floor(Math.pow(rng(), 1.4) * DEMO_DISTRICTS.length)];
    const created = now - Math.floor(rng() * 60) * DAY;

    children.push({
      id,
      name: "Demo Child " + String(i).padStart(2, "0"),
      age,
      gender,
      heightCm: Math.round(Math.min(190, Math.max(110, 128 + (age - 9) * 5.2 + gauss() * 5))),
      school: `Demo School ${district} ${1 + Math.floor(rng() * 3)}`,
      district,
      guardian: "Sample guardian",
      consentAt: new Date(created).toISOString(),
      createdAt: created,
      pipeline: "none",
      demo: true,
    });

    const ability = gauss() * 0.9;
    const mix = rng();
    const doJump = mix < 0.85;
    const doBalance = mix > 0.25;

    const add = (test, field, ref, floor) => {
      const z = 0.6 * ability + 0.8 * gauss();
      const value = Math.max(floor, round1(ref.mean + z * ref.sd));
      const when = now - Math.floor(rng() * 20) * DAY;
      results.push({ childId: id, test, [field]: value, createdAt: when });

      // Some children also have an earlier, slightly lower result.
      if (rng() < 0.3) {
        const earlier = Math.max(floor, round1(value * (0.86 + rng() * 0.08)));
        results.push({
          childId: id,
          test,
          [field]: earlier,
          createdAt: when - (25 + Math.floor(rng() * 30)) * DAY,
        });
      }
    };

    if (doJump) add("vertical_jump", "valueCm", reference("vertical_jump", gender, age), 6);
    if (doBalance) add("single_leg_balance", "valueSec", reference("single_leg_balance", gender, age), 2);
  }

  await db.transaction("rw", db.children, db.results, async () => {
    await db.children.bulkAdd(children);
    await db.results.bulkAdd(results);
  });
  return children.length;
}