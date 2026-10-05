import { Fragment } from "react";
import { formatDateRange } from "@/lib/dates";
import type { Experience, SkillGroup } from "@/lib/types";

export function ExperienceEntry({ entry }: { entry: Experience }) {
  return (
    <article className="border-b border-border py-6 first:pt-0 last:border-b-0">
      <header className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <hgroup>
          <h3 className="font-medium text-foreground">{entry.role}</h3>
          <p className="text-sm text-muted-foreground">
            <span>{entry.company}</span>{" "}
            <span aria-hidden="true">·</span>{" "}
            <span>{entry.location}</span>
          </p>
        </hgroup>
        <small className="text-sm text-muted-foreground">{formatDateRange(entry.start, entry.end)}</small>
      </header>
      <ul className="mt-3 list-outside list-disc space-y-1 pl-5 text-sm">
        {entry.highlights.map((h) => (
          <li key={h}>{h}</li>
        ))}
      </ul>
      {entry.tech && entry.tech.length > 0 ? (
        <p className="mt-3 flex flex-wrap gap-x-2 gap-y-1">
          {entry.tech.map((tag, i) => (
            <Fragment key={tag}>
              {i > 0 ? " " : null}
              <code className="rounded-none border border-border bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                {tag}
              </code>
            </Fragment>
          ))}
        </p>
      ) : null}
    </article>
  );
}

export function SkillGroups({ groups }: { groups: SkillGroup[] }) {
  return (
    <dl className="grid gap-3 sm:grid-cols-[auto_1fr] sm:gap-x-6">
      {groups.map((group) => (
        <div key={group.label} className="contents">
          <dt className="text-sm font-medium text-primary">{group.label}</dt>
          <dd className="text-sm text-muted-foreground">{group.skills.join(", ")}</dd>
        </div>
      ))}
    </dl>
  );
}
