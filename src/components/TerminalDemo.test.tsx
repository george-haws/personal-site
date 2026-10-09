import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { TerminalDemo } from "@/components/TerminalDemo";
import type { DemoLine } from "@/lib/types";

const lines: DemoLine[] = [
  [{ text: "[sess]", style: "name" }, { text: " · " }, { text: "Opus", style: "dim" }],
  [{ text: "Started:", style: "label" }, { text: " " }, { text: "A summary", style: "italic" }],
];

describe("TerminalDemo", () => {
  it("renders each line of the sample on its own row", () => {
    render(<TerminalDemo lines={lines} />);
    const pre = screen.getByRole("figure");
    expect(pre).toHaveTextContent("[sess] · Opus");
    expect(pre).toHaveTextContent("Started: A summary");
    expect(pre.textContent).toBe("[sess] · Opus\nStarted: A summary");
  });

  it("styles spans by their kind and leaves plain text unstyled", () => {
    render(<TerminalDemo lines={lines} />);
    expect(screen.getByText("[sess]")).toHaveClass("font-semibold");
    expect(screen.getByText("Opus")).toHaveClass("text-muted-foreground");
    expect(screen.getByText("Started:")).toHaveClass("text-primary");
    expect(screen.getByText("A summary")).toHaveClass("italic");
    expect(screen.getByText("·", { exact: false }).className).toBe("");
  });
});
