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
