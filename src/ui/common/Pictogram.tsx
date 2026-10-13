/**
 * A small picture before a section title or a field label, so each part is
 * recognised at a glance: the game's own icon where its files have a fitting
 * one, a tool's icon for what that tool works on, otherwise a line icon. It
 * sits on a dark chip, like the system icons, so it reads in both themes,
 * and it is always shown next to the text, never instead of it.
 */
import { useEditor } from "../../app/store";
import type { ToolId } from "../../app/workspaces";
import { usePicture } from "../../canvas/pictures";
import { PictogramIcon, ToolIcon, type LinePictogram } from "./icons";

type Source = { game: string } | { line: LinePictogram } | { tool: ToolId };

const PICTOGRAMS = {
  // The game's pictures: the weapons and drones system icons, and its
  // missile and drone part icons.
  weapons: { game: "img/icons/s_weapons_overlay.png" },
  drones: { game: "img/icons/s_drones_overlay.png" },
  weaponSlots: { game: "img/icons/s_weapons_overlay.png" },
  droneSlots: { game: "img/icons/s_drones_overlay.png" },
  missiles: { game: "img/ui_icons/icon_missiles.png" },
  droneParts: { game: "img/ui_icons/icon_drones.png" },
  // Line icons, where the game has no fitting picture.
  info: { line: "info" },
  save: { line: "save" },
  stats: { line: "stats" },
  hull: { line: "hull" },
  reactor: { line: "reactor" },
  crew: { line: "crew" },
  augments: { line: "augments" },
  roomSystems: { line: "roomSystems" },
  addSystem: { line: "addSystem" },
  position: { line: "position" },
  pictures: { line: "pictures" },
  // The tools' icons: for a tool's help, and for what a tool works on.
  mounts: { tool: "mount" },
  gibs: { tool: "gib" },
  select: { tool: "select" },
  room: { tool: "room" },
  door: { tool: "door" },
  station: { tool: "station" },
  movePicture: { tool: "movePicture" },
  mount: { tool: "mount" },
  gib: { tool: "gib" },
} satisfies Record<string, Source>;

export type PictogramId = keyof typeof PICTOGRAMS;

function GamePicture({ path }: { path: string }) {
  const view = useEditor((s) => s.game.data?.view);
  const picture = usePicture(view, path);
  return picture ? <img src={picture.url} alt="" draggable={false} /> : null;
}

export function Pictogram({ id, size = 22 }: { id: PictogramId; size?: number }) {
  const source: Source = PICTOGRAMS[id];
  return (
    <span
      className={"game" in source ? "pict pict--game" : "pict"}
      data-pictogram={id}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {"game" in source ? (
        <GamePicture path={source.game} />
      ) : "line" in source ? (
        <PictogramIcon id={source.line} />
      ) : (
        <ToolIcon tool={source.tool} />
      )}
    </span>
  );
}
