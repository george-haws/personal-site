# Edge analytics: server-side pageviews with a swappable provider

Date: 2026-10-11

## Goal

See who is visiting the site: which pages, from which referrers and
countries, and whether a specific tagged link (a LinkedIn post, a message to
one recruiter, the resume PDF) was followed. Tracking must survive ad
blockers, cost nothing at the site's traffic level, and leave the analytics
vendor replaceable without touching the site.

## Decisions

- Document loads are recorded at the edge by a Cloudflare Worker that runs
  in front of the static assets. No third-party script is loaded, so ad
  blockers have nothing to block and the site's Content-Security-Policy
  stays as it is.
- Client-side route changes (the site's internal links use `next/link`, so
  only the landing page and hard reloads are document loads) are reported
  by a small client component that POSTs to the same Worker on the site's
  own origin. Blockers work from lists of third-party hosts and well-known
  script names; a same-origin request to an unremarkable path passes them.
  Alternatives considered: plain anchors for internal links (full reloads,
  no client code, but changes how the site navigates) and counting entry
  pages only (loses the pages report).
- The Worker sends each pageview to a vendor's server-side events API. The
  first vendor is Umami Cloud's free Hobby plan (100k events a month, one
  site, six months of history). The vendor's dashboard is the only UI.
- The vendor sits behind a one-function provider interface. Swapping to a
  paid vendor (Plausible, Pirsch, or a self-hosted Umami) is one new provider
  file and a config change. Alternatives considered: proxying a vendor's
  client script through the Worker (vendor-specific scripts, CSP changes,
  and a blocker that inspects script contents can still catch it), and
  Workers Analytics Engine with Counterscale (free and unblockable, but the
  dashboard becomes ours to run and a later move to a paid vendor is a
  rewrite).
- Links the owner controls carry standard UTM parameters. Every vendor
  parses them, so per-link and per-person attribution needs no custom code.
- Invariant: analytics can never break the site. The asset response is
  obtained before any tracking code runs, every line of tracking code
  (trackability check, record building, provider call) sits inside one
  try/catch that logs and drops, and the response is returned unchanged
  regardless.
- Free Cloudflare Web Analytics was rejected because its beacon loads from a
  Cloudflare hostname on the standard block lists and it discards query
  strings, so tagged links would not register.

## Research summary

Findings this design rests on. Vendor terms change; these were current on
2026-10-11.

- Cloudflare zone analytics on the Free plan shows requests, bandwidth,
  unique visitors, and a country map, with no path or referrer breakdown.
  It stays on as a blocker-proof sanity check of total traffic.
- The deployed site serves HTML with `cache-control: public, max-age=0,
  must-revalidate` and an ETag, and answers a matching `If-None-Match` with
  304 (verified with curl against ghaws.dev). Every repeat visit is
  therefore a 304, and must count.
- Umami's `POST /api/send` accepts `ip` and `userAgent` in the payload and
  prefers them over headers (`getClientInfo` in `src/lib/detect.ts`). When
  the payload has no IP, `getIpAddress` in `src/lib/ip.ts` reads headers in
  this order: `x-umami-client-ip` (Cloud only), `true-client-ip`,
  `cf-connecting-ip`, then others, with `x-forwarded-for` ninth. The
  endpoint requires a User-Agent header and no authentication. Umami drops
  events whose user agent the isbot library flags. The sending-stats docs
  give `https://gateway.umami.is/api/send` for Cloud.
- Umami's own client sends `navigator.language`, a single tag, and the
  session table's language column is short. A raw `Accept-Language` header
  (`en-US,en;q=0.9,es;q=0.8,...`) does not fit; send the first tag without
  its weight.
- Plausible's `POST /api/event` takes the visitor IP in `X-Forwarded-For`
  and the user agent in the User-Agent header and extracts UTM parameters
  from the `url` field. Pirsch is server-side by design. Both fit the same
  provider interface.
- Workers Free allows 100k requests a day. Every request not under `/_next/`
  invokes the Worker: page loads, the PDF, icons, robots and sitemap, the
  `.txt` RSC payloads that `next/link` prefetches, and the pings. A visit
  that reads three pages costs on the order of ten Worker requests. At the
  site's traffic this is far below the limit, but it is not "one per page".
