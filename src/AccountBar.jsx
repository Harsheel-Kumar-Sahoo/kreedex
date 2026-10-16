import { useT } from "./lang";
import { useAuth } from "./auth";

export default function AccountBar() {
  const { t } = useT();
  const { account, signOut } = useAuth();
  if (!account) return null;

  const where =
    account.role === "teacher"
      ? account.school
      : account.scope === "state"
      ? t("auth.scope.state")
      : account.scope;

  return (
    <div className="acctbar noprint">
      <span className="rolebadge">{t("role." + account.role)}</span>
      <span className="acctname">{account.name} · {where}</span>
      <button className="link" onClick={() => signOut()}>{t("auth.signOut")}</button>
    </div>
  );
}