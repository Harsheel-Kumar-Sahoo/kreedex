import { useState } from "react";
import Register from "./screens/Register";
import Children from "./screens/Children";
import RunTest from "./screens/RunTest";
import Profile from "./screens/Profile";
import Dashboard from "./screens/Dashboard";
import Privacy from "./screens/Privacy";
import Settings from "./screens/Settings";
import Login from "./screens/Login";
import LangSwitch from "./LangSwitch";
import AccountBar from "./AccountBar";
import OfflineBox from "./OfflineBox";
import Welcome from "./Welcome";
import { useT } from "./lang";
import { useAuth, ALLOWED } from "./auth";

// Everything after sign-in. It is re-created for each account, so the screen resets on sign-in and sign-out.
function Shell({ account }) {
  const { t } = useT();
  const [screen, setScreen] = useState("home");
  const [profileId, setProfileId] = useState(null);
  const [profileFrom, setProfileFrom] = useState("children");
  const role = account.role;

  const go = (s) => {
    if (s === "home" || ALLOWED[role].includes(s)) setScreen(s);
  };
  const home = () => setScreen("home");

  const openProfile = (from) => (id) => {
    setProfileId(id);
    setProfileFrom(from);
    go("profile");
  };

  const header = (
    <header className="hero">
      <div className="logo">K</div>
      <h1>Kreedex</h1>
      <p className="tagline">{t("home.tagline")}</p>
    </header>
  );

  const footer = (
    <footer className="foot">
      <button className="link footlink" onClick={() => go("privacy")}>
        {t("home.privacy")}
      </button>
      <div>{t("home.footer")}</div>
    </footer>
  );

  const settingsCard = (
    <button className="card" onClick={() => go("settings")}>
      <strong>{t("home.settings")}</strong>
      <span>{t("home.settingsSub")}</span>
    </button>
  );

  return (
    <main className={"app" + (screen === "dashboard" ? " wide" : "")}>
      <LangSwitch />
      <AccountBar />

      {screen === "home" && role === "teacher" && (
        <>
          {header}
          <Welcome />
          <section className="cards">
            <button className="card" onClick={() => go("register")}>
              <strong>{t("home.register")}</strong>
              <span>{t("home.registerSub")}</span>
            </button>
            <button className="card" onClick={() => go("children")}>
              <strong>{t("home.children")}</strong>
              <span>{t("home.childrenSub")}</span>
            </button>
            <button className="card" onClick={() => go("test")}>
              <strong>{t("home.test")}</strong>
              <span>{t("home.testSub")}</span>
            </button>
            {settingsCard}
          </section>
          <OfflineBox />
          {footer}
        </>
      )}

      {screen === "home" && role === "official" && (
        <>
          {header}
          <p className="note">{t("auth.official.home")}</p>
          <section className="cards">
            <button className="card" onClick={() => go("dashboard")}>
              <strong>{t("home.dashboard")}</strong>
              <span>{t("home.dashboardSub")}</span>
            </button>
            {settingsCard}
          </section>
          <OfflineBox />
          {footer}
        </>
      )}

      {screen === "register" && <Register onBack={home} />}
      {screen === "children" && <Children onBack={home} onOpen={openProfile("children")} />}
      {screen === "dashboard" && <Dashboard onBack={home} onOpen={openProfile("dashboard")} />}
      {screen === "privacy" && <Privacy onBack={home} />}
      {screen === "settings" && <Settings onBack={home} />}
      {screen === "profile" && (
        <Profile
          childId={profileId}
          onBack={() => setScreen(profileFrom)}
          onRunTest={() => go("test")}
        />
      )}
      {screen === "test" && <RunTest onBack={home} />}
    </main>
  );
}

export default function App() {
  const { t } = useT();
  const { ready, account } = useAuth();

  if (!ready) {
    return (
      <main className="app">
        <p className="muted">{t("loading")}</p>
      </main>
    );
  }

  if (!account) {
    return (
      <main className="app">
        <LangSwitch />
        <Login />
      </main>
    );
  }

  return <Shell key={account.id} account={account} />;
}