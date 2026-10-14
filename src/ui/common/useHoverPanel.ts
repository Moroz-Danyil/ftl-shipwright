/** Which entry of a list the hover panel shows, and where it goes. */
import { useState } from "react";

/**
 * Where the panel goes. Level with the entry just right of the inspector
 * (`left` is the panel's left edge). In the slot bar's picker right of the
 * picker, or left of it when the window has no room on the right (`left` is
 * then where the panel's right edge goes). For the tool bar below the bar,
 * from the entry's left edge (`top` is the panel's top edge).
 */
export interface Anchor {
  left: number;
  top: number;
  side: "right" | "left" | "below";
}

const GAP = 12;
/** The width of the hover panel (as in the styles), to see whether it fits. */
const PANEL_WIDTH = 300;

export function anchorFor(entry: HTMLElement): Anchor {
  const box = entry.getBoundingClientRect();
  const bar = entry.closest(".cv-toolbar");
  if (bar) return { left: box.left, top: bar.getBoundingClientRect().bottom + GAP, side: "below" };
  const picker = entry.closest(".lo-picker")?.getBoundingClientRect();
  if (picker) {
    const fits = picker.right + GAP + PANEL_WIDTH <= window.innerWidth;
    return fits
      ? { left: picker.right + GAP, top: box.top, side: "right" }
      : { left: picker.left - GAP, top: box.top, side: "left" };
  }
  const inspector = entry.closest(".ed-inspector")?.getBoundingClientRect();
  return { left: (inspector?.right ?? box.right) + GAP, top: box.top, side: "right" };
}

/** Which entry of a list the panel shows, and where; `show` and `hide` go on the entries' events. */
export function useHoverPanel<T>() {
  const [shown, setShown] = useState<{ value: T; anchor: Anchor }>();
  return {
    shown,
    show: (value: T, entry: HTMLElement) => setShown({ value, anchor: anchorFor(entry) }),
    hide: () => setShown(undefined),
  };
}
