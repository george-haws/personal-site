import { Fragment } from "react";
import type { Project } from "@/lib/types";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { TerminalDemo } from "@/components/TerminalDemo";

export function ProjectCard({ project }: { project: Project }) {
  const hasLinks = Boolean(project.repoUrl || project.liveUrl);

  return (
    <Card>
      <CardHeader>
        <h3 className="font-medium leading-snug text-foreground">{project.title}</h3>
        <p className="text-sm text-muted-foreground">{project.summary}</p>
      </CardHeader>
      {project.image ? (
        // eslint-disable-next-line @next/next/no-img-element -- static export, no image optimization
        <img src={project.image} alt={project.title} className="w-full" />
      ) : null}
      {project.demo ? <TerminalDemo lines={project.demo} /> : null}
      <CardContent className="flex flex-col gap-3">
        <p className="text-sm">{project.description}</p>
        <p className="flex flex-wrap gap-x-2 gap-y-1">
          {project.tech.map((tag, i) => (
            <Fragment key={tag}>
              {i > 0 ? " " : null}
              <code className="rounded-none border border-border bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                {tag}
              </code>
            </Fragment>
          ))}
        </p>
      </CardContent>
      {hasLinks ? (
        <CardFooter className="flex gap-4 border-t-0 bg-transparent pt-0">
          {project.repoUrl ? (
            <a
              href={project.repoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline"
            >
              Source
            </a>
          ) : null}
          {project.repoUrl && project.liveUrl ? (
            <>
              <span aria-hidden="true" className="text-muted-foreground">
                ·
              </span>
            </>
          ) : null}
          {project.liveUrl ? (
            <a
              href={project.liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline"
            >
              Live
            </a>
          ) : null}
        </CardFooter>
      ) : null}
    </Card>
  );
}
