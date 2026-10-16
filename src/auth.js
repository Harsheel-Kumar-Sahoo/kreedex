import { createContext, useContext } from "react";

// Which screens each role may open.
export const ALLOWED = {
  teacher: ["register", "children", "test", "profile", "settings", "privacy"],
  official: ["dashboard", "profile", "settings", "privacy"],
};

// Set to false before any real pilot, so the demo PINs are no longer shown on the sign-in screen.
export const SHOW_DEMO_PINS = true;

export const DEMO_ACCOUNTS = [
  {
    id: "demo-teacher",
    role: "teacher",
    name: "Demo Teacher",
    school: "Demo Government School",
    district: "Anand",
    pin: "1111",
  },
  {
    id: "demo-official",
    role: "official",
    name: "Demo Sports Official",
    scope: "state",
    pin: "2222",
  },
];

export const DEMO_PINS = Object.fromEntries(DEMO_ACCOUNTS.map((d) => [d.role, d.pin]));

export const AuthContext = createContext({
  ready: false,
  accounts: [],
  account: null,
  role: null,
  notice: "",
  signIn: async () => ({ ok: false }),
  signOut: () => {},
  createAccount: async () => ({ ok: false }),
  resetAccounts: async () => {},
  canSeeChild: () => false,
});

export function useAuth() {
  return useContext(AuthContext);
}

export const normalize = (s) => String(s || "").trim().toLowerCase().replace(/\s+/g, " ");

// Officials see initials instead of full names, for example "Ravi Shah" becomes "R. S."
export function shownName(name, role) {
  if (role !== "official") return name;
  const letters = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => Array.from(w)[0].toUpperCase());
  return letters.length ? letters.join(". ") + "." : "-";
}

export function newSalt() {
  const bytes = new Uint8Array(8);
  if (globalThis.crypto && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// SHA-256 of salt + PIN. Falls back to a weak hash where the browser has no crypto.subtle
// (it needs HTTPS or localhost). Either way this is demonstration-level protection only.
export async function hashPin(pin, salt) {
  const text = salt + ":" + pin;
  if (globalThis.crypto && crypto.subtle) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return "weak-" + (h >>> 0).toString(16);
}