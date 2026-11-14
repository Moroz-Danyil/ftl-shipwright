// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { resetEditorStore } from "../app/store";
import { Section } from "./common/Section";

beforeEach(() => resetEditorStore());

describe("section", () => {
  it("starts folded, and opens and folds with its title, showing the count", () => {
    render(
      <Section id="crew" title="Crew" icon="crew" count="3 / 8">
        <span>Human</span>
      </Section>
    );
    const head = screen.getByRole("button", { name: /Crew/ });
    expect(head).toHaveAttribute("aria-expanded", "false");
    expect(head).toHaveTextContent("3 / 8");
    expect(screen.queryByText("Human")).not.toBeInTheDocument();
    fireEvent.click(head);
    expect(head).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Human")).toBeInTheDocument();
    fireEvent.click(head);
    expect(screen.queryByText("Human")).not.toBeInTheDocument();
  });

  it("stays open for the rest of the run, but starts folded in a new run", () => {
    const { unmount } = render(
      <Section id="help" title="Help" icon="select">
        <span>Body</span>
      </Section>
    );
    fireEvent.click(screen.getByRole("button", { name: "Help" }));
    unmount();
    const again = render(
      <Section id="help" title="Help" icon="select">
        <span>Body</span>
      </Section>
    );
    expect(screen.getByText("Body")).toBeInTheDocument();
    again.unmount();
    resetEditorStore();
    render(
      <Section id="help" title="Help" icon="select">
        <span>Body</span>
      </Section>
    );
    expect(screen.queryByText("Body")).not.toBeInTheDocument();
  });
});
