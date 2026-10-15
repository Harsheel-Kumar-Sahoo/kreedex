import { useState } from "react";
import { db } from "../db";
import { useT } from "../lang";

export default function Privacy({ onBack }) {
  const { t } = useT();
  const [done, setDone] = useState(false);

  async function deleteAll() {
    if (!window.confirm(t("pv.deleteConfirm"))) return;
    await db.results.clear();
    await db.children.clear();
    setDone(true);
  }

  return (
    <section className="panel">
      <button className="link" onClick={onBack}>{t("back")}</button>
      <h2>{t("pv.title")}</h2>

      {[1, 2, 3, 4, 5, 6].map((n) => (
        <div key={n} className="pvblock">
          <h3>{t("pv.h" + n)}</h3>
          <p>{t("pv.p" + n)}</p>
        </div>
      ))}

      <button className="btn danger" onClick={deleteAll}>{t("pv.deleteAll")}</button>
      {done && <p className="muted">{t("pv.deleted")}</p>}
    </section>
  );
}