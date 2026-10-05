# Resume Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate `docs/resume-ic.md` and `public/resume.pdf` from `src/data/resume.ts` with `npm run resume`, with tests that fail `npm run check` when the committed outputs are stale.

**Architecture:** Two pure renderers in `src/lib` (`renderResumeMarkdown`, `renderResumeHtml`) share a contact-line helper (`contactItems`, `displayUrl`). A `tsx` script writes the Markdown, then prints the HTML to PDF with the locally installed Chrome through `playwright-core`, and commits the HTML beside the Markdown as the record of what the PDF was printed from. Staleness tests compare each renderer's output for `icResume` with the committed file.

**Tech Stack:** Next.js 16.3 (static export), React 19, TypeScript 5, Vitest 5 (jsdom) + React Testing Library 16, `tsx` 4, `playwright-core` 1.63 driving system Chrome.

**Spec:** `docs/superpowers/specs/2026-10-04-resume-export-design.md`

## Global Constraints

- Node 24. The non-interactive shell's default `node` is a broken Homebrew Node 21; run every `npm`/`npx` command as `source ~/.nvm/nvm.sh && nvm use >/dev/null && <command>` (`.node-version` says 24).
- Path alias `@/*` maps to `src/*`. Vitest and `tsx` both honor it.
- Dates in data are `YYYY-MM` strings; a missing `end` means current. Always format through `formatDateRange` from `@/lib/dates` (en dash, e.g. `Mar 2026 – Present`).
- Experience order is always `sortByStartDesc` from `@/lib/resume`.
- Export section order: Summary, Skills, Experience. Tech tags never appear in either export.
- PDF: black on white, `Helvetica, Arial, sans-serif`, about 10.5pt, single column, no monospace, no `$`/`#` prefixes. Page geometry comes only from CSS `@page { size: Letter; margin: 0.6in; }`, printed with `preferCSSPageSize: true`; never pass `format` or `margin` to `page.pdf()`.
- Every data string interpolated into HTML goes through `escapeHtml` (replaces `&`, `<`, `>`, `"`, `'`), including `href` values. All attributes use double quotes.
- Staleness failure messages, verbatim: "docs/resume-ic.md is stale; run `npm run resume`" and "docs/resume-ic.html is stale; run `npm run resume`".
- `AGENTS.md` asks you to read `node_modules/next/dist/docs/` before writing Next.js code. Only Task 2 touches a component, and it uses no Next APIs.
- Verification before every commit: `npm run check` (typecheck, lint, test). Task 6 also runs `npm run build`.
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/lib/types.ts` (modify) | `SiteInfo.location`, `SiteInfo.url`, `Resume.headline` |
| `src/data/site.ts` (modify) | Location, URL, and finally `resumePdf` |
| `src/data/resume.ts` (modify) | `icResume.headline` |
| `src/components/ResumeView.tsx` (modify) | Show the headline under the page heading |
| `src/components/ResumeView.test.tsx` (create) | Headline renders below the heading |
| `src/lib/resume-contact.ts` (create) | `displayUrl`, `contactItems`, `ContactItem` |
| `src/lib/resume-markdown.ts` (create) | `renderResumeMarkdown` |
| `src/lib/resume-html.ts` (create) | `escapeHtml`, `renderResumeHtml` |
| `scripts/build-resume.ts` (create) | Writes Markdown, prints PDF, writes HTML |
| `docs/resume-ic.md` (regenerate) | Generated Markdown export |
| `docs/resume-ic.html` (create, generated) | HTML the committed PDF was printed from |
| `public/resume.pdf` (create, generated) | Published PDF |
| `package.json` (modify) | `resume` script, `tsx` and `playwright-core` devDependencies |

---

### Task 1: Data fields for location, URL, and headline

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/data/site.ts`
- Modify: `src/data/resume.ts:107-108`
- Test: `src/data/resume.test.ts`

**Interfaces:**
- Produces: `SiteInfo.location: string`, `SiteInfo.url: string`, `Resume.headline: string`. `site.location === "Long Beach, CA"`, `site.url === "https://ghaws.dev"`, `icResume.headline === "Staff Software Engineer"`.

- [ ] **Step 1: Write the failing test**

Add to the `describe("icResume", …)` block in `src/data/resume.test.ts`:

```ts
  it("has a headline", () => {
    expect(icResume.headline.trim().length).toBeGreaterThan(0);
  });
```

- [ ] **Step 2: Run it to verify it fails**

