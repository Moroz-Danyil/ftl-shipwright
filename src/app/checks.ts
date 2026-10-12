/** The ship's checks (from the core's validation) and what each one points at. */
import { useMemo } from "react";
import { validateShip, type Ship, type ValidationIssue } from "../core";
import type { Selection } from "./store";

export function useChecks(ship: Ship | undefined): ValidationIssue[] {
  return useMemo(() => (ship ? validateShip(ship) : []), [ship]);
}

/** What a check is about, to select it on the canvas. */
export function selectionOfIssue(issue: ValidationIssue): Selection | null {
  if (issue.door !== undefined) return { kind: "door", index: issue.door };
  if (issue.rooms && issue.rooms.length > 0) return { kind: "room", id: issue.rooms[0] };
  return null;
}
