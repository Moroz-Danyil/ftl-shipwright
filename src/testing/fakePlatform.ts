/**
 * A platform for tests: the game archive and the disk are kept in memory,
 * and dialogs answer from queues set up by the test.
 */
import { normalizePath, type FileSource } from "../core";
import type { FileFilter, Platform } from "../platform/types";

export interface FakePlatform extends Platform {
  /** Files on the fake disk, by path with forward slashes. */
  disk: Map<string, Uint8Array>;
  /** Folders created with `makeFolder`. */
  folders: string[];
  /** Answers of the next dialogs, used in order; `null` = cancelled. */
  answers: {
    pickFile: Array<string | null>;
    pickFolder: Array<string | null>;
    pickSavePath: Array<string | null>;
  };
  /** The dialogs asked so far, with their options. */
  asked: Array<{ kind: string; filters?: FileFilter[]; defaultPath?: string }>;
  /** The last zoom the interface asked for. */
  zoom: number;
}

const key = (path: string) => normalizePath(path).toLowerCase();

/**
 * @param games game archives by path: each is the source whose files the
 *   archive holds
 */
export function createFakePlatform(
  games: Record<string, FileSource> = {},
  options: { available?: boolean } = {}
): FakePlatform {
  const disk = new Map<string, Uint8Array>();
  const gameAt = (datPath: string) => {
    const game = games[datPath];
    if (!game) throw `Cannot open ${datPath}`;
    return game;
  };
  const readDisk = async (path: string) => {
    const bytes = disk.get(key(path));
    if (!bytes) throw new Error(`No such file: ${path}`);
    return bytes;
  };
  const platform: FakePlatform = {
    available: options.available ?? true,
    disk,
    folders: [],
    answers: { pickFile: [], pickFolder: [], pickSavePath: [] },
    asked: [],
    zoom: 1,
    dat: {
      async listEntries(datPath) {
        const files = await gameAt(datPath).list();
        return files.map((path) => ({ path, size: 0 }));
      },
      async readEntry(datPath, innerPath) {
        const bytes = await gameAt(datPath).readBytes(innerPath);
        if (!bytes) throw `Inner path not found in archive: ${innerPath}`;
        return bytes;
      },
    },
    folder: {
      async listFiles(root) {
        const prefix = key(root).replace(/\/+$/, "") + "/";
        return [...disk.keys()].filter((p) => p.startsWith(prefix));
      },
      readFile: readDisk,
    },
    readFile: readDisk,
    async writeFile(path, bytes) {
      disk.set(key(path), bytes);
    },
    async makeFolder(path) {
      platform.folders.push(normalizePath(path));
    },
    async pickFile(o) {
      platform.asked.push({ kind: "pickFile", ...o });
      return platform.answers.pickFile.shift() ?? null;
    },
    async pickFolder(o) {
      platform.asked.push({ kind: "pickFolder", ...o });
      return platform.answers.pickFolder.shift() ?? null;
    },
    async pickSavePath(o) {
      platform.asked.push({ kind: "pickSavePath", ...o });
      return platform.answers.pickSavePath.shift() ?? null;
    },
    async setZoom(factor) {
      platform.zoom = factor;
    },
  };
  return platform;
}
