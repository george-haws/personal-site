import type { Metadata } from "next";
import { ProjectCard } from "@/components/ProjectCard";
import { projects } from "@/data/projects";

export const metadata: Metadata = {
  title: "Projects",
  description: "Side projects and notable work.",
};

export default function ProjectsPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold text-foreground before:mr-2 before:text-primary before:content-['$']">
        Projects
      </h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {projects.map((project) => (
          <ProjectCard key={project.title} project={project} />
        ))}
      </div>
    </>
  );
}
