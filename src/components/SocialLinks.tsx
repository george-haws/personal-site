import type { SocialLinks as SocialLinksType } from "@/lib/types";

export function SocialLinks({ links }: { links: SocialLinksType }) {
  const items: { label: string; href: string }[] = [];
  if (links.github) items.push({ label: "GitHub", href: links.github });
  if (links.linkedin) items.push({ label: "LinkedIn", href: links.linkedin });
  if (links.email) items.push({ label: "Email", href: `mailto:${links.email}` });

  if (items.length === 0) return null;

  return (
    <ul>
      {items.map((item) => (
        <li key={item.label}>
          <a
            href={item.href}
            {...(item.href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          >
            {item.label}
          </a>
        </li>
      ))}
    </ul>
  );
}
