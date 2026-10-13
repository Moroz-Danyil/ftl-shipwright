/**
 * Choosing and moving the ship's pictures. The hull sits at the anchor plus
 * `<img x y>` with its picture's size in `<img w h>`; floor, cloak, mounts and
 * gibs are measured from the hull's corner; the shield picture is centred on
 * the shield ellipse and is 2 · half-width × 2 · half-height.
 */
import { anchorPx, roomsBoundsPx, updateLayout, updateLayoutXml, type Ship } from "../../core";
import type { PictureRef, PictureSlot, ShipSnapshot } from "./model";

export type PictureSize = { width: number; height: number };

/** The pictures the Move picture tool can move. */
export type MovablePicture = "hull" | "floor" | "cloak" | "shield";

/** The blueprint names the game uses for a picture instead of `img`, by slot. */
const IMAGE_NAME = { floor: "floorImage", cloak: "cloakImage", shield: "shieldImage" } as const;

/**
 * Sets the hull picture. `<img w h>` takes the picture's size; a ship that had
 * no hull picture gets it centred on its rooms.
 */
export function setHullPicture(
  snapshot: ShipSnapshot,
  ref: PictureRef,
  size: PictureSize
): ShipSnapshot {
  const { ship, art } = snapshot;
  let { x, y } = ship.layoutXml.img;
  if (!art.hull) {
    const rooms = roomsBoundsPx(ship.layout);
    const anchor = anchorPx(ship.layout);
    const cx = rooms ? rooms.x + rooms.w / 2 : anchor.x;
    const cy = rooms ? rooms.y + rooms.h / 2 : anchor.y;
    x = Math.round(cx - size.width / 2 - anchor.x);
    y = Math.round(cy - size.height / 2 - anchor.y);
  }
  return {
    ship: updateLayoutXml(ship, { img: { x, y, w: size.width, h: size.height } }),
    art: { ...art, hull: ref },
  };
}

/**
 * Sets or removes the floor, cloak, shield or ship icon picture. The chosen
 * picture is saved under the ship's own name, so the blueprint stops naming
 * another ship's picture. A shield picture also sizes the shield ellipse.
 */
export function setOptionalPicture(
  snapshot: ShipSnapshot,
  slot: Exclude<PictureSlot, "hull">,
  ref: PictureRef | undefined,
  size?: PictureSize
): ShipSnapshot {
  let ship = snapshot.ship;
  const art = { ...snapshot.art };
  if (ref) art[slot] = ref;
  else delete art[slot];
  if (slot !== "miniship" && ship.blueprint[IMAGE_NAME[slot]] !== undefined) {
    const blueprint = { ...ship.blueprint };
    delete blueprint[IMAGE_NAME[slot]];
    ship = { ...ship, blueprint };
  }
  if (slot === "shield" && ref && size) {
    const ellipse = {
      ...ship.layout.ellipse,
      halfWidth: Math.round(size.width / 2),
      halfHeight: Math.round(size.height / 2),
    };
    ship = updateLayout(ship, { ellipse });
  }
  return { ship, art };
}

/**
 * Moves a picture by whole pixels. The hull carries the floor, cloak, mounts
 * and gibs with it (they are measured from its corner); with `keepMounts` the
 * mounts are moved back so they stay where they were on the ship.
 */
export function movePicture(
  ship: Ship,
  picture: MovablePicture,
  dx: number,
  dy: number,
  keepMounts = false
): Ship {
  if (dx === 0 && dy === 0) return ship;
  const xml = ship.layoutXml;
  if (picture === "hull") {
    const img = { ...xml.img, x: xml.img.x + dx, y: xml.img.y + dy };
    const mounts = keepMounts
      ? xml.mounts.map((m) => ({ ...m, x: m.x - dx, y: m.y - dy }))
      : xml.mounts;
    return updateLayoutXml(ship, { img, mounts });
  }
  if (picture === "floor") {
    const old = xml.floorOffset ?? { x: 0, y: 0 };
    return updateLayoutXml(ship, { floorOffset: { ...old, x: old.x + dx, y: old.y + dy } });
  }
  if (picture === "cloak") {
    const old = xml.cloakOffset ?? { x: 0, y: 0 };
    return updateLayoutXml(ship, { cloakOffset: { ...old, x: old.x + dx, y: old.y + dy } });
  }
  const e = ship.layout.ellipse;
  return updateLayout(ship, {
    ellipse: { ...e, offsetX: e.offsetX + dx, offsetY: e.offsetY + dy },
  });
}
