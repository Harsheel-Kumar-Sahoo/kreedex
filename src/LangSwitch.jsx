import { LANGS, useT } from "./lang";

export default function LangSwitch() {
  const { lang, setLang } = useT();
  return (
    <div className="langs noprint" role="group" aria-label="Language">
      {LANGS.map(([code, label]) => (
        <button
          key={code}
          className={"langbtn" + (lang === code ? " on" : "")}
          onClick={() => setLang(code)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}