- `useSearchParams` in a static export forces a Suspense boundary and
  client-side rendering of the tree above it; `usePathname` does not. The
  tracker uses only `usePathname` and reads the query string from
  `window.location` inside its effect.

## Request flow: document loads

1. A request reaches the Worker when its path is not under `/_next/`. Next's
   chunks, fonts, and images stay on the asset-first path and never invoke
   the Worker.
2. If the request is `POST /pv`, see the next section. Otherwise the Worker
   fetches the asset through the `ASSETS` binding and keeps the response to
   return unchanged.
3. The request is trackable when all of these hold:
   - the method is GET;
   - the asset response status is 200 or 304;
   - the request is a document navigation (`Sec-Fetch-Dest: document`, or
     an `Accept` header including `text/html` when `Sec-Fetch-Dest` is
     absent) or a request for `/resume.pdf`;
   - no `Sec-Purpose` or `Purpose` header contains `prefetch` (Chrome
     prerender and search-engine prefetch send document requests nobody
     has looked at).
4. A trackable request whose user agent the isbot library flags is dropped.
5. Otherwise the Worker builds a pageview record, hands
   `provider.track(record)` to `ctx.waitUntil`, and returns the asset
   response. Tracking never delays or modifies the response.

Not-found responses are not tracked, which drops most scanner noise. The
PDF is tracked as an ordinary pageview of `/resume.pdf`, so it appears in
the pages list. Umami parses UTM parameters per event from the event's own
URL, so the PDF pageview carries none itself; connecting it to the tagged
landing is a session-level view in the dashboard, not something this design
guarantees.

## Request flow: client-side route changes

A client component `RouteTracker`, mounted once in the root layout, watches
`usePathname()`. On the first render it only records the current pathname,
because the Worker has already counted the document load. On each later
change it POSTs to `/pv` on the site's own origin with `fetch` and
`keepalive: true`:

```json
{ "url": "/writing/some-post?x=1", "referrer": "https://ghaws.dev/writing" }
```

`url` is the new pathname plus `window.location.search`; `referrer` is the
previous page's full URL, which is what Umami's own client sends and which
Umami strips as a self-referral. Hash changes do not change the pathname and
are not reported. Back and forward navigations are.

The Worker handles `POST /pv`:

1. Parse the JSON body. `url` must be a string starting with a single `/`
   and at most 2000 characters; `referrer` is optional, a string of at most
   2000 characters. Anything else is a 400.
2. If a `Sec-Fetch-Site` header is present and is not `same-origin`, reply
   204 and do nothing. This is a tripwire against casual cross-site posts,
   not security; the endpoint is public and a determined spammer can fake
   pageviews. Accepted for a personal site.
3. Confirm the page exists: a HEAD request for the pathname through the
   `ASSETS` binding must return 200 or 304. Otherwise reply 204 and do
   nothing, keeping the "no 404s" rule.
4. Drop user agents isbot flags.
5. Build the pageview record from the body's `url` and `referrer` and the
   request's user agent, IP, and language headers, hand it to
   `ctx.waitUntil`, and reply 204.

`/pv` is a short path chosen to look like nothing in particular; generic
blocker rules match paths containing words like `track`, `collect`, or
`analytics`. A GET to `/pv` falls through to the asset path and 404s.

No CSP change: the policy sets `default-src 'self'` and no `connect-src`,
so a same-origin fetch is already allowed.

## Pageview record

One plain object, vendor-neutral, built the same way for document loads and
pings. Country is deliberately absent; each vendor derives it from the IP.

```ts
type PageView = {
  url: string;        // full URL including the query string, so UTM tags survive
  hostname: string;
  referrer: string | null;   // Referer header or the ping's referrer, else null
  userAgent: string;
  ip: string;         // CF-Connecting-IP
  language: string | null;   // first Accept-Language tag without its weight, else null
};
```

## Provider interface

```ts
type Provider = { track(view: PageView): Promise<void> };
```

Providers never throw. Each wraps its network call, logs failures with
`console.error`, and resolves. A factory `createProvider(env)` reads
`env.ANALYTICS_PROVIDER` and returns the matching provider; `none`, unset,
or an unknown value returns a no-op provider and logs a warning once.

## Umami provider

One POST to `env.UMAMI_ENDPOINT` (default
`https://gateway.umami.is/api/send`) with headers `Content-Type:
application/json` and `User-Agent` set to the visitor's user agent, and body:

