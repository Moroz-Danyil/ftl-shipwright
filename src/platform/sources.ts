/**
 * Turns the platform's file access into the core's file sources.
 */
import { datSource, folderSource, zipSource, type FileSource } from "../core";
import type { ModRef, Platform } from "./types";

/** The game archive `ftl.dat` at this path. */
export function gameArchiveSource(platform: Platform, datPath: string): FileSource {
  return datSource(datPath, platform.dat);
}

/** A folder on disk. */
export function diskFolderSource(platform: Platform, path: string): FileSource {
  return folderSource(path, platform.folder);
}

/** A mod: a folder, or a `.ftl` / `.zip` file read whole. */
export async function modSource(platform: Platform, mod: ModRef): Promise<FileSource> {
  if (mod.kind === "folder") return diskFolderSource(platform, mod.path);
  return zipSource(await platform.readFile(mod.path));
}

/** The last part of a path, whichever slash it uses. */
export function baseName(path: string): string {
  const parts = path.split(/[\\/]+/).filter((p) => p !== "");
  return parts[parts.length - 1] ?? path;
}

/** The folder part of a path (without the trailing slash), or "" when there is none. */
export function folderOf(path: string): string {
  const i = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
  return i <= 0 ? "" : path.slice(0, i);
}
