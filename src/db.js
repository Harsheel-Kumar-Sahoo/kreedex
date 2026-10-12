import Dexie from "dexie";

export const db = new Dexie("kreedex");

db.version(1).stores({
  children: "id, name, district, createdAt",
});

export function newChildId() {
  return "KDX-" + Math.random().toString(36).slice(2, 7).toUpperCase();
}