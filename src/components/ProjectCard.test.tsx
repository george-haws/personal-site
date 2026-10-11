import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ProjectCard } from "@/components/ProjectCard";
import type { Project } from "@/lib/types";

const base: Project = {
  title: "Tool",
  summary: "Does a thing.",
  description: "Longer text about the thing.",
  tech: ["Go", "SQLite"],
  featured: false,
};

describe("ProjectCard", () => {
  it("renders title, summary, description, and tech tags", () => {
    render(<ProjectCard project={base} />);
    expect(screen.getByRole("heading", { name: "Tool" })).toBeInTheDocument();
    expect(screen.getByText("Does a thing.")).toBeInTheDocument();
    expect(screen.getByText("Longer text about the thing.")).toBeInTheDocument();
    expect(screen.getByText("Go")).toBeInTheDocument();
    expect(screen.getByText("SQLite")).toBeInTheDocument();
  });

  it("separates tech tags with spaces", () => {
    render(<ProjectCard project={base} />);
    expect(screen.getByText("Go").parentElement).toHaveTextContent(/^Go SQLite$/);
  });

  it("renders no links when no URLs are present", () => {
    render(<ProjectCard project={base} />);
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });

  it("renders repo and live links when URLs are present", () => {
    render(
      <ProjectCard
        project={{ ...base, repoUrl: "https://github.com/x/tool", liveUrl: "https://tool.example" }}
      />,
    );
    expect(screen.getByRole("link", { name: "Source" })).toHaveAttribute("href", "https://github.com/x/tool");
    expect(screen.getByRole("link", { name: "Live" })).toHaveAttribute("href", "https://tool.example");
  });

  it("renders an image only when one is given", () => {
    const { rerender } = render(<ProjectCard project={base} />);
    expect(screen.queryByRole("img")).toBeNull();
    rerender(<ProjectCard project={{ ...base, image: "/tool.png" }} />);
    expect(screen.getByRole("img", { name: "Tool" })).toHaveAttribute("src", "/tool.png");
  });

  it("renders a terminal demo only when one is given", () => {
    const { rerender } = render(<ProjectCard project={base} />);
    expect(screen.queryByRole("figure")).toBeNull();
    rerender(
      <ProjectCard
        project={{ ...base, demo: [[{ text: "Doing:", style: "label" }, { text: " Run tests (4s)" }]] }}
      />,
    );
    expect(screen.getByRole("figure")).toHaveTextContent("Doing: Run tests (4s)");
  });

  it("renders the title as an h3 by default and as an h2 when asked", () => {
    const { rerender } = render(<ProjectCard project={base} />);
    expect(screen.getByRole("heading", { level: 3, name: "Tool" })).toBeInTheDocument();
    rerender(<ProjectCard project={base} headingLevel="h2" />);
    expect(screen.getByRole("heading", { level: 2, name: "Tool" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 3 })).toBeNull();
  });
});
