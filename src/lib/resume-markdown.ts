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
