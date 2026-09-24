import type { Experience } from "@/lib/types";

/** Newest start first. "YYYY-MM" strings compare correctly as plain strings. */
export function sortByStartDesc(items: Experience[]): Experience[] {
  return [...items].sort((a, b) => (a.start < b.start ? 1 : a.start > b.start ? -1 : 0));
}
