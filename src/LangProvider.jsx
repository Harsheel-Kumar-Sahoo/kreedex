import { useEffect, useState } from "react";
import { LangContext } from "./lang";
import { STRINGS } from "./strings";

const KEY = "kreedex-lang";

function initialLang() {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved && STRINGS[saved]) return saved;
  } catch {
    /* storage not available */
  }
  return "en";
}

export default function LangProvider({ children }) {
  const [lang, setLang] = useState(initialLang);

  useEffect(() => {
    document.documentElement.lang = lang;
    try {
      localStorage.setItem(KEY, lang);
    } catch {
      /* ignore */
    }
  }, [lang]);

  // Looks up a key, falls back to English, then replaces {placeholders}.
  function t(key, vars) {
    let s = STRINGS[lang]?.[key] ?? STRINGS.en[key] ?? key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        s = s.split("{" + k + "}").join(String(v));
      }
    }
    return s;
  }

  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LangContext.Provider>
  );
}