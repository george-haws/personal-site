import type { Metadata } from "next";
import { ResumeView } from "@/components/ResumeView";
import { icResume } from "@/data/resume";
import { site } from "@/data/site";

export const metadata: Metadata = {
  title: "Resume",
  description: `Work history and skills for ${site.name}.`,
};

export default function ResumePage() {
  return <ResumeView title="Resume" resume={icResume} pdfHref={site.resumePdf} />;
}
