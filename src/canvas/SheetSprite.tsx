/** One frame of a sprite sheet from the game files, drawn at a place on the canvas. */
import type { Rect } from "../core";
import { useEditor } from "../app/store";
import { usePicture } from "./pictures";

interface Props {
  /** The sheet picture's path in the game files. */
  path: string;
  /** The frame in the sheet. */
  frame: Rect;
  /** Where the frame's top-left corner goes (before `transform`). */
  x?: number;
  y?: number;
  transform?: string;
  className?: string;
  testId?: string;
}

export function SheetSprite({ path, frame, x = 0, y = 0, transform, className, testId }: Props) {
  const view = useEditor((s) => s.game.data?.view);
  const picture = usePicture(view, path);
  if (!picture) return null;
  return (
    <g transform={transform} className={className} data-testid={testId}>
      <svg
        x={x}
        y={y}
        width={frame.w}
        height={frame.h}
        viewBox={`${frame.x} ${frame.y} ${frame.w} ${frame.h}`}
        overflow="hidden"
      >
        <image href={picture.url} width={picture.width} height={picture.height} />
      </svg>
    </g>
  );
}
