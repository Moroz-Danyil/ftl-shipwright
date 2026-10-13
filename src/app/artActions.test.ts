import { unzipSync } from "fflate";
import { beforeEach, describe, expect, it } from "vitest";
import type { Mount } from "../core";
import { en } from "../text/en";
import { HULL, openArtShip } from "../testing/artFixtures";
import { createFakePlatform } from "../testing/fakePlatform";
import { pngHeader } from "../testing/systemsFixtures";
import {
  addMountAtPoint,
  choosePicture,
  deleteSelectedArt,
  moveShipPicture,
  nudgeArt,
  pictureFromFile,
  removePicture,
  reorderMount,
} from "./artActions";
import { gamePicture } from "./art/model";
import { runCommand } from "./commands";
import { commandForEvent } from "./keys";
import { saveShipMod } from "./saveMod";
import { selectionOf } from "./selection";
import { hasUnsavedChanges, useEditor } from "./store";

const state = () => useEditor.getState();
const snap = () => state().doc!.history.present;
const steps = () => state().doc!.history.past.length;
const context = { platform: createFakePlatform(), texts: en };
const mount = (x: number, y: number): Mount => ({ x, y, rotate: false, mirror: false, gib: 0 });

describe("pictures", () => {
  beforeEach(() => openArtShip());

  it("choose a game picture as one undo step, sizing the hull", async () => {
    expect(await choosePicture({ slot: "hull" }, gamePicture("img/ship/big_base.png"), en)).toBe(
      true
    );
    expect(snap().ship.layoutXml.img).toEqual({ x: -10, y: -20, w: 300, h: 150 });
    expect(snap().art.hull).toEqual(gamePicture("img/ship/big_base.png"));
    expect(hasUnsavedChanges(state())).toBe(true);
    state().undo();
    expect(snap().art.hull).toEqual(gamePicture(HULL));
    expect(snap().ship.layoutXml.img.w).toBe(200);
    expect(hasUnsavedChanges(state())).toBe(false);
  });

  it("refuse a file that is not a PNG", async () => {
    const ref = { kind: "file" as const, name: "x.png", bytes: new Uint8Array([1, 2]) };
    expect(await choosePicture({ slot: "floor" }, ref, en)).toBe(false);
    expect(state().notice).toEqual({ kind: "error", text: en.art.notPng });
    expect(steps()).toBe(0);
  });

  it("are removed and added as gibs", async () => {
    removePicture("floor");
    expect(snap().art.floor).toBeUndefined();
    await choosePicture({ newGib: true }, gamePicture("img/ship/t_gib1.png"), en);
    expect(snap().ship.layoutXml.gibs).toHaveLength(3);
    expect(state().selection.gibs).toEqual([2]);
    expect(steps()).toBe(2);
  });

  it("are moved one step at a time, and by the arrow keys with the Move picture tool", () => {
    moveShipPicture("floor", 3, 4);
    expect(snap().ship.layoutXml.floorOffset).toEqual({ x: 3, y: 4 });
    expect(state().artTool.active).toBe("floor");
    state().setWorkspace("hull");
    state().setTool("movePicture");
    expect(runCommand("moveFar.left", context)).toBe(true);
    expect(snap().ship.layoutXml.floorOffset).toEqual({ x: -7, y: 4 });
    state().setArtTool({ picture: "hull" });
    expect(runCommand("move.down", context)).toBe(true);
    expect(snap().ship.layoutXml.img.y).toBe(-19);
    expect(steps()).toBe(3);
  });
});

describe("saving a picture from a file", () => {
  it("writes its bytes as the ship's picture", async () => {
    openArtShip();
    const platform = createFakePlatform({});
    const bytes = new Uint8Array([...pngHeader(220, 90), 7, 7, 7]);
    await platform.writeFile("pictures/my hull.png", bytes);
    platform.answers.pickFile.push("pictures/my hull.png");
    const ref = await pictureFromFile(platform, en);
    expect(ref).toEqual({ kind: "file", name: "my hull.png", bytes });
    await choosePicture({ slot: "hull" }, ref!, en);
    expect(snap().ship.layoutXml.img).toMatchObject({ w: 220, h: 90 });
    expect(await saveShipMod(platform, en, { kind: "ftl", path: "out/t.ftl" })).toBe(true);
    const files = unzipSync(platform.disk.get("out/t.ftl")!);
    expect(files["img/ship/t_base.png"]).toEqual(bytes);
    expect(files["img/ship/t_floor.png"]).toBeUndefined();
  });
});

describe("mounts", () => {
  beforeEach(() => {
    openArtShip([mount(10, 10), mount(20, 20)]);
    state().setWorkspace("hull");
  });

  it("are added on the hull (refused off it) and selected", () => {
    expect(addMountAtPoint({ x: 75, y: 95 })).toBeUndefined();
    expect(snap().ship.layoutXml.mounts[2]).toMatchObject({ x: 50, y: 80, slide: "down" });
    expect(state().selection.mounts).toEqual([2]);
    expect(addMountAtPoint({ x: 0, y: 0 })).toBe("outside");
    expect(steps()).toBe(1);
  });

  it("are reordered with the selection following", () => {
    state().select(selectionOf({ kind: "mount", index: 0 }));
    reorderMount(0, 1);
    expect(snap().ship.layoutXml.mounts.map((m) => m.x)).toEqual([20, 10]);
    expect(state().selection.mounts).toEqual([1]);
    reorderMount(1, 1);
    expect(steps()).toBe(1);
  });

  it("turn with [ and ] and move with the arrows", () => {
    expect(
      commandForEvent({
        code: "BracketLeft",
        key: "[",
        ctrlKey: false,
        metaKey: false,
        shiftKey: false,
        altKey: false,
      })
    ).toBe("mount.rotate");
    expect(runCommand("mount.rotate", context)).toBe(false);
    state().select(selectionOf({ kind: "mount", index: 1 }));
    runCommand("mount.rotate", context);
    runCommand("mount.mirror", context);
    expect(snap().ship.layoutXml.mounts[1]).toMatchObject({ rotate: true, mirror: true });
    expect(nudgeArt(0, -10)).toBe(true);
    expect(snap().ship.layoutXml.mounts[1]).toMatchObject({ x: 20, y: 10 });
    expect(steps()).toBe(3);
  });

  it("are deleted with gibs in one step", () => {
    state().select({ ...selectionOf({ kind: "mount", index: 0 }), gibs: [1] });
    expect(runCommand("delete", context)).toBe(true);
    expect(snap().ship.layoutXml.mounts).toHaveLength(1);
    expect(snap().ship.layoutXml.gibs).toHaveLength(1);
    expect(snap().art.gibs).toHaveLength(1);
    expect(deleteSelectedArt()).toBe(false);
    state().undo();
    expect(snap().ship.layoutXml.gibs).toHaveLength(2);
  });
});
