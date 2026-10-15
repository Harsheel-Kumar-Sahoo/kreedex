import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./registerSW.js";
import App from "./App.jsx";
import LangProvider from "./LangProvider.jsx";
import SettingsProvider from "./SettingsProvider.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <LangProvider>
      <SettingsProvider>
        <App />
      </SettingsProvider>
    </LangProvider>
  </StrictMode>
);