// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { Section } from "./common/Section";

beforeEach(() => localStorage.clear());

describe("section", () => {
  it("folds and opens with its title, showing the count", () => {
    render(
      <Section id="crew" title="Crew" icon="crew" count="3 / 8">
        <span>Human</span>
      </Section>
    );
    const head = screen.getByRole("button", { name: /Crew/ });
    expect(head).toHaveAttribute("aria-expanded", "true");
    expect(head).toHaveTextContent("3 / 8");
    expect(screen.getByText("Human")).toBeInTheDocument();
    fireEvent.click(head);
    expect(head).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Human")).not.toBeInTheDocument();
  });

  it("starts folded when asked, and remembers the choice", () => {
    const { unmount } = render(
      <Section id="help" title="Help" icon="select" defaultOpen={false}>
        <span>Body</span>
      </Section>
    );
    expect(screen.queryByText("Body")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Help" }));
    unmount();
    render(
      <Section id="help" title="Help" icon="select" defaultOpen={false}>
        <span>Body</span>
      </Section>
    );
    expect(screen.getByText("Body")).toBeInTheDocument();
  });
});
