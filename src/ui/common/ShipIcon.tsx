/** A ship's select icon from the game (`miniship_<img>.png`), or a plain outline. */
import { useEditor } from "../../app/store";
import { usePicture } from "../../canvas/pictures";
import { HullIcon } from "./icons";

export function ShipIcon({ img }: { img: string | undefined }) {
  const view = useEditor((s) => s.game.data?.view);
  const picture = usePicture(view, img ? `img/customizeUI/miniship_${img}.png` : undefined);
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
