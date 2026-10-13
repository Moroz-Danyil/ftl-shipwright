/**
 * The ship's pictures: hull, floor, cloak, shield and ship icon, each with a
 * preview, its file name, Change and (for the optional ones) Remove.
 */
import { removePicture } from "../../../app/artActions";
import { pictureName, type PictureRef, type PictureSlot } from "../../../app/art/model";
import { useEditor } from "../../../app/store";
import { usePictureRef } from "../../../canvas/pictures";
import { useTexts } from "../../../text";
import { PictureZoom } from "../../common/PictureZoom";

const SLOTS: PictureSlot[] = ["hull", "floor", "cloak", "shield", "miniship"];

function PictureRow({ slot, picture }: { slot: PictureSlot; picture: PictureRef | undefined }) {
  const texts = useTexts();
  const source = useEditor((s) => s.doc?.history.present.art.source);
  const loaded = usePictureRef(source, picture);
  const label = texts.art.slots[slot];
  return (
    <div className="ar-picture" data-slot={slot}>
      <PictureZoom
        className="ar-thumb"
        picture={loaded}
        title={label}
        name={picture ? pictureName(picture) : undefined}
      >
        {loaded && <img src={loaded.url} alt="" />}
      </PictureZoom>
      <span className="ar-picture-text">
        <span>{label}</span>
        <span className="eyebrow">{picture ? pictureName(picture) : texts.art.noPicture}</span>
      </span>
      <button
        type="button"
        className="btn btn--small"
        aria-label={texts.art.changeNamed(label)}
        onClick={() => useEditor.getState().openPicturePicker({ slot })}
      >
        {texts.art.change}
      </button>
      {slot !== "hull" && picture && (
        <button
          type="button"
          className="btn btn--small btn--danger"
          aria-label={texts.art.removeNamed(label)}
          onClick={() => removePicture(slot)}
        >
          {texts.art.remove}
        </button>
      )}
    </div>
  );
}

export function PicturesPanel() {
  const art = useEditor((s) => s.doc?.history.present.art);
  if (!art) return null;
  return (
    <div className="ar-pictures">
      {SLOTS.map((slot) => (
        <PictureRow key={slot} slot={slot} picture={art[slot]} />
      ))}
    </div>
  );
}
