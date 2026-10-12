import { umamiProvider } from "./providers/umami";

/** One page view, vendor-neutral. Country is left to the vendor, which derives it from the IP. */
export type PageView = {
  /** Full URL including the query string, so UTM tags survive. */
  url: string;
  hostname: string;
  referrer: string | null;
  userAgent: string;
  /** CF-Connecting-IP. */
  ip: string;
  /** First Accept-Language tag without its weight, e.g. "en-US". */
  language: string | null;
};

/** Sends one page view somewhere. Implementations never throw: they log and resolve. */
export type Provider = { track(view: PageView): Promise<void> };

export type ProviderEnv = {
  ANALYTICS_PROVIDER?: string;
  UMAMI_WEBSITE_ID?: string;
  UMAMI_ENDPOINT?: string;
};

export const noopProvider: Provider = {
  async track() {},
};

const warned = new Set<string>();

function warnOnce(message: string) {
  if (warned.has(message)) return;
  warned.add(message);
  console.warn(message);
}

/** Picks the provider named by ANALYTICS_PROVIDER. Unset, "none", or anything unknown disables tracking. */
export function createProvider(env: ProviderEnv): Provider {
  const name = env.ANALYTICS_PROVIDER ?? "none";
  switch (name) {
    case "none":
      return noopProvider;
    case "umami": {
      const websiteId = env.UMAMI_WEBSITE_ID ?? "";
      if (websiteId === "") {
        warnOnce("analytics: UMAMI_WEBSITE_ID is empty; tracking disabled");
        return noopProvider;
      }
      return umamiProvider({ websiteId, endpoint: env.UMAMI_ENDPOINT });
    }
    default:
      warnOnce(`analytics: unknown ANALYTICS_PROVIDER "${name}"; tracking disabled`);
      return noopProvider;
  }
}
