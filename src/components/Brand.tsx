import Link from "next/link";
import { site } from "@/data/site";

/** Header wordmark: the g_ mark on phones, where the full name does not fit, and the name from sm up. */
export function Brand() {
  return (
    <Link href="/" aria-label={site.name} className="tap-target min-w-11 font-medium text-foreground">
      <span className="font-semibold sm:hidden">g_</span>
      <span className="hidden before:mr-1.5 before:text-primary before:content-['>'] sm:inline">{site.name}</span>
    </Link>
  );
}
