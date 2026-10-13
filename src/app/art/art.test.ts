import { describe, expect, it } from "vitest";
import { memorySource, mountPositionPx, type Mount, type Ship } from "../../core";
import { testShip } from "../../testing/layoutFixtures";
import { weaponFramePoint, weaponTransform } from "../../canvas/weaponDraw";
import { gibMotionAt } from "./explosion";
import { NEW_GIB, addGib, moveGibs, removeGibs, setGibPicture, updateGib } from "./gibs";
import { gamePicture, type ShipArt, type ShipSnapshot } from "./model";
import {
  MAX_MOUNTS,
  addMountAt,
  defaultMount,
  moveMounts,
  setMountGib,
  setSlide,
  swapMounts,
  toggleMirror,
  toggleRotate,
} from "./mounts";
import { movePicture, setHullPicture, setOptionalPicture } from "./pictures";

const mount = (x: number, y: number, gib = 0): Mount => ({
  x,
  y,
  rotate: false,
  mirror: false,
  gib,
});

/** The test ship (rooms from cell (0,0) to (5,2) at anchor (1,1)) with a 200×100 hull at img (-10, -20). */
function hulled(mounts: Mount[] = [], gibs = 0): Ship {
  const ship = testShip();
  return {
    ...ship,
    layoutXml: {
      ...ship.layoutXml,
      img: { x: -10, y: -20, w: 200, h: 100 },
      mounts,
      gibs: Array.from({ length: gibs }, (_, i) => ({ ...NEW_GIB, x: i * 10, y: 0 })),
    },
  };
}

const art = (extra: Partial<ShipArt> = {}): ShipArt => ({
  source: memorySource({}),
  gibs: [],
  ...extra,
});
const snap = (ship: Ship, a: ShipArt = art()): ShipSnapshot => ({ ship, art: a });

describe("pictures", () => {
  it("sets the hull picture's size, centred on the rooms for a ship without one", () => {
    const next = setHullPicture(snap(testShip()), gamePicture("img/ship/a_base.png"), {
      width: 120,
      height: 60,
    });
    // Rooms span cells 0..5 x 0..2 at anchor (1, 1): centre (35 + 87.5, 35 + 35) in ship pixels.
    expect(next.ship.layoutXml.img).toEqual({ x: 28, y: 5, w: 120, h: 60 });
    expect(next.art.hull).toEqual(gamePicture("img/ship/a_base.png"));
    const replaced = setHullPicture(next, gamePicture("img/ship/b_base.png"), {
      width: 90,
      height: 40,
    });
    expect(replaced.ship.layoutXml.img).toEqual({ x: 28, y: 5, w: 90, h: 40 });
  });

  it("sets optional pictures under the ship's own name, the shield sizing its ellipse", () => {
    const base = testShip();
    const named = {
      ...base,
      blueprint: { ...base.blueprint, floorImage: "other", shieldImage: "other" },
    };
    let next = setOptionalPicture(snap(named), "floor", gamePicture("img/ship/x_floor.png"));
    expect(next.art.floor).toEqual(gamePicture("img/ship/x_floor.png"));
    expect("floorImage" in next.ship.blueprint).toBe(false);
    expect(next.ship.blueprint.shieldImage).toBe("other");
    next = setOptionalPicture(next, "shield", gamePicture("img/ship/x_shields1.png"), {
      width: 301,
      height: 200,
    });
    expect(next.ship.layout.ellipse).toMatchObject({ halfWidth: 151, halfHeight: 100 });
    expect("shieldImage" in next.ship.blueprint).toBe(false);
    next = setOptionalPicture(next, "floor", undefined);
    expect("floor" in next.art).toBe(false);
  });

  it("moves the hull with or without keeping the mounts in place", () => {
    const ship = hulled([mount(50, 10)]);
    const before = mountPositionPx(ship.layout, ship.layoutXml, ship.layoutXml.mounts[0]);
    const carried = movePicture(ship, "hull", 5, -3);
    expect(carried.layoutXml.img).toMatchObject({ x: -5, y: -23 });
    expect(carried.layoutXml.mounts[0]).toMatchObject({ x: 50, y: 10 });
    const kept = movePicture(ship, "hull", 5, -3, true);
    expect(mountPositionPx(kept.layout, kept.layoutXml, kept.layoutXml.mounts[0])).toEqual(before);
    expect(movePicture(ship, "hull", 0, 0)).toBe(ship);
  });

  it("moves the floor and cloak by their offsets and the shield by the ellipse offset", () => {
    const ship = hulled();
    expect(movePicture(ship, "floor", 2, 3).layoutXml.floorOffset).toEqual({ x: 2, y: 3 });
    const cloaked = movePicture(movePicture(ship, "cloak", -1, 0), "cloak", -1, 4);
    expect(cloaked.layoutXml.cloakOffset).toEqual({ x: -2, y: 4 });
    expect(movePicture(ship, "shield", 7, -2).layout.ellipse).toMatchObject({
      offsetX: 7,
      offsetY: -2,
    });
  });
});

