import { createContext, useContext } from "react";

export const LANGS = [
  ["en", "English"],
  ["gu", "ગુજરાતી"],
  ["hi", "हिन्दी"],
];

export const LangContext = createContext({
  lang: "en",
  setLang: () => {},
  t: (key) => key,
});

export function useT() {
  return useContext(LangContext);
}