```json
{
  "type": "event",
  "payload": {
    "website": "<UMAMI_WEBSITE_ID>",
    "hostname": "ghaws.dev",
    "url": "/?utm_source=linkedin&utm_medium=message&utm_campaign=acme-staff-eng",
    "referrer": "https://www.linkedin.com/",
    "language": "en-US",
    "ip": "203.0.113.7",
    "userAgent": "Mozilla/5.0 ..."
  }
}
```

`url` is the path plus query string. The request aborts after 5 seconds via
`AbortSignal.timeout`. A non-2xx response is logged with its status and
dropped.

Umami's public docs do not list the `ip` payload field; only the source
does. The first task after deploying is the country check under
Verification. If the IP is not honored, the fallback is the
`x-umami-client-ip` header, which Umami Cloud reads before any other IP
header. `X-Forwarded-For` is not a usable fallback: if the Cloud gateway
sits behind Cloudflare, the Worker's request arrives with
`cf-connecting-ip` set to the Worker's egress address, which outranks it,
and every visitor would geolocate to that address while still "showing a
country".

The Cloud endpoint host is taken from the docs. The README setup step says
to confirm it against the host in the dashboard's tracking snippet, since
docs pages for Cloud have given different hosts; the value is a config
variable either way.

## Configuration

`wrangler.jsonc` gains:

- `main: "worker/index.ts"`
- `assets.binding: "ASSETS"`
- `assets.run_worker_first: ["/*", "!/_next/*"]`
- `vars.ANALYTICS_PROVIDER: "umami"`
- `vars.UMAMI_WEBSITE_ID: "<id from the Umami dashboard>"`

Neither value is secret: an Umami website ID is visible in every
client-side install. `UMAMI_ENDPOINT` is optional and only set to override
the default. No wrangler secrets are needed for this provider.

`wrangler dev` reads `vars` from the same file, so local preview would send
real events. The `preview` script passes `--var ANALYTICS_PROVIDER:none`;
tracking in preview is opt-in by running wrangler dev by hand without it.

The Cloudflare git integration's build and deploy commands are unchanged.

## Files

- `worker/index.ts`: the fetch handler. Exports `default { fetch }` and the
  pure helpers it uses so they can be unit tested: `isTrackable(request,
  response)`, `pageViewFrom(request)`, `pageViewFromPing(request, body)`,
  and `parsePing(body)`.
- `worker/provider.ts`: the `PageView` and `Provider` types,
  `createProvider(env)`, and the no-op provider.
- `worker/providers/umami.ts`: the Umami provider.
- `worker/*.test.ts`: unit tests (see Tests).
- `worker-configuration.d.ts`: generated by `wrangler types`, committed, and
  regenerated when bindings or vars change. Declares `Env` with `ASSETS`,
  `ANALYTICS_PROVIDER`, `UMAMI_WEBSITE_ID`, and `UMAMI_ENDPOINT`.
- `src/components/RouteTracker.tsx`: the client component, and its test.
- `src/app/layout.tsx`: mounts `RouteTracker` inside the body.
- `vitest.config.mts`: `include` gains `worker/**/*.test.ts`.
- `package.json`: `isbot` as a dependency; a `preview` script that builds
  the export and runs `wrangler dev --var ANALYTICS_PROVIDER:none`; a
  `types` script for `wrangler types`.
- `src/lib/resume-contact.ts`: see Resume source tag.
- `README.md`: an Analytics section (see Documentation).

## Resume source tag

`contactItems(site, medium)` takes the export medium (`"pdf"` or
`"markdown"`) and sets the site link's href to
`${site.url}/?utm_source=resume&utm_medium=${medium}`. The display text stays
`ghaws.dev`. `resume-html.ts` passes `"pdf"` and `resume-markdown.ts` passes
`"markdown"`. The resume is regenerated with `npm run resume` and the three
outputs are committed, as the staleness tests require.

## Link tagging convention

Standard UTM parameters on every link the owner places:

| Parameter | Meaning | Values |
|---|---|---|
| `utm_source` | where the link lives | `linkedin`, `github`, `email`, `resume` |
| `utm_medium` | kind of placement | `profile`, `post`, `message`, `pdf`, `markdown` |
| `utm_campaign` | the specific link, and the per-person slot | a post slug, or company and role such as `acme-staff-eng` |

