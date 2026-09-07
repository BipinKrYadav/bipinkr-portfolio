# Changelog & Operations

---

## Running the site

```bash
npm install     # once
npm run dev     # http://localhost:3000
```

```bash
npm run build   # production build + static export into /out
```

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # next lint
```

`npm run build` runs lint and type-checking as part of the build and fails on
either (`next.config.mjs` sets `ignoreBuildErrors: false` and
`ignoreDuringBuilds: false`).

---

## Configuration

Copy `.env.example` to `.env.local` and fill in what you have. Every value is
optional and every unset value hides its feature rather than faking it.

```bash
NEXT_PUBLIC_SITE_URL=https://bipinkr.in
NEXT_PUBLIC_FORM_ENDPOINT=
NEXT_PUBLIC_WHATSAPP_NUMBER=      # digits only, e.g. 919876543210
NEXT_PUBLIC_CONTACT_EMAIL=
NEXT_PUBLIC_LINKEDIN_URL=
NEXT_PUBLIC_RESUME_FILE=bipin-kumar-resume.pdf
NEXT_PUBLIC_ANALYTICS_PROVIDER=   # "ga" | "plausible" | empty
NEXT_PUBLIC_GA_ID=
NEXT_PUBLIC_PLAUSIBLE_DOMAIN=
```

These are compiled into the static bundle and are therefore **public**. Never
put a secret here.

### Contact form endpoint

The site is a static export, so the form posts directly to a third-party
endpoint. Any service that accepts a `multipart/form-data` POST and returns
JSON works — Formspree, Web3Forms, Basin, Getform.

1. Create a form on the provider and copy its POST URL.
2. Set `NEXT_PUBLIC_FORM_ENDPOINT` to it.
3. Rebuild.

Until then the form renders a visible setup notice and refuses to submit. It
never reports a successful send that did not happen.

### Resume

Put the PDF in `public/documents/` and set `NEXT_PUBLIC_RESUME_FILE` to its
filename. `/resume` checks for the file at build time: present → inline
preview plus download button; absent → a clean placeholder state.

### Analytics

Leave `NEXT_PUBLIC_ANALYTICS_PROVIDER` empty and no analytics script loads at
all. Set it to `ga` or `plausible` with the matching ID to switch one on.

Events already wired through `lib/analytics.ts`:

`audit_cta_click` · `whatsapp_click` · `case_study_view` · `resume_click` ·
`contact_form_start` · `contact_form_submit` · `linkedin_click`

`track()` is a no-op when no provider is configured and never throws, so an
analytics failure cannot break a form submission.

---

## Deploying to Hostinger

1. `npm run build` — output lands in `/out`.
2. Upload **the contents of `/out`** (not the folder itself) into
   `public_html` via hPanel File Manager or FTP.
3. Enable **show hidden files** in the File Manager so `.htaccess` is
   uploaded with everything else. It is required for the custom 404, the
   Open Graph image MIME type, compression and caching.
4. Enable SSL in hPanel, then uncomment the force-HTTPS block at the bottom
   of `public/.htaccess` and re-upload it.
5. Point the `bipinkr.in` DNS at Hostinger if not already done.

To redeploy, rebuild and replace the files. There is no build step or Node
runtime on the server.

### Post-deploy checks

- `https://bipinkr.in/sitemap.xml` loads and lists 11 URLs
- `https://bipinkr.in/robots.txt` loads and references the sitemap
- A deliberately wrong URL shows the custom 404
- `https://bipinkr.in/opengraph-image` returns `Content-Type: image/png`
- Submit the contact form once end to end
- Run the URL through a social card validator

---

## Build history

### Initial build

Complete Next.js 15 + TypeScript + Tailwind portfolio, static export.

**Architecture** — App Router, `output: 'export'`, `trailingSlash: true`,
unoptimised images, `@/*` path alias. No CMS, no backend, no database.

**Routes (12)** — `/`, `/case-studies`, four case study pages, `/services`,
`/about`, `/contact`, `/resume`, `/privacy`, custom 404. Plus generated
`/sitemap.xml`, `/robots.txt` and the Open Graph card.

**Design system** — warm off-white ground, charcoal ink scale, single deep
teal accent, dark contrast bands. Source Serif 4 + Inter, self-hosted.
Editorial display scale with fluid `clamp()` sizing.

**Components (24)** — layout (`Header`, `Footer`, `AnalyticsScripts`), UI
(`Button`, `Container`, `Section`, `SectionHeading`, `EvidenceLabel`,
`Breadcrumbs`), data (`MetricCard`/`MetricGrid`, `DataTable`, `CohortBars`,
`ComparisonBlock`, `StateComparison`, `ScaleFunnel`, `FlowDiagram`), blocks
(`ProofStrip`, `CaseStudyCard`, `CaseStudyHero`, `CaseStudyLayout`,
`ServiceCard`, `CTASection`, `ProcessSteps`, `InsightBlock`,
`LimitationBlock`, `RecruiterCTA`, `TableOfContents`), contact
(`ContactForm`, `WhatsAppButton`).

