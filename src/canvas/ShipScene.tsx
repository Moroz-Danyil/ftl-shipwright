/**
 * Everything drawn on the canvas in ship pixels: pictures, grid, rooms,
 * doors, stations, system labels, mounts and the current tool's overlay.
 * In Hull & art the hull, floor and shield are always shown (the cloak
 * follows its layer), and the gibs with the Gib tool; during the explosion
 * preview only the gibs are drawn.
 */
import { useMemo } from "react";
import type { Rect } from "../core";
import { useSystemName } from "../app/names";
import { currentTool, useEditor } from "../app/store";
import { gibRectPx } from "./artHitTest";
import { CellZeroEdge, GridLines, ViewLimitFrame } from "./GridLayer";
import { MountsLayer } from "./MountsLayer";
import { ShipPictures } from "./ShipPictures";
import { Doors, Rooms } from "./ShipShapes";
import { Stations } from "./Stations";
import { SystemDropTarget, SystemLabels } from "./SystemLabels";
import { ToolOverlay } from "./ToolOverlay";
import type { Overlay } from "./tools/types";
import { equippedWeaponFrames } from "./weaponDraw";

interface Props {
  /** The visible part of the ship, in ship pixels (for the grid). */
  area: Rect;
  overlay: Overlay | null;
  /** Seconds into the explosion preview, while it plays. */
  explosion?: number;
}

export function ShipScene({ area, overlay, explosion }: Props) {
  const snapshot = useEditor((s) => s.doc?.history.present);
  const view = useEditor((s) => s.view);
  const selection = useEditor((s) => s.selection);
  const workspace = useEditor((s) => s.workspace);
  const tool = useEditor(currentTool);
  const data = useEditor((s) => s.game.data);
  const nameOf = useSystemName();
  const art = workspace === "art";
  const loadout = workspace === "loadout";
  const hoverWeapon = useEditor((s) => s.hoverWeapon);
  const setHoverWeapon = useEditor((s) => s.setHoverWeapon);
  const { layers, hangarPreview } = view;
  const pictureLayers = useMemo(
    () => (art ? { ...layers, hull: true, floor: true, shield: true } : layers),
    [art, layers]
  );
  const weaponItems = snapshot?.ship.blueprint.weaponList?.items;
  const weapons = useMemo(() => equippedWeaponFrames(data, weaponItems), [data, weaponItems]);
  if (!snapshot) return null;
  const { ship } = snapshot;
  const playing = explosion !== undefined;

  return (
    <>
      <ShipPictures
        ship={ship}
        art={snapshot.art}
        layers={pictureLayers}
        showGibs={art && tool === "gib"}
        explosion={explosion}
      />
      {!playing && (
        <>
          {layers.grid && !hangarPreview && area.w > 0 && (
            <>
              <GridLines area={area} />
              <CellZeroEdge ship={ship} area={area} />
            </>
          )}
          {layers.rooms && (
            <Rooms layout={ship.layout} selected={selection.rooms} showIds={!hangarPreview} />
          )}
          {layers.doors && <Doors layout={ship.layout} selected={selection.doors} />}
          {layers.stations && <Stations ship={ship} selected={selection.stations} />}
          {workspace === "systems" && (
            <SystemLabels layout={ship.layout} systems={ship.blueprint.systems} nameOf={nameOf} />
          )}
          {selection.gibs.map((i) => {
            const r = gibRectPx(ship, snapshot.art, i);
            return (
              <rect
                key={i}
                className="cv-selection-ring"
                data-testid={`gib-selected-${i + 1}`}
                x={r.x}
                y={r.y}
                width={r.w}
                height={r.h}
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
          {(layers.mounts || art || loadout) && (
            <MountsLayer
              layout={ship.layout}
              layoutXml={ship.layoutXml}
              selected={selection.mounts}
              hovered={loadout ? hoverWeapon : null}
              onHover={loadout ? setHoverWeapon : undefined}
              weapons={weapons}
            />
          )}
          {!hangarPreview && <ViewLimitFrame ship={ship} />}
          <ToolOverlay ship={ship} art={snapshot.art} overlay={overlay} />
          <SystemDropTarget ship={ship} />
        </>
      )}
    </>
  );
}
