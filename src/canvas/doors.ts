import { doorRooms, type Door, type ShipLayout } from "../core";

export type DoorKind = "inner" | "airlock" | "loose";

/** What a door is by the rooms beside it: between two rooms, to space, or touching no room. */
export function doorKind(layout: Pick<ShipLayout, "rooms">, door: Door): DoorKind {
  const [a, b] = doorRooms(layout, door);
  if (a === -1) return "loose";
  return b === -1 ? "airlock" : "inner";
}
