/**
 * The ship's checks: the core's validation plus the editor's own checks of
 * the texts, rooms, systems, pictures and equipment, each with the workspace
 * and selection it is about.
 */
import {
  doorSides,
  resolveText,
  validateShip,
  type Catalogs,
  type GameTexts,
  type Ship,
  type ShipText,
  type ValidationCode,
} from "../core";
import { isPlayerShip, viewLimitCells } from "../canvas/viewLimit";
import type { ShipArt } from "./art/model";
import { crewTotal } from "./details/rules";
import { EMPTY_SELECTION, selectionOf, type Selection } from "./selection";
import type { PictureSize } from "./systems/interiors";
import {
  interiorFits,
  isInstalled,
  roomsWithSeveralInstalled,
  roomsWithUnusualMix,
} from "./systems/rules";
import type { WorkspaceId } from "./workspaces";

export type TextCheckCode = "no-name" | "no-class" | "no-description";
export type LayoutCheckCode =
  "no-rooms" | "rooms-cut-off" | "rooms-off-screen" | "missing-core-system";
export type SystemCheckCode = "several-installed" | "unusual-mix" | "cloak-interior-size";
export type ArtCheckCode =
  "no-hull" | "no-shield" | "no-ship-icon" | "few-mounts" | "gib-no-picture" | "mount-gib-missing";
export type LoadoutCheckCode =
  | "too-many-weapons"
  | "too-many-drones"
  | "unknown-weapon"
  | "unknown-drone"
  | "no-crew"
  | "no-hull-points";
export type CheckCode =
  | ValidationCode
  | TextCheckCode
  | LayoutCheckCode
  | SystemCheckCode
  | ArtCheckCode
  | LoadoutCheckCode;

export interface CheckIssue {
  code: CheckCode;
  /** Room ids involved, if any. */
  rooms?: number[];
  /** Index into `layout.doors`, if a door is involved. */
  door?: number;
  /** Index into `blueprint.systems`, if a system is involved. */
  system?: number;
  /** Index into the mounts, if a mount is involved. */
  mount?: number;
  /** Index into the gibs, if a gib is involved. */
  gib?: number;
  /** Index into the weapon list, if a weapon is involved. */
  weapon?: number;
  /** Index into the drone list, if a drone is involved. */
  drone?: number;
  /** The blueprint name of the weapon or drone involved. */
  item?: string;
  /** The system involved (its element name), shown with its icon. */
  systemId?: string;
  /** The workspace that shows what the check is about. */
  workspace: WorkspaceId;
  /** Problems keep the ship from working; the rest are things to look at. */
  severity?: "problem";
}

/** The systems a ship needs to fly, jump and keep its crew alive. */
export const CORE_SYSTEMS = ["pilot", "engines", "oxygen", "shields"] as const;

/**
 * True when the text says something: inline text that is not blank, or a
 * text id the game's texts give a text that is not blank (any id counts
 * while the game's texts are not known).
 */
function hasText(text: ShipText | undefined, texts: GameTexts | undefined): boolean {
  if (!text) return false;
  if (text.kind === "text") return text.text.trim() !== "";
  return !texts || (resolveText(texts, text) ?? "").trim() !== "";
}

/** The texts: the class, and for a player ship the name and description the hangar shows. */
export function textChecks(ship: Ship, texts?: GameTexts): CheckIssue[] {
  const issues: CheckIssue[] = [];
  const t = ship.blueprint.texts;
  const player = isPlayerShip(ship.blueprint.name);
  if (player && !hasText(t.name, texts)) issues.push({ code: "no-name", workspace: "ship" });
  if (!hasText(t.class, texts)) issues.push({ code: "no-class", workspace: "ship" });
  if (player && !hasText(t.desc, texts)) issues.push({ code: "no-description", workspace: "ship" });
  return issues;
}

/**
 * The rooms crew cannot walk to: the rooms outside the largest group of rooms
 * joined by doors (an airlock joins nothing), sorted by id. Of groups of the
 * same size, the one with the room listed first counts as the ship.
 */
