import { describe, it, expect } from "vitest";
import { escapeHtml, renderResumeHtml } from "@/lib/resume-html";
import type { Resume, SiteInfo } from "@/lib/types";

const site: SiteInfo = {
  name: "Ada Lovelace",
  tagline: "Tagline.",
  bio: "Bio.",
  location: "London",
  url: "https://ada.dev",
  links: {
    email: "ada@ada.dev",
    github: "https://github.com/ada",
    linkedin: "https://www.linkedin.com/in/ada",
  },
};

const resume: Resume = {
  headline: "Staff Engineer",
  summary: "Writes programs.",
  skillGroups: [{ label: "Languages", skills: ["Go", "TypeScript"] }],
  experience: [
    {
      company: "Old Co",
      role: "Intern",
      location: "Cambridge",
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
      highlights: ["Did the thing."],
      tech: ["Rust"],
    },
  ],
};

function parse(html: string): Document {
  return new DOMParser().parseFromString(html, "text/html");
}

describe("escapeHtml", () => {
  it("escapes the five HTML-significant characters", () => {
    expect(escapeHtml(`<a href="x">Tom & Jerry's</a>`)).toBe(
      "&lt;a href=&quot;x&quot;&gt;Tom &amp; Jerry&#39;s&lt;/a&gt;",
    );
  });
});

describe("renderResumeHtml", () => {
  const html = renderResumeHtml(resume, site);
  const doc = parse(html);
  const text = doc.body.textContent!.replace(/\s+/g, " ");

  it("titles the document with name and headline", () => {
    expect(doc.title).toBe("Ada Lovelace — Staff Engineer");
  });

  it("contains the header, every entry, highlight, and date range", () => {
    for (const expected of [
      "Ada Lovelace",
      "Staff Engineer",
      "London",
      "Engine Co",
      "Engineer",
      "Old Co",
      "Intern",
      "Cambridge",
      "Did the thing.",
      "Learned the ropes.",
      "Mar 2021 – Present",
      "Jan 2018 – Jun 2019",
      "Languages:",
      "Go, TypeScript",
    ]) {
      expect(text, expected).toContain(expected);
    }
  });

  it("orders sections Summary, Skills, Experience and entries newest first", () => {
    const headings = Array.from(doc.querySelectorAll("h2")).map((h) => h.textContent);
    expect(headings).toEqual(["Summary", "Skills", "Experience"]);
    expect(text.indexOf("Engine Co")).toBeLessThan(text.indexOf("Old Co"));
  });

  it("links email, site, GitHub, and LinkedIn", () => {
    const hrefs = Array.from(doc.querySelectorAll("a")).map((a) => a.getAttribute("href"));
    expect(hrefs).toEqual([
      "mailto:ada@ada.dev",
      "https://ada.dev",
      "https://github.com/ada",
      "https://www.linkedin.com/in/ada",
    ]);
  });

  it("sets page geometry in CSS only", () => {
    expect(html).toContain("@page { size: Letter; margin: 0.6in; }");
  });

  it("leaves out tech tags", () => {
    expect(text).not.toContain("Rust");
  });

  it("escapes data in text and attributes", () => {
    const hostile = renderResumeHtml(
      {
        ...resume,
        experience: [{ ...resume.experience[1], highlights: [`Use <b> & "quotes"`] }],
      },
      { ...site, links: { github: `https://github.com/a" onclick="x` } },
    );
    expect(hostile).toContain("Use &lt;b&gt; &amp; &quot;quotes&quot;");
    const parsed = parse(hostile);
    expect(parsed.querySelector("li b")).toBeNull();
    expect(parsed.querySelector("[onclick]")).toBeNull();
    expect(parsed.querySelector('a[href^="https://github.com"]')!.getAttribute("href")).toBe(
      `https://github.com/a" onclick="x`,
    );
  });
});
