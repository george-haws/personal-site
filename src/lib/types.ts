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
