import { ExperienceEntry, SkillGroups } from "@/components/ResumeSection";
import type { Resume } from "@/lib/types";
import { sortByStartDesc } from "@/lib/resume";

export function ResumeView({ title, resume, pdfHref }: { title: string; resume: Resume; pdfHref?: string }) {
  const entries = sortByStartDesc(resume.experience);

  return (
    <>
      <hgroup>
        <h1 className="text-2xl font-semibold text-foreground before:mr-2 before:text-primary before:content-['$']">
          {title}
        </h1>
        <p className="mt-1 text-muted-foreground">{resume.headline}</p>
      </hgroup>
      {pdfHref ? (
        <p className="mt-3">
          <a href={pdfHref} className="tap-target text-sm text-primary hover:underline">
            Download PDF
          </a>
        </p>
      ) : null}

      <p className="mt-6 max-w-prose text-sm leading-relaxed">{resume.summary}</p>

      <section className="mt-10">
        <h2 className="text-lg font-medium text-foreground before:mr-2 before:text-primary before:content-['#']">
          Experience
        </h2>
        <div className="mt-4">
          {entries.map((entry) => (
            <ExperienceEntry key={`${entry.company}-${entry.start}`} entry={entry} />
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-medium text-foreground before:mr-2 before:text-primary before:content-['#']">
          Skills
        </h2>
        <div className="mt-4">
          <SkillGroups groups={resume.skillGroups} />
        </div>
      </section>
    </>
  );
}
