import { useState } from "react";
import { db, newChildId } from "../db";

const DISTRICTS = [
  "Ahmedabad", "Amreli", "Anand", "Banaskantha", "Bharuch", "Bhavnagar",
  "Chhota Udepur", "Dahod", "Devbhumi Dwarka", "Gandhinagar", "Junagadh",
  "Kachchh", "Kheda", "Mahisagar", "Mehsana", "Narmada", "Navsari",
  "Panchmahal", "Patan", "Porbandar", "Rajkot", "Sabarkantha", "Surat",
  "Surendranagar", "Tapi", "Vadodara", "Valsad",
];

const empty = {
  name: "",
  age: "",
  gender: "",
  school: "",
  district: "",
  guardian: "",
  consent: false,
};

export default function Register({ onBack }) {
  const [f, setF] = useState(empty);
  const [error, setError] = useState("");
  const [savedId, setSavedId] = useState("");

  const set = (key) => (e) =>
    setF({ ...f, [key]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError("");

    const age = Number(f.age);
    if (!f.name.trim()) return setError("Please enter the child's name.");
    if (!age || age < 6 || age > 17) return setError("Age must be between 6 and 17.");
    if (!f.gender) return setError("Please select a gender.");
    if (!f.school.trim()) return setError("Please enter the school name.");
    if (!f.district.trim()) return setError("Please enter the district.");
    if (!f.guardian.trim()) return setError("Please enter the parent/guardian name.");
    if (!f.consent) return setError("Parent/guardian consent is required to continue.");

    const id = newChildId();
    await db.children.add({
      id,
      name: f.name.trim(),
      age,
      gender: f.gender,
      school: f.school.trim(),
      district: f.district.trim(),
      guardian: f.guardian.trim(),
      consentAt: new Date().toISOString(),
      createdAt: Date.now(),
    });
    setSavedId(id);
    setF(empty);
  }

  if (savedId) {
    return (
      <section className="panel">
        <h2>Registered</h2>
        <p>Child ID</p>
        <div className="big-id">{savedId}</div>
        <p className="muted">Note this ID. It is used to find the child's results later.</p>
        <button className="btn primary" onClick={() => setSavedId("")}>
          Register another child
        </button>
        <button className="btn" onClick={onBack}>Back to home</button>
      </section>
    );
  }

  return (
    <section className="panel">
      <button className="link" onClick={onBack}>← Back</button>
      <h2>Register a child</h2>

      <form onSubmit={submit} className="form">
        <label>
          Child's name
          <input value={f.name} onChange={set("name")} autoComplete="off" />
        </label>

        <div className="row">
          <label>
            Age
            <input type="number" inputMode="numeric" value={f.age} onChange={set("age")} />
          </label>
          <label>
            Gender
            <select value={f.gender} onChange={set("gender")}>
              <option value="">Select</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other</option>
            </select>
          </label>
        </div>

        <label>
          School
          <input value={f.school} onChange={set("school")} autoComplete="off" />
        </label>

        <label>
          District
          <input list="districts" value={f.district} onChange={set("district")} />
          <datalist id="districts">
            {DISTRICTS.map((d) => <option key={d} value={d} />)}
          </datalist>
        </label>

        <label>
          Parent / guardian name
          <input value={f.guardian} onChange={set("guardian")} autoComplete="off" />
        </label>

        <label className="consent">
          <input type="checkbox" checked={f.consent} onChange={set("consent")} />
          <span>
            I am the parent/guardian and I consent to my child taking simple physical
            tests recorded on this device. Videos are analysed on the phone and are not
            uploaded or stored.
          </span>
        </label>

        {error && <p className="error">{error}</p>}

        <button className="btn primary" type="submit">Save</button>
      </form>
    </section>
  );
}