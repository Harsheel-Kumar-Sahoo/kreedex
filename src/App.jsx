import { useState } from "react";
import Register from "./screens/Register";
import Children from "./screens/Children";
import RunTest from "./screens/RunTest";
import Profile from "./screens/Profile";

export default function App() {
  const [screen, setScreen] = useState("home");
  const [profileId, setProfileId] = useState(null);
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
              <span>View profiles, scores and history</span>
            </button>
            <button className="card" onClick={() => setScreen("test")}>
              <strong>Run a test</strong>
              <span>Vertical jump and single-leg balance</span>
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
      {screen === "children" && (
        <Children
          onBack={home}
          onOpen={(id) => {
            setProfileId(id);
            setScreen("profile");
          }}
        />
      )}
      {screen === "profile" && (
        <Profile
          childId={profileId}
          onBack={() => setScreen("children")}
          onRunTest={() => setScreen("test")}
        />
      )}
      {screen === "test" && <RunTest onBack={home} />}
    </main>
  );
}