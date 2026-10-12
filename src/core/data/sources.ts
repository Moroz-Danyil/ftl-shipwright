/**
 * Read-only trees of files: the base game, a mod folder, a mod zip, files in
 * memory. Platform access (file system, the game archive) is injected, so
 * this module runs in a browser as well as in Node.
 *
 * Paths use forward slashes and are matched case-insensitively (the game
 * runs on Windows).
 */
import { unzipSync } from "fflate";

/** A read-only tree of files. */
export interface FileSource {
  /** Every file path in the source, relative to its root, with forward slashes and the source's own case. */
  list(): Promise<string[]>;
  /** True if the file exists (case-insensitive). */
  has(path: string): Promise<boolean>;
  /** The file's bytes, or `undefined` when it does not exist. */
  readBytes(path: string): Promise<Uint8Array | undefined>;
  /** The file decoded as UTF-8 (a BOM is removed), or `undefined` when it does not exist. */
  readText(path: string): Promise<string | undefined>;
}

/** Converts backslashes to slashes and removes `./`, leading slashes and doubled slashes. */
export function normalizePath(path: string): string {
  return path
    .replace(/\\/g, "/")
    .replace(/\/{2,}/g, "/")
    .replace(/^(\.\/)+/, "")
    .replace(/^\/+/, "");
}

/** The key used to compare paths: normalized and lower-cased. */
export function pathKey(path: string): string {
  return normalizePath(path).toLowerCase();
}

const utf8 = new TextDecoder("utf-8");
const encoder = new TextEncoder();

/** Decodes UTF-8 bytes; a leading BOM is removed. */
export function decodeText(bytes: Uint8Array): string {
  return utf8.decode(bytes);
}

/** Encodes text as UTF-8 (no BOM). */
export function encodeText(text: string): Uint8Array {
  return encoder.encode(text);
}

/**
 * Builds a {@link FileSource} from a function listing the files and a
 * function reading one file by its listed path. The listing is fetched once,
 * on first use. If two listed paths differ only in case, the later one wins.
 */
export function createFileSource(
  listFiles: () => Promise<string[]>,
  readListed: (listedPath: string) => Promise<Uint8Array>
): FileSource {
  let index: Promise<Map<string, string>> | undefined;
  const getIndex = () => {
    index ??= listFiles().then((paths) => {
      const map = new Map<string, string>();
      for (const p of paths) {
        const normalized = normalizePath(p);
        if (normalized === "" || normalized.endsWith("/")) continue;
        map.set(normalized.toLowerCase(), normalized);
      }
      return map;
    });
    return index;
  };
  const source: FileSource = {
    async list() {
      return [...(await getIndex()).values()];
    },
    async has(path) {
      return (await getIndex()).has(pathKey(path));
    },
    async readBytes(path) {
      const actual = (await getIndex()).get(pathKey(path));
      return actual === undefined ? undefined : readListed(actual);
    },
    async readText(path) {
      const bytes = await source.readBytes(path);
      return bytes === undefined ? undefined : decodeText(bytes);
    },
  };
  return source;
}

/** Files held in memory. String contents are stored as UTF-8. */
export function memorySource(
  files: Record<string, Uint8Array | string> | Iterable<readonly [string, Uint8Array | string]>
): FileSource {
  const entries: Array<readonly [string, Uint8Array | string]> =
    Symbol.iterator in Object(files)
      ? [...(files as Iterable<readonly [string, Uint8Array | string]>)]
      : Object.entries(files);
  const map = new Map<string, Uint8Array>();
  for (const [path, content] of entries)
    map.set(normalizePath(path), typeof content === "string" ? encodeText(content) : content);
  return createFileSource(
    async () => [...map.keys()],
    async (p) => map.get(p)!
  );
}

const GAME_TOP_FOLDERS = new Set(["data", "img", "audio", "fonts"]);

/**
 * The files of a zip (`.ftl` / `.zip` mod). Directory entries are skipped.
 * If no entry sits under `data/`, `img/`, `audio/` or `fonts/` but all
 * entries share one top folder, that wrapping folder is removed.
 */
export function zipSource(bytes: Uint8Array): FileSource {
  const unzipped = unzipSync(bytes);
  let paths = Object.keys(unzipped).filter((p) => !p.endsWith("/"));
  let prefix = "";
  const tops = new Set(paths.map((p) => normalizePath(p).split("/")[0].toLowerCase()));
  const hasGameFolder = [...tops].some((t) => GAME_TOP_FOLDERS.has(t));
  if (!hasGameFolder && tops.size === 1 && paths.every((p) => normalizePath(p).includes("/"))) {
    prefix = normalizePath(paths[0]).split("/")[0] + "/";
  }
  const map = new Map<string, Uint8Array>();
  for (const p of paths) map.set(normalizePath(p).slice(prefix.length), unzipped[p]);
  paths = [...map.keys()];
  return createFileSource(
    async () => paths,
    async (p) => map.get(p)!
  );
}

/** Platform functions for {@link folderSource} (e.g. Tauri's file API). */
export interface FolderAccess {
  /** Every file under `root`, as paths relative to `root` or as full paths starting with `root`; either slash works. */
  listFiles(root: string): Promise<string[]>;
  /** Bytes of the file at a full path: `root` + `/` + relative path, with forward slashes (see {@link joinFolderPath}). */
  readFile(path: string): Promise<Uint8Array>;
}

/** A folder on disk (a mod folder, or an unpacked game). */
export function folderSource(root: string, access: FolderAccess): FileSource {
  const base = normalizePath(root).replace(/\/+$/, "");
  const rootKey = base.toLowerCase() + "/";
  return createFileSource(
    async () =>
      (await access.listFiles(root)).map((p) => {
        const n = normalizePath(p);
        return n.toLowerCase().startsWith(rootKey) ? n.slice(rootKey.length) : n;
      }),
    (relative) => access.readFile(joinFolderPath(root, relative))
  );
}

/** Platform functions for {@link datSource}, matching the app's commands for the game archive. */
export interface DatAccess {
  listEntries(datPath: string): Promise<Array<{ path: string; size: number }>>;
  readEntry(datPath: string, innerPath: string): Promise<Uint8Array>;
}

/** The game archive `ftl.dat` (read through injected functions). */
export function datSource(datPath: string, access: DatAccess): FileSource {
  return createFileSource(
    async () => (await access.listEntries(datPath)).map((e) => e.path),
    (inner) => access.readEntry(datPath, inner)
  );
}

/**
 * `root` + `/` + `relative`, with forward slashes. A leading `/` or `//`
 * (UNC) of the root is kept; trailing slashes of the root are removed.
 */
export function joinFolderPath(root: string, relative: string): string {
  const r = root.replace(/\\/g, "/");
  const lead = /^\/\//.test(r) ? "//" : r.startsWith("/") ? "/" : "";
  const body = r
    .slice(lead.length)
    .replace(/\/{2,}/g, "/")
    .replace(/\/+$/, "");
  return `${lead}${body}/${normalizePath(relative)}`;
}
