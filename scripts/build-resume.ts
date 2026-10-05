import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";
import { icResume } from "@/data/resume";
import { site } from "@/data/site";
import { renderResumeHtml } from "@/lib/resume-html";
import { renderResumeMarkdown } from "@/lib/resume-markdown";

const root = process.cwd();
const markdownPath = path.join(root, "docs/resume-ic.md");
const htmlPath = path.join(root, "docs/resume-ic.html");
const pdfPath = path.join(root, "public/resume.pdf");

async function main() {
  // Markdown first, so a PDF failure never leaves it stale.
  writeFileSync(markdownPath, renderResumeMarkdown(icResume, site));
  console.log("Wrote docs/resume-ic.md");

  // Chrome stamps every PDF with a creation date and ID, so reprinting
  // unchanged content would still produce a binary diff. Skip it.
  const html = renderResumeHtml(icResume, site);
  const force = process.argv.includes("--force");
  const htmlUnchanged = existsSync(htmlPath) && readFileSync(htmlPath, "utf8") === html;
  if (htmlUnchanged && existsSync(pdfPath) && !force) {
    console.log("PDF up to date");
    return;
  }

  const browser = await chromium.launch({ channel: "chrome" });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    // No format or margin: the template's @page rule is the only source of page geometry.
    await page.pdf({ path: pdfPath, preferCSSPageSize: true, printBackground: true });
  } finally {
    await browser.close();
  }
  console.log("Wrote public/resume.pdf");

  // Only after the PDF succeeds, so this file never vouches for an old PDF.
  writeFileSync(htmlPath, html);
  console.log("Wrote docs/resume-ic.html");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message.split("\n")[0] : String(error);
  console.error(`npm run resume failed: ${message}`);
  process.exit(1);
});