**Evidence system** — seven-grade vocabulary rendered as visible chips, with
`verified` and `reported` deliberately weighted differently so they cannot be
confused. Documented in `docs/evidence-register.md` and
`docs/claims-ledger.md`.

**Fixes made during the build**

| Issue | Resolution |
|---|---|
| `??` mixed with `\|\|` without parens in `Button.tsx` | Parenthesised; SWC parse error resolved |
| `opengraph-image`, `robots.ts`, `sitemap.ts` failed under `output: 'export'` | Added `export const dynamic = 'force-static'` to each |
| OG renderer could not resolve the `₹` glyph | Replaced the two currency metrics on the card with non-currency ones |
| OG card exports as an extensionless file, which Apache mis-types | `ForceType image/png` rule added to `public/.htaccess` |
| Titles double-suffixed on About / Contact / Resume | `buildMetadata` now emits an absolute title when the title already contains the site name |

### Continuation pass (after an interrupted session)

The first session was cut short by a machine shutdown, leaving `docs/` empty
and the last build unverified. Resumed from the existing files rather than
rebuilding.

| Item | Resolution |
|---|---|
| `docs/` was empty — the five documentation files were never written | Written: evidence register, claims ledger, case study data, website content, this changelog |
| Page titles carried a duplicated `\| Bipin Kumar` suffix | Fixed in `lib/seo.ts`; all titles now match the brief exactly |
| Case study 4 was the only one without an explicit limitations block | Added `limitationsIntro`, `limitations` (10 items) and `limitationsClosing`, rendered via `LimitationBlock`; the `Limitation` chip now appears on all four |
| Required-field error read "What are you trying to solve? is required." | Added `ERROR_NAMES` so the message reads "A short description of the problem is required." |

**Verification run in this pass**

- `npm run build` — exit 0, 17 routes exported, no warnings
- `npx tsc --noEmit` — exit 0
- `npx next lint` — no ESLint warnings or errors
- Every internal link resolves to an exported route (all use trailing slashes)
- Sitemap lists 11 URLs; robots.txt references it; 404 excluded from both
- Zero horizontal overflow and exactly one `<h1>` on all 11 pages at 375px
- Mobile nav opens/closes, locks body scroll, exposes all 6 links + the CTA
- Contact form: 5 required + 3 optional fields, all labelled, `role="alert"`
  errors, `aria-invalid`, every `aria-describedby` resolving, focus moves to
  the first invalid field
- Skip link is the first focusable element and targets a real `<main>`
- Blocked claims and PII: zero matches across `app/`, `components/`, `content/`

### Tracking & conversion architecture

Added a measurement layer on top of the finished site. No page design was
changed apart from one addition noted below.

**New** — `lib/tracking/` (config, dataLayer, consent, attribution, events,
lead), `components/tracking/` (TrackingScripts, TrackingProvider,
CaseStudyView, LeadConversion), `components/blocks/MobileCtaBar.tsx`,
`app/thank-you/`, `app/how-this-site-is-tracked/`, `content/pages/tracking.ts`,
`docs/tracking-architecture.md`, `docs/tracking-qa.md`.

**Replaced** — the old `NEXT_PUBLIC_ANALYTICS_PROVIDER` / `GA_ID` /
`PLAUSIBLE_DOMAIN` mechanism and `components/layout/AnalyticsScripts.tsx`,
superseded by the GTM-first architecture. `lib/analytics.ts` remains as a thin
shim so every existing `Button` call site works unchanged.

**Changed** — `ContactForm` now fires `contact_form_submit` when the request
begins and redirects to `/thank-you` only after the endpoint confirms;
`app/layout.tsx` mounts the tracking runtime; the privacy page gained honest
sections on advertising measurement, consent and campaign attribution; CTA
`location` values were normalised to one taxonomy.

**Conversion optimisation** — the header CTA is hidden below the `sm`
breakpoint, so on a phone the primary action sat two taps behind the menu for
the whole page. `MobileCtaBar` closes that gap: below `lg`, after the hero,
hidden on `/contact` and `/thank-you`. No urgency, scarcity or countdown.
Delete one line in `app/layout.tsx` to remove it.

**Bug found and fixed during QA** — `contact_form_start` fired twice because
its guard used `useState`; two focus events both read the pre-update value.
Now a `useRef`.

**Verified in this pass**

- Build, typecheck and lint all exit 0; 19 routes; no warnings
- With no IDs: zero third-party scripts, zero cookies, `dataLayer` still queues
- With IDs: GTM loads, consent defaults precede it in `<head>`, platform IDs
  reach the dataLayer, direct loaders correctly suppressed
