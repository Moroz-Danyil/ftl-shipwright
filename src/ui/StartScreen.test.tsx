// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { addRoomAt } from "../app/layoutActions";
import { frameMiddlePx, offCentrePx, shipBoxPx } from "../app/layout/screen";
import { shipToScreen } from "../canvas/viewport";
import { currentTool, resetEditorStore, useEditor } from "../app/store";
import { miniGame } from "../core/testing/miniGame";
import { en } from "../text/en";
import { DAT_PATH, freshEditorStore, withMiniGame } from "../testing/editorFixtures";
import { loadGameIntoStore } from "../app/gameData";
import { encodeText } from "../core";
import { zipSync } from "fflate";
import { createFakePlatform } from "../testing/fakePlatform";
import { App } from "./App";

describe("outside the desktop app", () => {
  it("explains instead of failing", () => {
    resetEditorStore();
    render(<App platform={createFakePlatform({}, { available: false })} />);
    expect(screen.getByText(en.notInApp.title)).toBeInTheDocument();
    expect(screen.queryByText(en.start.newShip)).not.toBeInTheDocument();
  });
});

describe("start screen", () => {
  beforeEach(() => {
    localStorage.clear();
    resetEditorStore();
  });

  it("asks for ftl.dat first, then loads it and remembers it", async () => {
    const platform = createFakePlatform({ [DAT_PATH]: miniGame() });
    platform.answers.pickFile.push(DAT_PATH);
    render(<App platform={platform} />);

    expect(screen.getByText(en.gameData.notChosen)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: new RegExp(en.start.newShip) })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: en.gameData.chooseDat }));
    expect(await screen.findByText(en.gameData.found(1))).toBeInTheDocument();
    expect(platform.asked[0].filters).toEqual([
      { name: en.gameData.datFilter, extensions: ["dat"] },
    ]);
    expect(screen.getByText(DAT_PATH)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: new RegExp(en.start.newShip) })).toBeEnabled();
    expect(JSON.parse(localStorage.getItem("shipwright.datPath")!)).toBe(DAT_PATH);
  });

  it("shows why the game data could not be loaded", async () => {
    const platform = createFakePlatform({});
    platform.answers.pickFile.push("wrong/ftl.dat");
    render(<App platform={platform} />);
    fireEvent.click(screen.getByRole("button", { name: en.gameData.chooseDat }));
    expect(
      await screen.findByText(en.gameData.error("Cannot open wrong/ftl.dat"))
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: en.gameData.retry })).toBeInTheDocument();
  });

  it("loads the remembered game data on start", async () => {
    localStorage.setItem("shipwright.datPath", JSON.stringify(DAT_PATH));
    resetEditorStore();
    render(<App platform={createFakePlatform({ [DAT_PATH]: miniGame() })} />);
    expect(await screen.findByText(en.gameData.found(1))).toBeInTheDocument();
  });

  it("opens a game ship from the searchable list", async () => {
    const platform = await withMiniGame();
    render(<App platform={platform} />);
    fireEvent.click(screen.getByRole("button", { name: new RegExp(en.start.openShip) }));
    const dialog = screen.getByRole("dialog", { name: en.openShip.title });
    expect(within(dialog).getByText(en.shipPicker.playerShips)).toBeInTheDocument();

    fireEvent.change(within(dialog).getByRole("searchbox"), { target: { value: "nothing" } });
    expect(within(dialog).getByText(en.shipPicker.noMatch)).toBeInTheDocument();
    fireEvent.change(within(dialog).getByRole("searchbox"), { target: { value: "mini" } });
    fireEvent.click(within(dialog).getByRole("option", { name: /The Mini/ }));
    fireEvent.click(within(dialog).getByRole("button", { name: en.openShip.open }));

    expect(await screen.findByRole("tablist", { name: en.topBar.workspaces })).toBeInTheDocument();
    expect(within(screen.getByRole("banner")).getByText("The Mini")).toBeInTheDocument();
    expect(useEditor.getState().recent[0].blueprint).toBe("PLAYER_SHIP_MINI");
  });

  /** Opens the New ship dialog; `dialog()` finds it again after each step. */
  const openNewShip = () => {
    fireEvent.click(screen.getByRole("button", { name: new RegExp(en.start.newShip) }));
    const dialog = () => screen.getByRole("dialog", { name: en.newShip.title });
    const button = (name: string) => within(dialog()).getByRole("button", { name });
    return {
      dialog,
      button,
      card: (name: string) => within(dialog()).getByRole("radio", { name: new RegExp(name) }),
      step: (n: number, of: number, title: string) => {
        expect(within(dialog()).getByText(en.newShip.step(n, of))).toBeInTheDocument();
        expect(within(dialog()).getByRole("heading", { name: title })).toBeInTheDocument();
      },
      next: () => fireEvent.click(button(en.newShip.next)),
      back: () => fireEvent.click(button(en.newShip.back)),
    };
  };
  const fact = (preview: HTMLElement, label: string) =>
    within(preview).getByText(label).nextElementSibling;

  it("creates a copy of a game ship in three steps, Back keeping the choices", async () => {
    const platform = await withMiniGame();
    render(<App platform={platform} />);
    const ns = openNewShip();

    // 1 · How to start: two cards and nothing else; the empty hull is chosen at first.
    ns.step(1, 2, en.newShip.steps.start);
    expect(ns.card(en.newShip.empty)).toBeChecked();
    expect(ns.card(en.newShip.empty)).toHaveFocus();
    expect(ns.button(en.newShip.back)).toBeDisabled();
    expect(within(ns.dialog()).queryByRole("textbox")).not.toBeInTheDocument();
    fireEvent.click(ns.card(en.newShip.copy));
    ns.step(1, 3, en.newShip.steps.start);
    ns.next();

    // 2 · The base ship: the list and a preview of the ship picked; Next waits for one.
    ns.step(2, 3, en.newShip.steps.base);
    expect(within(ns.dialog()).getByRole("searchbox")).toHaveFocus();
    expect(within(ns.dialog()).getByText(en.newShip.preview.none)).toBeInTheDocument();
    expect(ns.button(en.newShip.next)).toBeDisabled();
    fireEvent.click(within(ns.dialog()).getByRole("option", { name: /The Mini/ }));
    const preview = within(ns.dialog()).getByRole("region", { name: "The Mini" });
    expect(within(preview).getByText("Mini Cruiser")).toBeInTheDocument();
    expect(within(preview).getByText("PLAYER_SHIP_MINI")).toBeInTheDocument();
    await waitFor(() => expect(fact(preview, en.newShip.preview.rooms)).toHaveTextContent("2"));
    expect(fact(preview, en.newShip.preview.systems)).toHaveTextContent("2");
    expect(fact(preview, en.newShip.preview.weapons)).toHaveTextContent("1");
    expect(fact(preview, en.newShip.preview.crew)).toHaveTextContent("1");
    expect(fact(preview, en.newShip.preview.hull)).toHaveTextContent("10");
    ns.next();

    // 3 · Name and hangar slot: the name follows the base ship.
    ns.step(3, 3, en.newShip.steps.name);
    const nameField = () => within(ns.dialog()).getByLabelText(en.newShip.name);
    expect(nameField()).toHaveValue(en.newShip.copyName("The Mini"));
    expect(nameField()).toHaveFocus();
    expect(
      within(ns.dialog()).getByText(en.newShip.takesPlace("Kestrel", "A", "the_mini_copy"))
    ).toBeInTheDocument();
    fireEvent.change(nameField(), { target: { value: "Tiny" } });
    fireEvent.click(within(ns.dialog()).getByRole("radio", { name: "Engi" }));

    // Back keeps the ship, the name and the slot.
    ns.back();
    ns.step(2, 3, en.newShip.steps.base);
    expect(within(ns.dialog()).getByRole("option", { name: /The Mini/ })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    ns.back();
    expect(ns.card(en.newShip.copy)).toBeChecked();
    ns.next();
    ns.next();
    expect(nameField()).toHaveValue("Tiny");
    expect(within(ns.dialog()).getByRole("radio", { name: "Engi" })).toBeChecked();
    fireEvent.click(ns.button(en.newShip.create));

    expect(await screen.findByText(en.topBar.unsaved)).toBeInTheDocument();
    expect(useEditor.getState().doc!.history.present.ship.blueprint).toMatchObject({
      name: "PLAYER_SHIP_CIRCLE",
      layout: "tiny",
      img: "tiny",
    });
    // A copy opens in Ship, with no hint about drawing rooms.
    expect(useEditor.getState().workspace).toBe("ship");
    expect(screen.queryByRole("note", { name: en.canvas.emptyShip.title })).toBeNull();
  });

  it("goes on with a double click or Enter, and closes with Esc", async () => {
    const platform = await withMiniGame();
    render(<App platform={platform} />);
    let ns = openNewShip();
    fireEvent.doubleClick(ns.card(en.newShip.copy));
    ns.step(2, 3, en.newShip.steps.base);
    // Enter waits for a ship to be picked.
    fireEvent.keyDown(within(ns.dialog()).getByRole("searchbox"), { key: "Enter" });
    ns.step(2, 3, en.newShip.steps.base);
    fireEvent.click(within(ns.dialog()).getByRole("option", { name: /The Mini/ }));
    fireEvent.keyDown(within(ns.dialog()).getByRole("searchbox"), { key: "Enter" });
    ns.step(3, 3, en.newShip.steps.name);
    ns.back();
    fireEvent.doubleClick(within(ns.dialog()).getByRole("option", { name: /The Mini/ }));
    ns.step(3, 3, en.newShip.steps.name);
    fireEvent.keyDown(ns.dialog(), { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    // A new dialog starts afresh; Enter on a card goes on with it.
    ns = openNewShip();
    expect(ns.card(en.newShip.empty)).toBeChecked();
    fireEvent.keyDown(ns.card(en.newShip.empty), { key: "Enter" });
    ns.step(2, 2, en.newShip.steps.name);
    fireEvent.click(ns.button(en.common.cancel));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens an empty hull made in two steps in Rooms, with the Room tool and a hint until the first room", async () => {
    const platform = await withMiniGame();
    render(<App platform={platform} />);
    const ns = openNewShip();
    ns.step(1, 2, en.newShip.steps.start);
    ns.next();
    ns.step(2, 2, en.newShip.steps.name);
    const nameField = within(ns.dialog()).getByLabelText(en.newShip.name);
    expect(nameField).toHaveValue(en.newShip.defaultName);
    // Enter in the name field creates the ship.
    fireEvent.keyDown(nameField, { key: "Enter" });

    const hint = await screen.findByRole("note", { name: en.canvas.emptyShip.title });
    expect(useEditor.getState().doc!.history.present.ship.blueprint).toMatchObject({
      name: "PLAYER_SHIP_HARD",
      layout: "new_ship",
    });
    expect(useEditor.getState().workspace).toBe("rooms");
    expect(currentTool(useEditor.getState())).toBe("room");
    expect(screen.getByRole("button", { name: en.tools.room })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(hint).toHaveTextContent(en.canvas.emptyShip.rooms("W"));
    expect(hint).toHaveTextContent(en.canvas.emptyShip.doors("E"));
    expect(hint).toHaveTextContent(en.canvas.emptyShip.systems);

    // Only Rooms shows it.
    act(() => useEditor.getState().setWorkspace("ship"));
    expect(screen.queryByRole("note", { name: en.canvas.emptyShip.title })).toBeNull();
    act(() => useEditor.getState().setWorkspace("rooms"));
    expect(screen.getByRole("note", { name: en.canvas.emptyShip.title })).toBeInTheDocument();

    act(() => void addRoomAt({ x: 0, y: 0, w: 2, h: 1 }));
    expect(screen.queryByRole("note", { name: en.canvas.emptyShip.title })).toBeNull();
    act(() => useEditor.getState().undo());
    expect(screen.getByRole("note", { name: en.canvas.emptyShip.title })).toBeInTheDocument();
  });

  describe("on an 800 × 600 canvas", () => {
    beforeEach(() => {
      vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
        x: 0,
        y: 0,
        left: 0,
        top: 0,
        right: 800,
        bottom: 600,
        width: 800,
        height: 600,
        toJSON: () => ({}),
      });
    });
    afterEach(() => vi.restoreAllMocks());

    it("starts an empty hull where the game places its ships, its frame in the middle of the canvas", async () => {
      const platform = await withMiniGame();
      render(<App platform={platform} />);
      const ns = openNewShip();
      ns.next();
      fireEvent.keyDown(within(ns.dialog()).getByLabelText(en.newShip.name), { key: "Enter" });
      await screen.findByRole("note", { name: en.canvas.emptyShip.title });
      const ship = () => useEditor.getState().doc!.history.present.ship;
      expect(ship().layout).toMatchObject({ xOffset: 7, yOffset: 5, horizontal: 5, vertical: -15 });
      expect(offCentrePx(ship())).toEqual({ x: 0, y: 0 });
      // The cell where the game places the middle of its ships is marked: cell (0, 0).
      const cell = screen.getByTestId("spot-cell");
      expect([cell.getAttribute("x"), cell.getAttribute("y")]).toEqual(["245", "175"]);
      await waitFor(() => expect(useEditor.getState().view.camera.x).not.toBe(0));
      const middle = shipToScreen(useEditor.getState().view.camera, frameMiddlePx(ship()));
      expect(middle.x).toBeCloseTo(400);
      expect(middle.y).toBeCloseTo(300);
      // A first room drawn on the marked cell sits where the game places its ships.
      act(() => void addRoomAt({ x: 0, y: 0, w: 1, h: 1 }));
      expect(offCentrePx(ship())).toEqual({ x: 0, y: 0 });
      expect(screen.queryByTestId("spot-cell")).toBeNull();
    });

    it("opens a game ship framed in the middle of the canvas: its rooms and hull together", async () => {
      const platform = await withMiniGame();
      render(<App platform={platform} />);
      fireEvent.click(screen.getByRole("button", { name: new RegExp(en.start.openShip) }));
      const dialog = screen.getByRole("dialog", { name: en.openShip.title });
      fireEvent.click(within(dialog).getByRole("option", { name: /The Mini/ }));
      fireEvent.click(within(dialog).getByRole("button", { name: en.openShip.open }));
      await waitFor(() => expect(useEditor.getState().doc).toBeDefined());
      await waitFor(() => expect(useEditor.getState().view.camera.x).not.toBe(0));
      const ship = useEditor.getState().doc!.history.present.ship;
      const box = shipBoxPx(ship)!;
      const at = shipToScreen(useEditor.getState().view.camera, {
        x: box.x + box.w / 2,
        y: box.y + box.h / 2,
      });
      expect(at.x).toBeCloseTo(400);
      expect(at.y).toBeCloseTo(300);
    });
  });

  it("says that a copy of an enemy ship is placed like a player ship", async () => {
    freshEditorStore();
    const platform = createFakePlatform({ [DAT_PATH]: miniGame() });
    await platform.writeFile(
      "mods/enemy.ftl",
      zipSync({
        "data/blueprints.xml.append": encodeText(
          '<FTL><shipBlueprint name="AUTO_TEST" layout="mini" img="mini"/></FTL>'
        ),
      })
    );
    await loadGameIntoStore(platform, en, DAT_PATH, { kind: "zip", path: "mods/enemy.ftl" });
    render(<App platform={platform} />);
    const ns = openNewShip();
    fireEvent.click(ns.card(en.newShip.copy));
    ns.next();
    fireEvent.click(within(ns.dialog()).getByRole("option", { name: /The Mini/ }));
    ns.next();
    expect(within(ns.dialog()).queryByText(en.newShip.enemyPlacement)).toBeNull();
    ns.back();
    fireEvent.click(within(ns.dialog()).getByRole("option", { name: /AUTO_TEST/ }));
    ns.next();
    expect(within(ns.dialog()).getByText(en.newShip.enemyPlacement)).toBeInTheDocument();
  });

  it("puts a new ship in a hangar slot of the type and layout chosen", async () => {
    const platform = await withMiniGame();
    render(<App platform={platform} />);
    const ns = openNewShip();
    ns.next();
    const dialog = ns.dialog();
    const types = within(dialog).getByRole("radiogroup", { name: en.hangarSlot.types });
    const layouts = within(dialog).getByRole("radiogroup", { name: en.hangarSlot.layouts });
    const layout = (letter: string) =>
      within(layouts).getByRole("radio", { name: en.hangarSlot.layout(letter) });
    const takes = (type: string, letter: string) =>
      within(dialog).getByText(en.newShip.takesPlace(type, letter, "new_ship"));

    // The Kestrel's layout A by default; each type is named under its icon.
    expect(within(types).getByRole("radio", { name: "Kestrel" })).toBeChecked();
    expect(within(types).getByRole("radio", { name: "Kestrel" })).toHaveTextContent("Kestrel");
    expect(layout("A")).toBeChecked();
    expect(within(types).getAllByRole("radio")).toHaveLength(10);
    expect(takes("Kestrel", "A")).toBeInTheDocument();
    // What taking a slot means is in the hover help of the slot heading.
    expect(screen.queryByText(en.help.newShipSlot.body)).not.toBeInTheDocument();
    fireEvent.pointerEnter(within(dialog).getByText(en.hangarSlot.label));
    expect(
      within(screen.getByRole("tooltip")).getByText(en.help.newShipSlot.body)
    ).toBeInTheDocument();

    fireEvent.click(within(types).getByRole("radio", { name: "Engi" }));
    fireEvent.click(layout("C"));
    expect(takes("Engi", "C")).toBeInTheDocument();
    // The Lanius and the Crystal have no layout C: with C chosen they are not offered.
    const offered = (name: string) => within(types).queryByRole("radio", { name });
    expect(within(types).getAllByRole("radio")).toHaveLength(8);
    expect(offered("Lanius")).not.toBeInTheDocument();
    expect(offered("Crystal")).not.toBeInTheDocument();
    fireEvent.click(layout("B"));
    expect(within(types).getAllByRole("radio")).toHaveLength(10);
    fireEvent.click(within(types).getByRole("radio", { name: "Lanius" }));
    expect(takes("Lanius", "B")).toBeInTheDocument();
    // Choosing C with the Lanius picked moves to the first type that has C.
    fireEvent.click(layout("C"));
    expect(takes("Kestrel", "C")).toBeInTheDocument();
    expect(offered("Lanius")).not.toBeInTheDocument();
    fireEvent.click(layout("B"));
    fireEvent.click(within(types).getByRole("radio", { name: "Lanius" }));
    expect(takes("Lanius", "B")).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: en.newShip.create }));
    expect(await screen.findByText(en.topBar.unsaved)).toBeInTheDocument();
    expect(useEditor.getState().doc!.history.present.ship.blueprint).toMatchObject({
      name: "PLAYER_SHIP_ANAEROBIC_2",
      layout: "new_ship",
      img: "new_ship",
    });
  });

  it("keeps an own blueprint name for mods made for other tools", async () => {
    const platform = await withMiniGame();
    render(<App platform={platform} />);
    const ns = openNewShip();
    ns.next();
    const dialog = ns.dialog();
    const create = within(dialog).getByRole("button", { name: en.newShip.create });
    // Folded away, marked as not shown in the plain game.
    const fold = within(dialog).getByText(en.newShip.ownNameFold, { selector: "summary" });
    expect(fold).toHaveTextContent(en.newShip.notInGame);
    expect(fold.parentElement).not.toHaveAttribute("open");
    fireEvent.click(fold);
    fireEvent.click(within(dialog).getByRole("checkbox", { name: en.newShip.useOwnName }));
    const own = within(dialog).getByRole("textbox", { name: en.newShip.ownName });
    expect(own).toHaveFocus();
    expect(own).toHaveValue("NEW_SHIP");
    expect(within(dialog).getByText(en.newShip.ownNameHint)).toBeInTheDocument();
    expect(within(dialog).getByRole("radio", { name: "Kestrel" })).toBeDisabled();
    expect(
      within(dialog).getByText(en.newShip.savedAs("NEW_SHIP", "new_ship"))
    ).toBeInTheDocument();

    // An invalid name keeps Create (and Enter) from going on.
    fireEvent.change(own, { target: { value: "MY SHIP" } });
    expect(within(dialog).getByText(en.hangar.invalidId)).toBeInTheDocument();
    expect(create).toBeDisabled();
    fireEvent.keyDown(own, { key: "Enter" });
    expect(screen.getByRole("dialog", { name: en.newShip.title })).toBeInTheDocument();
    // So does an empty ship name.
    fireEvent.change(own, { target: { value: "MY_SHIP" } });
    expect(create).toBeEnabled();
    const nameField = within(dialog).getByLabelText(en.newShip.name);
    fireEvent.change(nameField, { target: { value: "  " } });
    expect(create).toBeDisabled();
    fireEvent.change(nameField, { target: { value: "Mine" } });
    expect(within(dialog).getByText(en.newShip.savedAs("MY_SHIP", "mine"))).toBeInTheDocument();
    fireEvent.click(create);
    expect(await screen.findByText(en.topBar.unsaved)).toBeInTheDocument();
    expect(useEditor.getState().doc!.history.present.ship.blueprint).toMatchObject({
      name: "MY_SHIP",
      layout: "mine",
      img: "mine",
    });
  });

  it("lists recent ships and opens one again", async () => {
    const platform = await withMiniGame();
    const recent = {
      name: "The Mini",
      blueprint: "PLAYER_SHIP_MINI",
      img: "mini",
      origin: { kind: "game" as const },
      time: Date.UTC(2026, 0, 5),
    };
    act(() => useEditor.getState().setRecent([recent]));
    render(<App platform={platform} />);
    const item = screen.getByRole("button", { name: /The Mini/ });
    expect(item).toHaveTextContent(en.start.recentGame);
    fireEvent.click(item);
    expect(await screen.findByRole("tablist", { name: en.topBar.workspaces })).toBeInTheDocument();
  });

  it("offers English and the tour link", () => {
    render(<App platform={createFakePlatform()} />);
    expect(screen.getByRole("combobox", { name: en.start.language })).toHaveValue("en");
    expect(screen.getByRole("button", { name: en.start.tour })).toBeInTheDocument();
    expect(screen.getByText(en.start.recentEmpty)).toBeInTheDocument();
  });
});
