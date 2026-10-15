import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./registerSW.js";
import App from "./App.jsx";
import LangProvider from "./LangProvider.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <LangProvider>
      <App />
    </LangProvider>
  </StrictMode>
);