Run: `source ~/.nvm/nvm.sh && nvm use >/dev/null && npx vitest run src/data/resume.test.ts`
Expected: FAIL with `Cannot read properties of undefined (reading 'trim')`.

- [ ] **Step 3: Add the fields**

In `src/lib/types.ts`, replace the `SiteInfo` type with:

```ts
export type SiteInfo = {
  name: string;
  tagline: string;
  bio: string;
  /** City and region, e.g. "Long Beach, CA". Shown in the resume exports' contact line. */
  location: string;
  /** Canonical site URL with protocol, e.g. "https://ghaws.dev". */
  url: string;
  links: SocialLinks;
  /** Path under public/, e.g. "/resume.pdf". Omit to hide the download link. */
  resumePdf?: string;
};
```

and add `headline` as the first field of `Resume`:

```ts
export type Resume = {
  /** Title shown under the name on the resume page and in the exports, e.g. "Staff Software Engineer". */
  headline: string;
  /** A few sentences positioning the candidate for this variant's audience. */
  summary: string;
  experience: Experience[];
  skillGroups: SkillGroup[];
};
```

In `src/data/site.ts`, add after `bio`:

```ts
  location: "Long Beach, CA",
  url: "https://ghaws.dev",
```

In `src/data/resume.ts`, add as the first property of `icResume`:

```ts
export const icResume: Resume = {
  headline: "Staff Software Engineer",
  summary:
```

Do not set `site.resumePdf` yet; the PDF does not exist until Task 6.

- [ ] **Step 4: Verify**

Run: `source ~/.nvm/nvm.sh && nvm use >/dev/null && npm run check`
Expected: PASS (typecheck confirms nothing else constructs a `SiteInfo` or `Resume`).

- [ ] **Step 5: Commit**

```bash
git add src/lib/types.ts src/data/site.ts src/data/resume.ts src/data/resume.test.ts
git commit -m "Add location, site URL, and resume headline to the data

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Show the headline on the resume page

**Files:**
- Modify: `src/components/ResumeView.tsx:10-12`
- Create: `src/components/ResumeView.test.tsx`

**Interfaces:**
- Consumes: `Resume.headline` (Task 1).

- [ ] **Step 1: Write the failing test**

Create `src/components/ResumeView.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ResumeView } from "@/components/ResumeView";
import type { Resume } from "@/lib/types";

const resume: Resume = {
  headline: "Staff Engineer",
  summary: "Writes programs.",
  experience: [],
  skillGroups: [],
};

