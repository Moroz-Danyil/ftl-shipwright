import { describe, expect, it } from "vitest";
import { canRedo, canUndo, createHistory, record, redo, undo } from "./history";

describe("history", () => {
  it("records, undoes and redoes snapshots", () => {
    let h = createHistory("a");
    h = record(h, "b");
    h = record(h, "c");
    expect(h).toEqual({ past: ["a", "b"], present: "c", future: [] });
    h = undo(h);
    expect(h.present).toBe("b");
    expect(canRedo(h)).toBe(true);
    h = undo(h);
    expect(h.present).toBe("a");
    expect(canUndo(h)).toBe(false);
    expect(undo(h)).toBe(h);
    h = redo(h);
    expect(h).toEqual({ past: ["a"], present: "b", future: ["c"] });
  });

  it("drops the redo steps on a new change", () => {
    let h = record(record(createHistory(1), 2), 3);
    h = record(undo(h), 4);
    expect(h).toEqual({ past: [1, 2], present: 4, future: [] });
    expect(redo(h)).toBe(h);
  });

  it("records nothing for an unchanged state", () => {
    const value = { x: 1 };
    const h = createHistory(value);
    expect(record(h, value)).toBe(h);
  });

  it("keeps at most the limit of past states", () => {
    let h = createHistory(0);
    for (let i = 1; i <= 10; i++) h = record(h, i, 3);
    expect(h.past).toEqual([7, 8, 9]);
    expect(h.present).toBe(10);
  });
});
