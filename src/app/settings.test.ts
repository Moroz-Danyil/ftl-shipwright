import { describe, expect, it } from "vitest";
import type { KeyValueStore } from "../platform/storage";
import {
  RECENT_LIMIT,
  addRecent,
  loadDatPath,
  loadMod,
  loadRecent,
  saveDatPath,
  saveMod,
  saveRecent,
  type RecentShip,
} from "./settings";

function memoryStore(): KeyValueStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}

const entry = (blueprint: string, time = 1): RecentShip => ({
  name: blueprint,
  blueprint,
  img: blueprint.toLowerCase(),
  origin: { kind: "game" },
  time,
});

describe("settings", () => {
  it("remembers the game archive and the mod", () => {
    const store = memoryStore();
    expect(loadDatPath(store)).toBeUndefined();
    saveDatPath("games/ftl.dat", store);
    saveMod({ kind: "zip", path: "mods/a.ftl" }, store);
    expect(loadDatPath(store)).toBe("games/ftl.dat");
    expect(loadMod(store)).toEqual({ kind: "zip", path: "mods/a.ftl" });
    saveMod(undefined, store);
    expect(loadMod(store)).toBeUndefined();
  });

  it("ignores unreadable values", () => {
    const store = memoryStore();
    store.data.set("shipwright.datPath", "{not json");
    store.data.set("shipwright.mod", JSON.stringify({ kind: "disk", path: "x" }));
    store.data.set("shipwright.recent", JSON.stringify([{ name: 1 }, entry("A")]));
    expect(loadDatPath(store)).toBeUndefined();
    expect(loadMod(store)).toBeUndefined();
    expect(loadRecent(store)).toEqual([entry("A")]);
  });

  it("survives a storage that refuses writes", () => {
    const store: KeyValueStore = {
      getItem: () => null,
      setItem: () => {
        throw new Error("full");
      },
      removeItem: () => {},
    };
    expect(() => saveDatPath("x", store)).not.toThrow();
  });

  it("keeps recent ships newest first, once each, up to the limit", () => {
    let list: RecentShip[] = [];
    for (let i = 0; i < RECENT_LIMIT + 2; i++) list = addRecent(list, entry(`S${i}`, i));
    expect(list).toHaveLength(RECENT_LIMIT);
    expect(list[0].blueprint).toBe(`S${RECENT_LIMIT + 1}`);
    list = addRecent(list, entry("S5", 99));
    expect(list[0]).toEqual(entry("S5", 99));
    expect(list.filter((r) => r.blueprint === "S5")).toHaveLength(1);
    const elsewhere = { ...entry("S5"), origin: { kind: "modFile" as const, path: "a.ftl" } };
    expect(addRecent(list, elsewhere).filter((r) => r.blueprint === "S5")).toHaveLength(2);
    const store = memoryStore();
    saveRecent(list, store);
    expect(loadRecent(store)).toEqual(list);
  });
});
