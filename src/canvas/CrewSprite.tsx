/**
 * A crew member drawn as the game draws it: the frame of the race's picture
 * sheet, with the race's colour layers over it, each tinted with the colour
 * the member gets (see `crewColours.ts`).
 */
import { useId } from "react";
import type { Rect } from "../core";
import { useEditor } from "../app/store";
import { crewLayers, tintMatrix } from "./crewColours";
import { SheetSprite } from "./SheetSprite";

interface Props {
  race: string;
  /** The member's place in the crew list; it decides the colours. */
  member: number;
  /** The picture sheet and the frame in it. */
  path: string;
  frame: Rect;
  x?: number;
  y?: number;
  transform?: string;
  testId?: string;
}

export function CrewSprite({ race, member, path, frame, x = 0, y = 0, transform, testId }: Props) {
  const races = useEditor((s) => s.game.data?.catalogs.races);
  const id = useId().replace(/[^A-Za-z0-9_-]/g, "");
  const layers = crewLayers(
    races?.find((r) => r.name === race),
    path,
    member
  );
  return (
    <g transform={transform} data-testid={testId} data-layers={layers.length || undefined}>
      <SheetSprite path={path} frame={frame} x={x} y={y} />
      {layers.map((layer, i) => (
        <g key={i} filter={`url(#crew-tint-${id}-${i})`}>
          <filter
            id={`crew-tint-${id}-${i}`}
            x="0"
            y="0"
            width="1"
            height="1"
            colorInterpolationFilters="sRGB"
          >
            <feColorMatrix type="matrix" values={tintMatrix(layer.colour)} />
          </filter>
          <SheetSprite path={layer.path} frame={frame} x={x} y={y} />
        </g>
      ))}
    </g>
  );
}
