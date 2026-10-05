import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ResumeView } from "@/components/ResumeView";
import type { Resume } from "@/lib/types";

const resume: Resume = {
  headline: "Staff Engineer",
  summary: "Writes programs.",
  experience: [],
  skillGroups: [],
};

describe("ResumeView", () => {
  it("renders the headline below the page heading", () => {
    render(<ResumeView title="Resume" resume={resume} />);
    const heading = screen.getByRole("heading", { level: 1, name: "Resume" });
    const headline = screen.getByText("Staff Engineer");
    expect(heading.compareDocumentPosition(headline) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
