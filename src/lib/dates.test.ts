import { describe, it, expect } from "vitest";
import { formatMonth, formatDateRange } from "@/lib/dates";

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
