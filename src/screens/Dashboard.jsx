import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db";
import { computeKreedex } from "../scoring";
import { DISTRICTS } from "../districts";
import { loadDemo, removeDemo } from "../demoData";
import { PLACEHOLDER_NOTICE, SHOW_PLACEHOLDER_NOTICE } from "../benchmarks";
import { useAuth, shownName } from "../auth";

const STATUSES = [
  ["none", "Not shortlisted"],
  ["shortlisted", "Shortlisted"],
  ["invited", "Invited to trial"],
  ["trial_done", "Trial done"],
  ["enrolled", "Enrolled"],
];
const STATUS_LABEL = Object.fromEntries(STATUSES);

const AGE_GROUPS = [
  ["all", "All ages"],
  ["6-8", "6-8 years"],
  ["9-11", "9-11 years"],
  ["12-14", "12-14 years"],
  ["15-17", "15-17 years"],
];

const MIN_SCORES = [
  [0, "Any score"],
  [50, "50 and above"],
  [75, "75 and above (Strong)"],
  [90, "90 and above (Standout)"],
];

function inAge(age, group) {
  if (group === "all") return true;
  const [a, b] = group.split("-").map(Number);
  return age >= a && age <= b;
}

// The export has no names: officials work with child IDs.
function downloadCsv(rows) {
  const head = [
    "Child ID", "Age", "Gender", "School", "District",
    "Kreedex Score", "Label", "Status", "Vertical jump (cm)", "Balance hold (s)", "Sample data",
  ];
  const data = rows.map(({ c, k }) => {
    const get = (id) => k.tests.find((t) => t.id === id)?.value ?? "";
    return [
      c.id, c.age, c.gender, c.school, c.district,
      k.overall, k.band.label, STATUS_LABEL[c.pipeline || "none"],
      get("vertical_jump"), get("single_leg_balance"), c.demo ? "yes" : "no",
    ];
  });
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [head, ...data].map((r) => r.map(esc).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "kreedex-shortlist.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function Dashboard({ onBack, onOpen }) {
  const { account } = useAuth();
  const scopeDistrict =
    account && account.scope && account.scope !== "state" ? account.scope : null;

  const children = useLiveQuery(() => db.children.toArray(), []);
  const results = useLiveQuery(() => db.results.toArray(), []);

  const [source, setSource] = useState("all");
  const [district, setDistrict] = useState("all");
  const [gender, setGender] = useState("all");
  const [age, setAge] = useState("all");
  const [minScore, setMinScore] = useState(0);
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("score");
  const [busy, setBusy] = useState(false);

  if (!children || !results) {
    return (
      <section className="panel">
        <button className="link" onClick={onBack}>← Back</button>
        <p className="muted">Loading…</p>
      </section>
    );
  }

  const byChild = {};
  for (const r of results) {
    if (!byChild[r.childId]) byChild[r.childId] = [];
    byChild[r.childId].push(r);
  }

  // An official with a district only sees that district.
  const visible = children.filter((c) => !scopeDistrict || c.district === scopeDistrict);
  const all = visible.map((c) => ({ c, k: computeKreedex(c, byChild[c.id] || []) }));
  const sampleCount = children.filter((c) => c.demo).length;

  const pool = all.filter(({ c }) =>
    source === "all" ? true : source === "sample" ? c.demo : !c.demo
  );
  const scored = pool.filter(({ k }) => k.overall != null);
  const untested = pool.length - scored.length;

  const avg = scored.length
    ? Math.round(scored.reduce((s, { k }) => s + k.overall, 0) / scored.length)
    : null;
  const isListed = (c) => (c.pipeline || "none") !== "none";
  const shortlisted = scored.filter(({ c }) => isListed(c));

  // Coverage by district
  const cov = {};
  for (const { c, k } of scored) {
    const d = c.district || "Unknown";
    if (!cov[d]) cov[d] = { n: 0, sum: 0, short: 0 };
    cov[d].n++;
    cov[d].sum += k.overall;
    if (isListed(c)) cov[d].short++;
  }
  const covList = Object.entries(cov).sort((a, b) => b[1].n - a[1].n);
  const maxN = covList.length ? covList[0][1].n : 1;
  const covered = DISTRICTS.filter((d) => cov[d]).length;
  const uncovered = scopeDistrict ? [] : DISTRICTS.filter((d) => !cov[d]);
  const totalDistricts = scopeDistrict ? 1 : DISTRICTS.length;

  const shown = scored
    .filter(
      ({ c, k }) =>
        (district === "all" || c.district === district) &&
        (gender === "all" || c.gender === gender) &&
        inAge(c.age, age) &&
        k.overall >= minScore &&
        (status === "all" || (c.pipeline || "none") === status)
    )
    .sort((a, b) =>
      sort === "name" ? a.c.id.localeCompare(b.c.id) : b.k.overall - a.k.overall
    );

  async function onLoad() {
    if (
      sampleCount > 0 &&
      !window.confirm("Replace the current sample data with a fresh set? Shortlist choices on sample children will be reset.")
    ) {
      return;
    }
    setBusy(true);
    try {
      await loadDemo(60);
    } finally {
      setBusy(false);
    }
  }

  async function onRemove() {
    if (!window.confirm("Remove all sample children and their results? Real registrations are not touched.")) {
      return;
    }
    setBusy(true);
    try {
      await removeDemo();
      setSource("all");
      setDistrict("all");
    } finally {
      setBusy(false);
    }
  }

  function updateStatus(id, value) {
    db.children.update(id, { pipeline: value });
  }

  return (
    <section className="panel">
      <button className="link" onClick={onBack}>← Back</button>
      <h2>Scout dashboard</h2>
      <p className="muted">Area: {scopeDistrict || "All of Gujarat"}</p>

      <p className="note">
        Demo login: this dashboard shows the data stored in this browser. Names are shortened to
        initials for officials, and exports contain no names. A real deployment needs server-side
        access control, and data from teachers would arrive through import or sync.
      </p>
      {SHOW_PLACEHOLDER_NOTICE && <p className="note">{PLACEHOLDER_NOTICE}</p>}

      {!scopeDistrict && (
        <>
          <div className="row">
            <button className="btn primary" onClick={onLoad} disabled={busy}>
              {sampleCount > 0 ? "Reload sample data" : "Load sample data (60 children)"}
            </button>
            <button className="btn" onClick={onRemove} disabled={busy || sampleCount === 0}>
              Remove sample data
            </button>
          </div>
          <p className="muted">
            Sample data is generated for demonstration. These are not real children.
            {sampleCount > 0 ? ` ${sampleCount} sample children are loaded.` : ""}
          </p>
        </>
      )}

      <label className="form inline">
        <span className="muted">Show</span>
        <select value={source} onChange={(e) => setSource(e.target.value)}>
          <option value="all">Real and sample</option>
          <option value="real">Real only</option>
          <option value="sample">Sample only</option>
        </select>
      </label>

      {pool.length === 0 ? (
        <p className="muted">
          No children to show yet.{" "}
          {scopeDistrict
            ? "Results will appear here once data for your district is available on this device."
            : "Load the sample data, or register children and save test results."}
        </p>
      ) : (
        <>
          <div className="stats">
            <div className="stat"><span className="n">{scored.length}</span><span className="muted">Children screened</span></div>
            <div className="stat"><span className="n">{avg ?? "–"}</span><span className="muted">Average Kreedex Score</span></div>
            <div className="stat"><span className="n">{shortlisted.length}</span><span className="muted">In the pipeline</span></div>
            <div className="stat"><span className="n">{covered}/{totalDistricts}</span><span className="muted">Districts with screening</span></div>
          </div>
          {untested > 0 && (
            <p className="muted">{untested} registered children have no saved results yet and are not listed.</p>
          )}

          <h3>District coverage</h3>
          <div className="cov">
            {covList.map(([d, v]) => (
              <div className="covrow" key={d}>
                <span>{d}</span>
                <div className="covbar"><span style={{ width: `${(v.n / maxN) * 100}%` }} /></div>
                <span className="muted">
                  {v.n} · avg {Math.round(v.sum / v.n)}
                  {v.short ? ` · ${v.short} listed` : ""}
                </span>
              </div>
            ))}
          </div>
          {uncovered.length > 0 && (
            <details>
              <summary>{uncovered.length} districts with no screening yet</summary>
              <div className="attempts" style={{ marginTop: 8 }}>
                {uncovered.map((d) => <span className="chip" key={d}>{d}</span>)}
              </div>
            </details>
          )}

          <h3>Find talent</h3>
          <div className="form filters">
            <label>
              District
              <select value={district} onChange={(e) => setDistrict(e.target.value)}>
                <option value="all">All districts</option>
                {covList.map(([d]) => <option key={d} value={d}>{d}</option>)}
              </select>
            </label>
            <label>
              Gender
              <select value={gender} onChange={(e) => setGender(e.target.value)}>
                <option value="all">All</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label>
              Age group
              <select value={age} onChange={(e) => setAge(e.target.value)}>
                {AGE_GROUPS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
            <label>
              Minimum score
              <select value={minScore} onChange={(e) => setMinScore(Number(e.target.value))}>
                {MIN_SCORES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
            <label>
              Pipeline status
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="all">Any status</option>
                {STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
            <label>
              Sort by
              <select value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="score">Highest score</option>
                <option value="name">Child ID</option>
              </select>
            </label>
          </div>

          <div className="row">
            <span className="muted">{shown.length} children match</span>
            <button
              className="btn"
              disabled={shortlisted.length === 0}
              onClick={() => downloadCsv(shortlisted)}
            >
              Download pipeline (CSV)
            </button>
          </div>

          <div className="rows">
            {shown.map(({ c, k }) => (
              <div className="rowcard" key={c.id}>
                <div className="child" style={{ border: "none", padding: 0 }}>
                  <div>
                    <strong>
                      {c.demo ? c.name : shownName(c.name, "official")}
                      {c.demo && <span className="tag">SAMPLE</span>}
                    </strong>
                    <span className="muted">{c.id} · {c.age} yrs · {c.gender}</span>
                    <span className="muted">{c.school}, {c.district}</span>
                  </div>
                  <div className="scoretext" style={{ textAlign: "right" }}>
                    <span className="scorenum" style={{ color: k.band.color, fontSize: 32 }}>{k.overall}</span>
                    <span style={{ color: k.band.color }}>{k.band.label}</span>
                  </div>
                </div>

                <div className="attempts">
                  {k.tests.map((t) => (
                    <span className="chip" key={t.id}>
                      {t.index}: {t.score}
                      <span className="chipsub"> ({t.value} {t.unit})</span>
                    </span>
                  ))}
                </div>

                <select
                  className="statusel"
                  value={c.pipeline || "none"}
                  onChange={(e) => updateStatus(c.id, e.target.value)}
                >
                  {STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                <button className="btn" onClick={() => onOpen(c.id)}>View profile</button>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}