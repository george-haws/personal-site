import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { NavLinks } from "@/components/NavLinks";

describe("NavLinks", () => {
  it("renders the three routes", () => {
    render(<NavLinks currentPath="/" />);
    expect(screen.getByRole("link", { name: "About" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Resume" })).toHaveAttribute("href", "/resume");
    expect(screen.getByRole("link", { name: "Projects" })).toHaveAttribute("href", "/projects");
  });

  it("marks only the home link current on /", () => {
    render(<NavLinks currentPath="/" />);
    expect(screen.getByRole("link", { name: "About" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Resume" })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("link", { name: "Projects" })).not.toHaveAttribute("aria-current");
  });

  it("marks the resume link current on /resume", () => {
    render(<NavLinks currentPath="/resume" />);
    expect(screen.getByRole("link", { name: "Resume" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "About" })).not.toHaveAttribute("aria-current");
  });
});
