import { readFileSync } from "node:fs";
import path from "node:path";
import { icResume } from "@/data/resume";
import { site as realSite } from "@/data/site";
import { describe, it, expect } from "vitest";
import { renderResumeMarkdown } from "@/lib/resume-markdown";
import type { Resume, SiteInfo } from "@/lib/types";

const site: SiteInfo = {
  name: "Ada Lovelace",
  tagline: "Tagline.",
  bio: "Bio.",
  location: "London",
  url: "https://ada.dev",
  links: { email: "ada@ada.dev", github: "https://github.com/ada" },
};

const resume: Resume = {
  headline: "Staff Engineer",
  summary: "Writes programs.",
  skillGroups: [
    { label: "Languages", skills: ["Go", "TypeScript"] },
    { label: "Cloud", skills: ["AWS"] },
  ],
  experience: [
    {
      company: "Old Co",
      role: "Intern",
      location: "London",
      start: "2018-01",
      end: "2019-06",
      highlights: ["Learned the ropes."],
      tech: ["Rust"],
    },
    {
      company: "Engine Co",
      role: "Engineer",
      location: "Remote",
      start: "2021-03",
      highlights: ["Did the thing.", "Did another thing."],
      tech: ["Rust"],
    },
  ],
};

const md = renderResumeMarkdown(resume, site);

describe("renderResumeMarkdown", () => {
  it("starts with the name, the bold headline, and the contact line", () => {
    const lines = md.split("\n").filter((line) => line.trim() !== "");
    expect(lines[0]).toBe("# Ada Lovelace");
    expect(lines[1]).toBe("**Staff Engineer**");
    expect(lines[2]).toBe(
      "London · [ada@ada.dev](mailto:ada@ada.dev) · [ada.dev](https://ada.dev) · [github.com/ada](https://github.com/ada)",
    );
  });

  it("separates blocks with one blank line and ends with a single newline", () => {
    expect(md.startsWith("# Ada Lovelace\n\n**Staff Engineer**\n\nLondon · ")).toBe(true);
    expect(md).toContain("## Summary\n\nWrites programs.\n\n## Skills");
    expect(md.endsWith("\n")).toBe(true);
    expect(md.endsWith("\n\n")).toBe(false);
  });

  it("orders sections Summary, Skills, Experience", () => {
    const summary = md.indexOf("## Summary");
    const skills = md.indexOf("## Skills");
    const experience = md.indexOf("## Experience");
    expect(summary).toBeGreaterThan(-1);
    expect(summary).toBeLessThan(skills);
    expect(skills).toBeLessThan(experience);
  });

  it("renders each skill group as one bullet", () => {
    expect(md).toContain("- **Languages:** Go, TypeScript\n- **Cloud:** AWS");
  });

  it("renders experience newest first with dates, location, and highlights", () => {
    expect(md).toContain(
      "### Engine Co — Engineer\n\nMar 2021 – Present · Remote\n\n- Did the thing.\n- Did another thing.",
    );
    expect(md).toContain("### Old Co — Intern\n\nJan 2018 – Jun 2019 · London\n\n- Learned the ropes.");
    expect(md.indexOf("Engine Co")).toBeLessThan(md.indexOf("Old Co"));
  });

  it("leaves out tech tags", () => {
    expect(md).not.toContain("Rust");
  });
});

describe("docs/resume-ic.md", () => {
  it("matches the current resume data", () => {
    const committed = readFileSync(path.join(process.cwd(), "docs/resume-ic.md"), "utf8");
    expect(renderResumeMarkdown(icResume, realSite), "docs/resume-ic.md is stale; run `npm run resume`").toBe(
      committed,
    );
  });
});