- Without GTM but with GA4/Pixel IDs: direct fallback loaders fire
- A malformed `NEXT_PUBLIC_GTM_ID` containing a `<script>` payload is rejected
  rather than interpolated
- `generate_lead` fires once on a confirmed submission carrying `event_id`,
  service, spend band and the UTM values captured four navigations earlier
- `generate_lead` does **not** fire on: validation failure, submit click,
  missing endpoint, direct `/thank-you` visit, or refresh after converting
- No PII in `dataLayer` — checked with realistic values in all six fields
- Zero horizontal overflow and one `<h1>` across all 14 exported routes
- No case study figure, label or evidence wording changed

### GTM container installed

Tag Assistant reported "Google tags found: 0" against bipinkr.in. Two separate
causes, both diagnosed:

1. **The site is not deployed.** `bipinkr.in` still serves Hostinger's default
   "You Are All Set to Go!" placeholder — the portfolio has never been
   uploaded. No code change can make Tag Assistant pass until `/out` is on the
   server.
2. **No container ID was configured at build time.** Only `.env.example`
   existed, which Next.js does not load, so `NEXT_PUBLIC_GTM_ID` was empty and
   `TrackingScripts` correctly rendered nothing. The GTM code was already
   present and working — it had no ID to use.

**Changes**

| File | Change |
|---|---|
| `.env.production` | **New, committed.** `NEXT_PUBLIC_GTM_ID=GTM-NTDV5NHD`. GA4 / Ads / Pixel IDs deliberately left empty. |
| `.gitignore` | Comment explaining why `.env.production` is tracked. |
| `.env.example` | Documents where production values live and why `NEXT_PUBLIC_GA4_ID` must stay empty while GTM is in use. |
| `components/tracking/TrackingProvider.tsx` | Skips the **initial** `page_view` push; emits only on client-side route changes. |
| `docs/tracking-architecture.md` | Current-state note; page-view ownership table replaces the old "turn the Google tag's page view off" instruction. |

No component, page, style or case-study content was touched.

**Why `.env.production` rather than `.env.local`:** `.env.local` is untracked,
which is exactly how the ID went missing — a build on another machine produced
a site with no tag manager. A GTM container ID is public by definition (it
ships in the HTML), so committing it is safe and makes builds reproducible.

**Page-view ownership.** The container's Google tag fires on
"Initialization - All Pages" and sends its own page view on every document
load. The site now pushes `page_view` only for client-side route changes,
which a static export performs without a document load. Full load = the Google
tag; SPA navigation = this push. Neither can double-count.

**Verified**

- Build / typecheck / lint all exit 0; Next reports `Environments: .env.production`
- `gtm.js?id=GTM-NTDV5NHD` present exactly once on every exported page
- `window.google_tag_manager['GTM-NTDV5NHD']` initialises in the browser
- 0 `page_view` pushes on first load; exactly 1 per client-side navigation
- No `gtag/js` and no Meta Pixel anywhere in the export
- `G-XDGM90H8WH` appears nowhere in the source or the build
- Regression: `case_study_view`, the `generate_lead` guards and the
  direct-visit `/thank-you` state all still behave correctly

**Outstanding — the GA4 tag is not in the published container.** Fetching
`https://www.googletagmanager.com/gtm.js?id=GTM-NTDV5NHD` returns a container
with no reference to `G-XDGM90H8WH`. The tag appears to exist in the GTM
workspace but has not been submitted and published, so it will not fire even
once the site is deployed. Publish the container.

---

## Known TODOs

| # | Item | Blocking |
|---|---|---|
| 1 | Set `NEXT_PUBLIC_WHATSAPP_NUMBER` | WhatsApp CTAs are hidden — this is the brief's second conversion path |
| 2 | Set `NEXT_PUBLIC_FORM_ENDPOINT` | Contact form cannot submit |
| 3 | Set `NEXT_PUBLIC_CONTACT_EMAIL` and `NEXT_PUBLIC_LINKEDIN_URL` | Email + LinkedIn buttons hidden |
| 4 | Add the resume PDF to `public/documents/` | `/resume` shows the placeholder state |
| 5 | Decide on client permission to name projects publicly | See `docs/claims-ledger.md` §5 — one flag in `content/anonymise.ts` |
| 6 | Optional: professional portrait | Currently typography and data visuals carry all the visual weight, by design |
| 7 | Create the GTM container, GA4 property, Google Ads conversion action and Meta Pixel, then set the four IDs | No measurement is collected until then — see `docs/tracking-architecture.md` §6–9 |
| 8 | Connect a consent platform and set `NEXT_PUBLIC_CONSENT_MODE=required` before enabling advertising tags for any audience where consent is required | The Consent Mode plumbing is built; the banner is not |
| 9 | Optional: server-side Meta CAPI | Needs a backend and a secret store; `event_id` is already emitted for deduplication |

Nothing in this list blocks deployment. The site builds and deploys as it
stands; each item unlocks a feature that is currently hidden rather than
broken.