describe("mounts", () => {
  it("default by position: top half turned up and mirrored, bottom half down", () => {
    const ship = hulled();
    expect(defaultMount(ship, { x: 20, y: 30 })).toEqual({
      x: 20,
      y: 30,
      rotate: true,
      mirror: true,
      gib: 0,
      slide: "up",
    });
    expect(defaultMount(ship, { x: 20.4, y: 70 })).toMatchObject({
      x: 20,
      mirror: false,
      slide: "down",
    });
  });

  it("are added on the hull picture only, and at most eight", () => {
    const ship = hulled();
    // The hull's corner is at ship pixel (25, 15).
    const added = addMountAt(ship, { x: 75, y: 95 });
    expect(added.ship?.layoutXml.mounts[0]).toMatchObject({ x: 50, y: 80, slide: "down" });
    expect(addMountAt(ship, { x: 10, y: 10 })).toEqual({ problem: "outside" });
    const full = hulled(Array.from({ length: MAX_MOUNTS }, () => mount(1, 1)));
    expect(addMountAt(full, { x: 75, y: 95 })).toEqual({ problem: "full" });
  });

  it("reorder, turn, slide, link and move", () => {
    let ship = hulled([mount(1, 1), mount(2, 2)]);
    ship = swapMounts(ship, 0, 1);
    expect(ship.layoutXml.mounts.map((m) => m.x)).toEqual([2, 1]);
    expect(swapMounts(ship, 0, 5)).toBe(ship);
    ship = toggleMirror(toggleRotate(ship, 0), 0);
    expect(ship.layoutXml.mounts[0]).toMatchObject({ rotate: true, mirror: true });
    ship = setMountGib(setSlide(ship, 0, "left"), 0, 3);
    expect(ship.layoutXml.mounts[0]).toMatchObject({ slide: "left", gib: 3 });
    ship = moveMounts(ship, [1], 4, -1);
    expect(ship.layoutXml.mounts[1]).toMatchObject({ x: 5, y: 0 });
  });
});

describe("gibs", () => {
  it("are added with a picture and removed with their mount links renumbered", () => {
    let s = snap(
      hulled([mount(0, 0, 1), mount(0, 0, 2), mount(0, 0, 3)], 3),
      art({
        gibs: [gamePicture("g1"), gamePicture("g2"), gamePicture("g3")],
      })
    );
    s = addGib(s, gamePicture("g4"));
    expect(s.ship.layoutXml.gibs).toHaveLength(4);
    expect(s.art.gibs[3]).toEqual(gamePicture("g4"));
    s = removeGibs(s, [1]);
    expect(s.ship.layoutXml.gibs).toHaveLength(3);
    expect(s.art.gibs).toEqual([gamePicture("g1"), gamePicture("g3"), gamePicture("g4")]);
    expect(s.ship.layoutXml.mounts.map((m) => m.gib)).toEqual([1, 0, 2]);
  });

  it("are edited, moved and given pictures", () => {
    let s = snap(hulled([], 2));
    s = { ...s, ship: updateGib(s.ship, 1, { velocity: { min: 0.5, max: 2 } }) };
    expect(s.ship.layoutXml.gibs[1].velocity).toEqual({ min: 0.5, max: 2 });
    s = { ...s, ship: moveGibs(s.ship, [0], 3, 4) };
    expect(s.ship.layoutXml.gibs[0]).toMatchObject({ x: 3, y: 4 });
    s = setGibPicture(s, 1, gamePicture("p"));
    expect(s.art.gibs).toEqual([null, gamePicture("p")]);
  });

  it("move in the explosion preview from their place, 0 degrees being up", () => {
    const gib = {
      ...NEW_GIB,
      velocity: { min: 1, max: 1 },
      direction: { min: 0, max: 0 },
      angular: { min: 1, max: 1 },
    };
    expect(gibMotionAt(gib, 0, 0)).toEqual({ dx: 0, dy: -0, angle: 0 });
    const later = gibMotionAt(gib, 0, 0.5);
    expect(later.dx).toBeCloseTo(0);
    expect(later.dy).toBeCloseTo(-30);
    expect(later.angle).toBeCloseTo(30);
    const right = gibMotionAt({ ...gib, direction: { min: 90, max: 90 } }, 2, 1);
    expect(right.dx).toBeCloseTo(60);
    expect(right.dy).toBeCloseTo(0);
    expect(gibMotionAt(NEW_GIB, 3, 1)).toEqual(gibMotionAt(NEW_GIB, 3, 1));
  });
});

describe("weapon drawing", () => {
  const at = { x: 100, y: 50 };
  const mountPoint = { x: 10, y: 4 };

  it("puts the mount point on the mount", () => {
    for (const pose of [
      { rotate: false, mirror: false },
      { rotate: true, mirror: false },
      { rotate: false, mirror: true },
      { rotate: true, mirror: true },
    ])
      expect(weaponFramePoint(at, mountPoint, pose, mountPoint)).toEqual(at);
  });

  it("mirrors horizontally, then turns 90° clockwise", () => {
    const p = { x: 20, y: 4 };
    expect(weaponFramePoint(at, mountPoint, { rotate: false, mirror: false }, p)).toEqual({
      x: 110,
      y: 50,
    });
    expect(weaponFramePoint(at, mountPoint, { rotate: false, mirror: true }, p)).toEqual({
      x: 90,
      y: 50,
    });
    expect(weaponFramePoint(at, mountPoint, { rotate: true, mirror: false }, p)).toEqual({
      x: 100,
      y: 60,
    });
    expect(weaponFramePoint(at, mountPoint, { rotate: true, mirror: true }, p)).toEqual({
      x: 100,
      y: 40,
    });
  });

  it("writes the same steps as an SVG transform", () => {
    expect(weaponTransform(at, mountPoint, { rotate: true, mirror: true })).toBe(
      "translate(100 50) rotate(90) scale(-1 1) translate(-10 -4)"
    );
    expect(weaponTransform(at, mountPoint, { rotate: false, mirror: false })).toBe(
      "translate(100 50) translate(-10 -4)"
    );
  });
});
