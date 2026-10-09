import { describe, it, expect } from "vitest";
import { formatMonth, formatDateRange, formatDate } from "@/lib/dates";

describe("formatMonth", () => {
  it("formats YYYY-MM as short month and year", () => {
    expect(formatMonth("2021-03")).toBe("Mar 2021");
    expect(formatMonth("2019-12")).toBe("Dec 2019");
  });
});

describe("formatDateRange", () => {
  it("uses Present when end is missing", () => {
    expect(formatDateRange("2021-03")).toBe("Mar 2021 – Present");
  });

  it("formats both ends when end is given", () => {
    expect(formatDateRange("2018-06", "2021-02")).toBe("Jun 2018 – Feb 2021");
  });
});

describe("formatDate", () => {
  it("formats an ISO date as short month, day, and year", () => {
    expect(formatDate("2026-10-09")).toBe("Oct 9, 2026");
    expect(formatDate("2025-01-31")).toBe("Jan 31, 2025");
  });
});
