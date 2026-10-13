/**
 * Weapon mounts with their numbers; a mount with an equipped weapon (the
 * n-th weapon of the ship's list on the n-th mount) shows the weapon's
 * resting picture as `weaponDraw.ts` places it.
 */
import { memo } from "react";
import {
  mountPositionPx,
  type FileSource,
  type Mount,
  type Point,
  type ShipLayout,
  type ShipLayoutXml,
} from "../core";
import { useEditor } from "../app/store";
import { usePicture } from "./pictures";
import { weaponTransform, type WeaponFrame } from "./weaponDraw";

const MARKER_RADIUS = 9;
const BADGE_RADIUS = 7;

function WeaponOnMount({
  source,
  frame,
  at,
  mount,
}: {
  source: FileSource;
  frame: WeaponFrame;
  at: Point;
  mount: Mount;
}) {
  const picture = usePicture(source, frame.path);
  if (!picture) return null;
  const { rect } = frame;
  return (
    <g transform={weaponTransform(at, frame.mountPoint, mount)} className="cv-weapon">
      <svg width={rect.w} height={rect.h} viewBox={`${rect.x} ${rect.y} ${rect.w} ${rect.h}`}>
        <image href={picture.url} width={frame.sheet.w} height={frame.sheet.h} />
      </svg>
    </g>
  );
}

interface Props {
  layout: ShipLayout;
  layoutXml: ShipLayoutXml;
  selected: number[];
  weapons: Array<WeaponFrame | undefined>;
}

export const MountsLayer = memo(function MountsLayer({
  layout,
  layoutXml,
  selected,
  weapons,
}: Props) {
  const source = useEditor((s) => s.game.data?.view);
  return (
    <g>
      {layoutXml.mounts.map((mount, i) => {
        const p = mountPositionPx(layout, layoutXml, mount);
        const frame = weapons[i];
        const isSelected = selected.includes(i);
        const r = frame ? BADGE_RADIUS : MARKER_RADIUS;
        return (
          <g
            key={i}
            className={frame ? "cv-mount cv-mount--armed" : "cv-mount"}
            data-testid={`mount-${i + 1}`}
            data-selected={isSelected || undefined}
          >
            {frame && source && (
              <WeaponOnMount source={source} frame={frame} at={p} mount={mount} />
            )}
            {isSelected && (
              <circle
                className="cv-selection-ring"
                cx={p.x}
                cy={p.y}
                r={r + 4}
                vectorEffect="non-scaling-stroke"
              />
            )}
            <circle cx={p.x} cy={p.y} r={r} />
            <text x={p.x} y={p.y} dy="0.35em" textAnchor="middle">
              {i + 1}
            </text>
          </g>
        );
      })}
    </g>
  );
});
