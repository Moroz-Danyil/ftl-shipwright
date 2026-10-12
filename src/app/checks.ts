/**
 * The ship's checks: the core's validation plus the system checks of the
 * editor, each with the workspace and selection it is about.
 */
import { useMemo } from "react";
import { validateShip, type FileSource, type Ship, type ValidationCode } from "../core";
import { EMPTY_SELECTION, selectionOf, type Selection } from "./selection";
import { useInteriorSizes, type PictureSize } from "./systems/interiors";
import { interiorFits, roomsWithSeveralInstalled, roomsWithUnusualMix } from "./systems/rules";
import type { WorkspaceId } from "./workspaces";

export type SystemCheckCode = "several-installed" | "unusual-mix" | "cloak-interior-size";
export type CheckCode = ValidationCode | SystemCheckCode;

export interface CheckIssue {
  code: CheckCode;
  /** Room ids involved, if any. */
  rooms?: number[];
  /** Index into `layout.doors`, if a door is involved. */
  door?: number;
  /** Index into `blueprint.systems`, if a system is involved. */
  system?: number;
  /** The workspace that shows what the check is about. */
  workspace: WorkspaceId;
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

/** Every check of the ship, the core's first. */
export function allChecks(ship: Ship, sizes: Record<string, PictureSize> = {}): CheckIssue[] {
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
  return [...core, ...systemChecks(ship, sizes)];
}

/** The checks of a ship; interior sizes are read from `source` (the ship's pictures). */
export function useChecks(ship: Ship | undefined, source?: FileSource): CheckIssue[] {
  const sizes = useInteriorSizes(source, ship);
  return useMemo(() => (ship ? allChecks(ship, sizes) : []), [ship, sizes]);
}

/** What a check is about, to select it on the canvas. */
export function selectionOfIssue(issue: CheckIssue): Selection {
  if (issue.door !== undefined) return selectionOf({ kind: "door", index: issue.door });
  if (issue.rooms && issue.rooms.length > 0)
    return selectionOf(...issue.rooms.map((id) => ({ kind: "room" as const, id })));
  return EMPTY_SELECTION;
}
