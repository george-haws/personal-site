import type { Experience, SkillGroup } from "@/lib/types";

export const experience: Experience[] = [
  {
    company: "Example Corp",
    role: "Staff Software Engineer",
    location: "Remote",
    start: "2021-03",
    highlights: [
      "Led the platform team responsible for build, deploy, and observability tooling.",
      "Cut p95 API latency by 40% by redesigning the request pipeline.",
    ],
    tech: ["TypeScript", "Go", "Kubernetes", "PostgreSQL"],
  },
  {
    company: "Previous Inc",
    role: "Senior Software Engineer",
    location: "San Francisco, CA",
    start: "2016-08",
    end: "2021-02",
    highlights: [
      "Designed and shipped the billing service that processed all customer payments.",
      "Mentored four engineers who were promoted to senior during my tenure.",
    ],
    tech: ["Python", "Django", "AWS"],
  },
  {
    company: "First Startup",
    role: "Software Engineer",
    location: "Austin, TX",
    start: "2011-06",
    end: "2016-07",
    highlights: ["Built the first version of the product from an empty repo to paying customers."],
    tech: ["Ruby", "Rails", "MySQL"],
  },
];

export const skillGroups: SkillGroup[] = [
  { label: "Languages", skills: ["TypeScript", "Go", "Python", "SQL"] },
  { label: "Infrastructure", skills: ["Kubernetes", "AWS", "Terraform", "PostgreSQL"] },
  { label: "Practices", skills: ["System design", "Incident response", "Mentoring"] },
];