describe("ResumeView", () => {
  it("renders the headline below the page heading", () => {
    render(<ResumeView title="Resume" resume={resume} />);
    const heading = screen.getByRole("heading", { level: 1, name: "Resume" });
    const headline = screen.getByText("Staff Engineer");
    expect(heading.compareDocumentPosition(headline) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `source ~/.nvm/nvm.sh && nvm use >/dev/null && npx vitest run src/components/ResumeView.test.tsx`
Expected: FAIL with `Unable to find an element with the text: Staff Engineer`.

- [ ] **Step 3: Render the headline**

In `src/components/ResumeView.tsx`, replace the `<h1>…</h1>` element with an `hgroup`, matching the home page's name and tagline (`src/app/page.tsx:13-18`):

```tsx
      <hgroup>
        <h1 className="text-2xl font-semibold text-foreground before:mr-2 before:text-primary before:content-['$']">
          {title}
        </h1>
        <p className="mt-1 text-muted-foreground">{resume.headline}</p>
      </hgroup>
```

- [ ] **Step 4: Verify**

Run: `source ~/.nvm/nvm.sh && nvm use >/dev/null && npm run check`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ResumeView.tsx src/components/ResumeView.test.tsx
git commit -m "Show the resume headline under the page heading

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Shared contact line

**Files:**
- Create: `src/lib/resume-contact.ts`
- Test: `src/lib/resume-contact.test.ts`

**Interfaces:**
- Consumes: `SiteInfo` with `location` and `url` (Task 1).
- Produces:
  - `export type ContactItem = { text: string; href?: string };`
  - `export function displayUrl(url: string): string`
  - `export function contactItems(site: SiteInfo): ContactItem[]` — order: location (no href), email (`mailto:`), site URL, GitHub, LinkedIn; absent links omitted.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/resume-contact.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { contactItems, displayUrl } from "@/lib/resume-contact";
import type { SiteInfo } from "@/lib/types";

const site: SiteInfo = {
  name: "Ada Lovelace",
  tagline: "Tagline.",
  bio: "Bio.",
  location: "London",
  url: "https://ada.dev",
  links: {
    email: "ada@ada.dev",
    github: "https://github.com/ada",
    linkedin: "https://www.linkedin.com/in/ada/",
  },
};

describe("displayUrl", () => {
  it("strips the protocol, a leading www., and a trailing slash", () => {
    expect(displayUrl("https://www.linkedin.com/in/ada/")).toBe("linkedin.com/in/ada");
    expect(displayUrl("https://github.com/ada")).toBe("github.com/ada");
    expect(displayUrl("https://ada.dev")).toBe("ada.dev");
  });

  it("leaves a bare host alone", () => {
    expect(displayUrl("ada.dev")).toBe("ada.dev");
  });
});

describe("contactItems", () => {
  it("lists location, email, site, GitHub, and LinkedIn in order", () => {
    expect(contactItems(site)).toEqual([
      { text: "London" },
      { text: "ada@ada.dev", href: "mailto:ada@ada.dev" },
      { text: "ada.dev", href: "https://ada.dev" },
      { text: "github.com/ada", href: "https://github.com/ada" },
      { text: "linkedin.com/in/ada", href: "https://www.linkedin.com/in/ada/" },
    ]);
  });

  it("omits links that are absent", () => {
    const items = contactItems({ ...site, links: { email: "ada@ada.dev" } });
    expect(items.map((item) => item.text)).toEqual(["London", "ada@ada.dev", "ada.dev"]);
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `source ~/.nvm/nvm.sh && nvm use >/dev/null && npx vitest run src/lib/resume-contact.test.ts`
Expected: FAIL, cannot resolve `@/lib/resume-contact`.

- [ ] **Step 3: Implement**

Create `src/lib/resume-contact.ts`:

```ts
import type { SiteInfo } from "@/lib/types";

export type ContactItem = { text: string; href?: string };

/** "https://www.linkedin.com/in/gehaws/" → "linkedin.com/in/gehaws". */
export function displayUrl(url: string): string {
  return url
    .replace(/^[a-z][a-z0-9+.-]*:\/\//i, "")
    .replace(/^www\./, "")
    .replace(/\/$/, "");
}

/** The resume exports' contact line, in display order. Absent links are omitted. */
export function contactItems(site: SiteInfo): ContactItem[] {
  const { email, github, linkedin } = site.links;
  const items: ContactItem[] = [{ text: site.location }];
  if (email) items.push({ text: email, href: `mailto:${email}` });
  for (const url of [site.url, github, linkedin]) {
    if (url) items.push({ text: displayUrl(url), href: url });
  }
  return items;
}
```

- [ ] **Step 4: Verify**

Run: `source ~/.nvm/nvm.sh && nvm use >/dev/null && npm run check`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/resume-contact.ts src/lib/resume-contact.test.ts
git commit -m "Add shared contact-line helpers for resume exports

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Markdown renderer

**Files:**
- Create: `src/lib/resume-markdown.ts`
- Test: `src/lib/resume-markdown.test.ts`

**Interfaces:**
- Consumes: `contactItems` (Task 3), `sortByStartDesc` (`@/lib/resume`), `formatDateRange` (`@/lib/dates`), `Resume.headline` (Task 1).
- Produces: `export function renderResumeMarkdown(resume: Resume, site: SiteInfo): string` — blocks separated by one blank line, list items by single newlines, ending in exactly one `\n`.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/resume-markdown.test.ts`. The fixture is small and synthetic so failures point at the renderer, not the real data; the staleness test against `icResume` is added in Task 6.

```ts
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
```

- [ ] **Step 2: Run them to verify they fail**

Run: `source ~/.nvm/nvm.sh && nvm use >/dev/null && npx vitest run src/lib/resume-markdown.test.ts`
Expected: FAIL, cannot resolve `@/lib/resume-markdown`.

- [ ] **Step 3: Implement**

Create `src/lib/resume-markdown.ts`:

```ts
import { formatDateRange } from "@/lib/dates";
import { sortByStartDesc } from "@/lib/resume";
import { contactItems } from "@/lib/resume-contact";
import type { Resume, SiteInfo } from "@/lib/types";

/** The complete Markdown resume, blocks separated by one blank line, ending in a single newline. */
export function renderResumeMarkdown(resume: Resume, site: SiteInfo): string {
  const contact = contactItems(site)
    .map((item) => (item.href ? `[${item.text}](${item.href})` : item.text))
    .join(" · ");

  const skills = resume.skillGroups
    .map((group) => `- **${group.label}:** ${group.skills.join(", ")}`)
    .join("\n");

  const experience = sortByStartDesc(resume.experience).map((entry) =>
    [
      `### ${entry.company} — ${entry.role}`,
      `${formatDateRange(entry.start, entry.end)} · ${entry.location}`,
      entry.highlights.map((highlight) => `- ${highlight}`).join("\n"),
    ].join("\n\n"),
  );

  const blocks = [
    `# ${site.name}`,
    `**${resume.headline}**`,
    contact,
    "## Summary",
    resume.summary,
    "## Skills",
    skills,
    "## Experience",
    ...experience,
  ];

  return `${blocks.join("\n\n")}\n`;
}
```

- [ ] **Step 4: Verify**

Run: `source ~/.nvm/nvm.sh && nvm use >/dev/null && npm run check`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/resume-markdown.ts src/lib/resume-markdown.test.ts
git commit -m "Render the resume as Markdown

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: HTML renderer for the PDF

**Files:**
- Create: `src/lib/resume-html.ts`
- Test: `src/lib/resume-html.test.ts`

**Interfaces:**
- Consumes: `contactItems` (Task 3), `sortByStartDesc`, `formatDateRange`, `Resume.headline`.
- Produces:
  - `export function escapeHtml(text: string): string`
  - `export function renderResumeHtml(resume: Resume, site: SiteInfo): string` — a standalone `<!doctype html>` document with inline CSS, ending in a single `\n`.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/resume-html.test.ts`. Tests run in jsdom, so `DOMParser` is available for checking structure rather than matching raw strings.

```ts
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
```

- [ ] **Step 2: Run them to verify they fail**

Run: `source ~/.nvm/nvm.sh && nvm use >/dev/null && npx vitest run src/lib/resume-html.test.ts`
Expected: FAIL, cannot resolve `@/lib/resume-html`.

- [ ] **Step 3: Implement**

Create `src/lib/resume-html.ts`:

```ts
import { formatDateRange } from "@/lib/dates";
import { sortByStartDesc } from "@/lib/resume";
import { contactItems } from "@/lib/resume-contact";
import type { Experience, Resume, SiteInfo } from "@/lib/types";

const entities: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (char) => entities[char]);
}

// Print styles only. Page geometry lives here and nowhere else: the build
// script prints with preferCSSPageSize and passes no format or margin.
const styles = `
@page { size: Letter; margin: 0.6in; }
* { box-sizing: border-box; }
body { margin: 0; font-family: Helvetica, Arial, sans-serif; font-size: 10.5pt; line-height: 1.35; color: #000; background: #fff; }
a { color: inherit; text-decoration: none; }
p { margin: 0; }
h1 { margin: 0; font-size: 20pt; }
.headline { margin-top: 2pt; font-size: 12pt; }
.contact { margin-top: 4pt; font-size: 9.5pt; }
h2 { margin: 14pt 0 6pt; padding-bottom: 2pt; border-bottom: 0.75pt solid #000; font-size: 11pt; text-transform: uppercase; letter-spacing: 0.04em; break-after: avoid; }
ul { margin: 3pt 0 0; padding-left: 14pt; }
li { margin-bottom: 2pt; }
.skills { list-style: none; padding-left: 0; }
.entry { margin-bottom: 9pt; }
.entry-head { display: flex; justify-content: space-between; align-items: baseline; gap: 12pt; break-after: avoid; }
h3 { margin: 0; font-size: 10.5pt; }
.company { font-weight: normal; }
.dates { white-space: nowrap; }
.location { font-style: italic; break-after: avoid; }
`.trim();

function renderEntry(entry: Experience): string {
  const highlights = entry.highlights.map((h) => `<li>${escapeHtml(h)}</li>`).join("\n");
  return [
    `<div class="entry">`,
    `<div class="entry-head">`,
    `<h3>${escapeHtml(entry.role)}<span class="company">, ${escapeHtml(entry.company)}</span></h3>`,
    `<span class="dates">${escapeHtml(formatDateRange(entry.start, entry.end))}</span>`,
    `</div>`,
    `<p class="location">${escapeHtml(entry.location)}</p>`,
    `<ul>\n${highlights}\n</ul>`,
    `</div>`,
  ].join("\n");
}

/** A standalone HTML document for printing the resume to PDF. */
export function renderResumeHtml(resume: Resume, site: SiteInfo): string {
  const contact = contactItems(site)
    .map((item) =>
      item.href
        ? `<a href="${escapeHtml(item.href)}">${escapeHtml(item.text)}</a>`
        : escapeHtml(item.text),
    )
    .join(" · ");

  const skills = resume.skillGroups
    .map(
      (group) =>
        `<li><strong>${escapeHtml(group.label)}:</strong> ${escapeHtml(group.skills.join(", "))}</li>`,
    )
    .join("\n");

  const experience = sortByStartDesc(resume.experience).map(renderEntry).join("\n");

  return `${[
    `<!doctype html>`,
    `<html lang="en">`,
    `<head>`,
    `<meta charset="utf-8">`,
    `<title>${escapeHtml(`${site.name} — ${resume.headline}`)}</title>`,
    `<style>\n${styles}\n</style>`,
    `</head>`,
    `<body>`,
    `<header>`,
    `<h1>${escapeHtml(site.name)}</h1>`,
    `<p class="headline">${escapeHtml(resume.headline)}</p>`,
    `<p class="contact">${contact}</p>`,
    `</header>`,
    `<section>`,
    `<h2>Summary</h2>`,
    `<p>${escapeHtml(resume.summary)}</p>`,
    `</section>`,
    `<section>`,
    `<h2>Skills</h2>`,
    `<ul class="skills">\n${skills}\n</ul>`,
    `</section>`,
    `<section>`,
    `<h2>Experience</h2>`,
    experience,
    `</section>`,
    `</body>`,
    `</html>`,
  ].join("\n")}\n`;
}
```

- [ ] **Step 4: Verify**

Run: `source ~/.nvm/nvm.sh && nvm use >/dev/null && npm run check`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/resume-html.ts src/lib/resume-html.test.ts
git commit -m "Render the resume as print HTML for the PDF

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Build script, generated outputs, and staleness tests

**Files:**
- Modify: `package.json` (devDependencies, `resume` script)
- Create: `scripts/build-resume.ts`
- Modify: `src/lib/resume-markdown.test.ts`, `src/lib/resume-html.test.ts` (staleness tests)
- Regenerate: `docs/resume-ic.md`; create: `docs/resume-ic.html`, `public/resume.pdf`
- Modify: `src/data/site.ts` (`resumePdf`)

**Interfaces:**
- Consumes: `renderResumeMarkdown` (Task 4), `renderResumeHtml` (Task 5), `icResume` (`@/data/resume`), `site` (`@/data/site`).
- Produces: `npm run resume [-- --force]`.

- [ ] **Step 1: Install dependencies and add the script**

Run: `source ~/.nvm/nvm.sh && nvm use >/dev/null && npm install --save-dev tsx playwright-core`

`playwright-core` downloads no browser; it drives the installed Google Chrome via `channel: "chrome"`.

Then add to `"scripts"` in `package.json`, after `"deploy"`:

```json
    "resume": "tsx scripts/build-resume.ts"
```

- [ ] **Step 2: Write the failing staleness tests**

Add to the top of `src/lib/resume-markdown.test.ts`:

```ts
import { readFileSync } from "node:fs";
import path from "node:path";
import { icResume } from "@/data/resume";
import { site as realSite } from "@/data/site";
```

and at the end of the file:

```ts
describe("docs/resume-ic.md", () => {
  it("matches the current resume data", () => {
    const committed = readFileSync(path.join(process.cwd(), "docs/resume-ic.md"), "utf8");
    expect(renderResumeMarkdown(icResume, realSite), "docs/resume-ic.md is stale; run `npm run resume`").toBe(
      committed,
    );
  });
});
```

Add the same imports to the top of `src/lib/resume-html.test.ts`, and at the end:

```ts
describe("docs/resume-ic.html", () => {
  it("matches the current resume data and template", () => {
    const committed = readFileSync(path.join(process.cwd(), "docs/resume-ic.html"), "utf8");
    expect(renderResumeHtml(icResume, realSite), "docs/resume-ic.html is stale; run `npm run resume`").toBe(
      committed,
    );
  });
});
```

(`realSite` avoids clashing with each file's `site` fixture. Vitest runs from the repo root, so `process.cwd()` is the root.)

- [ ] **Step 3: Run them to verify they fail**

Run: `source ~/.nvm/nvm.sh && nvm use >/dev/null && npx vitest run src/lib/resume-markdown.test.ts src/lib/resume-html.test.ts`
Expected: the Markdown staleness test FAILS with "docs/resume-ic.md is stale; run `npm run resume`" (the hand-written file differs); the HTML staleness test FAILS with `ENOENT` for `docs/resume-ic.html`.

- [ ] **Step 4: Write the build script**

Create `scripts/build-resume.ts`:

```ts
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";
import { icResume } from "@/data/resume";
import { site } from "@/data/site";
import { renderResumeHtml } from "@/lib/resume-html";
import { renderResumeMarkdown } from "@/lib/resume-markdown";

const root = process.cwd();
const markdownPath = path.join(root, "docs/resume-ic.md");
const htmlPath = path.join(root, "docs/resume-ic.html");
const pdfPath = path.join(root, "public/resume.pdf");

async function main() {
  // Markdown first, so a PDF failure never leaves it stale.
  writeFileSync(markdownPath, renderResumeMarkdown(icResume, site));
  console.log("Wrote docs/resume-ic.md");

  // Chrome stamps every PDF with a creation date and ID, so reprinting
  // unchanged content would still produce a binary diff. Skip it.
  const html = renderResumeHtml(icResume, site);
  const force = process.argv.includes("--force");
  const htmlUnchanged = existsSync(htmlPath) && readFileSync(htmlPath, "utf8") === html;
  if (htmlUnchanged && existsSync(pdfPath) && !force) {
    console.log("PDF up to date");
    return;
  }

  const browser = await chromium.launch({ channel: "chrome" });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    // No format or margin: the template's @page rule is the only source of page geometry.
    await page.pdf({ path: pdfPath, preferCSSPageSize: true, printBackground: true });
  } finally {
    await browser.close();
  }
  console.log("Wrote public/resume.pdf");

  // Only after the PDF succeeds, so this file never vouches for an old PDF.
  writeFileSync(htmlPath, html);
  console.log("Wrote docs/resume-ic.html");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message.split("\n")[0] : String(error);
  console.error(`npm run resume failed: ${message}`);
  process.exit(1);
});
```

- [ ] **Step 5: Generate the outputs**

Run: `source ~/.nvm/nvm.sh && nvm use >/dev/null && npm run resume`
Expected output:

```
Wrote docs/resume-ic.md
Wrote public/resume.pdf
Wrote docs/resume-ic.html
```

If Chrome fails to launch, the script prints one `npm run resume failed: …` line and exits 1; stop and report the message.

- [ ] **Step 6: Review the Markdown diff**

Run: `git diff docs/resume-ic.md`
Expected: exactly these changes and no others:
- Contact line: `me@ghaws.dev` becomes `[me@ghaws.dev](mailto:me@ghaws.dev)`, and the LinkedIn URL loses its trailing slash (`https://www.linkedin.com/in/gehaws`).
- Skills: `agent skill development` becomes `Agent skill development`.

Any other difference means the renderer or the data lost something. Fix the cause and rerun Step 5; do not edit the generated file by hand.

- [ ] **Step 7: Check that the skip works**

Run: `source ~/.nvm/nvm.sh && nvm use >/dev/null && npm run resume && git status --short public/resume.pdf docs/resume-ic.html`
Expected: the script prints `PDF up to date`, and the status shows both files as untracked (`??`) only, unchanged since Step 5.

- [ ] **Step 8: Verify the PDF by hand**

Run: `open public/resume.pdf`
Confirm: US Letter page size (Preview: Tools → Show Inspector), two pages or fewer, black on white sans-serif, text selectable, the email, site, GitHub, and LinkedIn links clickable, no tech tags, and no entry heading stranded at the bottom of a page. If it runs past two pages, report back rather than shrinking the type below about 10pt.

- [ ] **Step 9: Publish the download link**

In `src/data/site.ts`, add after `links`:

```ts
  resumePdf: "/resume.pdf",
```

- [ ] **Step 10: Verify everything**

Run: `source ~/.nvm/nvm.sh && nvm use >/dev/null && npm run check && npm run build && ls -l out/resume.pdf`
Expected: all checks PASS, including both staleness tests; the build succeeds; `out/resume.pdf` exists.

- [ ] **Step 11: Commit**

```bash
git add package.json package-lock.json scripts/build-resume.ts src/lib/resume-markdown.test.ts src/lib/resume-html.test.ts docs/resume-ic.md docs/resume-ic.html public/resume.pdf src/data/site.ts
git commit -m "Generate resume Markdown and PDF from the data

npm run resume writes docs/resume-ic.md and prints public/resume.pdf with
the local Chrome. Staleness tests fail npm run check when either committed
output no longer matches the data or template.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Follow-up outside this plan

- Confirm `https://ghaws.dev` resolves to the deployed site before sending the PDF anywhere (spec, Data changes).
