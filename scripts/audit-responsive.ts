import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { chromium, devices, type BrowserContextOptions } from "playwright-core";
import { site } from "@/data/site";

// Captures the deployed site across device profiles and themes, then records
// layout facts (overflow, small tap targets, tiny text) and axe violations for
// each capture. Output lands in audit-out/, which is gitignored. Usage:
//   npx tsx scripts/audit-responsive.ts [--base https://host] [--routes /,/resume]

type Profile = { name: string; options: BrowserContextOptions };

const phone = { deviceScaleFactor: 2, isMobile: true, hasTouch: true };
// Pick the layout fields only: the descriptor also names WebKit, but we drive Chrome.
const { viewport, userAgent, deviceScaleFactor, isMobile, hasTouch } = devices["iPhone 15"];
const iphone15: BrowserContextOptions = { viewport, userAgent, deviceScaleFactor, isMobile, hasTouch };

const profiles: Profile[] = [
  { name: "phone-320", options: { viewport: { width: 320, height: 568 }, ...phone } },
  { name: "phone-375", options: { viewport: { width: 375, height: 667 }, ...phone } },
  { name: "iphone-15", options: iphone15 },
  { name: "tablet-768", options: { viewport: { width: 768, height: 1024 }, ...phone } },
  { name: "laptop-1024", options: { viewport: { width: 1024, height: 768 } } },
  { name: "desktop-1440", options: { viewport: { width: 1440, height: 900 } } },
];
const themes = ["light", "dark"] as const;
const defaultRoutes = ["/", "/projects", "/resume", "/writing", "/no-such-page"];

function argValue(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  return index === -1 ? undefined : process.argv[index + 1];
}

// Runs inside the page. Everything it touches must be browser-side.
function collectLayoutFacts() {
  const doc = document.documentElement;
  const vw = window.innerWidth;
  const describe = (el: Element) => {
    const id = el.id ? `#${el.id}` : "";
    const classes =
      typeof el.className === "string" && el.className.trim()
        ? `.${el.className.trim().split(/\s+/).slice(0, 3).join(".")}`
        : "";
    const text = (el.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 40);
    return `${el.tagName.toLowerCase()}${id}${classes}${text ? ` "${text}"` : ""}`;
  };
  const round = (n: number) => Math.round(n);

  const all = Array.from(document.querySelectorAll("body *"));
  const overflowing = all
    .map((el) => ({ el, rect: el.getBoundingClientRect() }))
    .filter(({ rect }) => rect.width > 0 && (rect.right > vw + 1 || rect.left < -1))
    .slice(0, 20)
    .map(({ el, rect }) => ({
      element: describe(el),
      left: round(rect.left),
      right: round(rect.right),
      width: round(rect.width),
    }));

  const interactive = Array.from(
    document.querySelectorAll<HTMLElement>(
      "a[href], button, input, select, textarea, summary, [role=button], [tabindex]:not([tabindex='-1'])",
    ),
  )
    .map((el) => ({ el, rect: el.getBoundingClientRect() }))
    .filter(({ rect }) => rect.width > 0 && rect.height > 0);
  const targets = interactive.map(({ el, rect }) => ({
    element: describe(el),
    width: round(rect.width),
    height: round(rect.height),
  }));
  const smallTargets = targets.filter((t) => t.width < 24 || t.height < 24);
  const targetsUnder44 = targets.filter((t) => t.width < 44 || t.height < 44).length;

  const hasOwnText = (el: Element) =>
    Array.from(el.childNodes).some((n) => n.nodeType === Node.TEXT_NODE && (n.textContent ?? "").trim());
  const smallText = all
    .filter((el) => hasOwnText(el))
    .map((el) => ({ el, size: parseFloat(getComputedStyle(el).fontSize) }))
    .filter(({ size }) => size < 12)
    .slice(0, 10)
    .map(({ el, size }) => ({ element: describe(el), fontSize: size }));

  return {
    title: document.title,
    viewportMeta: document.querySelector('meta[name="viewport"]')?.getAttribute("content") ?? null,
    innerWidth: vw,
    innerHeight: window.innerHeight,
    scrollWidth: doc.scrollWidth,
    clientWidth: doc.clientWidth,
    scrollHeight: doc.scrollHeight,
    horizontalScroll: doc.scrollWidth > doc.clientWidth,
    overflowing,
    interactiveCount: interactive.length,
    smallTargets,
    targetsUnder44,
    smallText,
  };
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
          const response = await page.goto(base + route, { waitUntil: "networkidle" });
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
          results.push({
            route,
            status: response?.status() ?? null,
            profile: profile.name,
            theme,
            screenshot: path.relative(root, screenshot),
            facts,
            violations,
          });
          const overflow = facts ? ` overflow=${facts.horizontalScroll}` : "";
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
