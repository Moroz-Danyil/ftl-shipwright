/**
 * Small pictures of weapons, drones, augments and crew races, drawn from the
 * game's sprite sheets and pictures.
 */
import { raceWalkDownFrame, weaponRestingFrame, type Rect } from "../../core";
import { dronePicturePaths, findItem } from "../../app/loadout/catalog";
import { useEditor } from "../../app/store";
import { usePicture } from "../../canvas/pictures";

interface Frame {
  path: string;
  rect: Rect;
  sheet: { w: number; h: number };
}

/**
 * One frame of a sprite sheet, scaled to fit a box. The inner `svg` clips the
 * sheet to the frame, so neighbouring frames never show beside a narrow one.
 * `turned` lays it on its side and mirrors it, as the game draws weapons on
 * the player's ship: a weapon drawn barrel-up then points right, its left
 * side facing down.
 */
function FramePicture({
  frame,
  size,
  turned = false,
}: {
  frame: Frame | undefined;
  size: number;
  turned?: boolean;
}) {
  const view = useEditor((s) => s.game.data?.view);
  const picture = usePicture(view, frame?.path);
  if (!frame || !picture)
    return <span className="item-pic" style={{ width: size, height: size }} />;
  const { rect } = frame;
  const [w, h] = turned ? [rect.h, rect.w] : [rect.w, rect.h];
  return (
    <svg
      className="item-pic"
      width={size}
      height={size}
      viewBox={`0 0 ${w} ${h}`}
      aria-hidden="true"
    >
      <g transform={turned ? `matrix(0 -1 -1 0 ${rect.h} ${rect.w})` : undefined}>
        <svg width={rect.w} height={rect.h} viewBox={`${rect.x} ${rect.y} ${rect.w} ${rect.h}`}>
          <image href={picture.url} width={frame.sheet.w} height={frame.sheet.h} />
        </svg>
      </g>
    </svg>
  );
}

export function WeaponPicture({ name, size = 40 }: { name: string; size?: number }) {
  const data = useEditor((s) => s.game.data);
  const item = findItem(data, "weapon", name);
  const art = item?.kind === "weapon" ? item.entry.weaponArt : undefined;
  const frame = data && art ? weaponRestingFrame(data.animations, art) : undefined;
  return <FramePicture frame={frame} size={size} turned />;
}

export function RacePicture({ race, size = 32 }: { race: string; size?: number }) {
  const data = useEditor((s) => s.game.data);
  const frame = data ? raceWalkDownFrame(data.animations, race) : undefined;
  return <FramePicture frame={frame} size={size} />;
}

/** A drone's `_base` picture, else its `_off` picture, else nothing. */
export function DronePicture({ name, size = 40 }: { name: string; size?: number }) {
  const data = useEditor((s) => s.game.data);
  const item = findItem(data, "drone", name);
  const [base, off] = item?.kind === "drone" ? dronePicturePaths(item.entry) : [];
  const first = usePicture(data?.view, base);
  const second = usePicture(data?.view, off);
  const picture = first ?? second;
  return (
    <span className="item-pic" style={{ width: size, height: size }}>
      {picture && <img src={picture.url} alt="" />}
    </span>
  );
}

/** Augments have no picture in the game; a neutral chip mark stands in. */
export function AugmentIcon({ size = 40 }: { size?: number }) {
  return (
    <svg
      className="item-pic item-pic--icon"
      width={size}
      height={size}
      viewBox="0 0 20 20"
      aria-hidden="true"
    >
      <rect
        x="4"
        y="4"
        width="12"
        height="12"
        rx="2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M8 1v3M12 1v3M8 16v3M12 16v3M1 8h3M1 12h3M16 8h3M16 12h3"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}
