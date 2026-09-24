import Link from "next/link";
import { ProjectCard } from "@/components/ProjectCard";
import { SocialLinks } from "@/components/SocialLinks";
import { projects } from "@/data/projects";
import { site } from "@/data/site";

export default function Home() {
  const featured = projects.filter((p) => p.featured);

  return (
    <>
      <section>
        <hgroup>
          <h1>{site.name}</h1>
          <p>{site.tagline}</p>
        </hgroup>
        <p>{site.bio}</p>
        <SocialLinks links={site.links} />
      </section>

      {featured.length > 0 ? (
        <section>
          <h2>Featured projects</h2>
          <div>
            {featured.map((project) => (
              <ProjectCard key={project.title} project={project} />
            ))}
          </div>
          <p>
            <Link href="/projects">All projects</Link>
          </p>
        </section>
      ) : null}
    </>
  );
}
