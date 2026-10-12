/**
 * Whole-ship loading and saving, plus immutable edit helpers.
 *
 * Every edit function returns a new `Ship` and leaves its input untouched;
 * parts that did not change are shared with the input (structural sharing),
 * so `a.layout === b.layout` tells a UI that the layout did not change.
 */
import { parseShipBlueprint, writeShipBlueprint, type BlueprintWriteOptions } from "./blueprint";
import { doorMatchesGeometry, doorRooms } from "./geometry";
import { parseLayoutTxt, writeLayoutTxt } from "./layoutTxt";
import { parseLayoutXml, writeLayoutXml } from "./layoutXml";
import type {
  Door,
  Mount,
  Room,
  Ship,
  ShipBlueprint,
  ShipLayout,
  ShipLayoutXml,
  ShipSystem,
} from "./model";

/** The three texts a ship is stored in. */
export interface ShipFiles {
  /** One `<shipBlueprint>` element (or text containing one). */
  blueprintXml: string;
  /** `data/<layout>.txt` */
  layoutTxt: string;
  /** `data/<layout>.xml` */
  layoutXml: string;
}

/** Parses the three files of a ship. */
export function loadShip(files: ShipFiles): Ship {
  return {
    blueprint: parseShipBlueprint(files.blueprintXml),
    layout: parseLayoutTxt(files.layoutTxt),
    layoutXml: parseLayoutXml(files.layoutXml),
  };
}

/** Writes the three files of a ship. */
export function saveShip(ship: Ship, options?: BlueprintWriteOptions): ShipFiles {
  return {
    blueprintXml: writeShipBlueprint(ship.blueprint, options),
    layoutTxt: writeLayoutTxt(ship.layout, options),
    layoutXml: writeLayoutXml(ship.layoutXml, options),
  };
}

/** A new, empty ship: no rooms, doors, systems, mounts or gibs. */
export function createShip(ids: { name: string; layout: string; img: string }): Ship {
  return {
    blueprint: {
      name: ids.name,
      layout: ids.layout,
      img: ids.img,
      texts: {},
      systems: [],
      augments: [],
      crew: [],
      extraElements: [],
    },
    layout: {
      xOffset: 0,
      yOffset: 0,
      vertical: 0,
      ellipse: { halfWidth: 0, halfHeight: 0, offsetX: 0, offsetY: 0 },
      rooms: [],
      doors: [],
    },
    layoutXml: {
      img: { x: 0, y: 0, w: 0, h: 0 },
      mounts: [],
      gibs: [],
    },
  };
}

// ---------------------------------------------------------------------------
// Generic setters

export function updateBlueprint(ship: Ship, patch: Partial<ShipBlueprint>): Ship {
  return { ...ship, blueprint: { ...ship.blueprint, ...patch } };
}

export function updateLayout(ship: Ship, patch: Partial<ShipLayout>): Ship {
  return { ...ship, layout: { ...ship.layout, ...patch } };
}

export function updateLayoutXml(ship: Ship, patch: Partial<ShipLayoutXml>): Ship {
  return { ...ship, layoutXml: { ...ship.layoutXml, ...patch } };
}

/** Sets the anchor (`X_OFFSET`/`Y_OFFSET`, in cells). */
export function setAnchor(ship: Ship, x: number, y: number): Ship {
  return updateLayout(ship, { xOffset: x, yOffset: y });
}

// ---------------------------------------------------------------------------
// Rooms

/** Appends a room with the next id (`rooms.length`). */
export function addRoom(ship: Ship, rect: Omit<Room, "id">): Ship {
  const room: Room = { id: ship.layout.rooms.length, x: rect.x, y: rect.y, w: rect.w, h: rect.h };
  return updateLayout(ship, { rooms: [...ship.layout.rooms, room] });
}

/**
 * Moves and/or resizes a room. Doors are not moved and their room ids are
 * not changed; call {@link syncDoorRooms} to update the ids from the new
 * geometry.
 */
export function updateRoom(ship: Ship, id: number, patch: Partial<Omit<Room, "id">>): Ship {
  return updateLayout(ship, {
    rooms: ship.layout.rooms.map((r) => (r.id === id ? { ...r, ...patch, id: r.id } : r)),
  });
}

