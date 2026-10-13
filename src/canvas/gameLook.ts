/**
 * How the game draws a ship's insides, as plain data: door sprites, system
 * icons in rooms and crew members at their stations.
 */
import {
  CELL_SIZE,
  animFrame,
  doorSegmentPx,
  type Animations,
  type Door,
  type Rect,
  type SheetFrame,
  type Ship,
  type ShipLayout,
  type StationDirection,
} from "../core";
import { isInstalled } from "../app/systems/rules";

/** The door sprite sheet: 5 × 5 frames of 35 × 35; columns open the door, rows are door kinds. */
export const DOOR_SHEET = { path: "img/effects/door_sheet.png", w: 175, h: 175 } as const;

/** The closed frame of the ordinary door (column 0, row 0); it shows a door on a vertical wall. */
export const CLOSED_DOOR_FRAME: Rect = { x: 0, y: 0, w: CELL_SIZE, h: CELL_SIZE };

/**
 * The SVG transform that puts the door frame (its own pixels) on the door's
 * wall segment: centred on it, and turned 90° for a door on a horizontal wall.
 */
export function doorSpriteTransform(
  layout: Pick<ShipLayout, "xOffset" | "yOffset">,
  door: Pick<Door, "x" | "y" | "vertical">
): string {
  const s = doorSegmentPx(layout, door);
  const cx = (s.x1 + s.x2) / 2;
  const cy = (s.y1 + s.y2) / 2;
  const place = `translate(${cx - CELL_SIZE / 2} ${cy - CELL_SIZE / 2})`;
  return door.vertical ? place : `rotate(90 ${cx} ${cy}) ${place}`;
}

/** The icon the game draws in a room for a system (32 × 32). */
export function systemIconPath(system: string): string {
  return `img/icons/s_${system}_overlay.png`;
}

/** Size of a system icon in ship pixels. */
export const ROOM_ICON_SIZE = 32;

export interface RoomIcon {
  system: string;
  /** Bought later (`start="false"`): drawn tinted. */
  later: boolean;
  /** Top-left corner in ship pixels. */
  x: number;
  y: number;
}

/** The system icons of a room: centred, side by side when the room holds several systems. */
export function roomIcons(ship: Ship, roomId: number, roomRect: Rect): RoomIcon[] {
  const systems = ship.blueprint.systems.filter((s) => s.room === roomId);
  const size = ROOM_ICON_SIZE;
  const total = systems.length * size;
  const left = roomRect.x + roomRect.w / 2 - total / 2;
  const top = roomRect.y + roomRect.h / 2 - size / 2;
  return systems.map((s, i) => ({
    system: s.system,
    later: !isInstalled(s),
    x: left + i * size,
    y: top,
  }));
}

/** The race shown at the stations: the ship's first crew race, else human. */
export function crewRace(ship: Ship): string {
  return ship.blueprint.crew[0]?.race ?? "human";
}

/**
 * The frame of a crew member manning a station: frame 0 of
 * `<race>_type_<direction>`, or of `<race>_walk_down` without a direction.
 * A race without these animations falls back to human.
 */
export function stationCrewFrame(
  animations: Animations,
  race: string,
  direction: StationDirection | undefined
): SheetFrame | undefined {
  const name = (r: string) =>
    direction && ["up", "down", "left", "right"].includes(direction)
      ? `${r}_type_${direction}`
      : `${r}_walk_down`;
  for (const r of race === "human" ? [race] : [race, "human"]) {
    const anim = Object.prototype.hasOwnProperty.call(animations.anims, name(r))
      ? animations.anims[name(r)]
      : undefined;
    const frame = anim && animFrame(animations, anim, 0);
    if (frame) return frame;
  }
  return undefined;
}
