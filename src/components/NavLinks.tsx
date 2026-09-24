import Link from "next/link";

const navItems = [
  { href: "/", label: "About" },
  { href: "/resume", label: "Resume" },
  { href: "/projects", label: "Projects" },
] as const;

function isActive(href: string, currentPath: string): boolean {
  if (href === "/") return currentPath === "/";
  return currentPath === href || currentPath.startsWith(`${href}/`);
}

export function NavLinks({ currentPath }: { currentPath: string }) {
  return (
    <ul>
      {navItems.map((item) => (
        <li key={item.href}>
          <Link href={item.href} aria-current={isActive(item.href, currentPath) ? "page" : undefined}>
            {item.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}
