import { Fragment } from "react";
import { formatDateRange } from "@/lib/dates";
import type { Experience, SkillGroup } from "@/lib/types";

export function ExperienceEntry({ entry }: { entry: Experience }) {
  return (
    <article>
      <header>
        <hgroup>
          <h3>{entry.role}</h3>
          <p>
            <span>{entry.company}</span>
            <span aria-hidden="true"> · </span>
            <span>{entry.location}</span>
          </p>
        </hgroup>
        <small>{formatDateRange(entry.start, entry.end)}</small>
      </header>
      <ul>
        {entry.highlights.map((h) => (
          <li key={h}>{h}</li>
        ))}
      </ul>
      {entry.tech && entry.tech.length > 0 ? (
        <p>
          {entry.tech.map((tag, i) => (
            <Fragment key={tag}>
              {i > 0 ? " " : null}
              <code>{tag}</code>
            </Fragment>
          ))}
        </p>
      ) : null}
    </article>
  );
}

export function SkillGroups({ groups }: { groups: SkillGroup[] }) {
  return (
    <dl>
      {groups.map((group) => (
        <div key={group.label}>
          <dt>{group.label}</dt>
          <dd>{group.skills.join(", ")}</dd>
        </div>
      ))}
    </dl>
  );
}
