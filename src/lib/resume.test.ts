import { describe, it, expect } from "vitest";
import { sortByStartDesc } from "@/lib/resume";
import type { Experience } from "@/lib/types";

function entry(start: Experience["start"]): Experience {
  return {
    company: `Co ${start}`,
    role: "Engineer",
    location: "Remote",
    start,
    highlights: [],
  };
}

describe("sortByStartDesc", () => {
  it("orders newest start first without mutating the input", () => {
    const input = [entry("2018-06"), entry("2022-01"), entry("2020-11")];
    const result = sortByStartDesc(input);
    expect(result.map((e) => e.start)).toEqual(["2022-01", "2020-11", "2018-06"]);
    expect(input.map((e) => e.start)).toEqual(["2018-06", "2022-01", "2020-11"]);
  });
});
