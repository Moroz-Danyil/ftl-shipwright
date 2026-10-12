/**
 * What the app needs from the computer it runs on: the game archive, files
 * and folders, and the system's dialogs. The desktop app provides these
 * through Tauri; tests use fakes.
 */
import type { DatAccess, FolderAccess } from "../core";

/** A file filter of an open or save dialog. */
export interface FileFilter {
  name: string;
  extensions: string[];
}

export interface Platform {
  /** False when the interface runs outside the desktop app (a plain browser). */
  readonly available: boolean;
  /** The game archive `ftl.dat`. */
  readonly dat: DatAccess;
  /** Folders on disk (listing every file below a folder, reading one file). */
  readonly folder: FolderAccess;
  readFile(path: string): Promise<Uint8Array>;
  writeFile(path: string, bytes: Uint8Array): Promise<void>;
  /** Creates a folder and every missing folder above it. */
  makeFolder(path: string): Promise<void>;
  /** Asks for an existing file; `null` when cancelled. */
  pickFile(options: { filters: FileFilter[]; defaultPath?: string }): Promise<string | null>;
  /** Asks for an existing folder; `null` when cancelled. */
  pickFolder(options?: { defaultPath?: string }): Promise<string | null>;
  /** Asks where to save a file; `null` when cancelled. */
  pickSavePath(options: { filters: FileFilter[]; defaultPath?: string }): Promise<string | null>;
  /** Asks a yes/no question. */
  confirm(message: string): Promise<boolean>;
}

/** A mod chosen in the game data card: a folder or a `.ftl` / `.zip` file. */
export interface ModRef {
  kind: "folder" | "zip";
  path: string;
}
