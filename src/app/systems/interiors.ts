/**
 * Room interior pictures (`img/ship/interior/<name>.png`): the list the game
 * offers, and the sizes of the ones a ship uses.
 */
import { useEffect, useState } from "react";
import {
  listInteriors,
  type FileSource,
  type GameView,
  type NamedPicture,
  type Ship,
} from "../../core";
import { loadPicture } from "../../canvas/pictures";

export function interiorPath(name: string): string {
  return `img/ship/interior/${name}.png`;
}

const lists = new WeakMap<GameView, Promise<NamedPicture[]>>();

/** The game's interior pictures (without lighting overlays); `undefined` while reading. */
export function useInteriorList(view: GameView | undefined): NamedPicture[] | undefined {
  const [loaded, setLoaded] = useState<{ view: GameView; list: NamedPicture[] }>();
  useEffect(() => {
    if (!view) return;
    let live = true;
    let list = lists.get(view);
    if (!list) {
      list = listInteriors(view).catch(() => []);
      lists.set(view, list);
    }
    void list.then((l) => {
      if (live) setLoaded({ view, list: l });
    });
    return () => {
      live = false;
    };
  }, [view]);
  return loaded && loaded.view === view ? loaded.list : undefined;
}

export type PictureSize = { width: number; height: number };

const NO_SIZES: Record<string, PictureSize> = {};

/** The sizes of the interior pictures the ship's systems use, by name; missing pictures are absent. */
export function useInteriorSizes(
  source: FileSource | undefined,
  ship: Ship | undefined
): Record<string, PictureSize> {
  const names = [
    ...new Set((ship?.blueprint.systems ?? []).flatMap((s) => (s.img ? [s.img] : []))),
  ].sort();
  const key = names.join("|");
  const [sizes, setSizes] = useState<{
    source?: FileSource;
    key: string;
    sizes: Record<string, PictureSize>;
  }>({
    key: "",
    sizes: {},
  });
  useEffect(() => {
    if (!source) return;
    let live = true;
    const wanted = key === "" ? [] : key.split("|");
    void Promise.all(wanted.map((n) => loadPicture(source, interiorPath(n)))).then((pictures) => {
      if (!live) return;
      const out: Record<string, PictureSize> = {};
      pictures.forEach((p, i) => {
        if (p) out[wanted[i]] = { width: p.width, height: p.height };
      });
      setSizes({ source, key, sizes: out });
    });
    return () => {
      live = false;
    };
  }, [source, key]);
  return sizes.source === source && sizes.key === key ? sizes.sizes : NO_SIZES;
}
