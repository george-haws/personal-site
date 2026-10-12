import type { Provider } from "../provider";

export function umamiProvider(_options: { websiteId: string; endpoint?: string }): Provider {
  return { async track() {} };
}
