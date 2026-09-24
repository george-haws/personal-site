import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ExperienceEntry, SkillGroups } from "@/components/ResumeSection";
import type { Experience } from "@/lib/types";

const current: Experience = {
  company: "Acme",
  role: "Staff Engineer",
  location: "Remote",
  start: "2021-03",
  highlights: ["Did the thing.", "Did another thing."],
  tech: ["Go"],
};

describe("ExperienceEntry", () => {
  it("renders role, company, location, and highlights", () => {
    render(<ExperienceEntry entry={current} />);
    expect(screen.getByRole("heading", { name: "Staff Engineer" })).toBeInTheDocument();
    expect(screen.getByText("Acme")).toBeInTheDocument();
    expect(screen.getByText("Remote")).toBeInTheDocument();
    expect(screen.getByText("Did the thing.")).toBeInTheDocument();
    expect(screen.getByText("Did another thing.")).toBeInTheDocument();
    expect(screen.getByText("Go")).toBeInTheDocument();
  });

  it("keeps spaces around the separator between company and location", () => {
    render(<ExperienceEntry entry={current} />);
    expect(screen.getByText("Acme").parentElement).toHaveTextContent(/^Acme · Remote$/);
  });

  it("shows Present when there is no end date", () => {
    render(<ExperienceEntry entry={current} />);
    expect(screen.getByText("Mar 2021 – Present")).toBeInTheDocument();
  });

  it("shows the full range when there is an end date", () => {
    render(<ExperienceEntry entry={{ ...current, end: "2023-09" }} />);
    expect(screen.getByText("Mar 2021 – Sep 2023")).toBeInTheDocument();
  });

  it("omits the tech list when tech is absent", () => {
    render(<ExperienceEntry entry={{ ...current, tech: undefined }} />);
    expect(screen.queryByText("Go")).toBeNull();
  });
});

describe("SkillGroups", () => {
  it("renders each group label with its skills", () => {
    render(
      <SkillGroups
        groups={[
          { label: "Languages", skills: ["Go", "TypeScript"] },
          { label: "Infra", skills: ["Kubernetes"] },
        ]}
      />,
    );
    expect(screen.getByText("Languages")).toBeInTheDocument();
    expect(screen.getByText("Go, TypeScript")).toBeInTheDocument();
    expect(screen.getByText("Infra")).toBeInTheDocument();
    expect(screen.getByText("Kubernetes")).toBeInTheDocument();
  });
});
