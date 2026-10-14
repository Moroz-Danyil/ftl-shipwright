/** A picture of the game (the mod's own picture first) drawn at its own size on the hangar screen. */
import { useEditor } from "../../app/store";
import { usePicture } from "../pictures";

interface Props {
  path: string;
  x: number;
  y: number;
  /** Mirrored left to right, in place. */
  mirror?: boolean;
  className?: string;
  testId?: string;
}

export function ScreenPicture({ path, x, y, mirror = false, className, testId }: Props) {
  const view = useEditor((s) => s.game.data?.view);
  const picture = usePicture(view, path);
  if (!picture) return null;
  return (
    <image
      className={className}
      data-testid={testId}
      href={picture.url}
      x={x}
      y={y}
      width={picture.width}
      height={picture.height}
      transform={mirror ? `translate(${2 * x + picture.width} 0) scale(-1 1)` : undefined}
    />
  );
}
