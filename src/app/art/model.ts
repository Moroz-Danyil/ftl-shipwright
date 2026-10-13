/**
 * The pictures of the open ship: where each one comes from (a file in the
 * game, or bytes from a PNG file the user chose). They are part of every
 * undo snapshot, so picture choices can be undone like any other change.
 */
import type { FileSource, Ship, ShipPicturePaths } from "../../core";

/** A picture: a path in the ship's game files, or the bytes of a PNG file. */
export type PictureRef =
  { kind: "game"; path: string } | { kind: "file"; name: string; bytes: Uint8Array };

export type PictureSlot = "hull" | "floor" | "cloak" | "shield" | "miniship";

export interface ShipArt {
  /** Where `game` pictures (and room interiors) are read from: the game, or the game with the ship's mod. */
  source: FileSource;
  hull?: PictureRef;
  floor?: PictureRef;
  cloak?: PictureRef;
  shield?: PictureRef;
  miniship?: PictureRef;
  /** Gib N's picture at index N-1; `null` when it has none. */
  gibs: Array<PictureRef | null>;
}

/** The ship and its pictures: one undo step. */
export interface ShipSnapshot {
  ship: Ship;
  art: ShipArt;
}

export const gamePicture = (path: string): PictureRef => ({ kind: "game", path });

/** The pictures found for a ship loaded from the game. */
export function artFromPaths(source: FileSource, paths: ShipPicturePaths): ShipArt {
  const art: ShipArt = {
    source,
    gibs: paths.gibs.map((p) => (p === null ? null : gamePicture(p))),
  };
  if (paths.hull) art.hull = gamePicture(paths.hull);
  if (paths.floor) art.floor = gamePicture(paths.floor);
  if (paths.cloak) art.cloak = gamePicture(paths.cloak);
  if (paths.shield) art.shield = gamePicture(paths.shield);
  if (paths.miniship) art.miniship = gamePicture(paths.miniship);
  return art;
}

/** The file name a picture is shown with. */
export function pictureName(ref: PictureRef): string {
  if (ref.kind === "file") return ref.name;
  return ref.path.slice(ref.path.lastIndexOf("/") + 1);
}

/** A picture's bytes, or `undefined` when its file is missing. */
export async function readPicture(
  source: FileSource,
  ref: PictureRef | null | undefined
): Promise<Uint8Array | undefined> {
  if (!ref) return undefined;
  return ref.kind === "file" ? ref.bytes : source.readBytes(ref.path);
}
