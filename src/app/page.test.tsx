import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import Home from "@/app/page";

describe("Home", () => {
  it("links to the resume page and the PDF", () => {
    render(<Home />);
    expect(screen.getByRole("link", { name: "Resume →" })).toHaveAttribute("href", "/resume");
    expect(screen.getByRole("link", { name: "PDF" })).toHaveAttribute("href", "/resume.pdf");
  });

  it("does not show projects", () => {
    render(<Home />);
    expect(screen.queryByRole("heading", { name: "Featured projects" })).toBeNull();
    expect(screen.queryByRole("link", { name: /projects/i })).toBeNull();
  });
});
