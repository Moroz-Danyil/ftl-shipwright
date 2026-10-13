/**
 * The ship's checks: the core's validation plus the system checks of the
 * editor, each with the workspace and selection it is about.
 */
import { useMemo } from "react";
import { validateShip, type Ship, type ValidationCode } from "../core";
import type { ShipArt } from "./art/model";
import { EMPTY_SELECTION, selectionOf, type Selection } from "./selection";
import { useInteriorSizes, type PictureSize } from "./systems/interiors";
import { interiorFits, roomsWithSeveralInstalled, roomsWithUnusualMix } from "./systems/rules";
import type { WorkspaceId } from "./workspaces";

export type SystemCheckCode = "several-installed" | "unusual-mix" | "cloak-interior-size";
export type ArtCheckCode = "no-hull" | "few-mounts" | "gib-no-picture" | "mount-gib-missing";
export type CheckCode = ValidationCode | SystemCheckCode | ArtCheckCode;

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

/** Every check of the ship, the core's first. */
export function allChecks(
  ship: Ship,
  sizes: Record<string, PictureSize> = {},
  art?: ShipArt
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
  return [...core, ...systemChecks(ship, sizes), ...artChecks(ship, art)];
}

/** The checks of a ship with its pictures (interior sizes are read from the pictures' source). */
export function useChecks(ship: Ship | undefined, art?: ShipArt): CheckIssue[] {
  const sizes = useInteriorSizes(art?.source, ship);
  return useMemo(() => (ship ? allChecks(ship, sizes, art) : []), [ship, sizes, art]);
}

/** What a check is about, to select it on the canvas. */
export function selectionOfIssue(issue: CheckIssue): Selection {
  if (issue.door !== undefined) return selectionOf({ kind: "door", index: issue.door });
  if (issue.mount !== undefined) return selectionOf({ kind: "mount", index: issue.mount });
  if (issue.gib !== undefined) return selectionOf({ kind: "gib", index: issue.gib });
  if (issue.rooms && issue.rooms.length > 0)
    return selectionOf(...issue.rooms.map((id) => ({ kind: "room" as const, id })));
  return EMPTY_SELECTION;
}