/**
 * Removes a room and keeps the ids `0 .. n-1`: higher room ids move down by
 * one in rooms, doors and systems. Doors on the removed room and systems in
 * it are removed.
 */
export function removeRoom(ship: Ship, id: number): Ship {
  const shift = (r: number) => (r > id ? r - 1 : r);
  const rooms = ship.layout.rooms
    .filter((r) => r.id !== id)
    .map((r) => (r.id > id ? { ...r, id: r.id - 1 } : r));
  const doors = ship.layout.doors
    .filter((d) => d.roomA !== id && d.roomB !== id)
    .map((d) =>
      d.roomA > id || d.roomB > id ? { ...d, roomA: shift(d.roomA), roomB: shift(d.roomB) } : d
    );
  const systems = ship.blueprint.systems
    .filter((s) => s.room !== id)
    .map((s) => (s.room > id ? { ...s, room: s.room - 1 } : s));
  return {
    ...ship,
    layout: { ...ship.layout, rooms, doors },
    blueprint: { ...ship.blueprint, systems },
  };
}

// ---------------------------------------------------------------------------
// Doors

/** Adds a door; its room ids are taken from the geometry (`room, -1` for an airlock). */
export function addDoor(ship: Ship, pos: Pick<Door, "x" | "y" | "vertical">): Ship {
  const [roomA, roomB] = doorRooms(ship.layout, pos);
  const door: Door = { x: pos.x, y: pos.y, roomA, roomB, vertical: pos.vertical };
  return updateLayout(ship, { doors: [...ship.layout.doors, door] });
}

/** Moves a door (or flips its orientation); room ids are recomputed from the geometry. */
export function updateDoor(
  ship: Ship,
  index: number,
  patch: Partial<Pick<Door, "x" | "y" | "vertical">>
): Ship {
  return updateLayout(ship, {
    doors: ship.layout.doors.map((d, i) => {
      if (i !== index) return d;
      const moved = { ...d, ...patch };
      const [roomA, roomB] = doorRooms(ship.layout, moved);
      return { ...moved, roomA, roomB };
    }),
  });
}

export function removeDoor(ship: Ship, index: number): Ship {
  return updateLayout(ship, { doors: ship.layout.doors.filter((_, i) => i !== index) });
}

/**
 * Updates every door's room ids from the geometry. Doors that already match
 * (inner doors in either order) are kept as they are.
 */
export function syncDoorRooms(ship: Ship): Ship {
  let changed = false;
  const doors = ship.layout.doors.map((d) => {
    if (doorMatchesGeometry(ship.layout, d)) return d;
    changed = true;
    const [roomA, roomB] = doorRooms(ship.layout, d);
    return { ...d, roomA, roomB };
  });
  return changed ? updateLayout(ship, { doors }) : ship;
}

// ---------------------------------------------------------------------------
// Systems

export function addSystem(ship: Ship, system: ShipSystem): Ship {
  return updateBlueprint(ship, { systems: [...ship.blueprint.systems, system] });
}

export function updateSystem(ship: Ship, index: number, patch: Partial<ShipSystem>): Ship {
  return updateBlueprint(ship, {
    systems: ship.blueprint.systems.map((s, i) => (i === index ? { ...s, ...patch } : s)),
  });
}

export function removeSystem(ship: Ship, index: number): Ship {
  return updateBlueprint(ship, { systems: ship.blueprint.systems.filter((_, i) => i !== index) });
}

// ---------------------------------------------------------------------------
// Mounts

export function addMount(ship: Ship, mount: Mount): Ship {
  return updateLayoutXml(ship, { mounts: [...ship.layoutXml.mounts, mount] });
}

export function updateMount(ship: Ship, index: number, patch: Partial<Mount>): Ship {
  return updateLayoutXml(ship, {
    mounts: ship.layoutXml.mounts.map((m, i) => (i === index ? { ...m, ...patch } : m)),
  });
}

export function removeMount(ship: Ship, index: number): Ship {
  return updateLayoutXml(ship, { mounts: ship.layoutXml.mounts.filter((_, i) => i !== index) });
}
