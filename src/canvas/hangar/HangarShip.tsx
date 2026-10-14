/**
 * The ship on the hangar screen, drawn as the editor draws it with the
 * editor's marks off: hull and floor, rooms, doors, the interiors and icons
 * of the systems installed at the start, the crew at their stations and the
 * weapons on their mounts. The view-limit frame lands on the game's ship area.
 */
import { useMemo } from "react";
import { EMPTY_SELECTION } from "../../app/selection";
import { LAYERS, useEditor, type LayerId } from "../../app/store";
import { MountsLayer } from "../MountsLayer";
import { Interiors, SystemIcons } from "../RoomContents";
import { ShipPictures } from "../ShipPictures";
import { Doors, Rooms } from "../ShipShapes";
import { Stations } from "../Stations";
import { equippedWeaponFrames } from "../weaponDraw";
import { hangarShip, hangarShipOffset } from "./hangarLayout";

/** The game's hangar shows the hull and the floor; no shield, cloak or gibs. */
const PICTURE_LAYERS = Object.fromEntries(
  LAYERS.map((layer) => [layer, layer === "hull" || layer === "floor"])
) as Record<LayerId, boolean>;

export function HangarShip() {
  const snapshot = useEditor((s) => s.doc?.history.present);
  const data = useEditor((s) => s.game.data);
  const weaponItems = snapshot?.ship.blueprint.weaponList?.items;
  const weapons = useMemo(() => equippedWeaponFrames(data, weaponItems), [data, weaponItems]);
  const shown = useMemo(() => snapshot && hangarShip(snapshot.ship), [snapshot]);
  if (!snapshot || !shown) return null;
  const { layout, layoutXml } = shown;
  const offset = hangarShipOffset(layout);
  return (
    <g
      className="hg-ship"
      data-testid="hangar-ship"
      transform={`translate(${offset.x} ${offset.y})`}
    >
      <ShipPictures ship={shown} art={snapshot.art} layers={PICTURE_LAYERS} showGibs={false} />
      <Rooms layout={layout} selected={EMPTY_SELECTION.rooms} ids="none" />
      <Interiors ship={shown} source={snapshot.art.source} />
      <Doors layout={layout} selected={EMPTY_SELECTION.doors} plain />
      <SystemIcons ship={shown} />
      <Stations
        ship={shown}
        animations={data?.animations}
        selected={EMPTY_SELECTION.stations}
        plain
      />
      <MountsLayer
        layout={layout}
        layoutXml={layoutXml}
        selected={EMPTY_SELECTION.mounts}
        weapons={weapons}
        plain
      />
    </g>
  );
}
