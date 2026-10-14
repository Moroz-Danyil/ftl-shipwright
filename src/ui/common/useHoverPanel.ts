/** Which entry of a list the hover panel shows, and where it goes. */
import { useState } from "react";

/**
 * Where the panel goes, level with the entry: just right of the inspector
 * (`left` is the panel's left edge), or for the tool rail just left of the
 * rail (`left` is where the panel's right edge goes). In the slot bar's
 * picker it goes right of the picker, or left of it when the window has no
 * room on the right.
 */
export interface Anchor {
  left: number;
  top: number;
  side: "right" | "left";
}

const GAP = 12;
/** The width of the hover panel (as in the styles), to see whether it fits. */
const PANEL_WIDTH = 300;

export function anchorFor(entry: HTMLElement): Anchor {
  const box = entry.getBoundingClientRect();
  const rail = entry.closest(".ed-rail");
  if (rail) return { left: rail.getBoundingClientRect().left - GAP, top: box.top, side: "left" };
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
