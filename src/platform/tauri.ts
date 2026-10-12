/**
 * The platform of the desktop app, through Tauri: the app's own commands for
 * the game archive, the file system plugin and the dialog plugin.
 */
import { invoke, isTauri } from "@tauri-apps/api/core";
import { ask, open, save } from "@tauri-apps/plugin-dialog";
import { mkdir, readDir, readFile, writeFile } from "@tauri-apps/plugin-fs";
import type { DatAccess, FolderAccess } from "../core";
import type { Platform } from "./types";

/** Bytes returned by a command: a JSON number array, or raw bytes. */
export function toBytes(value: unknown): Uint8Array {
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (Array.isArray(value)) return Uint8Array.from(value as number[]);
  throw new Error("Unexpected data from the app");
}

export const tauriDatAccess: DatAccess = {
  async listEntries(datPath) {
    return invoke<Array<{ path: string; size: number }>>("pkg_list_entries", { datPath });
  },
  async readEntry(datPath, innerPath) {
    return toBytes(await invoke("pkg_read_entry", { datPath, innerPath }));
  },
};

/** Lists every file below `root` as paths relative to it, walking sub-folders. */
export async function listFolder(
  root: string,
  read: (path: string) => Promise<Array<{ name: string; isDirectory: boolean }>>
): Promise<string[]> {
  const out: string[] = [];
  const base = root.replace(/[\\/]+$/, "");
  const walk = async (relative: string) => {
    const entries = await read(relative === "" ? base : `${base}/${relative}`);
    for (const entry of entries) {
      const path = relative === "" ? entry.name : `${relative}/${entry.name}`;
      if (entry.isDirectory) await walk(path);
      else out.push(path);
    }
  };
  await walk("");
  return out;
}

export const tauriFolderAccess: FolderAccess = {
  listFiles: (root) => listFolder(root, (path) => readDir(path)),
  readFile: (path) => readFile(path),
};

export function createTauriPlatform(): Platform {
  return {
    available: isTauri(),
    dat: tauriDatAccess,
    folder: tauriFolderAccess,
    readFile: (path) => readFile(path),
    writeFile: (path, bytes) => writeFile(path, bytes),
    makeFolder: (path) => mkdir(path, { recursive: true }),
    async pickFile({ filters, defaultPath }) {
      const picked = await open({ multiple: false, directory: false, filters, defaultPath });
      return typeof picked === "string" ? picked : null;
    },
    async pickFolder(options) {
      const picked = await open({
        multiple: false,
        directory: true,
        defaultPath: options?.defaultPath,
      });
      return typeof picked === "string" ? picked : null;
    },
    pickSavePath: ({ filters, defaultPath }) => save({ filters, defaultPath }),
    confirm: (message) => ask(message, { kind: "warning" }),
  };
}
