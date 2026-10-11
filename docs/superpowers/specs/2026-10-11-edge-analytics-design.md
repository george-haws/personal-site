# Edge analytics: server-side pageviews with a swappable provider

Date: 2026-10-11

## Goal

See who is visiting the site: which pages, from which referrers and
countries, and whether a specific tagged link (a LinkedIn post, a message to
one recruiter, the resume PDF) was followed. Tracking must survive ad
blockers, cost nothing at the site's traffic level, and leave the analytics
vendor replaceable without touching the site.

## Decisions

- Pageviews are recorded at the edge by a Cloudflare Worker that runs in
  front of the static assets, not by a script in the browser. Nothing is
  loaded client-side, so ad blockers cannot interfere and the site's
  Content-Security-Policy stays as it is.
- The Worker sends each pageview to a vendor's server-side events API. The
  first vendor is Umami Cloud's free Hobby plan (100k events a month, one
  site, six months of history). The vendor's dashboard is the only UI.
- The vendor sits behind a one-function provider interface. Swapping to a
  paid vendor (Plausible, Pirsch, or a self-hosted Umami) is one new provider
  file and a config change. Alternatives considered: proxying a vendor's
  client script through the Worker (weaker blocker resistance, CSP changes,
  vendor-specific scripts), and Workers Analytics Engine with Counterscale
  (free and unblockable, but the dashboard becomes ours to run and a later
  move to a paid vendor is a rewrite).
- Links the owner controls carry standard UTM parameters. Every vendor
  parses them, so per-link and per-person attribution needs no custom code.
- Analytics can never break the site: the asset response is sent unchanged
  before tracking runs, and every tracking failure is logged and dropped.
- Free Cloudflare Web Analytics was rejected because its beacon loads from a
  Cloudflare hostname on the standard block lists and it discards query
  strings, so tagged links would not register.

## Research summary

Findings from the research that this design rests on. Vendor terms change;
these were current on 2026-10-09.

- Cloudflare zone analytics on the Free plan shows requests, bandwidth,
  unique visitors, and a country map, with no path or referrer breakdown.
  It stays on as a blocker-proof sanity check of total traffic.
- Umami's `POST /api/send` accepts `ip` and `userAgent` in the payload,
  falling back to request headers when absent (`getClientInfo` in
  `src/lib/detect.ts` of the Umami source). The endpoint requires a
  User-Agent header and no authentication. Umami drops events whose user
  agent the isbot library flags. Umami Cloud's endpoint is
  `https://gateway.umami.is/api/send`.
- Plausible's `POST /api/event` takes the visitor IP in `X-Forwarded-For`
  and the user agent in the User-Agent header and extracts UTM parameters
  from the `url` field. Pirsch is server-side by design. Both fit the same
  provider interface.
- Workers Free allows 100k requests a day. The Worker runs only for page
  navigations, not for Next's build output, so a page costs one Worker
  request.

## Request flow

1. A request reaches the Worker when its path is not under `/_next/`. Next's
   chunks, fonts, and images stay on the asset-first path and never invoke
   the Worker.
2. The Worker fetches the asset through the `ASSETS` binding and keeps the
   response to return unchanged.
3. The request is trackable when all of these hold: the method is GET; the
   asset response status is 200; and the request is either a document
   navigation (`Sec-Fetch-Dest: document`, or an `Accept` header that
   includes `text/html` when that header is absent) or a request for
   `/resume.pdf`.
4. A trackable request whose user agent the isbot library flags is dropped.
5. Otherwise the Worker builds a pageview record, hands
   `provider.track(record)` to `ctx.waitUntil`, and returns the asset
   response. Tracking never delays or modifies the response.

Not-found responses are not tracked, which drops most scanner noise. The
PDF is tracked as an ordinary pageview of `/resume.pdf`, so it appears in
the pages list and inherits the session's UTM tags.

## Pageview record

One plain object, vendor-neutral. Country is deliberately absent; each
vendor derives it from the IP.

```ts
type PageView = {
  url: string;        // full URL including the query string, so UTM tags survive
  hostname: string;
  referrer: string | null;   // Referer header, or null
  userAgent: string;
  ip: string;         // CF-Connecting-IP
  language: string | null;   // Accept-Language, or null
};
```

## Provider interface

```ts
type Provider = { track(view: PageView): Promise<void> };
```