export function roomsCutOff(ship: Ship): number[] {
  const rooms = ship.layout.rooms;
  if (rooms.length < 2) return [];
  const parent = new Map<number, number>(rooms.map((r) => [r.id, r.id]));
  const find = (id: number): number => {
    let root = id;
    while (parent.get(root) !== root) root = parent.get(root)!;
    return root;
  };
  for (const door of ship.layout.doors) {
    const [a, b] = doorSides(ship.layout, door);
    if (a === -1 || b === -1) continue;
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(rb, ra);
  }
  const sizes = new Map<number, number>();
  for (const r of rooms) sizes.set(find(r.id), (sizes.get(find(r.id)) ?? 0) + 1);
  let main = find(rooms[0].id);
  for (const r of rooms) {
    const root = find(r.id);
    if (sizes.get(root)! > sizes.get(main)!) main = root;
  }
  return rooms
    .filter((r) => find(r.id) !== main)
    .map((r) => r.id)
    .sort((a, b) => a - b);
}

/** The rooms of a player ship that lie, even partly, outside the view limit frame. */
export function roomsOffScreen(ship: Ship): number[] {
  if (!isPlayerShip(ship.blueprint.name)) return [];
  const frame = viewLimitCells(ship.layout);
  const slack = 1e-6;
  return ship.layout.rooms
    .filter(
      (r) =>
        r.x < frame.left - slack ||
        r.y < frame.top - slack ||
        r.x + r.w > frame.right + slack ||
        r.y + r.h > frame.bottom + slack
    )
    .map((r) => r.id)
    .sort((a, b) => a - b);
}

/** The Rooms checks of the editor: no rooms, rooms cut off or off screen, the core systems. */
export function layoutChecks(ship: Ship): CheckIssue[] {
  const issues: CheckIssue[] = [];
  if (ship.layout.rooms.length === 0)
    issues.push({ code: "no-rooms", workspace: "rooms", severity: "problem" });
  const cutOff = roomsCutOff(ship);
  if (cutOff.length > 0) issues.push({ code: "rooms-cut-off", rooms: cutOff, workspace: "rooms" });
  const offScreen = roomsOffScreen(ship);
  if (offScreen.length > 0)
    issues.push({ code: "rooms-off-screen", rooms: offScreen, workspace: "rooms" });
  for (const system of CORE_SYSTEMS) {
    const installed = ship.blueprint.systems.some((s) => s.system === system && isInstalled(s));
    if (!installed)
      issues.push({ code: "missing-core-system", systemId: system, workspace: "rooms" });
  }
  return issues;
}

/** The editor's own system checks; `sizes` are the interior picture sizes by name. */
export function systemChecks(ship: Ship, sizes: Record<string, PictureSize>): CheckIssue[] {
  const issues: CheckIssue[] = [];
  for (const id of roomsWithSeveralInstalled(ship))
    issues.push({ code: "several-installed", rooms: [id], workspace: "rooms" });
  for (const id of roomsWithUnusualMix(ship))
    issues.push({ code: "unusual-mix", rooms: [id], workspace: "rooms" });
  ship.blueprint.systems.forEach((s, index) => {
    if (s.system !== "cloaking" || !s.img) return;
    const room = ship.layout.rooms.find((r) => r.id === s.room);
    const size = sizes[s.img];
    if (room && size && !interiorFits(room, size))
      issues.push({
        code: "cloak-interior-size",
        rooms: [room.id],
        system: index,
        systemId: "cloaking",
        workspace: "rooms",
        severity: "problem",
      });
  });
  return issues;
}

/**
 * The Hull checks: the hull and shield pictures (and the ship icon of a
 * player ship), enough mounts, gib pictures and mount links.
 */
