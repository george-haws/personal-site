"use client";

import { usePathname } from "next/navigation";
import { NavLinks } from "@/components/NavLinks";

export function Nav() {
  const pathname = usePathname();
  return <NavLinks currentPath={pathname} />;
}
