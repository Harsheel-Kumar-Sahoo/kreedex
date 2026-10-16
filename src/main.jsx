import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./registerSW.js";
import App from "./App.jsx";
import LangProvider from "./LangProvider.jsx";
import AuthProvider from "./AuthProvider.jsx";
import SettingsProvider from "./SettingsProvider.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <LangProvider>
      <AuthProvider>
        <SettingsProvider>
          <App />
        </SettingsProvider>
      </AuthProvider>
    </LangProvider>
  </StrictMode>
);