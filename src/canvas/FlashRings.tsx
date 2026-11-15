/**
 * The objects a click in the Overview points at, outlined in amber while
 * they flash.
 */
import type { Ship } from "../core";
import type { ShipArt } from "../app/art/model";
import { useEditor } from "../app/store";
import { objectRectsPx } from "./objectRects";

/** How far the outline lies outside an object (ship pixels). */
const RING_GAP = 4;

export function FlashRings({ ship, art }: { ship: Ship; art: ShipArt }) {
  const flash = useEditor((s) => s.flash);
  if (!flash) return null;
  return (
    <g className="cv-flash" key={flash.key} data-testid="flash-rings">
      {objectRectsPx(ship, art, flash.objects).map((r, i) => (
        <rect
          key={i}
          x={r.x - RING_GAP}
          y={r.y - RING_GAP}
          width={r.w + 2 * RING_GAP}
          height={r.h + 2 * RING_GAP}
          rx={3}
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </g>
  );
}
