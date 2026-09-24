import type { Project } from "@/lib/types";

export const projects: Project[] = [
  {
    title: "Example Tool",
    summary: "A command-line tool that does one useful thing well.",
    description:
      "Built to scratch a personal itch, then shared. Handles the common case in one command and stays out of the way otherwise.",
    tech: ["Go"],
    repoUrl: "https://github.com/george-haws/example-tool",
    featured: true,
  },
  {
    title: "Example Web App",
    summary: "A small web app with a live demo.",
    description: "A weekend project that turned into something I use every week.",
    tech: ["TypeScript", "React"],
    repoUrl: "https://github.com/george-haws/example-web-app",
    liveUrl: "https://example-web-app.pages.dev",
    featured: true,
  },
  {
    title: "Example Library",
    summary: "A library extracted from a larger project.",
    description: "Not featured on the home page; listed here for completeness.",
    tech: ["Python"],
    featured: false,
  },
];
