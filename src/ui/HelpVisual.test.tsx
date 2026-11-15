// @vitest-environment jsdom
import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { createGameView, memorySource, type Ship } from "../core";
import { useEditor } from "../app/store";
import { en } from "../text/en";
import { openSystemsShip, pngHeader } from "../testing/systemsFixtures";
import { HUD_PICTURES, hullCells, reactorBars, slotBox } from "./common/helpPictures";
import { HelpVisual } from "./common/HelpVisual";
import { Stats } from "./editor/ship/Stats";

const HUD_FILES = {
  [HUD_PICTURES.hull]: pngHeader(385, 65),
  [HUD_PICTURES.hullMask]: pngHeader(360, 65),
  [HUD_PICTURES.hullLabel]: pngHeader(52, 28),
  [HUD_PICTURES.reactor]: pngHeader(56, 340),
  [HUD_PICTURES.boxLabel]: pngHeader(53, 27),
  [HUD_PICTURES.missiles]: pngHeader(80, 40),
  [HUD_PICTURES.droneParts]: pngHeader(75, 40),
  [HUD_PICTURES.fuel]: pngHeader(80, 40),
  "img/box_weapons_bottom2.png": pngHeader(225, 87),
  "img/box_weapons_bottom3.png": pngHeader(322, 88),
  "img/box_weapons_bottom4.png": pngHeader(419, 88),
};

/** Opens the test ship; `withHud` adds the game's interface pictures to its game data. */
function open(withHud: boolean) {
  const data = openSystemsShip();
  if (!withHud) return;
  const files = memorySource(HUD_FILES);
  const view = createGameView(files);
  useEditor.setState({ game: { status: "ready", datPath: data.datPath, data: { ...data, view } } });
}

function edit(change: (ship: Ship) => Ship) {
  act(() => useEditor.getState().edit(change));
}

const setBlueprint = (patch: Partial<Ship["blueprint"]>) =>
  edit((s) => ({ ...s, blueprint: { ...s.blueprint, ...patch } }));

describe("the pictures of the hover help", () => {
  it("measures the game's bars and boxes", () => {
    expect(hullCells(30)).toBe(30);
    expect(hullCells(45)).toBe(30);
    expect(hullCells(7.6)).toBe(7);
    expect(reactorBars(3).map((b) => b.y)).toEqual([289, 280, 271]);
    expect(reactorBars(40)).toHaveLength(25);
    expect(slotBox(3)).toEqual({ path: "img/box_weapons_bottom3.png", slots: 3, exact: true });
    expect(slotBox(1)).toMatchObject({ slots: 2, exact: false });
    expect(slotBox(8)).toMatchObject({ slots: 4, exact: false });
  });

  describe("with the game's pictures", () => {
    beforeEach(() => open(true));

    it("fills one cell of the hull bar per hull point", async () => {
      setBlueprint({ health: 22 });
      render(<HelpVisual topic="hull" />);
      const bar = await screen.findByTestId("hv-game-hull");
      const fill = bar.querySelector(".hv-hull-fill")!;
      expect(fill).toHaveAttribute("data-cells", "22");
      expect(fill).toHaveAttribute("width", String(22 * 12));
      expect(bar.querySelectorAll("image")).toHaveLength(3);
      expect(bar.querySelector(".hv-note")).toBeNull();
    });

    it("shows a hull above 30 as a full bar, with a note", async () => {
      setBlueprint({ health: 40 });
      render(<HelpVisual topic="hull" />);
      const bar = await screen.findByTestId("hv-game-hull");
      expect(bar.querySelector(".hv-hull-fill")).toHaveAttribute("data-cells", "30");
      expect(bar).toHaveTextContent(en.helpPictures.hullFull(40));
    });

    it("draws the reactor's power bars beside the game's wire", async () => {
      setBlueprint({ maxPower: 6 });
      render(<HelpVisual topic="reactor" />);
      const reactor = await screen.findByTestId("hv-game-reactor");
      expect(reactor.querySelectorAll(".hv-power")).toHaveLength(6);
      expect(reactor.querySelector("image")).toBeInTheDocument();
    });

    it("draws the game's box for the slot count, else the nearest with a note", async () => {
      setBlueprint({ weaponSlots: 3, droneSlots: 1 });
      const { unmount } = render(<HelpVisual topic="weaponSlots" />);
      const weapons = await screen.findByTestId("hv-game-weapon-box");
      expect(weapons.querySelector("svg")).toHaveAttribute("width", "320");
      expect(weapons.querySelector(".hv-note")).toBeNull();
      unmount();
      render(<HelpVisual topic="droneSlots" />);
      const drones = await screen.findByTestId("hv-game-drone-box");
      expect(drones.querySelector("svg")).toHaveAttribute("width", "223");
      expect(drones).toHaveTextContent(en.helpPictures.nearestBox(1, 2));
    });

    it("writes the starting missiles and drone parts in the game's top panel icons", async () => {
      setBlueprint({
        weaponList: { count: 0, missiles: 12, items: [] },
        droneList: { count: 0, drones: 3, items: [] },
      });
      const { unmount } = render(<HelpVisual topic="missiles" />);
      expect(await screen.findByTestId("hv-game-missiles")).toHaveTextContent("12");
      unmount();
      render(<HelpVisual topic="droneParts" />);
      expect(await screen.findByTestId("hv-game-drone-parts")).toHaveTextContent("3");
    });

    it("notes under the stats that the game has no fuel per ship, with its fuel icon", async () => {
      render(<Stats ship={useEditor.getState().doc!.history.present.ship} />);
      useEditor.getState().setSectionOpen("ship-stats", true);
      const line = await screen.findByText(en.loadout.noFuel);
      await waitFor(() => expect(line.querySelector("[data-testid=fuel-icon]")).not.toBeNull());
    });
  });

  describe("without the game's pictures", () => {
    beforeEach(() => open(false));

    it("draws the stand-ins for the hull, reactor and slots, and nothing for the counts", async () => {
      setBlueprint({ health: 12, maxPower: 5, weaponSlots: 3 });
      const hull = render(<HelpVisual topic="hull" />);
      await waitFor(() => expect(document.querySelectorAll(".hv-hull span")).toHaveLength(12));
      hull.unmount();
      const reactor = render(<HelpVisual topic="reactor" />);
      await waitFor(() => expect(document.querySelectorAll(".hv-reactor span")).toHaveLength(5));
      reactor.unmount();
      const weapons = render(<HelpVisual topic="weaponSlots" />);
      await waitFor(() => expect(document.querySelectorAll(".hv-slots span")).toHaveLength(3));
      weapons.unmount();
      const missiles = render(<HelpVisual topic="missiles" />);
      await act(async () => {});
      expect(missiles.container).toBeEmptyDOMElement();
      expect(screen.queryByTestId("hv-game-hull")).toBeNull();
    });

    it("keeps the fuel line, without the icon", async () => {
      useEditor.getState().setSectionOpen("ship-stats", true);
      render(<Stats ship={useEditor.getState().doc!.history.present.ship} />);
      expect(screen.getByText(en.loadout.noFuel)).toBeInTheDocument();
      await act(async () => {});
      expect(screen.queryByTestId("fuel-icon")).toBeNull();
    });
  });
});
