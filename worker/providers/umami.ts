import type { PageView, Provider } from "../provider";

export const DEFAULT_UMAMI_ENDPOINT = "https://gateway.umami.is/api/send";

/** Cloudflare lets background work run after the response, but a hung vendor should not hold the Worker open. */
const TIMEOUT_MS = 5000;

export type UmamiOptions = { websiteId: string; endpoint?: string };

/**
 * Sends page views to Umami's events API. Umami derives country, browser,
 * device, UTM tags, and unique visitors from the fields sent here.
 */
export function umamiProvider(options: UmamiOptions): Provider {
  const endpoint = options.endpoint ?? DEFAULT_UMAMI_ENDPOINT;
  return {
    async track(view: PageView) {
      try {
        const url = new URL(view.url);
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            // Umami rejects requests without a User-Agent; the visitor's is the one that matters.
            "User-Agent": view.userAgent,
          },
          body: JSON.stringify({
            type: "event",
            payload: {
              website: options.websiteId,
              hostname: view.hostname,
              url: url.pathname + url.search,
              referrer: view.referrer ?? "",
              // JSON.stringify drops undefined, so a null language is omitted rather than sent as null.
              language: view.language ?? undefined,
              ip: view.ip,
              userAgent: view.userAgent,
            },
          }),
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        if (!response.ok) {
          console.error(`analytics: umami responded ${response.status}: ${await response.text()}`);
        }
      } catch (error) {
        console.error("analytics: umami request failed", error);
      }
    },
  };
}
