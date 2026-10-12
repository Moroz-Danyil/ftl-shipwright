/**
 * The ship data model.
 *
 * Everything here is plain, JSON-serializable data: no classes, no methods,
 * no hidden state. Objects are meant to be treated as immutable; the helpers
 * in `ship.ts` return new objects instead of changing their input, so a UI
 * can keep snapshots for undo and compare states with `===` per branch.
 *
 * Optional properties are *absent* (not `undefined`) when the source file
 * did not have the value; writers then leave the value out again.
 */

// ---------------------------------------------------------------------------
// Shared small types

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A `min`/`max` pair, as used by gib motion values. */
export interface Range {
  min: number;
  max: number;
}

/**
 * Attributes found in the source that the model does not know, kept so they
 * can be written back (e.g. `NOLOC="1"` on a blueprint). Keys in source order.
 */
export type ExtraAttributes = Record<string, string>;

// ---------------------------------------------------------------------------
// Layout `.txt`: anchor, ellipse, rooms, doors

/** `ROOM id x y w h`, all in cells. */
export interface Room {
  id: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * `DOOR x y roomA roomB vertical`.
 *
 * - `vertical: true`: the door is on the vertical wall line `x`, between cell
 *   columns `x - 1` and `x`, in cell row `y`.
 * - `vertical: false`: the door is on the horizontal wall line `y`, between
 *   cell rows `y - 1` and `y`, in cell column `x`.
 *
 * `roomA`/`roomB` are kept in file order for inner doors. Airlocks (one side
 * is space, `-1`) are always stored as `roomA = room, roomB = -1`.
 */
export interface Door {
  x: number;
  y: number;
  roomA: number;
  roomB: number;
  vertical: boolean;
}

/** `ELLIPSE halfWidth halfHeight offsetX offsetY` (pixels). */
export interface ShieldEllipse {
  halfWidth: number;
  halfHeight: number;
  offsetX: number;
  offsetY: number;
}

/** Contents of `data/<layout>.txt`. */
export interface ShipLayout {
  /** `X_OFFSET` (cells). Absent = not written; the game then uses 0. */
  xOffset?: number;
  /** `Y_OFFSET` (cells). Absent = not written; the game then uses 0. */
  yOffset?: number;
  /** `HORIZONTAL` (pixels); only shifts the ship on screen. */
  horizontal?: number;
  /** `VERTICAL` (pixels); only shifts the ship on screen. */
  vertical?: number;
  ellipse: ShieldEllipse;
  rooms: Room[];
  doors: Door[];
  /**
   * Keywords the model does not know (mods), each with the tokens that
   * followed it up to the next known keyword. Written after the doors.
   * Also holds a known keyword whose values are incomplete or not numbers.
   */
  extraKeywords?: LayoutKeyword[];
}

/** An unknown keyword of a layout `.txt` and its value tokens, kept as text. */
export interface LayoutKeyword {
  keyword: string;
  values: string[];
}

// ---------------------------------------------------------------------------
// Layout `.xml`: pictures, mounts, gibs

/** Known `slide` values; other strings found in files are kept as they are. */
export type MountSlide = "up" | "down" | "left" | "right" | "no" | (string & {});

/** `<mount x y rotate mirror gib slide/>`. `x`/`y` are hull-picture pixels. */
export interface Mount {
  x: number;
  y: number;
  rotate: boolean;
  mirror: boolean;
  /** Number of the gib (1-based) the mount flies off with. */
  gib: number;
  /** Absent when the file has no `slide` attribute. */
  slide?: MountSlide;
  extraAttributes?: ExtraAttributes;
  /** Child elements of `<mount>` (mods), verbatim. */
  extraElements?: string[];
}

/** `<gibN>` inside `<explosion>`. Gib N is `gibs[N - 1]`. */
export interface Gib {
  velocity: Range;
  direction: Range;
  angular: Range;
  /** Position in hull-picture pixels (`<x>`, `<y>`). */
  x: number;
  y: number;
  /** Optional `<glowOffset x y/>` (iPad only, present on enemy ships). */
  glowOffset?: Point;
  /** Attributes of the `<gibN>` element itself (mods). */
  extraAttributes?: ExtraAttributes;
  /** Unknown child elements of `<gibN>` (mods), verbatim. */
  extraElements?: string[];
}

/** A floor or cloak offset; unknown attributes of its element are kept. */
export interface OffsetPoint extends Point {
  extraAttributes?: ExtraAttributes;
}

/** Contents of `data/<layout>.xml`. */
export interface ShipLayoutXml {
  /** `<img x y w h/>`: hull picture rect relative to the anchor. */
  img: Rect;
  /** `<offsets><floor x y/></offsets>`, relative to the hull picture's corner. */
  floorOffset?: OffsetPoint;
  /** `<offsets><cloak x y/></offsets>`, relative to the hull picture's corner. */
  cloakOffset?: OffsetPoint;
  /** Attributes of `<offsets>` itself (mods). */
  offsetsExtraAttributes?: ExtraAttributes;
  /** Unknown child elements of `<offsets>` (mods), verbatim. */
  offsetsExtraElements?: string[];
  /** Top-level `<glowOffset x y/>` (iPad only). */
  glowOffset?: Point;
  mounts: Mount[];
  gibs: Gib[];
  /** Child elements of `<weaponMounts>` other than `<mount>`, verbatim. */
  weaponMountsExtraElements?: string[];
  /** Child elements of `<explosion>` other than `<gibN>`, verbatim. */
  explosionExtraElements?: string[];
  /** Unknown top-level elements, verbatim source text, in source order. */
  extraElements?: string[];
}

// ---------------------------------------------------------------------------
// Blueprint: one `<shipBlueprint>` element

/** A text that is either a reference into the game's text files or inline text. */
export type ShipText = { kind: "id"; id: string } | { kind: "text"; text: string };

/** The texts of a blueprint: `<class>`, `<name>`, `<desc>`, `<unlock>`. */
export interface ShipTexts {
  class?: ShipText;
  name?: ShipText;
  desc?: ShipText;
  unlock?: ShipText;
}

/** The vanilla system element names. Other names (mods) are kept as strings. */
export const SYSTEM_IDS = [
  "pilot",
  "doors",
  "sensors",
  "medbay",
  "clonebay",
  "oxygen",
  "weapons",
  "shields",
  "engines",
  "drones",
  "cloaking",
  "battery",
  "hacking",
  "mind",
  "teleporter",
  "artillery",
] as const;

export type KnownSystemId = (typeof SYSTEM_IDS)[number];
export type SystemId = KnownSystemId | (string & {});

export type StationDirection = "up" | "down" | "left" | "right" | (string & {});

/**
 * `<slot>`: the crew station of a system room.
 * `number` is the cell inside the room counted row by row (`y * w + x`);
 * a negative number (vanilla medbays use -2) means "no station cell".
 */
export interface StationSlot {
  number?: number;
  direction?: StationDirection;
}

/** One system element inside `<systemList>`. */
export interface ShipSystem {
  /** Element name, e.g. `'pilot'`, `'artillery'`. */
  system: SystemId;
  /** `power`: starting level. */
  power: number;
  /** `room`: room id. Several systems may share a room. */
  room: number;
  /** `start`: absent, `true` or `false` (false = must be bought). */
  start?: boolean;
  /** `max`: upgrade limit (enemy ships). */
  max?: number;
  /** `img`: room interior picture base name. */
  img?: string;
  /** `weapon`: artillery weapon blueprint. */
  weapon?: string;
  slot?: StationSlot;
  extraAttributes?: ExtraAttributes;
  /** Unknown child elements other than `<slot>`, verbatim. */
  extraElements?: string[];
}

/** `<weaponList count missiles load>` with its `<weapon name/>` children. */
export interface WeaponList {
  count?: number;
  missiles?: number;
  load?: string;
  /** Weapon blueprint names, in order. */
  items: string[];
  extraAttributes?: ExtraAttributes;
}

/** `<droneList count drones load>` with its `<drone name/>` children. */
export interface DroneList {
  count?: number;
  drones?: number;
  load?: string;
  /** Drone blueprint names, in order. */
  items: string[];
  extraAttributes?: ExtraAttributes;
}

/** `<crewCount amount class max/>`. */
export interface CrewCount {
  amount: number;
  /** The `class` attribute (race: `human`, `engi`, `random`, ...). */
  race: string;
  max?: number;
  extraAttributes?: ExtraAttributes;
}

/** One `<shipBlueprint>`. */
export interface ShipBlueprint {
  /** `name` attribute: the blueprint id. */
  name: string;
  /** `layout` attribute: base name of the layout `.txt`/`.xml`. */
  layout: string;
  /** `img` attribute: base name of the ship pictures. */
  img: string;
  /** Other attributes of `<shipBlueprint>` (e.g. `NOLOC`). */
  extraAttributes?: ExtraAttributes;
  texts: ShipTexts;
  systems: ShipSystem[];
  weaponSlots?: number;
  droneSlots?: number;
  weaponList?: WeaponList;
  droneList?: DroneList;
  /** `<aug name/>` values, in order. */
  augments: string[];
  /** `<health amount/>`. */
  health?: number;
  /** `<maxPower amount/>`. */
  maxPower?: number;
  crew: CrewCount[];
  shieldImage?: string;
  cloakImage?: string;
  floorImage?: string;
  /**
   * Child elements the model does not know (`boardingAI`, `minSector`, ...),
   * verbatim source text, in source order. Written after the known elements.
   */
  extraElements: string[];
}

// ---------------------------------------------------------------------------
// A whole ship

/** A ship = blueprint + layout `.txt` + layout `.xml`. */
export interface Ship {
  blueprint: ShipBlueprint;
  layout: ShipLayout;
  layoutXml: ShipLayoutXml;
}
