// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetEditorStore, useEditor } from "../app/store";
import { en } from "../text/en";
import { withMiniShipOpen } from "../testing/editorFixtures";
import { createFakePlatform } from "../testing/fakePlatform";
import { App } from "./App";

const html = () => document.documentElement;

beforeEach(() => {
  localStorage.clear();
  resetEditorStore();
});

afterEach(() => {
  delete html().dataset.theme;
});

describe("settings", () => {
  it("opens from the start screen and changes the theme, remembering it", () => {
    render(<App platform={createFakePlatform({})} />);
    expect(html().dataset.theme).toBe("dark");

    fireEvent.click(screen.getByRole("button", { name: en.start.settings }));
    const dialog = screen.getByRole("dialog", { name: en.settings.title });
    fireEvent.click(within(dialog).getByRole("radio", { name: en.settings.light }));

    expect(html().dataset.theme).toBe("light");
    expect(within(dialog).getByRole("radio", { name: en.settings.light })).toHaveAttribute(
      "aria-checked",
      "true"
    );
    expect(JSON.parse(localStorage.getItem("shipwright.theme")!)).toBe("light");
  });

  it("opens from the editor's top bar and scales the interface", async () => {
    const platform = await withMiniShipOpen();
    render(<App platform={platform} />);

    fireEvent.click(screen.getByRole("button", { name: en.topBar.settings }));
    const dialog = screen.getByRole("dialog", { name: en.settings.title });
    fireEvent.click(within(dialog).getByRole("radio", { name: en.settings.scaleValue(150) }));

    expect(useEditor.getState().uiScale).toBe(150);
    await waitFor(() => expect(platform.zoom).toBe(1.5));
    expect(JSON.parse(localStorage.getItem("shipwright.scale")!)).toBe(150);

    fireEvent.click(within(dialog).getByRole("button", { name: en.common.close }));
    expect(screen.queryByRole("dialog", { name: en.settings.title })).not.toBeInTheDocument();
  });

  it("starts with the remembered theme and scale", async () => {
    localStorage.setItem("shipwright.theme", JSON.stringify("light"));
    localStorage.setItem("shipwright.scale", JSON.stringify(125));
    resetEditorStore();
    const platform = createFakePlatform({});
    render(<App platform={platform} />);
    expect(html().dataset.theme).toBe("light");
    await waitFor(() => expect(platform.zoom).toBe(1.25));
  });
});

describe("settings keyboard", () => {
  it("focuses the chosen scale and moves the choice with the arrow keys", () => {
    render(<App platform={createFakePlatform({})} />);
    fireEvent.click(screen.getByRole("button", { name: en.start.settings }));
    const chosen = screen.getByRole("radio", { name: en.settings.scaleValue(100) });
    expect(chosen).toHaveFocus();
    fireEvent.keyDown(chosen, { key: "ArrowRight" });
    expect(useEditor.getState().uiScale).toBe(110);
    fireEvent.keyDown(chosen, { key: "ArrowLeft" });
    expect(useEditor.getState().uiScale).toBe(100);
  });
});
