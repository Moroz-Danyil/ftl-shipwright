import { doorRooms, doorSegmentPx, type Door, type Rect, type ShipLayout } from "../core";

export type DoorKind = "inner" | "airlock" | "loose";

const DOOR_LENGTH = 16;
const DOOR_THICKNESS = 6;

/** What a door is by the rooms beside it: between two rooms, to space, or touching no room. */
export function doorKind(layout: Pick<ShipLayout, "rooms">, door: Door): DoorKind {
  const [a, b] = doorRooms(layout, door);
  if (a === -1) return "loose";
  return b === -1 ? "airlock" : "inner";
}

/** The rectangle a door is drawn as, centred on its wall segment (ship pixels). */
export function doorRectPx(
  layout: Pick<ShipLayout, "xOffset" | "yOffset">,
  door: Pick<Door, "x" | "y" | "vertical">
): Rect {
  const s = doorSegmentPx(layout, door);
  const cx = (s.x1 + s.x2) / 2;
  const cy = (s.y1 + s.y2) / 2;
  const w = door.vertical ? DOOR_THICKNESS : DOOR_LENGTH;
  const h = door.vertical ? DOOR_LENGTH : DOOR_THICKNESS;
  return { x: cx - w / 2, y: cy - h / 2, w, h };
}
