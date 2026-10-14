// @vitest-environment jsdom
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useEditor } from "../app/store";
import { en } from "../text/en";
import { createFakePlatform } from "../testing/fakePlatform";
import { openTestShip } from "../testing/layoutFixtures";
import { App } from "./App";
import { ConfirmDialog } from "./common/ConfirmDialog";
import { EditorErrorBoundary } from "./editor/EditorCrash";

const state = () => useEditor.getState();

vi.mock("./editor/EditorWindow", () => ({ EditorWindow: FailsAfterAnEdit }));

/** Stands in for the editor: fails to draw while the ship has a step to undo. */
function FailsAfterAnEdit() {
  const steps = useEditor((s) => s.doc?.history.past.length ?? 0);
  if (steps > 0) throw new Error("The test editor fell over");
  return <p>The editor</p>;
}

function renameShip() {
  act(() => state().edit((s) => ({ ...s, blueprint: { ...s.blueprint, name: "RENAMED" } })));
}

let logged: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  openTestShip();
  logged = vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => vi.restoreAllMocks());

describe("the crash screen", () => {
  beforeEach(() => {
    render(
      <>
        <EditorErrorBoundary>
          <FailsAfterAnEdit />
        </EditorErrorBoundary>
        <ConfirmDialog />
      </>
    );
    expect(screen.getByText("The editor")).toBeInTheDocument();
    renameShip();
  });

  it("shows a message and the error, selectable, and logs the error", () => {
    expect(screen.queryByText("The editor")).toBeNull();
    expect(screen.getByRole("heading", { name: en.crash.title })).toBeInTheDocument();
    expect(screen.getByText(en.crash.message)).toBeInTheDocument();
    const error = screen.getByLabelText(en.crash.errorLabel);
    expect(error).toHaveTextContent("Error: The test editor fell over");
    expect(error).toHaveClass("ed-crash-error");
    expect(screen.getByRole("button", { name: en.crash.undoAndContinue })).toHaveFocus();
    expect(
      logged.mock.calls.some((call: unknown[]) =>
        call.some((arg) => arg instanceof Error && arg.message === "The test editor fell over")
      )
    ).toBe(true);
  });

  it("undoes the last step and shows the editor again", () => {
    fireEvent.click(screen.getByRole("button", { name: en.crash.undoAndContinue }));
    expect(state().doc?.history.past).toHaveLength(0);
    expect(state().doc?.history.present.ship.blueprint.name).not.toBe("RENAMED");
    expect(screen.getByText("The editor")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: en.crash.title })).toBeNull();
  });

  it("goes back to the start screen, asking first about unsaved changes", async () => {
    fireEvent.click(screen.getByRole("button", { name: en.crash.backToStart }));
    const question = await screen.findByRole("dialog", { name: en.topBar.confirmClose.title });
    fireEvent.click(within(question).getByRole("button", { name: en.common.cancel }));
    await act(async () => undefined);
    expect(state().doc).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: en.crash.backToStart }));
    fireEvent.click(await screen.findByRole("button", { name: en.topBar.confirmClose.confirm }));
    await act(async () => undefined);
    expect(state().doc).toBeUndefined();
  });

  it("goes back to the start screen at once when nothing is unsaved", async () => {
    const doc = state().doc!;
    act(() =>
      state().markSaved(doc.history.present, { kind: "folder", path: "out" }, { kind: "game" })
    );
    fireEvent.click(screen.getByRole("button", { name: en.crash.backToStart }));
    await act(async () => undefined);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(state().doc).toBeUndefined();
  });
});

describe("the app", () => {
  it("shows the crash screen in place of a failing editor and goes back to the start", async () => {
    act(() => state().closeDocument());
    render(<App platform={createFakePlatform()} />);
    act(() => {
      openTestShip();
    });
    expect(screen.getByText("The editor")).toBeInTheDocument();
    renameShip();
    expect(screen.getByRole("heading", { name: en.crash.title })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: en.crash.backToStart }));
    fireEvent.click(await screen.findByRole("button", { name: en.topBar.confirmClose.confirm }));
    await act(async () => undefined);
    expect(screen.queryByRole("heading", { name: en.crash.title })).toBeNull();
    expect(screen.getByRole("button", { name: new RegExp(en.start.newShip) })).toBeInTheDocument();
  });
});
