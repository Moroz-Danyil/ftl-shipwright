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

  it("goes below the tool bar, from the left edge of the tool", () => {
    const bar = document.createElement("div");
    bar.className = "cv-toolbar";
    const tool = document.createElement("button");
    bar.append(tool);
    box(bar, 352, 52, 420, 40);
    box(tool, 450, 57, 110, 30);
    expect(anchorFor(tool)).toEqual({ left: 450, top: 104, side: "below" });
  });
});
