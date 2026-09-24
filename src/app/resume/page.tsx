import type { Metadata } from "next";
import { ExperienceEntry, SkillGroups } from "@/components/ResumeSection";
import { experience, skillGroups } from "@/data/resume";
import { site } from "@/data/site";
import { sortByStartDesc } from "@/lib/resume";

export const metadata: Metadata = {
  title: "Resume",
  description: `Work history and skills for ${site.name}.`,
};

export default function ResumePage() {
  const entries = sortByStartDesc(experience);

  return (
    <>
      <h1>Resume</h1>
      {site.resumePdf ? (
        <p>
          <a href={site.resumePdf}>Download PDF</a>
        </p>
      ) : null}

      <section>
        <h2>Experience</h2>
        {entries.map((entry) => (
          <ExperienceEntry key={`${entry.company}-${entry.start}`} entry={entry} />
        ))}
      </section>

      <section>
        <h2>Skills</h2>
        <SkillGroups groups={skillGroups} />
      </section>
    </>
  );
}
