import type { SiteInfo } from "@/lib/types";

export type ContactItem = { text: string; href?: string };

/** "https://www.linkedin.com/in/gehaws/" → "linkedin.com/in/gehaws". */
export function displayUrl(url: string): string {
  return url
    .replace(/^[a-z][a-z0-9+.-]*:\/\//i, "")
    .replace(/^www\./, "")
    .replace(/\/$/, "");
}

/** The resume exports' contact line, in display order. Absent links are omitted. */
export function contactItems(site: SiteInfo): ContactItem[] {
  const { email, github, linkedin } = site.links;
  const items: ContactItem[] = [{ text: site.location }];
  if (email) items.push({ text: email, href: `mailto:${email}` });
  for (const url of [site.url, github, linkedin]) {
    if (url) items.push({ text: displayUrl(url), href: url });
  }
  return items;
}
