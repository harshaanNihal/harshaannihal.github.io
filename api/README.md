# The portfolio's API

A Cloudflare Worker (free plan) behind two things on the site: the contact form, which emails the owner, and the
visit counter, which counts without cookies. The site itself stays on GitHub Pages and calls this API.

- `POST /contact` takes the form. It checks the fields against `packages/contract`, drops bots (a honeypot field,
  a time trap, three messages an hour per visitor), stores the message in D1 for 90 days and emails it through
  Resend with Reply-To set to the sender. Without JavaScript the browser posts the form itself and is sent on
  to `/contact/sent/` or `/contact/error/` on the site.
- `POST /e` takes an event from the page's beacon: a page view, the page being left, or a click worth knowing
  about. It skips bots and browsers that send Global Privacy Control or Do Not Track. It stores the page, the
  referring site, campaign and ref tags, the country, coarse device details, the network's name, and a visitor
  hash that only holds for one day. It never stores an IP address.
- Cron jobs, just after midnight UTC: roll yesterday's events into daily totals, then delete raw events after 30
  days, network names in totals after 12 months, totals after 25 months, and messages after 90 days. Mondays at
  03:30 UTC (09:00 in India): the weekly digest email.

How visitors are told apart, and why that needs no cookie banner, is in `src/visitor.ts`. What the site tells
visitors about all this is `site/src/pages/privacy/index.astro`; keep the two in step.

## Set it up (once)

You need a Cloudflare account and a Resend account, both free.

1. Sign in to Cloudflare from this folder: `npx wrangler login`.
2. Create the database and the key-value store, then paste each id it prints into `wrangler.jsonc`:
   ```sh
   npx wrangler d1 create portfolio          # database_id
   npx wrangler kv namespace create KV       # the kv_namespaces id
   ```
3. Create the tables: `npx wrangler d1 migrations apply DB --remote`.
4. In Resend, sign up with the address that should receive the messages, and create an API key. With no domain,
   Resend's test sender (`onboarding@resend.dev`) delivers only to that account's own address, which is the one
   this needs. Then store both as Worker secrets:
   ```sh
   npx wrangler secret put RESEND_API_KEY
   npx wrangler secret put MAIL_TO           # the address on your Resend account
   ```
5. Deploy: `npx wrangler deploy`. It prints the API's address, `https://portfolio-api.<your-subdomain>.workers.dev`.
6. In the GitHub repository's settings, under Secrets and variables, then Actions, add:
   - the variable `API_URL`, set to that address. The site build reads it, so the next deploy shows the form and
     starts counting;
   - the secrets `CLOUDFLARE_API_TOKEN` (a token with the "Edit Cloudflare Workers" template, plus D1 edit) and
     `CLOUDFLARE_ACCOUNT_ID`, so `.github/workflows/api.yml` deploys every change on master.

A domain later (about $10 a year) would let Resend send from your own address to anyone, and could serve the API
at `api.<domain>`.

## Work on it

```sh
npx wrangler d1 migrations apply DB --local    # once: the local database
npm run dev:api                                # from the repository root: the Worker on http://localhost:8787
PUBLIC_API_URL=http://localhost:8787 npm run dev   # the site, using it
npm test                                       # the API's tests, in the Workers runtime
npm run check -w api                           # types
```

Locally there are no emails unless `api/.dev.vars` sets `RESEND_API_KEY` and `MAIL_TO`. The beacon ignores
headless browsers (they look like bots), so test the counter in a normal browser.

## Ask it things

The digest covers the week. For anything else, query D1 directly:

```sh
npx wrangler d1 execute DB --remote --command "SELECT day, value, visitors FROM daily WHERE dimension = 'country' ORDER BY day DESC LIMIT 20"
npx wrangler d1 execute DB --remote --command "SELECT ref, count(DISTINCT day || visitor) AS visits FROM events WHERE ref IS NOT NULL GROUP BY ref"
npx wrangler d1 execute DB --remote --command "SELECT received_at, name, email FROM messages ORDER BY received_at DESC"
```

A visitor is a day's hash, so `day || visitor` counts visits and a single `visitor` never spans two days.

## Files

| Path | What it holds |
| --- | --- |
| `src/index.ts` | The routes, and the cron entry |
| `src/contact.ts`, `src/events.ts` | The two endpoints |
| `src/visitor.ts` | The daily salt and the visitor hash |
| `src/agent.ts` | Bots, device, browser and system from the User-Agent |
| `src/networks.ts` | Sorting networks into cloud, home and business; edit its lists when the digest shows one in the wrong place |
| `src/report.ts`, `src/digest.ts`, `src/cron.ts` | Totals, the weekly email, and the scheduled jobs |
| `migrations/` | The D1 schema |
| `test/` | Tests, run inside workerd with a local D1 and KV |
