import { isbot } from "isbot";
import { PING_PATH } from "./ping-path";
import { createProvider, noopProvider, type PageView, type Provider } from "./provider";

const MAX_PING_FIELD = 2000;

/** A validated ping: `url` is the resolved site-relative path plus query. */
export type Ping = { url: string; referrer: string | null };

/** Validates a ping body against the request's origin; `referrer` is optional. */
export function parsePing(body: unknown, origin: string): Ping | null {
  if (typeof body !== "object" || body === null) return null;
  const { url, referrer } = body as Record<string, unknown>;
  if (typeof url !== "string" || url.length > MAX_PING_FIELD || !url.startsWith("/")) return null;
  let resolved: URL;
  try {
    resolved = new URL(url, origin);
  } catch {
    return null;
  }
  // A prefix check is not enough: the URL parser reads "/\evil.example/" as another host.
  if (resolved.origin !== origin) return null;
  if (referrer !== undefined && referrer !== null) {
    if (typeof referrer !== "string" || referrer.length > MAX_PING_FIELD) return null;
  }
  return {
    url: resolved.pathname + resolved.search,
    referrer: typeof referrer === "string" && referrer !== "" ? referrer : null,
  };
}

/** The page view record for a client-side route change reported by the page. */
export function pageViewFromPing(request: Request, ping: Ping): PageView {
  const url = new URL(ping.url, new URL(request.url).origin);
  return { ...pageViewFrom(request), url: url.href, referrer: ping.referrer };
}

/** Umami's own client sends navigator.language; its session column is this wide. */
const MAX_LANGUAGE = 35;

/** First Accept-Language tag without its weight: "en-US,en;q=0.9" → "en-US". */
export function firstLanguage(header: string | null): string | null {
  if (!header) return null;
  const first = header.split(",")[0]?.split(";")[0]?.trim();
  return first ? first.slice(0, MAX_LANGUAGE) : null;
}

function isDocumentRequest(request: Request): boolean {
  const dest = request.headers.get("Sec-Fetch-Dest");
  if (dest !== null) return dest === "document";
  // Old browsers and some tools send no fetch metadata; fall back to content negotiation.
  return (request.headers.get("Accept") ?? "").includes("text/html");
}

/** Chrome prerender and search-engine prefetch send document requests nobody has looked at. */
function isPrefetch(request: Request): boolean {
  return ["Sec-Purpose", "Purpose"].some((name) =>
    (request.headers.get(name) ?? "").toLowerCase().includes("prefetch"),
  );
}

/** Crawlers, and anything with no user agent at all: Umami rejects events without one. */
function isBot(request: Request): boolean {
  const userAgent = request.headers.get("User-Agent");
  return !userAgent || isbot(userAgent);
}

/** Whether a request that was served from the assets should count as a page view. */
export function isTrackable(request: Request, response: Response): boolean {
  if (request.method !== "GET") return false;
  // 304: the deployed HTML is must-revalidate, so every repeat visit is a 304.
  if (response.status !== 200 && response.status !== 304) return false;
  const { pathname } = new URL(request.url);
  if (pathname.startsWith("/_next/")) return false;
  if (pathname !== "/resume.pdf" && !isDocumentRequest(request)) return false;
  if (isPrefetch(request)) return false;
  return !isBot(request);
}

/** The page view record for a document load. */
export function pageViewFrom(request: Request): PageView {
  const url = new URL(request.url);
  return {
    url: url.href,
    hostname: url.hostname,
    referrer: request.headers.get("Referer"),
    userAgent: request.headers.get("User-Agent") ?? "",
    ip: request.headers.get("CF-Connecting-IP") ?? "",
    language: firstLanguage(request.headers.get("Accept-Language")),
  };
}

function noContent(): Response {
  return new Response(null, { status: 204 });
}

function badRequest(): Response {
  return new Response("Bad Request", { status: 400 });
}

/**
 * POST /nav from RouteTracker. The endpoint is public; the same-origin check is
 * a tripwire against casual cross-site posts, not security. Nothing waits on
 * the 204, so the existence check runs with the tracking in the background.
 */
async function handlePing(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  provider: Provider,
): Promise<Response> {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return badRequest();
    }
    const ping = parsePing(body, new URL(request.url).origin);
    if (ping === null) return badRequest();

    const site = request.headers.get("Sec-Fetch-Site");
    if (site !== null && site !== "same-origin") return noContent();
    if (isBot(request)) return noContent();

    const view = pageViewFromPing(request, ping);
    ctx.waitUntil(
      (async () => {
        // Keep the "no 404s" rule: the page has to exist in the assets.
        const head = await env.ASSETS.fetch(new Request(view.url, { method: "HEAD" }));
        if (head.status === 200 || head.status === 304) await provider.track(view);
      })().catch(logPingError),
    );
  } catch (error) {
    logPingError(error);
  }
  return noContent();
}

function logPingError(error: unknown) {
  console.error("analytics: ping failed", error);
}

/**
 * Serves the asset exactly as before, then reports the view in the background.
 * Invariant: nothing in here can change or delay the response. All tracking
 * code runs inside the try/catch after the asset has been fetched.
 */
export async function handleRequest(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  provider: Provider,
): Promise<Response> {
  if (request.method === "POST" && new URL(request.url).pathname === PING_PATH) {
    return handlePing(request, env, ctx, provider);
  }
  const response = await env.ASSETS.fetch(request);
  try {
    if (isTrackable(request, response)) {
      ctx.waitUntil(provider.track(pageViewFrom(request)).catch(logTrackingError));
    }
  } catch (error) {
    logTrackingError(error);
  }
  return response;
}

function logTrackingError(error: unknown) {
  console.error("analytics: tracking failed", error);
}

export default {
  async fetch(request, env, ctx) {
    // Provider construction is tracking code too, so it gets the same guard.
    let provider: Provider = noopProvider;
    try {
      provider = createProvider(env);
    } catch (error) {
      console.error("analytics: provider setup failed", error);
    }
    return handleRequest(request, env, ctx, provider);
  },
} satisfies ExportedHandler<Env>;
