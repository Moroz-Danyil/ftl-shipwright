/**
 * A ship's picture for lists: its select icon from the game
 * (`miniship_<img>.png`), else its hull picture (`<img>_base.png` in one of
 * the game's ship picture folders, as enemy ships have no select icon),
 * else a plain outline.
 */
import { SHIP_PICTURE_FOLDERS } from "../../core";
import { useEditor } from "../../app/store";
import { usePicture } from "../../canvas/pictures";
import { HullIcon } from "./icons";

export function ShipIcon({ img }: { img: string | undefined }) {
  const view = useEditor((s) => s.game.data?.view);
  const miniship = usePicture(view, img ? `img/customizeUI/miniship_${img}.png` : undefined);
  const hulls = [
    usePicture(view, img ? `${SHIP_PICTURE_FOLDERS[0]}/${img}_base.png` : undefined),
    usePicture(view, img ? `${SHIP_PICTURE_FOLDERS[1]}/${img}_base.png` : undefined),
    usePicture(view, img ? `${SHIP_PICTURE_FOLDERS[2]}/${img}_base.png` : undefined),
  ];
  const picture = miniship ?? hulls.find((p) => p !== undefined);
  return (
    <span className="ship-icon" aria-hidden="true">
      {picture ? (
        <img src={picture.url} alt="" draggable={false} />
      ) : (
        <span className="ship-icon-mark">
          <HullIcon />
        </span>
      )}
    </span>
  );
}
