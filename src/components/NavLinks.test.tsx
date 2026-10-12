import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { NavLinks } from "@/components/NavLinks";

describe("NavLinks", () => {
  it("renders the four routes", () => {
    render(<NavLinks currentPath="/" />);
    expect(screen.getByRole("link", { name: "About" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Writing" })).toHaveAttribute("href", "/writing");
    expect(screen.getByRole("link", { name: "Resume" })).toHaveAttribute("href", "/resume");
    expect(screen.getByRole("link", { name: "Projects" })).toHaveAttribute("href", "/projects");
  });

  it("orders the links About, Writing, Resume, Projects", () => {
    render(<NavLinks currentPath="/" />);
    const labels = screen.getAllByRole("link").map((link) => link.textContent);
    expect(labels).toEqual(["About", "Writing", "Resume", "Projects"]);
  });

  it("marks the writing link current on a post page", () => {
    render(<NavLinks currentPath="/writing/some-slug" />);
    expect(screen.getByRole("link", { name: "Writing" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "About" })).not.toHaveAttribute("aria-current");
  });

  it("marks the projects link current on /projects", () => {
    render(<NavLinks currentPath="/projects" />);
    expect(screen.getByRole("link", { name: "Projects" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "About" })).not.toHaveAttribute("aria-current");
  });

  it("marks only the home link current on /", () => {
    render(<NavLinks currentPath="/" />);
    expect(screen.getByRole("link", { name: "About" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Resume" })).not.toHaveAttribute("aria-current");
  });

  it("marks the resume link current on /resume", () => {
    render(<NavLinks currentPath="/resume" />);
    expect(screen.getByRole("link", { name: "Resume" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "About" })).not.toHaveAttribute("aria-current");
  });
});
