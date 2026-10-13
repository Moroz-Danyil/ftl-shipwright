/**
 * The interior picture of a system's room: the game's pictures meant for the
 * system (or all of them), with small previews and their size; a picture
 * that does not fit the room gets a warning, a strong one for cloaking.
 */
import { useState } from "react";
import type { FileSource, Room } from "../../../core";
import { setSystemInterior } from "../../../app/systemActions";
import { interiorPath, useInteriorList } from "../../../app/systems/interiors";
import { interiorFits, interiorsFor } from "../../../app/systems/rules";
import { useEditor } from "../../../app/store";
import { usePicture } from "../../../canvas/pictures";
import { useTexts } from "../../../text";
import { PictureZoom } from "../../common/PictureZoom";
import { Help } from "../../common/Help";

interface OptionProps {
  source: FileSource;
  name: string;
  room: Room;
  group: string;
  checked: boolean;
  onPick: () => void;
}

function InteriorOption({ source, name, room, group, checked, onPick }: OptionProps) {
  const texts = useTexts();
  const picture = usePicture(source, interiorPath(name));
  const fits = picture ? interiorFits(room, picture) : true;
  return (
    <label className={fits ? "sy-interior" : "sy-interior sy-interior--misfit"}>
      <input type="radio" name={group} checked={checked} onChange={onPick} />
      <PictureZoom className="sy-interior-preview" picture={picture} title={name}>
        {picture && <img src={picture.url} alt="" />}
      </PictureZoom>
      <span className="sy-interior-text">
        <span className="sy-interior-name">{name}</span>
        {picture && (
          <span className="sy-interior-size mono">
            {texts.systems.interiorSize(picture.width, picture.height)}
          </span>
        )}
      </span>
    </label>
  );
}

function CurrentWarning({
  source,
  name,
  room,
  system,
}: {
  source: FileSource;
  name: string;
  room: Room;
  system: string;
}) {
  const texts = useTexts();
  const picture = usePicture(source, interiorPath(name));
  if (!picture || interiorFits(room, picture)) return null;
  return (
    <div
      className={system === "cloaking" ? "ed-group ed-group--problem" : "ed-group ed-group--warn"}
      role="alert"
    >
      <span>
        {texts.systems.interiorMismatch(picture.width, picture.height, room.w * 35, room.h * 35)}
      </span>
      {system === "cloaking" && <span>{texts.systems.cloakMismatch}</span>}
    </div>
  );
}

export function InteriorPicker({ index, room }: { index: number; room: Room }) {
  const texts = useTexts();
  const view = useEditor((s) => s.game.data?.view);
  const source = useEditor((s) => s.doc?.history.present.art.source);
  const system = useEditor((s) => s.doc?.history.present.ship.blueprint.systems[index]);
  const list = useInteriorList(view);
  const [all, setAll] = useState(false);
  if (!system || !source) return null;
  const meant = interiorsFor(list ?? [], system.system);
  const shown = all ? (list ?? []) : meant;
  const names = shown.map((p) => p.name);
  if (system.img && !names.includes(system.img)) names.unshift(system.img);
  const group = `interior-${index}`;
  return (
    <fieldset className="sy-interiors">
      <legend className="eyebrow">
        <Help topic="interior">
          <span>{texts.systems.interior}</span>
        </Help>
      </legend>
      {system.img && (
        <CurrentWarning source={source} name={system.img} room={room} system={system.system} />
      )}
      <div className="sy-interior-list">
        <label className="sy-interior">
          <input
            type="radio"
            name={group}
            checked={!system.img}
            onChange={() => setSystemInterior(index, undefined)}
          />
          <span className="sy-interior-preview" />
          <span className="sy-interior-name">{texts.systems.interiorNone}</span>
        </label>
        {names.map((name) => (
          <InteriorOption
            key={name}
            source={source}
            name={name}
            room={room}
            group={group}
            checked={system.img === name}
            onPick={() => setSystemInterior(index, name)}
          />
        ))}
      </div>
      {list && meant.length === 0 && !all && (
        <span className="muted">{texts.systems.noInteriors}</span>
      )}
      <label className="ed-choice">
        <input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} />
        {texts.systems.interiorAll}
      </label>
    </fieldset>
  );
}
