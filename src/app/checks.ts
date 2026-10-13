/**
 * The ship's checks: the core's validation plus the system checks of the
 * editor, each with the workspace and selection it is about.
 */
import { useMemo } from "react";
import { validateShip, type Catalogs, type Ship, type ValidationCode } from "../core";
import type { ShipArt } from "./art/model";
import { crewTotal } from "./details/rules";
import { useEditor } from "./store";
import { EMPTY_SELECTION, selectionOf, type Selection } from "./selection";
import { useInteriorSizes, type PictureSize } from "./systems/interiors";
import { interiorFits, roomsWithSeveralInstalled, roomsWithUnusualMix } from "./systems/rules";
import type { WorkspaceId } from "./workspaces";

export type SystemCheckCode = "several-installed" | "unusual-mix" | "cloak-interior-size";
export type ArtCheckCode = "no-hull" | "few-mounts" | "gib-no-picture" | "mount-gib-missing";
export type LoadoutCheckCode =
  | "too-many-weapons"
  | "too-many-drones"
  | "unknown-weapon"
  | "unknown-drone"
  | "no-crew"
  | "no-hull-points";
export type CheckCode = ValidationCode | SystemCheckCode | ArtCheckCode | LoadoutCheckCode;

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
  /** The workspace that shows what the check is about. */
  workspace: WorkspaceId;
  /** Problems keep the ship from working; the rest are things to look at. */
  severity?: "problem";
}

const SYSTEM_CODES: ReadonlySet<CheckCode> = new Set(["system-unknown-room"]);

/** The editor's own system checks; `sizes` are the interior picture sizes by name. */
export function systemChecks(ship: Ship, sizes: Record<string, PictureSize>): CheckIssue[] {
  const issues: CheckIssue[] = [];
  for (const id of roomsWithSeveralInstalled(ship))
    issues.push({ code: "several-installed", rooms: [id], workspace: "systems" });
  for (const id of roomsWithUnusualMix(ship))
    issues.push({ code: "unusual-mix", rooms: [id], workspace: "systems" });
  ship.blueprint.systems.forEach((s, index) => {
    if (s.system !== "cloaking" || !s.img) return;
    const room = ship.layout.rooms.find((r) => r.id === s.room);
    const size = sizes[s.img];
    if (room && size && !interiorFits(room, size))
      issues.push({
        code: "cloak-interior-size",
        rooms: [room.id],
        system: index,
        workspace: "systems",
      });
  });
  return issues;
}

/** The Hull & art checks: the hull picture, enough mounts, gib pictures and mount links. */
export function artChecks(ship: Ship, art: ShipArt | undefined): CheckIssue[] {
  const issues: CheckIssue[] = [];
  const xml = ship.layoutXml;
  if (art && !art.hull) issues.push({ code: "no-hull", workspace: "art", severity: "problem" });
  if ((ship.blueprint.weaponSlots ?? 0) > xml.mounts.length)
    issues.push({ code: "few-mounts", workspace: "art" });
  if (art)
    xml.gibs.forEach((_, gib) => {
      if (!art.gibs[gib]) issues.push({ code: "gib-no-picture", gib, workspace: "art" });
    });
  xml.mounts.forEach((m, mount) => {
    if (m.gib > xml.gibs.length)
      issues.push({ code: "mount-gib-missing", mount, workspace: "art" });
  });
  return issues;
}

/** The Loadout and Details checks: items beyond their slots, items the game does not know, crew and hull. */
export function loadoutChecks(ship: Ship, catalogs: Catalogs | undefined): CheckIssue[] {
  const issues: CheckIssue[] = [];
  const bp = ship.blueprint;
  const weapons = bp.weaponList?.items ?? [];
  const drones = bp.droneList?.items ?? [];
  if (bp.weaponSlots !== undefined && weapons.length > bp.weaponSlots)
    issues.push({ code: "too-many-weapons", workspace: "loadout" });
  if (bp.droneSlots !== undefined && drones.length > bp.droneSlots)
    issues.push({ code: "too-many-drones", workspace: "loadout" });
  if (catalogs) {
    weapons.forEach((item, weapon) => {
      if (!catalogs.weapons.some((w) => w.name === item))
        issues.push({ code: "unknown-weapon", weapon, item, workspace: "loadout" });
    });
    drones.forEach((item, drone) => {
      if (!catalogs.drones.some((d) => d.name === item))
        issues.push({ code: "unknown-drone", drone, item, workspace: "loadout" });
    });
  }
  if (crewTotal(ship) === 0) issues.push({ code: "no-crew", workspace: "details" });
  if (bp.health === 0)
    issues.push({ code: "no-hull-points", workspace: "details", severity: "problem" });
  return issues;
}

/** Every check of the ship, the core's first. */
export function allChecks(
  ship: Ship,
  sizes: Record<string, PictureSize> = {},
  art?: ShipArt,
  catalogs?: Catalogs
): CheckIssue[] {
  const core: CheckIssue[] = validateShip(ship).map((issue) => {
    const out: CheckIssue = {
      code: issue.code,
      workspace: SYSTEM_CODES.has(issue.code) ? "systems" : "layout",
    };
    if (issue.rooms) out.rooms = issue.rooms;
    if (issue.door !== undefined) out.door = issue.door;
    if (issue.system !== undefined) out.system = issue.system;
    return out;
  });
  return [
    ...core,
    ...systemChecks(ship, sizes),
    ...artChecks(ship, art),
    ...loadoutChecks(ship, catalogs),
  ];
}

/** The checks of a ship with its pictures (interior sizes are read from the pictures' source). */
export function useChecks(ship: Ship | undefined, art?: ShipArt): CheckIssue[] {
  const sizes = useInteriorSizes(art?.source, ship);
  const catalogs = useEditor((s) => s.game.data?.catalogs);
  return useMemo(
    () => (ship ? allChecks(ship, sizes, art, catalogs) : []),
    [ship, sizes, art, catalogs]
  );
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
