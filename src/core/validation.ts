/**
 * Validation helpers. They report problems as data and never throw.
 */
import { doorRooms, doorMatchesGeometry, stationInRoom } from "./geometry";
import type { Room, Ship, ShipBlueprint, ShipLayout } from "./model";

export type ValidationCode =
  | "room-overlap"
  | "room-ids"
  | "room-size"
  | "door-no-room"
  | "door-rooms-mismatch"
  | "airlock-large-room"
  | "station-outside-room"
  | "system-unknown-room";

export interface ValidationIssue {
  code: ValidationCode;
  message: string;
  /** Room ids involved, if any. */
  rooms?: number[];
  /** Index into `layout.doors`, if a door is involved. */
  door?: number;
  /** Index into `blueprint.systems`, if a system is involved. */
  system?: number;
}

/** Pairs of rooms that share at least one cell. */
export function findOverlappingRooms(layout: Pick<ShipLayout, "rooms">): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const rooms = layout.rooms;
  for (let i = 0; i < rooms.length; i++) {
    for (let j = i + 1; j < rooms.length; j++) {
      const a = rooms[i];
      const b = rooms[j];
      if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) {
        issues.push({
          code: "room-overlap",
          message: `Rooms ${a.id} and ${b.id} overlap`,
          rooms: [a.id, b.id],
        });
      }
    }
  }
  return issues;
}

/** Room ids that are not exactly `0 .. n-1` in list order, and rooms with a size below 1×1. */
export function checkRoomIds(layout: Pick<ShipLayout, "rooms">): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  layout.rooms.forEach((r, index) => {
    if (r.id !== index) {
      issues.push({
        code: "room-ids",
        message: `Room at position ${index} has id ${r.id}; ids must be 0..${layout.rooms.length - 1} in order`,
        rooms: [r.id],
      });
    }
    if (!(r.w >= 1 && r.h >= 1)) {
      issues.push({
        code: "room-size",
        message: `Room ${r.id} has size ${r.w}×${r.h}`,
        rooms: [r.id],
      });
    }
  });
  return issues;
}

/** Doors that have no room on either side. */
export function findDoorsTouchingNoRoom(
  layout: Pick<ShipLayout, "rooms" | "doors">
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  layout.doors.forEach((d, index) => {
    const [a] = doorRooms(layout, d);
    if (a === -1) {
      issues.push({
        code: "door-no-room",
        message: `Door ${index} at (${d.x}, ${d.y}) ${d.vertical ? "vertical" : "horizontal"} touches no room`,
        door: index,
      });
    }
  });
  return issues;
}

/** Doors whose written room ids differ from the rooms on their two sides. Doors touching no room are not reported here. */
export function findDoorRoomMismatches(
  layout: Pick<ShipLayout, "rooms" | "doors">
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  layout.doors.forEach((d, index) => {
    const [a, b] = doorRooms(layout, d);
    if (a === -1) return;
    if (!doorMatchesGeometry(layout, d)) {
      issues.push({
        code: "door-rooms-mismatch",
        message: `Door ${index} at (${d.x}, ${d.y}) is written as ${d.roomA}, ${d.roomB} but connects ${a}, ${b}`,
        door: index,
        rooms: b === -1 ? [a] : [a, b],
      });
    }
  });
  return issues;
}

/** Airlocks on rooms bigger than 2×2 (wider or taller than 2 cells); the game vents such rooms only partly. */
export function findAirlocksOnLargeRooms(
  layout: Pick<ShipLayout, "rooms" | "doors">
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  layout.doors.forEach((d, index) => {
    const [a, b] = doorRooms(layout, d);
    if (a === -1 || b !== -1) return;
    const room = layout.rooms.find((r) => r.id === a);
    if (room && (room.w > 2 || room.h > 2)) {
      issues.push({
        code: "airlock-large-room",
        message: `Door ${index} is an airlock on room ${room.id} (${room.w}×${room.h}), bigger than 2×2`,
        door: index,
        rooms: [room.id],
      });
    }
  });
  return issues;
}

/**
 * Systems whose station cell (`slot.number`) lies outside their room, and
 * systems that name a room that does not exist. A negative station number
 * means "no station" and is not reported.
 */
export function findStationsOutsideRooms(
  blueprint: Pick<ShipBlueprint, "systems">,
  layout: Pick<ShipLayout, "rooms">
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const byId = new Map<number, Room>();
  for (const r of layout.rooms) if (!byId.has(r.id)) byId.set(r.id, r);
  blueprint.systems.forEach((s, index) => {
    const room = byId.get(s.room);
    if (!room) {
      issues.push({
        code: "system-unknown-room",
        message: `System ${s.system} is in room ${s.room}, which does not exist`,
        system: index,
        rooms: [s.room],
      });
      return;
    }
    const number = s.slot?.number;
    if (number === undefined || number < 0) return;
    if (!stationInRoom(room, number)) {
      issues.push({
        code: "station-outside-room",
        message: `System ${s.system}: station cell ${number} is outside room ${room.id} (${room.w}×${room.h})`,
        system: index,
        rooms: [room.id],
      });
    }
  });
  return issues;
}

/** Runs every layout check. */
export function validateLayout(layout: ShipLayout): ValidationIssue[] {
  return [
    ...checkRoomIds(layout),
    ...findOverlappingRooms(layout),
    ...findDoorsTouchingNoRoom(layout),
    ...findDoorRoomMismatches(layout),
    ...findAirlocksOnLargeRooms(layout),
  ];
}

/** Runs every check on a whole ship. */
export function validateShip(ship: Ship): ValidationIssue[] {
  return [...validateLayout(ship.layout), ...findStationsOutsideRooms(ship.blueprint, ship.layout)];
}
