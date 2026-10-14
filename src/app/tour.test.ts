import { describe, expect, it } from "vitest";
import { DEFAULT_KEYS } from "./keys";
import { TOUR_STEPS, placeCard, tourKeys } from "./tour";

const area = { width: 1000, height: 800 };
const card = { width: 300, height: 200 };

describe("tour steps", () => {
  it("has the eleven steps in order, each with its own part", () => {
    expect(TOUR_STEPS.map((s) => s.id)).toEqual([
      "workspaces",
      "shipInspector",
      "roomsInspector",
      "hullInspector",
      "tools",
      "canvas",
      "slots",
      "view",
      "undo",
      "overview",
      "settings",
    ]);
    expect(new Set(TOUR_STEPS.map((s) => s.target)).size).toBe(TOUR_STEPS.length);
  });

  it("names the current keys", () => {
    const keys = tourKeys({ ...DEFAULT_KEYS, undo: "Ctrl+U", "tool.room": "K" });
    expect(keys.workspace).toEqual({ ship: "1", rooms: "2", hull: "3" });
    expect(keys.tool.room).toBe("K");
    expect(keys.tool.gib).toBe("G");
    expect(keys.undo).toEqual(["Ctrl+U"]);
    expect(keys.redo).toEqual(["Ctrl+Y", "Ctrl+Shift+Z"]);
    expect(keys.pan).toEqual(["Space"]);
    expect(keys.delete).toEqual(["D", "Del", "Backspace"]);
  });
});

describe("where the tour's card goes", () => {
  it("goes below a part at the top, centred on it", () => {
    expect(placeCard({ x: 400, y: 10, width: 100, height: 30 }, card, area)).toEqual({
      x: 300,
      y: 54,
    });
  });

  it("goes right of a tall part on the left", () => {
    expect(placeCard({ x: 0, y: 50, width: 300, height: 750 }, card, area)).toEqual({
      x: 314,
      y: 325,
    });
  });

  it("goes above a part at the bottom right, inside the window", () => {
    expect(placeCard({ x: 850, y: 740, width: 140, height: 40 }, card, area)).toEqual({
      x: 688,
      y: 526,
    });
  });

  it("goes left of a part that leaves room only there", () => {
    expect(placeCard({ x: 340, y: 0, width: 660, height: 800 }, card, area)).toEqual({
      x: 26,
      y: 300,
    });
  });

  it("goes on the side with the most room when it fits nowhere, kept in the window", () => {
    const at = placeCard({ x: 100, y: 100, width: 800, height: 600 }, card, area);
    expect(at.x).toBeGreaterThanOrEqual(12);
    expect(at.y).toBeGreaterThanOrEqual(12);
    expect(at.x + card.width).toBeLessThanOrEqual(area.width - 12);
    expect(at.y + card.height).toBeLessThanOrEqual(area.height - 12);
  });

  it("goes in the middle with nothing to point at", () => {
    expect(placeCard(null, card, area)).toEqual({ x: 350, y: 300 });
  });
});
