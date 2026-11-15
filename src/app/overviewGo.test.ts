import { describe, expect, it } from "vitest";
import { OVERVIEW_ITEMS, type OverviewItemId } from "./overview";
import { overviewTarget } from "./overviewGo";
import type { CheckIssue } from "./checks";

/** The items whose place is only their objects on the canvas. */
const OBJECTS_ONLY: OverviewItemId[] = ["doors", "reach", "airlocks"];

describe("overviewTarget", () => {
  const all = Object.values(OVERVIEW_ITEMS).flat() as OverviewItemId[];

  it("gives every item a section or a field, unless its place is its objects", () => {
    for (const id of all) {
      const target = overviewTarget({ id, issues: [] });
      if (OBJECTS_ONLY.includes(id)) expect(target).toEqual({});
      else expect(target.section ?? target.field, id).toBeTruthy();
    }
  });

  it("points at the field of the check's system, weapon or slot count", () => {
    const issue = (patch: Partial<CheckIssue>): CheckIssue => ({
      code: "missing-core-system",
      workspace: "rooms",
      ...patch,
    });
    expect(overviewTarget({ id: "coreSystems", issues: [issue({ systemId: "oxygen" })] })).toEqual({
      section: "rooms-palette",
      field: "system:oxygen",
    });
    expect(
      overviewTarget({
        id: "interiors",
        issues: [issue({ code: "cloak-interior-size", systemId: "cloaking" })],
      })
    ).toEqual({ section: "room-systems", field: "interior:cloaking" });
    expect(
      overviewTarget({
        id: "knownItems",
        issues: [issue({ code: "unknown-drone", drone: 1, workspace: "ship" })],
      })
    ).toEqual({ section: "ship-drones", field: "drone:1" });
    expect(
      overviewTarget({
        id: "slots",
        issues: [issue({ code: "too-many-drones", workspace: "ship" })],
      })
    ).toEqual({ section: "ship-stats", field: "droneSlots" });
  });
});