export function artChecks(ship: Ship, art: ShipArt | undefined): CheckIssue[] {
  const issues: CheckIssue[] = [];
  const xml = ship.layoutXml;
  if (art && !art.hull) issues.push({ code: "no-hull", workspace: "hull", severity: "problem" });
  if (art && !art.shield) issues.push({ code: "no-shield", workspace: "hull" });
  if (art && !art.miniship && isPlayerShip(ship.blueprint.name))
    issues.push({ code: "no-ship-icon", workspace: "hull" });
  if ((ship.blueprint.weaponSlots ?? 0) > xml.mounts.length)
    issues.push({ code: "few-mounts", workspace: "hull" });
  if (art)
    xml.gibs.forEach((_, gib) => {
      if (!art.gibs[gib]) issues.push({ code: "gib-no-picture", gib, workspace: "hull" });
    });
  xml.mounts.forEach((m, mount) => {
    if (m.gib > xml.gibs.length)
      issues.push({ code: "mount-gib-missing", mount, workspace: "hull" });
  });
  return issues;
}

/** The Ship checks: items beyond their slots, items the game does not know, crew and hull. */
export function loadoutChecks(ship: Ship, catalogs: Catalogs | undefined): CheckIssue[] {
  const issues: CheckIssue[] = [];
  const bp = ship.blueprint;
  const weapons = bp.weaponList?.items ?? [];
  const drones = bp.droneList?.items ?? [];
  if (bp.weaponSlots !== undefined && weapons.length > bp.weaponSlots)
    issues.push({ code: "too-many-weapons", workspace: "ship" });
  if (bp.droneSlots !== undefined && drones.length > bp.droneSlots)
    issues.push({ code: "too-many-drones", workspace: "ship" });
  if (catalogs) {
    weapons.forEach((item, weapon) => {
      if (!catalogs.weapons.some((w) => w.name === item))
        issues.push({ code: "unknown-weapon", weapon, item, workspace: "ship" });
    });
    drones.forEach((item, drone) => {
      if (!catalogs.drones.some((d) => d.name === item))
        issues.push({ code: "unknown-drone", drone, item, workspace: "ship" });
    });
  }
  if (crewTotal(ship) === 0) issues.push({ code: "no-crew", workspace: "ship" });
  if (bp.health === 0)
    issues.push({ code: "no-hull-points", workspace: "ship", severity: "problem" });
  return issues;
}

/** Every check of the ship, the core's first. */
export function allChecks(
  ship: Ship,
  sizes: Record<string, PictureSize> = {},
  art?: ShipArt,
  catalogs?: Catalogs,
  texts?: GameTexts
): CheckIssue[] {
  const core: CheckIssue[] = validateShip(ship).map((issue) => {
    const out: CheckIssue = {
      code: issue.code,
      workspace: "rooms",
    };
    if (issue.rooms) out.rooms = issue.rooms;
    if (issue.door !== undefined) out.door = issue.door;
    if (issue.system !== undefined) {
      out.system = issue.system;
      out.systemId = ship.blueprint.systems[issue.system]?.system;
    }
    return out;
  });
  return [
    ...core,
    ...layoutChecks(ship),
    ...systemChecks(ship, sizes),
    ...artChecks(ship, art),
    ...loadoutChecks(ship, catalogs),
    ...textChecks(ship, texts),
  ];
}

/** What a check is about, to select it on the canvas. */
export function selectionOfIssue(issue: CheckIssue): Selection {
  if (issue.door !== undefined) return selectionOf({ kind: "door", index: issue.door });
  if (issue.mount !== undefined) return selectionOf({ kind: "mount", index: issue.mount });
  if (issue.gib !== undefined) return selectionOf({ kind: "gib", index: issue.gib });
  if (issue.weapon !== undefined) return selectionOf({ kind: "weapon", index: issue.weapon });
  if (issue.drone !== undefined) return selectionOf({ kind: "drone", index: issue.drone });
  if (issue.rooms && issue.rooms.length > 0)
    return selectionOf(...issue.rooms.map((id) => ({ kind: "room" as const, id })));
  return EMPTY_SELECTION;
}
