/** Calendar month as "YYYY-MM", e.g. "2021-03". */
export type YearMonth = `${number}-${number}`;

export type SocialLinks = {
  github?: string;
  linkedin?: string;
  email?: string;
};

export type SiteInfo = {
  name: string;
  tagline: string;
  bio: string;
  /** City and region, e.g. "Long Beach, CA". Shown in the resume exports' contact line. */
  location: string;
  /** Canonical site URL with protocol, e.g. "https://ghaws.dev". */
  url: string;
  links: SocialLinks;
  /** Path under public/, e.g. "/resume.pdf". Omit to hide the download link. */
  resumePdf?: string;
};

export type Experience = {
  company: string;
  role: string;
  location: string;
  start: YearMonth;
  /** Omit for the current role. */
  end?: YearMonth;
  highlights: string[];
  tech?: string[];
};

export type SkillGroup = {
  label: string;
  skills: string[];
};

/** One variant of the resume: the same history, arranged for a particular audience. */
export type Resume = {
  /** Title shown under the name on the resume page and in the exports, e.g. "Staff Software Engineer". */
  headline: string;
  /** A few sentences positioning the candidate for this variant's audience. */
  summary: string;
  experience: Experience[];
  skillGroups: SkillGroup[];
};

export type Project = {
  title: string;
  /** One line, shown on cards. */
  summary: string;
  /** Longer text, shown on cards below the summary. */
  description: string;
  tech: string[];
  repoUrl?: string;
  liveUrl?: string;
  /** Path under public/. */
  image?: string;
  featured: boolean;
};
