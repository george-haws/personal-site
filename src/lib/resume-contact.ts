import type { SiteInfo } from "@/lib/types";

export type ContactItem = { text: string; href?: string };

/** "https://www.linkedin.com/in/gehaws/" → "linkedin.com/in/gehaws". */
export function displayUrl(url: string): string {
  return url
    .replace(/^[a-z][a-z0-9+.-]*:\/\//i, "")
    .replace(/^www\./, "")
    .replace(/\/$/, "");
}

export type ResumeMedium = "pdf" | "markdown";

/** The site link in a resume export, tagged so a click from the resume shows up as such in analytics. */
function taggedSiteHref(url: string, medium: ResumeMedium): string {
  return `${url.replace(/\/$/, "")}/?utm_source=resume&utm_medium=${medium}`;
}

/** The resume exports' contact line, in display order. Absent links are omitted. */
export function contactItems(site: SiteInfo, medium: ResumeMedium): ContactItem[] {
  const { email, github, linkedin } = site.links;
  const items: ContactItem[] = [{ text: site.location }];
  if (email) items.push({ text: email, href: `mailto:${email}` });
  items.push({ text: displayUrl(site.url), href: taggedSiteHref(site.url, medium) });
  for (const url of [github, linkedin]) {
    if (url) items.push({ text: displayUrl(url), href: url });
  }
  return items;
}
