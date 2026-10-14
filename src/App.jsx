import { useState } from "react";
import Register from "./screens/Register";
import Children from "./screens/Children";
import RunTest from "./screens/RunTest";
import Profile from "./screens/Profile";
import Dashboard from "./screens/Dashboard";

export default function App() {
  const [screen, setScreen] = useState("home");
  const [profileId, setProfileId] = useState(null);
  const [profileFrom, setProfileFrom] = useState("children");
  const home = () => setScreen("home");

  const openProfile = (from) => (id) => {
    setProfileId(id);
    setProfileFrom(from);
    setScreen("profile");
  };

  return (
    <main className={"app" + (screen === "dashboard" ? " wide" : "")}>
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
            <button className="card" onClick={() => setScreen("dashboard")}>
              <strong>Scout dashboard</strong>
              <span>Coverage, filters and shortlist</span>
            </button>
          </section>

          <footer className="foot">
            Prototype · PS000014 · Seva First Innovation Challenge 2026
          </footer>
        </>
      )}

      {screen === "register" && <Register onBack={home} />}
      {screen === "children" && <Children onBack={home} onOpen={openProfile("children")} />}
      {screen === "dashboard" && <Dashboard onBack={home} onOpen={openProfile("dashboard")} />}
      {screen === "profile" && (
        <Profile
          childId={profileId}
          onBack={() => setScreen(profileFrom)}
          onRunTest={() => setScreen("test")}
        />
      )}
      {screen === "test" && <RunTest onBack={home} />}
    </main>
  );
}