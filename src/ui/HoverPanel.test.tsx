// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { anchorFor } from "./common/useHoverPanel";

function box(el: HTMLElement, left: number, top: number, width: number, height: number) {
  el.getBoundingClientRect = () =>
    ({
      x: left,
      y: top,
      left,
      top,
      right: left + width,
      bottom: top + height,
      width,
      height,
      toJSON: () => ({}),
    }) as DOMRect;
}

describe("hover panel anchor", () => {
  it("goes right of the inspector for its entries", () => {
    const inspector = document.createElement("aside");
    inspector.className = "ed-inspector";
    const entry = document.createElement("button");
    inspector.append(entry);
    box(inspector, 0, 40, 340, 700);
    box(entry, 16, 200, 300, 30);
    expect(anchorFor(entry)).toEqual({ left: 352, top: 200, side: "right" });
  });

  it("goes left of the tool rail for its tools", () => {
    const rail = document.createElement("aside");
    rail.className = "ed-rail";
    const tool = document.createElement("button");
    rail.append(tool);
    box(rail, 1200, 40, 80, 700);
    box(tool, 1207, 120, 66, 62);
    expect(anchorFor(tool)).toEqual({ left: 1188, top: 120, side: "left" });
  });
});
