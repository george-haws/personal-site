import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import Home from "@/app/page";

describe("Home", () => {
  it("links to the resume page and the PDF", () => {
    render(<Home />);
    expect(screen.getByRole("link", { name: "Resume →" })).toHaveAttribute("href", "/resume");
    expect(screen.getByRole("link", { name: "PDF" })).toHaveAttribute("href", "/resume.pdf");
  });

  it("shows the featured projects with their sample output", () => {
    render(<Home />);
    expect(screen.getByRole("heading", { name: "Featured projects" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "expo-whisperkit" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Claude Code setup" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Claude Code status line" })).toBeInTheDocument();
    const figures = screen.getAllByRole("figure");
    expect(figures).toHaveLength(3);
    expect(figures[0]).toHaveTextContent("streamingUpdate");
    expect(figures[1]).toHaveTextContent("cross-model-review");
    expect(figures[2]).toHaveTextContent("Started:");
  });

  it("does not link to the projects page", () => {
    render(<Home />);
    expect(screen.queryByRole("link", { name: /projects/i })).toBeNull();
  });
});
