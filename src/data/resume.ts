import type { Experience, Resume } from "@/lib/types";

const aerospike = {
  company: "Aerospike",
  location: "Remote",
  start: "2026-03",
  tech: ["TypeScript", "React", "Next.js", "Go", "Playwright", "GCP", "AWS"],
} satisfies Partial<Experience>;

const bitscopic: Experience = {
  company: "BITSCOPIC",
  role: "Senior Software Engineer",
  location: "Remote",
  start: "2024-08",
  end: "2026-03",
  highlights: [
    "Sole front-end engineer for two products used across about a dozen hospital systems, owning design, implementation, and delivery end to end: PraediAlert, FDA-registered clinical surveillance software for infection preventionists and pharmacists, and Praedico, a nationwide public health surveillance and outbreak management platform. Built new endpoints in the Java Spring backend and maintained the service.",
    "Redesigned and rebuilt PraediAlert as a React application in about three months while it stayed in clinical use: visual design, reworked critical workflows, and the full implementation, replacing the legacy Ember codebase.",
  ],
  tech: ["TypeScript", "React", "Ember", "Java", "Spring"],
};

const contractor: Experience = {
  company: "Independent Contractor",
  role: "Software Engineer",
  location: "Remote",
  start: "2023-10",
  end: "2024-02",
  highlights: ["Built the front end of an AI-assisted clinical trial design tool for an early-stage client."],
  tech: ["TypeScript", "React"],
};

const elementTech = ["TypeScript", "React", "Node.js", "GraphQL", "Scala", "MariaDB", "AWS", "Azure"];

const elementStaff = {
  company: "Element Analytics",
  location: "Remote",
  start: "2020-09",
  end: "2023-09",
  tech: elementTech,
} satisfies Partial<Experience>;

const elementSenior = {
  company: "Element Analytics",
  location: "San Francisco Bay Area",
  start: "2016-07",
  end: "2020-09",
  tech: elementTech,
} satisfies Partial<Experience>;

const elementBullets = {
  language:
    "Designed and built a drag-and-drop visual programming language for transforming industrial historian data.",
  canvas:
    "Re-architected the canvas's React rendering, layout engine, and state management, raising its practical ceiling from hundreds of nodes to thousands.",
  testing:
    "Built the unit testing framework, browser integration test suite, and continuous delivery pipeline for the primary React application.",
  team: "Made the case for a dedicated front-end team, recruited all four engineers, and managed it: the team took full ownership of the flagship React application and the cloud-native connectors to OSIsoft PI, SAP, Honeywell, IBM Maximo, Amazon S3, and Power BI, replacing a model where backend engineers filled in on front-end work.",
  coverage:
    "Grew end-to-end coverage from a handful of tests to a full suite; releases went from monthly to several times a week.",
  promotions: "Promoted two engineers from junior to mid-level.",
  productOwner:
    "Served as product owner and scrum master for the React app: set the roadmap and met with users to shape requirements.",
  mentoring:
    "Mentored junior engineers on React architecture and front-end engineering practice; contributed to the Scala and MariaDB backend.",
};

const apcera: Experience = {
  company: "Apcera",
  role: "Software Engineer",
  location: "San Francisco Bay Area",
  start: "2015-02",
  end: "2016-07",
  highlights: [
    "Built the dashboard for Apcera's container platform with a small team of engineers and designers, using Mithril.js and React.",
  ],
  tech: ["JavaScript", "Mithril.js", "React", "CSS"],
};

const bleacherReport: Experience = {
  company: "Bleacher Report",
  role: "Engineer",
  location: "San Francisco Bay Area",
  start: "2014-10",
  end: "2015-01",
  highlights: [
    "Implemented a full redesign of the home page, seen by more than 80 million unique visitors a month.",
  ],
  tech: ["JavaScript", "HTML", "CSS"],
};

const chuteBullets = {
  backlog:
    "Owned the technical backlog for Chute's core front-end product, a Marionette.js application, and shipped a JSON API, performant D3 charts, and a queued processor for aggregating analytics data on aggressive deadlines.",
  team: "Led a team of two to four engineers on professional services projects: set coding standards, built automation tooling, and scoped projects with clients on pre- and post-sales calls.",
};

const chute = {
  company: "Chute",
  location: "San Francisco Bay Area",
  start: "2013-08",
  end: "2014-09",
  tech: ["JavaScript", "Marionette.js", "D3", "Ruby on Rails"],
} satisfies Partial<Experience>;

/** Arranged for Staff-level individual contributor roles. */
export const icResume: Resume = {
  summary:
    "Staff engineer with thirteen years on complex B2B products, from industrial data platforms to FDA-registered clinical software to a database-as-a-service console. I own the product surface end to end: client architecture, UX, and the services and pipelines under it. At Aerospike I lead the front-end team, cut end-to-end CI from an hour to 8 minutes, moved releases from every few weeks to several a week, and built the agentic development workflow now used by engineers and non-engineers across the org.",
  experience: [
    {
      ...aerospike,
      role: "Staff Software Engineer",
      highlights: [
        "Tech lead and acting manager for the four-engineer front-end team; set technical direction for Aerospike Cloud, the DBaaS console, and the desktop database browser.",
        "Took releases from every few weeks to several times a week by re-architecting the Playwright end-to-end suite that 7 engineers across 2 teams depend on: most tests moved to mocked infrastructure, with live databases kept for critical workflows only.",
        "Cut end-to-end CI time from 60 minutes to 8 and flake rate from over 40% to under 5%, and reduced provisioned test databases by 80%.",
        "Built the user flows and backend-for-frontend layer for GCP support in Aerospike Cloud (Next.js), which let one of the company's largest customers migrate 80 self-managed database clusters to the hosted service.",
        "Wrote the RFC for feature-enablement governance and traceability in production, where none existed. Accepted by SRE management, it is now policy across the engineering org.",
        "Narrowed the shared feature library to cross-product features only, cutting release volume and test overhead; four core features now ship to Aerospike Cloud and the desktop app from one codebase. Built the CI/CD pipelines for the library and the design system component library.",
        "Built the engineering org's AI development workflow: curated agent skills backed by fast deterministic feedback loops (lint, type, and test gates in CI) and agent-driven design-standards review. Adopted by engineers and non-engineers across the organization.",
      ],
    },
    bitscopic,
    contractor,
    {
      ...elementStaff,
      role: "Staff Software Engineer",
      highlights: [elementBullets.team, elementBullets.coverage, elementBullets.promotions],
    },
    {
      ...elementSenior,
      role: "Senior Software Engineer",
      highlights: [
        elementBullets.language,
        elementBullets.canvas,
        elementBullets.testing,
        elementBullets.productOwner,
        elementBullets.mentoring,
      ],
    },
    apcera,
    bleacherReport,
    {
      ...chute,
      role: "Product/Platform Engineer and Development Team Lead",
      highlights: [chuteBullets.backlog, chuteBullets.team],
    },
  ],
  skillGroups: [
    { label: "Languages", skills: ["TypeScript", "JavaScript", "Java", "Go", "Scala"] },
    { label: "Frontend", skills: ["React", "Next.js", "HTML", "CSS", "D3"] },
    { label: "Backend and data", skills: ["Node.js", "Express", "Spring", "GraphQL", "REST API design", "MariaDB"] },
    { label: "Testing and delivery", skills: ["Playwright", "Jest", "CI/CD design", "webpack"] },
    { label: "Cloud", skills: ["AWS", "GCP", "Azure"] },
    { label: "AI tooling", skills: ["Claude Code", "Cursor", "Agent skill development"] },
  ],
};
