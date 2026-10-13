// @vitest-environment jsdom
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { resetEditorStore, useEditor } from "../app/store";
import { miniGame } from "../core/testing/miniGame";
import { en } from "../text/en";
import { DAT_PATH, withMiniGame } from "../testing/editorFixtures";
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
    expect(screen.getByText("The Mini")).toBeInTheDocument();
    expect(useEditor.getState().recent[0].blueprint).toBe("PLAYER_SHIP_MINI");
  });

  it("creates a copy of a game ship under a new name", async () => {
    const platform = await withMiniGame();
    render(<App platform={platform} />);
    fireEvent.click(screen.getByRole("button", { name: new RegExp(en.start.newShip) }));
    const dialog = screen.getByRole("dialog", { name: en.newShip.title });
    const create = within(dialog).getByRole("button", { name: en.newShip.create });
    fireEvent.click(within(dialog).getByRole("button", { name: new RegExp(en.newShip.copy) }));
    expect(create).toBeDisabled();
    fireEvent.click(within(dialog).getByRole("option", { name: /The Mini/ }));
    expect(within(dialog).getByLabelText(en.newShip.name)).toHaveValue(
      en.newShip.copyName("The Mini")
    );
    expect(within(dialog).getByText(en.newShip.savedAs("THE_MINI_COPY"))).toBeInTheDocument();
    fireEvent.click(create);

    expect(await screen.findByText(en.topBar.unsaved)).toBeInTheDocument();
    expect(useEditor.getState().doc!.history.present.ship.blueprint.name).toBe("THE_MINI_COPY");
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
