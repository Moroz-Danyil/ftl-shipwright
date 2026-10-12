/** The ship's checks (from the core's validation) and what each one points at. */
import { useMemo } from "react";
import { validateShip, type Ship, type ValidationIssue } from "../core";
import { EMPTY_SELECTION, selectionOf, type Selection } from "./selection";

export function useChecks(ship: Ship | undefined): ValidationIssue[] {
  return useMemo(() => (ship ? validateShip(ship) : []), [ship]);
}

/** What a check is about, to select it on the canvas. */
export function selectionOfIssue(issue: ValidationIssue): Selection {
  if (issue.door !== undefined) return selectionOf({ kind: "door", index: issue.door });
  if (issue.rooms && issue.rooms.length > 0)
    return selectionOf(...issue.rooms.map((id) => ({ kind: "room" as const, id })));
  return EMPTY_SELECTION;
}
