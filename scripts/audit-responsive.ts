import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { chromium } from "@playwright/test";
import {
  collectLayoutFacts,
  overflowingElements,
  profiles,
  smallTargets,
  tinyText,
} from "@/lib/layout-checks";
import { site } from "@/data/site";

// Captures the deployed site across device profiles and themes, then records
// layout facts (overflow, small tap targets, tiny text) and axe violations for
// each capture. Output lands in audit-out/, which is gitignored. Usage:
//   npx tsx scripts/audit-responsive.ts [--base https://host] [--routes /,/resume]

const themes = ["light", "dark"] as const;
const defaultRoutes = ["/", "/projects", "/resume", "/writing", "/no-such-page"];

function argValue(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  return index === -1 ? undefined : process.argv[index + 1];
}

async function main() {
  const root = process.cwd();
  const base = (argValue("--base") ?? site.url).replace(/\/$/, "");
  const routes = argValue("--routes")?.split(",") ?? defaultRoutes;
  const outDir = path.join(root, "audit-out");
  mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch({ channel: "chrome" });
  const results = [];
  try {
    for (const route of routes) {
      const slug = route === "/" ? "home" : route.replace(/^\//, "").replace(/\//g, "-");
      const dir = path.join(outDir, slug);
      mkdirSync(dir, { recursive: true });
      for (const profile of profiles) {
        for (const theme of themes) {
          const context = await browser.newContext({ ...profile.options, colorScheme: theme });
          const page = await context.newPage();
          // tsx compiles with esbuild keepNames, which wraps nested functions in a
          // __name helper that does not exist inside the page. Provide a no-op.
          await page.addInitScript("window.__name = (fn) => fn;");
          // "load" plus fonts, not networkidle: dev servers keep sockets open and never go idle.
          const response = await page.goto(base + route, { waitUntil: "load" });
          await page.evaluate(() => document.fonts.ready);
          // Layout does not depend on theme; collect facts once per profile.
          const facts = theme === "light" ? await page.evaluate(collectLayoutFacts) : undefined;
          const axe = await new AxeBuilder({ page })
            .options({ rules: { "target-size": { enabled: true } } })
            .analyze();
          const screenshot = path.join(dir, `${profile.name}-${theme}.png`);
          await page.screenshot({ path: screenshot, fullPage: true });
          await context.close();

          const violations = axe.violations.map((v) => ({
            id: v.id,
            impact: v.impact,
            help: v.help,
            count: v.nodes.length,
            targets: v.nodes.slice(0, 5).map((n) => n.target.join(" ")),
          }));
          const summary = facts
            ? {
                title: facts.title,
                viewportMeta: facts.viewportMeta,
                innerWidth: facts.innerWidth,
                scrollWidth: facts.scrollWidth,
                clientWidth: facts.clientWidth,
                scrollHeight: facts.scrollHeight,
                horizontalScroll: facts.scrollWidth > facts.clientWidth,
                overflowing: overflowingElements(facts).map((e) => ({ element: e.description, ...e.rect })),
                interactiveCount: facts.elements.filter((e) => e.interactive && e.rendered).length,
                smallTargets: smallTargets(facts).map((e) => ({ element: e.description, width: e.rect.width, height: e.rect.height })),
                targetsUnder44: smallTargets(facts, 44).length,
                smallText: tinyText(facts).map((e) => ({ element: e.description, fontSize: e.fontSize })),
              }
            : undefined;
          results.push({
            route,
            status: response?.status() ?? null,
            profile: profile.name,
            theme,
            screenshot: path.relative(root, screenshot),
            facts: summary,
            violations,
          });
          const overflow = summary ? ` overflow=${summary.horizontalScroll}` : "";
          console.log(`${route} ${profile.name} ${theme} status=${response?.status()}${overflow} axe=${violations.length}`);
        }
      }
    }
  } finally {
    await browser.close();
  }
  writeFileSync(path.join(outDir, "results.json"), JSON.stringify(results, null, 2));
  console.log(`Wrote ${path.relative(root, outDir)}/results.json`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message.split("\n")[0] : String(error);
  console.error(`audit-responsive failed: ${message}`);
  process.exit(1);
});
