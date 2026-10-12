export default function App() {
  const steps = [
    { title: "Register a child", note: "Chapter 2" },
    { title: "Run a test", note: "Chapters 3-5" },
    { title: "View results", note: "Chapters 6-7" },
    { title: "Scout dashboard", note: "Chapter 8" },
  ];

  return (
    <main className="app">
      <header className="hero">
        <div className="logo">K</div>
        <h1>Kreedex</h1>
        <p className="tagline">Find talent where it is, not where scouts are.</p>
      </header>

      <section className="cards">
        {steps.map((s) => (
          <button key={s.title} className="card" disabled>
            <strong>{s.title}</strong>
            <span>Coming in {s.note}</span>
          </button>
        ))}
      </section>

      <footer className="foot">
        Prototype · PS000014 · Seva First Innovation Challenge 2026
      </footer>
    </main>
  );
}