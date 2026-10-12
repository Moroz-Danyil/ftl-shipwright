import { zipSync } from "fflate";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { encodeText, memorySource } from "../core";
import { createFakePlatform } from "../testing/fakePlatform";
import { baseName, folderOf, gameArchiveSource, modSource } from "./sources";

const invoke = vi.hoisted(() => vi.fn());
const readDir = vi.hoisted(() => vi.fn());
vi.mock("@tauri-apps/api/core", () => ({ invoke, isTauri: () => false }));
vi.mock("@tauri-apps/plugin-fs", () => ({
  readDir,
  readFile: vi.fn(),
  writeFile: vi.fn(),
  mkdir: vi.fn(),
}));
vi.mock("@tauri-apps/plugin-dialog", () => ({ open: vi.fn(), save: vi.fn(), ask: vi.fn() }));

const tauri = await import("./tauri");

describe("Tauri adapters", () => {
  beforeEach(() => {
    invoke.mockReset();
    readDir.mockReset();
  });

  it("calls the archive commands with their argument names", async () => {
    invoke.mockResolvedValueOnce([{ path: "data/a.xml", size: 3 }]);
    expect(await tauri.tauriDatAccess.listEntries("game/ftl.dat")).toEqual([
      { path: "data/a.xml", size: 3 },
    ]);
    expect(invoke).toHaveBeenLastCalledWith("pkg_list_entries", { datPath: "game/ftl.dat" });

    invoke.mockResolvedValueOnce([104, 105]);
    expect(await tauri.tauriDatAccess.readEntry("game/ftl.dat", "data/a.xml")).toEqual(
      new Uint8Array([104, 105])
    );
    expect(invoke).toHaveBeenLastCalledWith("pkg_read_entry", {
      datPath: "game/ftl.dat",
      innerPath: "data/a.xml",
    });
  });

  it("turns command results into bytes", () => {
    expect(tauri.toBytes([1, 2])).toEqual(new Uint8Array([1, 2]));
    expect(tauri.toBytes(new Uint8Array([3]).buffer)).toEqual(new Uint8Array([3]));
    expect(() => tauri.toBytes("x")).toThrow();
  });

  it("lists a folder by walking its sub-folders", async () => {
    const tree: Record<string, Array<{ name: string; isDirectory: boolean }>> = {
      "mods/x": [
        { name: "data", isDirectory: true },
        { name: "readme.txt", isDirectory: false },
      ],
      "mods/x/data": [{ name: "a.xml.append", isDirectory: false }],
    };
    readDir.mockImplementation(async (path: string) => tree[path] ?? []);
    expect(await tauri.tauriFolderAccess.listFiles("mods/x/")).toEqual([
      "data/a.xml.append",
      "readme.txt",
    ]);
  });

  it("knows it runs outside the desktop app", () => {
    expect(tauri.createTauriPlatform().available).toBe(false);
  });
});

describe("file sources", () => {
  it("reads the game archive through the platform", async () => {
    const platform = createFakePlatform({
      "game/ftl.dat": memorySource({ "data/a.xml": "<a/>" }),
    });
    const source = gameArchiveSource(platform, "game/ftl.dat");
    expect(await source.readText("DATA/A.XML")).toBe("<a/>");
  });

  it("reads mods from folders and zip files", async () => {
    const platform = createFakePlatform();
    await platform.writeFile("mods/folder/data/x.txt", encodeText("folder"));
    await platform.writeFile("mods/a.ftl", zipSync({ "data/x.txt": encodeText("zip") }));
    const folder = await modSource(platform, { kind: "folder", path: "mods/folder" });
    const zip = await modSource(platform, { kind: "zip", path: "mods/a.ftl" });
    expect(await folder.readText("data/x.txt")).toBe("folder");
    expect(await zip.readText("data/x.txt")).toBe("zip");
  });

  it("splits paths with either slash", () => {
    expect(baseName("C:\\Games\\FTL\\ftl.dat")).toBe("ftl.dat");
    expect(baseName("mods/mine/")).toBe("mine");
    expect(folderOf("mods/mine/data/a.txt")).toBe("mods/mine/data");
    expect(folderOf("a.txt")).toBe("");
  });
});
