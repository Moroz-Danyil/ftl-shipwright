/**
 * The game as it looks with one mod applied, following Slipstream's rules:
 *
 * | Mod file                                   | Effect on the game file      |
 * | ------------------------------------------ | ---------------------------- |
 * | `X.xml.append` / `X.append.xml`            | added to the end of `X.xml`  |
 * | `X.xml.rawappend` / `X.rawappend.xml`      | same, as raw text            |
 * | `X.xml.rawclobber` / `X.rawclobber.xml`    | replaces `X.xml`             |
 * | anything else                              | replaces or adds the file    |
 */
import { decodeText, encodeText, normalizePath, pathKey, type FileSource } from "./sources";

/** How one layer of a file came about. */
export type LayerKind = "base" | "replace" | "rawclobber" | "append" | "rawappend";

/** One part of a file in the modded game, in the order the parts are joined. */
export interface FileLayer {
  kind: LayerKind;
  /** True when this layer comes from the mod. */
  fromMod: boolean;
  /** Path of the layer's own file inside its source. */
  sourcePath: string;
  bytes: Uint8Array;
}

/** Read access to the game with a mod applied. Paths are case-insensitive. */
export interface GameView extends FileSource {
  readonly base: FileSource;
  readonly mod?: FileSource;
  /**
   * The parts that make up a file: the base (or the mod's replacement), then
   * the appends. `undefined` when the file does not exist. Readers of XML
   * should parse each layer on its own (an appended text is a fragment).
   */
  readLayers(path: string): Promise<FileLayer[] | undefined>;
  /** True when the mod replaces, adds or appends to this file. */
  isFromMod(path: string): Promise<boolean>;
}

interface ModTarget {
  /** Path of the target file, in the mod's spelling. */
  path: string;
  replace?: string;
  clobber?: string;
  appends: Array<{ path: string; raw: boolean }>;
}

const SPECIAL = /^(.*)\.(xml\.(append|rawappend|rawclobber)|(append|rawappend|rawclobber)\.xml)$/i;

/** What a mod file does: `{ target, kind }` (`kind` = 'replace' for an ordinary file). */
export function classifyModPath(path: string): {
  target: string;
  kind: "replace" | "append" | "rawappend" | "rawclobber";
} {
  const p = normalizePath(path);
  const m = SPECIAL.exec(p);
  if (!m) return { target: p, kind: "replace" };
  const kind = (m[3] ?? m[4]).toLowerCase() as "append" | "rawappend" | "rawclobber";
  return { target: `${m[1]}.xml`, kind };
}

/**
 * Creates the layered view of `base` with `mod` applied (or just `base`).
 *
 * - The mod's ordinary file replaces the base file; a `rawclobber` replaces
 *   both. Appends are added afterwards, sorted by their path.
 * - An append whose target exists nowhere becomes the whole file.
 * - When text is joined, a line break is put between parts that need one.
 */
export function createGameView(base: FileSource, mod?: FileSource): GameView {
  let targets: Promise<Map<string, ModTarget>> | undefined;
  const getTargets = () => {
    targets ??= (async () => {
      const map = new Map<string, ModTarget>();
      for (const p of mod ? await mod.list() : []) {
        const { target, kind } = classifyModPath(p);
        const key = target.toLowerCase();
        let t = map.get(key);
        if (!t) {
          t = { path: target, appends: [] };
          map.set(key, t);
        }
        if (kind === "replace") t.replace = p;
        else if (kind === "rawclobber") t.clobber = p;
        else t.appends.push({ path: p, raw: kind === "rawappend" });
      }
      for (const t of map.values())
        t.appends.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
      return map;
    })();
    return targets;
  };

  const readLayers = async (path: string): Promise<FileLayer[] | undefined> => {
    const t = (await getTargets()).get(pathKey(path));
    const layers: FileLayer[] = [];
    if (t?.clobber)
      layers.push({
        kind: "rawclobber",
        fromMod: true,
        sourcePath: t.clobber,
        bytes: (await mod!.readBytes(t.clobber))!,
      });
    else if (t?.replace)
      layers.push({
        kind: "replace",
        fromMod: true,
        sourcePath: t.replace,
        bytes: (await mod!.readBytes(t.replace))!,
      });
    else {
      const bytes = await base.readBytes(path);
      if (bytes)
        layers.push({ kind: "base", fromMod: false, sourcePath: normalizePath(path), bytes });
    }
    for (const a of t?.appends ?? []) {
      layers.push({
        kind: a.raw ? "rawappend" : "append",
        fromMod: true,
        sourcePath: a.path,
        bytes: (await mod!.readBytes(a.path))!,
      });
    }
    return layers.length > 0 ? layers : undefined;
  };

  const view: GameView = {
    base,
    mod,
    async list() {
      const out = await base.list();
      const seen = new Set(out.map((p) => p.toLowerCase()));
      for (const [key, t] of await getTargets()) {
        if (!seen.has(key)) {
          seen.add(key);
          out.push(t.path);
        }
      }
      return out;
    },
    async has(path) {
      return (await getTargets()).has(pathKey(path)) || (await base.has(path));
    },
    readLayers,
    async readBytes(path) {
      const layers = await readLayers(path);
      if (!layers) return undefined;
      if (layers.length === 1) return layers[0].bytes;
      return encodeText(joinLayerTexts(layers));
    },
    async readText(path) {
      const layers = await readLayers(path);
      return layers && joinLayerTexts(layers);
    },
    async isFromMod(path) {
      return (await getTargets()).has(pathKey(path));
    },
  };
  return view;
}

/** Joins layers as text, with a line break between parts when the previous one does not end with one. */
export function joinLayerTexts(layers: FileLayer[]): string {
  let text = "";
  for (const layer of layers) {
    const part = decodeText(layer.bytes);
    if (text.length > 0 && !text.endsWith("\n") && part.length > 0) text += "\n";
    text += part;
  }
  return text;
}
