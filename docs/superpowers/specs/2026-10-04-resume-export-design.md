# Resume export: generated Markdown and PDF

Date: 2026-10-04

## Goal

Generate `docs/resume-ic.md` and `public/resume.pdf` from the resume data in
`src/data/resume.ts`, so the two exports can never drift from the site. The
PDF is served from the site through the existing "Download PDF" link and is
also the file sent with job applications.

## Decisions

- One PDF serves both the site and applications.
- The PDF is a conventional print resume: black on white, system sans font,
  single column, ATS-friendly, visually independent from the site's terminal
  theme.
- `npm run resume` generates all outputs, and they are committed. Two tests
  fail `npm run check` when a committed output is stale: one for the Markdown
  and one for the HTML that the PDF is printed from (see Staleness).
- The PDF is rendered from an HTML template by the locally installed Chrome,
  launched through `playwright-core` with `channel: "chrome"`. No browser
  download. Alternatives considered: `@react-pdf/renderer` (pure Node, but a
  second layout language) and pandoc (system install, weak layout control).
- Both exports order sections Summary, Skills, Experience. This differs from
  the site's `/resume` page (Experience before Skills) on purpose: a print
  resume leads with skills for a quick scan, while the site leads with the
  work history.

## Data changes

`SiteInfo` gains `location: string` ("Long Beach, CA") and `url: string`
("https://ghaws.dev"), and `site.resumePdf` is set to `"/resume.pdf"`, which
makes the existing Download link on the resume page appear. Before the first
PDF goes out, confirm `https://ghaws.dev` resolves to the deployed site;
nothing in the repo records the custom domain yet.

`Resume` gains `headline: string` ("Staff Software Engineer"), a per-variant
title shown under the name in both exports and on the site's `/resume`
page. `ResumeView` renders it directly under the `<h1>` as muted text, styled
like the home page's tagline (`text-muted-foreground`), so the site and the
PDF carry the same title and a future variant's page says which variant it
is.

The data is the source of truth wherever it disagrees with today's
hand-written Markdown. The known differences, all accepted:

- Skills: the data's `Agent skill development` replaces `agent skill
  development`, matching the capitalization of the other skills.
- LinkedIn: the URL loses its trailing slash (`https://www.linkedin.com/in/gehaws`).

## Modules

### `src/lib/resume-contact.ts`

Shared by both renderers so the contact line is identical in each.

- `displayUrl(url: string): string` strips the protocol, a leading `www.`,
  and a trailing slash: `https://www.linkedin.com/in/gehaws/` →
  `linkedin.com/in/gehaws`.
- `contactItems(site: SiteInfo): { text: string; href?: string }[]` returns,
  in order: location (no href); email (text is the address, href
  `mailto:{address}`); site, GitHub, LinkedIn (text from `displayUrl`, href
  the full URL). Entries whose data is absent are omitted.

Email is a `mailto:` link in both exports, which changes today's plain-text
email in the Markdown.

### `src/lib/resume-markdown.ts`

`renderResumeMarkdown(resume: Resume, site: SiteInfo): string` returns the
complete Markdown document, ending in a single newline. It is pure and reuses
`sortByStartDesc`, `formatDateRange`, and `contactItems`. Blocks are separated
by exactly one blank line, matching the current hand-written file:

1. `# {name}`
2. `**{headline}**`
3. Contact line: each item as `[text](href)`, or plain text when it has no
   href, joined by ` · `.
4. `## Summary`, then the summary paragraph.
5. `## Skills`, then one bullet per group, `- **{label}:** {skills joined by ", "}`.
   Bullets in a list are not separated by blank lines.
6. `## Experience`, then for each entry newest first: `### {company} — {role}`,
   a line `{date range} · {location}`, then one bullet per highlight. Tech
   tags are not included.

The first generated output should differ from today's hand-written file only
in the accepted differences listed under Data changes and the `mailto:`
email. That diff is the check that nothing was lost.

### `src/lib/resume-html.ts`

`renderResumeHtml(resume: Resume, site: SiteInfo): string` returns a
standalone HTML document with inline CSS, used only as PDF input.

- `<title>` is `"{name} — {headline}"`, which becomes the PDF metadata title.
- Page size and margins come from CSS alone: `@page { size: Letter; margin:
  0.6in; }`, printed with `preferCSSPageSize: true` (see the build script).
  Body is a system sans stack (Helvetica, Arial, sans-serif), about 10.5pt,
  black on white.
