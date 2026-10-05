import Link from "next/link";
import { ProjectCard } from "@/components/ProjectCard";
import { SocialLinks } from "@/components/SocialLinks";
import { projects } from "@/data/projects";
import { site } from "@/data/site";

export default function Home() {
  const featured = projects.filter((p) => p.featured);

  return (
    <>
      <section className="flex flex-col gap-4">
        <hgroup>
          <h1 className="text-2xl font-semibold text-foreground before:mr-2 before:text-primary before:content-['$']">
            {site.name}
          </h1>
          <p className="mt-1 text-muted-foreground">{site.tagline}</p>
        </hgroup>
        <p className="max-w-prose text-sm leading-relaxed">{site.bio}</p>
        <SocialLinks links={site.links} />
      </section>

      {featured.length > 0 ? (
        <section className="mt-12 flex flex-col gap-4">
          <h2 className="text-lg font-medium text-foreground before:mr-2 before:text-primary before:content-['#']">
            Featured projects
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {featured.map((project) => (
              <ProjectCard key={project.title} project={project} />
            ))}
          </div>
          <p>
            <Link href="/projects" className="text-sm text-primary hover:underline">
              All projects →
            </Link>
          </p>
        </section>
      ) : null}
    </>
  );
}
