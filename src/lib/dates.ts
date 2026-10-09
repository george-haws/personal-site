import type { YearMonth } from "@/lib/types";

const monthFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export function formatMonth(ym: YearMonth): string {
  const [year, month] = ym.split("-").map(Number);
  return monthFormatter.format(new Date(Date.UTC(year, month - 1, 1)));
}

export function formatDateRange(start: YearMonth, end?: YearMonth): string {
  const endLabel = end ? formatMonth(end) : "Present";
  return `${formatMonth(start)} – ${endLabel}`;
}

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

/** Formats an ISO date ("YYYY-MM-DD") as e.g. "Oct 9, 2026". */
export function formatDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  return dateFormatter.format(new Date(Date.UTC(year, month - 1, day)));
}
