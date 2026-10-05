import { describe, it, expect } from "vitest";
import { icResume } from "@/data/resume";

describe("icResume", () => {
  it("has a summary", () => {
    expect(icResume.summary.trim().length).toBeGreaterThan(0);
  });

  it("has a headline", () => {
    expect(icResume.headline.trim().length).toBeGreaterThan(0);
  });

  it("lists every role with at least one highlight", () => {
    for (const entry of icResume.experience) {
      expect(entry.highlights.length, entry.company).toBeGreaterThan(0);
    }
  });
});
