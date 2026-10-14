import { useState } from "react";
import Register from "./screens/Register";
import Children from "./screens/Children";
import RunTest from "./screens/RunTest";
import Profile from "./screens/Profile";
import Dashboard from "./screens/Dashboard";
import LangSwitch from "./LangSwitch";
import { useT } from "./lang";

export default function App() {
  const { t } = useT();
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
      <LangSwitch />

      {screen === "home" && (
        <>
          <header className="hero">
            <div className="logo">K</div>
            <h1>Kreedex</h1>
            <p className="tagline">{t("home.tagline")}</p>
          </header>

          <section className="cards">
            <button className="card" onClick={() => setScreen("register")}>
              <strong>{t("home.register")}</strong>
              <span>{t("home.registerSub")}</span>
            </button>
            <button className="card" onClick={() => setScreen("children")}>
              <strong>{t("home.children")}</strong>
              <span>{t("home.childrenSub")}</span>
            </button>
            <button className="card" onClick={() => setScreen("test")}>
              <strong>{t("home.test")}</strong>
              <span>{t("home.testSub")}</span>
            </button>
            <button className="card" onClick={() => setScreen("dashboard")}>
              <strong>{t("home.dashboard")}</strong>
              <span>{t("home.dashboardSub")}</span>
            </button>
          </section>

          <footer className="foot">{t("home.footer")}</footer>
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