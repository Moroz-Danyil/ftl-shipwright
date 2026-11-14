// @vitest-environment jsdom
import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import type { ShipCatalogEntry } from "../core";
import { resetEditorStore } from "../app/store";
import { en } from "../text/en";
import { ShipPicker } from "./start/ShipPicker";

const origin = { file: "data/blueprints.xml", fromMod: false };
const ship = (name: string, more: Partial<ShipCatalogEntry> = {}): ShipCatalogEntry => ({
  name,
  layout: name.toLowerCase(),
  img: name.toLowerCase(),
  isPlayer: name.startsWith("PLAYER_SHIP_"),
  displayName: name,
  xml: "",
  ...origin,
  ...more,
});

const ships = [
  ship("PLAYER_SHIP_HARD", { displayName: "The Kestrel", className: "Kestrel Cruiser" }),
  ship("BOSS_1_EASY", { className: "Rebel Flagship" }),
  ship("AUTO_BASIC", { className: "Auto-Scout" }),
  ship("BOSS_1_NORMAL_DLC", { className: "Rebel Flagship" }),
  ship("MYSTERY"),
  ship("ODDITY"),
];

describe("the ship picker", () => {
  beforeEach(() => resetEditorStore());

  it("titles ships by the game's name or class, the blueprint name under it, by class", () => {
    const picked: string[] = [];
    render(
      <ShipPicker
        ships={ships}
        selected={undefined}
        onSelect={(n) => picked.push(n)}
        onChoose={() => {}}
      />
    );
    const kestrel = screen.getByRole("option", { name: /The Kestrel/ });
    expect(kestrel).toHaveTextContent("Kestrel Cruiser · PLAYER_SHIP_HARD");

    const flagships = screen.getByRole("group", { name: "Rebel Flagship" });
    const rows = within(flagships).getAllByRole("option");
    expect(rows.map((r) => r.querySelector(".picker-name")!.textContent)).toEqual([
      "Rebel Flagship",
      "Rebel Flagship",
    ]);
    expect(rows.map((r) => r.querySelector(".picker-sub")!.textContent)).toEqual([
      "BOSS_1_EASY",
      "BOSS_1_NORMAL_DLC",
    ]);
    // A class of one ship is a plain row, its title naming the class.
    expect(screen.queryByRole("group", { name: "Auto-Scout" })).toBeNull();
    expect(screen.getByRole("option", { name: /Auto-Scout/ })).toHaveTextContent("AUTO_BASIC");
    // Ships with neither name nor class show their blueprint name once, last.
    const unclassed = screen.getByRole("group", { name: en.shipPicker.noClass });
    const mystery = within(unclassed).getAllByRole("option")[0];
    expect(mystery.querySelector(".picker-name")).toHaveTextContent("MYSTERY");
    expect(mystery.querySelector(".picker-sub")).toBeNull();
    const groups = screen.getAllByRole("group").map((g) => g.getAttribute("aria-label"));
    expect(groups).toEqual(["Rebel Flagship", en.shipPicker.noClass]);
    const titles = screen
      .getAllByRole("option")
      .map((o) => o.querySelector(".picker-name")!.textContent);
    expect(titles).toEqual([
      "The Kestrel",
      "Auto-Scout",
      "Rebel Flagship",
      "Rebel Flagship",
      "MYSTERY",
      "ODDITY",
    ]);

    fireEvent.click(rows[1]);
    expect(picked).toEqual(["BOSS_1_NORMAL_DLC"]);
  });

  it("still finds a ship by its blueprint name", () => {
    render(
      <ShipPicker ships={ships} selected={undefined} onSelect={() => {}} onChoose={() => {}} />
    );
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "normal_dlc" } });
    expect(screen.getAllByRole("option")).toHaveLength(1);
    expect(screen.getByRole("option")).toHaveTextContent("Rebel FlagshipBOSS_1_NORMAL_DLC");
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "boss_1" } });
    expect(
      within(screen.getByRole("group", { name: "Rebel Flagship" })).getAllByRole("option")
    ).toHaveLength(2);
    expect(screen.queryByText(en.shipPicker.playerShips)).toBeNull();
    expect(screen.getByText(en.shipPicker.otherShips)).toBeInTheDocument();
  });
});
