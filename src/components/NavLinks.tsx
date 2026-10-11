import Link from "next/link";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "About" },
  { href: "/writing", label: "Writing" },
  { href: "/resume", label: "Resume" },
] as const;

function isActive(href: string, currentPath: string): boolean {
  if (href === "/") return currentPath === "/";
  return currentPath === href || currentPath.startsWith(`${href}/`);
}

export function NavLinks({ currentPath }: { currentPath: string }) {
  return (
    <ul className="flex items-center gap-5">
      {navItems.map((item) => {
        const active = isActive(item.href, currentPath);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "tap-target transition-colors hover:text-primary",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
