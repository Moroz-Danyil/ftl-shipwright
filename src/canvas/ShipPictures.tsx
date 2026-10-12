/**
 * The ship's pictures from the game: shield, hull, floor, cloak and gibs.
 */
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
import type { LayerId, ShipPictureRefs } from "../app/store";
import { usePicture } from "./pictures";

interface PictureProps {
  source: FileSource;
  path: string | null | undefined;
  at: Point;
  className: string;
  /** Draw centred on `at` instead of from its top-left corner. */
  centred?: boolean;
}

function Picture({ source, path, at, className, centred }: PictureProps) {
  const picture = usePicture(source, path);
  if (!picture) return null;
  const x = centred ? at.x - picture.width / 2 : at.x;
  const y = centred ? at.y - picture.height / 2 : at.y;
  return (
    <image
      className={className}
      href={picture.url}
      x={x}
      y={y}
      width={picture.width}
      height={picture.height}
      preserveAspectRatio="none"
    />
  );
}

/** The shield picture centred on the shield ellipse, or the ellipse itself when there is none. */
function Shield({ ship, pictures }: { ship: Ship; pictures: ShipPictureRefs }) {
  const ellipse = shieldEllipsePx(ship.layout);
  const picture = usePicture(pictures.source, pictures.paths.shield);
  if (!ellipse) return null;
  if (picture)
    return (
      <image
        className="cv-shield-picture"
        href={picture.url}
        x={ellipse.cx - picture.width / 2}
        y={ellipse.cy - picture.height / 2}
        width={picture.width}
        height={picture.height}
        preserveAspectRatio="none"
      />
    );
  if (ellipse.rx <= 0 || ellipse.ry <= 0) return null;
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

interface Props {
  ship: Ship;
  pictures: ShipPictureRefs;
  layers: Record<LayerId, boolean>;
}

export function ShipPictures({ ship, pictures, layers }: Props) {
  const { layout, layoutXml } = ship;
  const { source, paths } = pictures;
  const hull = hullRectPx(layout, layoutXml);
  return (
    <g>
      {layers.shield && <Shield ship={ship} pictures={pictures} />}
      {layers.hull && <Picture source={source} path={paths.hull} at={hull} className="cv-hull" />}
      {layers.floor && (
        <Picture
          source={source}
          path={paths.floor}
          at={floorPositionPx(layout, layoutXml)}
          className="cv-floor"
        />
      )}
      {layers.cloak && (
        <Picture
          source={source}
          path={paths.cloak}
          at={cloakPositionPx(layout, layoutXml)}
          className="cv-cloak"
        />
      )}
      {layers.gibs &&
        layoutXml.gibs.map((gib, i) => (
          <Picture
            key={i}
            source={source}
            path={paths.gibs[i]}
            at={gibPositionPx(layout, layoutXml, gib)}
            className="cv-gib"
          />
        ))}
    </g>
  );
}
