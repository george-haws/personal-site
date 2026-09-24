import { Fragment } from "react";
import type { Project } from "@/lib/types";

export function ProjectCard({ project }: { project: Project }) {
  const hasLinks = Boolean(project.repoUrl || project.liveUrl);

  return (
    <article>
      <header>
        <h3>{project.title}</h3>
        <p>{project.summary}</p>
      </header>
      {project.image ? (
        // eslint-disable-next-line @next/next/no-img-element -- static export, no image optimization
        <img src={project.image} alt={project.title} />
      ) : null}
      <p>{project.description}</p>
      <p>
        {project.tech.map((tag, i) => (
          <Fragment key={tag}>
            {i > 0 ? " " : null}
            <code>{tag}</code>
          </Fragment>
        ))}
      </p>
      {hasLinks ? (
        <footer>
          {project.repoUrl ? (
            <a href={project.repoUrl} target="_blank" rel="noopener noreferrer">
              Source
            </a>
          ) : null}
          {project.repoUrl && project.liveUrl ? (
            <>
              {" "}
              <span aria-hidden="true">·</span>{" "}
            </>
          ) : null}
          {project.liveUrl ? (
            <a href={project.liveUrl} target="_blank" rel="noopener noreferrer">
              Live
            </a>
          ) : null}
        </footer>
      ) : null}
    </article>
  );
}
