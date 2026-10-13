/** Which entry of a list the hover panel shows, and where it goes. */
import { useState } from "react";

/** Where the panel goes: just right of the inspector, level with the entry. */
export interface Anchor {
  left: number;
  top: number;
}

function anchorFor(entry: HTMLElement): Anchor {
  const box = entry.getBoundingClientRect();
  const inspector = entry.closest(".ed-inspector")?.getBoundingClientRect();
  return { left: (inspector?.right ?? box.right) + 12, top: box.top };
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
