/**
 * The ship's pictures: shield, hull, floor, cloak and gibs. During the
 * explosion preview only the gibs are drawn, moving apart.
 */
import { memo } from "react";
import {
  cloakPositionPx,
  floorPositionPx,
  gibPositionPx,
  hullRectPx,
  shieldEllipsePx,
  type FileSource,
  type Point,
  type Ship,
} from "../core";
import type { PictureRef, ShipArt } from "../app/art/model";
import { gibMotionAt } from "../app/art/explosion";
import type { LayerId } from "../app/store";
import { usePictureRef } from "./pictures";

interface PictureProps {
  source: FileSource;
  picture: PictureRef | null | undefined;
  at: Point;
  className: string;
  /** Draw at this size instead of the picture's own. */
  size?: { width: number; height: number };
  transform?: string;
  testId?: string;
}

function Picture({ source, picture, at, className, size, transform, testId }: PictureProps) {
  const loaded = usePictureRef(source, picture);
  if (!loaded) return null;
  return (
    <image
      className={className}
      data-testid={testId}
      href={loaded.url}
      x={at.x}
      y={at.y}
      width={size?.width ?? loaded.width}
      height={size?.height ?? loaded.height}
      transform={transform}
      preserveAspectRatio="none"
    />
  );
}

/** The shield picture fills the shield ellipse's box; without a (readable) picture the ellipse is drawn. */
function Shield({ ship, art }: { ship: Ship; art: ShipArt }) {
  const ellipse = shieldEllipsePx(ship.layout);
  const loaded = usePictureRef(art.source, art.shield);
  if (!ellipse || ellipse.rx <= 0 || ellipse.ry <= 0) return null;
  if (loaded)
    return (
      <image
        className="cv-shield-picture"
        href={loaded.url}
        x={ellipse.cx - ellipse.rx}
        y={ellipse.cy - ellipse.ry}
        width={2 * ellipse.rx}
        height={2 * ellipse.ry}
        preserveAspectRatio="none"
      />
    );
  return (
    <ellipse
      className="cv-shield-ellipse"
      data-testid="shield-ellipse"
      cx={ellipse.cx}
      cy={ellipse.cy}
      rx={ellipse.rx}
      ry={ellipse.ry}
    />
  );
}

function Gibs({ ship, art, seconds }: { ship: Ship; art: ShipArt; seconds?: number }) {
  const { layout, layoutXml } = ship;
  return (
    <g>
      {layoutXml.gibs.map((gib, i) => {
        const at = gibPositionPx(layout, layoutXml, gib);
        const motion = seconds === undefined ? undefined : gibMotionAt(gib, i, seconds);
        return (
          <Picture
            key={i}
            source={art.source}
            picture={art.gibs[i]}
            at={motion ? { x: at.x + motion.dx, y: at.y + motion.dy } : at}
            transform={
              motion ? `rotate(${motion.angle} ${at.x + motion.dx} ${at.y + motion.dy})` : undefined
            }
            className="cv-gib"
            testId={`gib-${i + 1}`}
          />
        );
      })}
    </g>
  );
}

interface Props {
  ship: Ship;
  art: ShipArt;
  layers: Record<LayerId, boolean>;
  /** Show the gibs whatever the layer says (Gib tool). */
  showGibs: boolean;
  /** Seconds into the explosion preview, when it plays. */
  explosion?: number;
}

export const ShipPictures = memo(function ShipPictures({
  ship,
  art,
  layers,
  showGibs,
  explosion,
}: Props) {
  if (explosion !== undefined) return <Gibs ship={ship} art={art} seconds={explosion} />;
  const { layout, layoutXml } = ship;
  return (
    <g>
      {layers.shield && <Shield ship={ship} art={art} />}
      {layers.hull && (
        <Picture
          source={art.source}
          picture={art.hull}
          at={hullRectPx(layout, layoutXml)}
          className="cv-hull"
          testId="hull-picture"
        />
      )}
      {layers.floor && (
        <Picture
          source={art.source}
          picture={art.floor}
          at={floorPositionPx(layout, layoutXml)}
          className="cv-floor"
        />
      )}
      {layers.cloak && (
        <Picture
          source={art.source}
          picture={art.cloak}
          at={cloakPositionPx(layout, layoutXml)}
          className="cv-cloak"
        />
      )}
      {(layers.gibs || showGibs) && <Gibs ship={ship} art={art} />}
    </g>
  );
});
