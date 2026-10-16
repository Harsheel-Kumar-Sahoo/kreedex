import { useCallback, useEffect, useRef, useState } from "react";
import { AuthContext, hashPin, newSalt, normalize, DEMO_ACCOUNTS } from "./auth";

const ACC_KEY = "kreedex-accounts";
const SESSION_KEY = "kreedex-session";
const IDLE_MS = 15 * 60 * 1000; // sign out after 15 minutes without a tap or key press
const MAX_TRIES = 5;
const LOCK_MS = 30 * 1000;

function readAccounts() {
  try {
    const raw = localStorage.getItem(ACC_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function writeAccounts(list) {
  try {
    localStorage.setItem(ACC_KEY, JSON.stringify(list));
  } catch {
    /* storage not available */
  }
}

function readSession() {
  try {
    return sessionStorage.getItem(SESSION_KEY) || null;
  } catch {
    return null;
  }
}

function writeSession(id) {
  try {
    if (id) sessionStorage.setItem(SESSION_KEY, id);
    else sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}

async function makeAccount(fields, pin) {
  const salt = newSalt();
  const hash = await hashPin(pin, salt);
  return { ...fields, salt, hash, createdAt: Date.now() };
}

async function seedDemo() {
  const out = [];
  for (const d of DEMO_ACCOUNTS) {
    const { pin, ...fields } = d;
    out.push(await makeAccount({ ...fields, demo: true }, pin));
  }
  return out;
}

export default function AuthProvider({ children }) {
  const [accounts, setAccounts] = useState(null); // null while loading
  const [sessionId, setSessionId] = useState(readSession);
  const [notice, setNotice] = useState("");
  const lastActive = useRef(Date.now());
  const tries = useRef({});

  useEffect(() => {
    let alive = true;
    (async () => {
      let list = readAccounts();
      if (list.length === 0) {
        list = await seedDemo();
        writeAccounts(list);
      }
      if (alive) setAccounts(list);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const account =
    accounts && sessionId ? accounts.find((a) => a.id === sessionId) || null : null;

  const signOut = useCallback((why) => {
    writeSession(null);
    setSessionId(null);
    setNotice(why || "");
  }, []);

  // Sign out after a period of inactivity.
  useEffect(() => {
    if (!account) return undefined;
    lastActive.current = Date.now();
    const bump = () => {
      lastActive.current = Date.now();
    };
    const events = ["pointerdown", "keydown", "touchstart"];
    events.forEach((e) => window.addEventListener(e, bump, { passive: true }));
    const timer = setInterval(() => {
      if (Date.now() - lastActive.current > IDLE_MS) signOut("auth.idle");
    }, 15000);
    return () => {
      events.forEach((e) => window.removeEventListener(e, bump));
      clearInterval(timer);
    };
  }, [account, signOut]);

  async function signIn(id, pin) {
    const acc = (accounts || []).find((a) => a.id === id);
    if (!acc) return { ok: false, reason: "auth.e.pick" };

    const now = Date.now();
    const st = tries.current[id] || { count: 0, until: 0 };
    if (st.until > now) {
      return { ok: false, reason: "auth.e.locked", wait: Math.ceil((st.until - now) / 1000) };
    }

    const h = await hashPin(pin, acc.salt);
    if (h !== acc.hash) {
      st.count += 1;
      if (st.count >= MAX_TRIES) {
        st.count = 0;
        st.until = Date.now() + LOCK_MS;
      }
      tries.current[id] = st;
      return { ok: false, reason: "auth.e.wrong" };
    }

    tries.current[id] = { count: 0, until: 0 };
    lastActive.current = Date.now();
    writeSession(id);
    setNotice("");
    setSessionId(id);
    return { ok: true };
  }

  async function createAccount({ role, name, pin, school, district, scope }) {
    const nm = (name || "").trim();
    if (!nm) return { ok: false, reason: "auth.e.name" };
    if (!/^\d{4}$/.test(pin || "")) return { ok: false, reason: "auth.e.pin" };
    if (role === "teacher") {
      if (!(school || "").trim()) return { ok: false, reason: "auth.e.school" };
      if (!(district || "").trim()) return { ok: false, reason: "auth.e.district" };
    }

    const id = "acc-" + newSalt().slice(0, 8);
    const fields =
      role === "teacher"
        ? { id, role, name: nm, school: school.trim(), district: district.trim() }
        : { id, role, name: nm, scope: scope || "state" };

    const acc = await makeAccount(fields, pin);
    const list = [...(accounts || []), acc];
    writeAccounts(list);
    setAccounts(list);
    lastActive.current = Date.now();
    writeSession(id);
    setNotice("");
    setSessionId(id);
    return { ok: true };
  }

  async function resetAccounts() {
    const list = await seedDemo();
    writeAccounts(list);
    setAccounts(list);
    writeSession(null);
    setSessionId(null);
    setNotice("");
  }

  // Which children this account may see.
  const canSeeChild = (c) => {
    if (!account || !c) return false;
    if (account.role === "teacher") {
      return !c.demo && normalize(c.school) === normalize(account.school);
    }
    if (account.role === "official") {
      return account.scope === "state" || c.district === account.scope;
    }
    return false;
  };

  return (
    <AuthContext.Provider
      value={{
        ready: accounts !== null,
        accounts: accounts || [],
        account,
        role: account ? account.role : null,
        notice,
        signIn,
        signOut: () => signOut(""),
        createAccount,
        resetAccounts,
        canSeeChild,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}