Providers never throw. Each wraps its network call, logs failures with
`console.error`, and resolves. A factory `createProvider(env)` reads
`env.ANALYTICS_PROVIDER` and returns the matching provider; an unset or
unknown value returns a no-op provider and logs a warning once, so local
preview sends nothing unless opted in.

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
does. The first task after deploying is to open the site and confirm the
visit shows a country in the dashboard. If it does not, the provider sends
the IP in an `X-Forwarded-For` header instead, which the same `getIpAddress`
path reads.

## Configuration

`wrangler.jsonc` gains:

- `main: "worker/index.ts"`
- `assets.binding: "ASSETS"`
- `assets.run_worker_first: ["/*", "!/_next/*"]`
- `vars.ANALYTICS_PROVIDER: "umami"`
- `vars.UMAMI_WEBSITE_ID: "<id from the Umami dashboard>"`

Neither value is secret: an Umami website ID is visible in every
client-side install. `UMAMI_ENDPOINT` is optional and only set for a
self-hosted Umami. No wrangler secrets are needed for this provider.

The Cloudflare git integration's build and deploy commands are unchanged.

## Files

- `worker/index.ts`: the fetch handler. Exports `default { fetch }` and the
  pure helpers it uses so they can be unit tested: `isTrackable(request,
  response)` and `pageViewFrom(request)`.
- `worker/provider.ts`: the `PageView` and `Provider` types,
  `createProvider(env)`, and the no-op provider.
- `worker/providers/umami.ts`: the Umami provider.
- `worker/*.test.ts`: unit tests (see Tests).
- `worker-configuration.d.ts`: generated by `wrangler types`, committed, and
  regenerated when bindings or vars change. Declares `Env` with `ASSETS`,
  `ANALYTICS_PROVIDER`, `UMAMI_WEBSITE_ID`, and `UMAMI_ENDPOINT`.
- `vitest.config.mts`: `include` gains `worker/**/*.test.ts`.
- `package.json`: `isbot` as a dependency; a `preview` script that builds
  the export and runs `wrangler dev`; `types` script for `wrangler types`.
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
paragraph; the one-time Umami Cloud setup (create the free account and a
website for `ghaws.dev`, paste the website ID into `wrangler.jsonc`); the
tagging table above; the two standing links to update once (the website
field on the LinkedIn and GitHub profiles); and how to swap providers (add
a file under `worker/providers/`, a case in the factory, and change
`ANALYTICS_PROVIDER`).

## Tests

Unit tests under `worker/`, no network and no Workers runtime. The fetch
handler is exercised with a stub `ASSETS` binding and a recording provider.

- `isTrackable`: a document GET with a 200 asset is tracked; `/resume.pdf`
  is tracked; a request under `/_next/` is not (defensive, even though
  routing excludes it); a non-GET is not; a 404 asset is not; a request
  whose user agent isbot flags is not.
- `pageViewFrom`: builds the record from a request carrying
  `CF-Connecting-IP`, `Referer`, `Accept-Language`, and a query string, and
  yields null for absent referrer and language.
- `createProvider`: returns the Umami provider for `"umami"` and the no-op
  provider for unset and unknown values.
- Umami provider: against a mocked `fetch`, sends the documented body and
  headers; resolves without throwing on a network error and on a non-2xx
  response.
- Fetch handler: returns the asset response unchanged; passes a trackable
  request to the provider through `ctx.waitUntil`; does not call the
  provider for an untracked request.
- `contactItems`: the site link's href carries the resume tag for each
  medium and the display text is unchanged.

## Verification after deploy

1. Visit the site with and without an ad blocker; both visits appear in
   Umami with a country.
2. Open the resume PDF; `/resume.pdf` appears in the pages list.
3. Follow a tagged link; the campaign appears under UTM reporting.
4. Compare Umami's visits with zone analytics unique visitors for the same
   day; a large gap points at bot traffic, not blockers, since nothing here
   can be blocked.

## Out of scope

- A privacy note on the site. Umami is cookieless and hashes the IP with a
  rotating salt; whether to say so on the site is a separate decision.
- Custom events beyond pageviews (outbound link clicks, theme toggles).
- A second provider implementation. The interface is designed for it; the
  file is written when a vendor is chosen.
- Workers Analytics Engine, Counterscale, or any self-run dashboard.
- Filtering by Cloudflare bot score, which is not available on the Free plan.