Example for a link sent to one recruiter:
`https://ghaws.dev/?utm_source=linkedin&utm_medium=message&utm_campaign=acme-staff-eng`

Untagged visits still carry the referrer, so LinkedIn traffic is visible
either way, just not which post or message it came from. LinkedIn's mobile
app often sends no referrer at all, which is why the tags matter.

## Documentation

README gains an Analytics section covering: how tracking works in one
paragraph (edge for document loads, same-origin ping for route changes);
the one-time Umami Cloud setup (create the free account and a website for
`ghaws.dev`, paste the website ID into `wrangler.jsonc`, confirm the
endpoint host against the snippet shown in the dashboard); the tagging
table above; the two standing links to update once (the website field on
the LinkedIn and GitHub profiles); and how to swap providers (add a file
under `worker/providers/`, a case in the factory, and change
`ANALYTICS_PROVIDER`).

## Tests

Unit tests under `worker/` and `src/components/`, no network and no Workers
runtime. The fetch handler is exercised with a stub `ASSETS` binding and a
recording provider.

- `isTrackable`: a document GET with a 200 asset is tracked, and with a 304;
  `/resume.pdf` is tracked; a request under `/_next/` is not (defensive,
  even though routing excludes it); a non-GET is not; a 404 asset is not; a
  request whose user agent isbot flags is not; a document request with
  `Sec-Purpose: prefetch` is not.
- `pageViewFrom`: builds the record from a request carrying
  `CF-Connecting-IP`, `Referer`, `Accept-Language`, and a query string;
  reduces `en-US,en;q=0.9,es;q=0.8` to `en-US`; yields null for absent
  referrer and language.
- `parsePing`: accepts a valid body; rejects a missing `url`, a `url` not
  starting with `/`, a protocol-relative `//host`, and over-long values.
- `pageViewFromPing`: combines the body's `url` and `referrer` with the
  request's headers into the same record shape.
- `createProvider`: returns the Umami provider for `"umami"` and the no-op
  provider for `"none"`, unset, and unknown values.
- Umami provider: against a mocked `fetch`, sends the documented body and
  headers; resolves without throwing on a network error and on a non-2xx
  response.
- Fetch handler: returns the asset response unchanged; passes a trackable
  request to the provider through `ctx.waitUntil`; does not call the
  provider for an untracked request; still returns the asset response when
  `pageViewFrom` throws (the invariant); for `POST /pv` returns 204 and
  tracks a valid ping, returns 400 for an invalid body, and returns 204
  without tracking when the page HEAD is a 404, when `Sec-Fetch-Site` is
  `cross-site`, or when the user agent is a bot.
- `RouteTracker` (jsdom, `next/navigation` mocked): no request on mount; one
  POST to `/pv` with the new `url` and the previous page as `referrer` when
  the pathname changes; no request on a re-render with the same pathname.
- `contactItems`: the site link's href carries the resume tag for each
  medium and the display text is unchanged.

## Verification after deploy

1. Visit the site with and without an ad blocker; both visits appear in
   Umami with the correct country. "Correct" means a country that could not
   be the Worker's egress: check from a phone on cellular or a VPN exit
   abroad, or compare Umami's country breakdown with the zone analytics map
   for a day. A visit that "shows a country" is not enough.
2. Reload the page; the repeat visit (a 304) appears.
3. Click through to a second page without reloading; it appears in the
   pages list.
4. Open the resume PDF; `/resume.pdf` appears in the pages list.
5. Follow a tagged link; the campaign appears under UTM reporting.
6. Compare Umami's visits with zone analytics unique visitors for the same
   day; a large gap points at bot traffic, not blockers.

## Out of scope

- A privacy note on the site. Umami is cookieless and hashes the IP with a
  rotating salt; whether to say so on the site is a separate decision.
- Custom events beyond pageviews (outbound link clicks, theme toggles).
- A second provider implementation. The interface is designed for it; the
  file is written when a vendor is chosen.
- Workers Analytics Engine, Counterscale, or any self-run dashboard.
- Filtering by Cloudflare bot score, which is not available on the Free plan.
- Abuse protection for `/pv` beyond the same-origin tripwire.
