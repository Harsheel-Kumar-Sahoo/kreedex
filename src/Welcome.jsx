import { useLiveQuery } from "dexie-react-hooks";
import { db } from "./db";
import { useT } from "./lang";

export default function Welcome() {
  const { t } = useT();
  const realCount = useLiveQuery(() => db.children.filter((c) => !c.demo).count(), []);

  // undefined while loading, so nothing flashes on screen
  if (realCount !== 0) return null;

  return (
    <div className="welcome">
      <strong>{t("wl.title")}</strong>
      <ol>
        <li>{t("wl.s1")}</li>
        <li>{t("wl.s2")}</li>
        <li>{t("wl.s3")}</li>
      </ol>
      <p className="muted">{t("wl.try")}</p>
    </div>
  );
}