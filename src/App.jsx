import { useState } from "react";
import Register from "./screens/Register";
import Children from "./screens/Children";
import RunTest from "./screens/RunTest";

export default function App() {
  const [screen, setScreen] = useState("home");
  const home = () => setScreen("home");

  return (
    <main className="app">
      {screen === "home" && (
        <>
          <header className="hero">
            <div className="logo">K</div>
            <h1>Kreedex</h1>
            <p className="tagline">Find talent where it is, not where scouts are.</p>
          </header>

          <section className="cards">
            <button className="card" onClick={() => setScreen("register")}>
              <strong>Register a child</strong>
              <span>Add a child with parental consent</span>
            </button>
            <button className="card" onClick={() => setScreen("children")}>
              <strong>Registered children</strong>
              <span>View and manage saved profiles</span>
            </button>
            <button className="card" onClick={() => setScreen("test")}>
              <strong>Run a test</strong>
              <span>Camera and pose detection</span>
            </button>
            <button className="card" disabled>
              <strong>Scout dashboard</strong>
              <span>Coming in Chapter 8</span>
            </button>
          </section>

          <footer className="foot">
            Prototype · PS000014 · Seva First Innovation Challenge 2026
          </footer>
        </>
      )}

      {screen === "register" && <Register onBack={home} />}
      {screen === "children" && <Children onBack={home} />}
      {screen === "test" && <RunTest onBack={home} />}
    </main>
  );
}