- Header: name, headline, then one contact line built from `contactItems`
  (location, email, site, GitHub, LinkedIn), with each href as a real `<a>`.
- Sections in the same order as the Markdown. Each experience entry is a flex
  row with role and company on the left and the date range on the right,
  location beneath, then a bullet list of highlights. No tech tags.
- An `escapeHtml` helper replaces `&`, `<`, `>`, `"`, and `'`. Every string
  from the data goes through it before interpolation, including attribute
  values such as `href`. All attributes use double quotes.
- No terminal-theme styling: no monospace font, no `$` or `#` prefixes.

### `scripts/build-resume.ts`

Run with `tsx`, which honors the `@/` path alias.

1. Render Markdown for `icResume` and write `docs/resume-ic.md`.
2. Render HTML. If it equals the committed `docs/resume-ic.html` and
   `public/resume.pdf` exists, print "PDF up to date" and stop, unless
   `--force` was passed. Otherwise write `docs/resume-ic.html` and continue.
3. Launch Chrome via `playwright-core` (`chromium.launch({ channel: "chrome"
   })`). Inside `try`/`finally` so the browser always closes:
   `page.setContent(html, { waitUntil: "load" })`, then `page.pdf({
   preferCSSPageSize: true, printBackground: true })`, and write
   `public/resume.pdf`. No `format` or `margin` options are passed; the CSS
   `@page` rule is the single source of page geometry.
4. On any failure (Chrome missing, render error), print a one-line message
   naming the cause and exit non-zero. The Markdown is written first so a PDF
   failure never leaves it stale.

Step 2 exists because Chrome embeds a creation date and document ID in every
PDF, so regenerating unchanged content would still produce a binary diff.
Skipping the print when the HTML is unchanged keeps `public/resume.pdf` out of
the diff unless its content changed.

## Staleness

`docs/resume-ic.html` is committed alongside the Markdown and is the record
of what the committed PDF was printed from. Because the build script prints a
new PDF whenever the HTML changes, the PDF can only drift if someone edits
the data or template and skips `npm run resume`, which the tests below catch.
That covers data changes and template-only changes.

## Scripts and dependencies

- devDependencies: `tsx`, `playwright-core`.
- `"resume": "tsx scripts/build-resume.ts"`.
- `check`, `build`, and `deploy` are unchanged.

## Tests

Committed files are read with `fs.readFileSync(path.join(process.cwd(),
"docs/resume-ic.md"), "utf8")`; Vitest runs from the repo root.

`src/lib/resume-contact.test.ts`

- `displayUrl` strips protocol, `www.`, and a trailing slash, and leaves a
  bare host alone.
- `contactItems` returns items in the documented order, gives email a
  `mailto:` href and location none, and omits a missing link.

`src/lib/resume-markdown.test.ts`

- Header: the first two non-empty lines are `# {name}` and `**{headline}**`;
  the third contains the location and a `mailto:` link.
- Every skill group label and every highlight appears in the output.
- Dates render through `formatDateRange` (for example `Mar 2026 – Present`).
- Staleness: `renderResumeMarkdown(icResume, site)` equals the contents of
  `docs/resume-ic.md` exactly. Failure message: "docs/resume-ic.md is stale;
  run `npm run resume`".

`src/lib/resume-html.test.ts`

- Output contains the name, headline, location, every company, role, and
  highlight, and the formatted date ranges.
- Links: parsed with `DOMParser`, the document has `<a>` elements whose
  `href`s are exactly `mailto:{email}`, the site URL, the GitHub URL, and the
  LinkedIn URL.
- Escaping: a highlight containing `<`, `&`, and `"` and a link URL
  containing `"` are escaped in the output.
- Staleness: `renderResumeHtml(icResume, site)` equals the contents of
  `docs/resume-ic.html` exactly. Failure message: "docs/resume-ic.html is
  stale; run `npm run resume`".

`src/components/ResumeView.test.tsx`

- Renders the resume's `headline` below the page heading.

The PDF is verified manually on first generation: open it, confirm it is US
Letter, two pages or fewer, text is selectable, and links are clickable.

## Out of scope

- A Next.js route for the print view.
- A second resume variant. Filenames keep the `-ic` suffix so one can be
  added later beside it; the published PDF stays at `public/resume.pdf`.
- CI browser setup. Generation runs locally, where Chrome is installed.
