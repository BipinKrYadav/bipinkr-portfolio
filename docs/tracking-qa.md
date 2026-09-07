# Tracking QA Checklist

Practical verification steps. Work through these in order the first time any
platform is connected, and re-run sections 3–6 after any change to the GTM
container.

> **Status: not yet run against live platforms.** No container, property,
> conversion action or pixel exists. Sections 1–2 have been verified against
> the current build; everything from section 3 onward requires real IDs and
> is untested by definition.

---

## 0. Before you start

```bash
cp .env.example .env.local     # fill in the IDs you have
npm run build
npx serve out -l 4321          # serve the real static export, not `next dev`
```

Test the **exported** site. `next dev` behaves differently around script
strategies, and the export is what actually deploys.

For a verbose local run, set `NEXT_PUBLIC_TRACKING_DEBUG=true` and use
`npm run dev` — every `dataLayer.push` is mirrored to the console. The flag is
ignored in production builds.

---

## 1. With NO IDs configured (the default state)

Verify the site is genuinely inert before configuring anything.

- [ ] `npm run build` succeeds with every tracking variable empty
- [ ] View source: no `googletagmanager.com`, no `connect.facebook.net`
- [ ] DevTools → Network, filter `google|facebook|gtm`: **zero** requests
- [ ] DevTools → Application → Cookies: no `_ga`, `_gcl_au`, `_fbp`
- [ ] Console: `window.dataLayer` exists and is an array
- [ ] Console: `window.dataLayer.length > 0` — events queue with no container
- [ ] Click a CTA, submit the form: no errors in the console
- [ ] `/how-this-site-is-tracked` reports everything as "Not configured"

The last one is generated from the build config, so it is a real check rather
than a copy check.

---

## 2. dataLayer behaviour (no platform needed)

Open the console and confirm each push. `dataLayer` is append-only, so
`window.dataLayer.map(e => e.event)` shows the sequence.

- [ ] Load any page → `page_view` with `page_path`, `page_title`
- [ ] Navigate via a nav link → a **second** `page_view` with the new path
- [ ] Open a case study → `case_study_view` with `case_study_slug` + title
- [ ] Click "Get a Free Ad Audit" → `audit_cta_click` with `location`
- [ ] Click a WhatsApp CTA → `whatsapp_click` (needs a configured number)
- [ ] Focus a form field → `contact_form_start`, **once only**
- [ ] Focus another field → no second `contact_form_start`
- [ ] Arrive at `/?utm_source=test&utm_medium=qa&utm_campaign=check`, then
      navigate away → `sessionStorage.bk_attribution` still holds the values

### Negative checks — these must NOT produce `generate_lead`

- [ ] Submitting with empty fields (validation fails)
- [ ] Clicking the submit button itself
- [ ] A submission that returns a non-2xx response
- [ ] Submitting with `NEXT_PUBLIC_FORM_ENDPOINT` empty
- [ ] Opening `/thank-you` directly in a new tab
- [ ] Refreshing `/thank-you` after a real conversion

To simulate a failed endpoint, point `NEXT_PUBLIC_FORM_ENDPOINT` at a URL that
returns 500 and submit. Expect `contact_form_submit` **and no**
`generate_lead`.

### PII check — run this every time the form changes

```js
JSON.stringify(window.dataLayer).match(/@|\+91|[A-Z][a-z]+ [A-Z][a-z]+/g)
```

- [ ] No email address, phone number, personal name, company name or message
      text appears anywhere in `dataLayer`

---

## 3. GTM Preview

GTM → **Preview** → enter the site URL.

- [ ] Tag Assistant connects and the container loads
- [ ] Summary panel lists every event from section 2
- [ ] Each event's **Variables** tab shows the expected parameters populated
- [ ] `tracking_config` fires early, carrying the platform IDs
- [ ] Each tag fires on its intended event and **only** that event
- [ ] Complete a real submission → `generate_lead` appears exactly once
- [ ] `generate_lead` carries `event_id`, `service`, and UTM values when the
      session started on a campaign URL
- [ ] Refresh `/thank-you` → no second `generate_lead`

---

## 4. GA4 DebugView

GA4 → Admin → **DebugView**. GTM Preview enables debug mode automatically.

- [ ] Events arrive with the names from the taxonomy, unmodified
- [ ] `page_view` appears **once** per page — if twice, the GA4 Configuration
      tag is still sending its own; turn that setting off
- [ ] Client-side navigation produces a new `page_view`
- [ ] Custom parameters are present (`location`, `case_study_slug`, …)
- [ ] `generate_lead` is marked as a key event
- [ ] Realtime report shows the events within a minute or two
- [ ] No `(not set)` where a parameter was expected

Custom dimensions must be registered in GA4 before they appear in reports;
DebugView shows them immediately either way.

---

## 5. Meta Events Manager

Events Manager → your Pixel → **Test Events**.

- [ ] `PageView` fires on load
- [ ] `Lead` fires on a real submission, once
- [ ] `Lead` carries an `event_id`
- [ ] No PII in the payload
- [ ] Diagnostics tab shows no errors or warnings

Meta Pixel Helper (Chrome extension) is a fast second opinion.

**When CAPI is added later:** confirm Events Manager shows the browser and
server events **deduplicated** — one `Lead`, with both sources listed — rather
than two separate conversions.

---

## 6. Google Ads conversion diagnostics

Google Ads → Goals → Conversions → your action → **Diagnostics**.

- [ ] Status moves from "No recent conversions" to "Recording conversions"
      (allow up to 24 hours after the first real submission)
- [ ] Conversion Linker tag is present and firing on all pages
- [ ] Tag diagnostics report no errors
- [ ] The conversion action's counting setting is deliberate — **One** for a
      lead form, not "Every"
- [ ] Attribution model is set intentionally
- [ ] No conversion value is set unless there is real evidence for one

This is precisely the diagnostic surface the measurement audit case study is
about. Take its warnings seriously here.

---

## 7. Consent mode (only when `NEXT_PUBLIC_CONSENT_MODE=required`)

- [ ] View source: the consent script is in `<head>`, **before** the GTM
      snippet
- [ ] On load, `google_tag_data.ics` shows analytics/ad storage denied
- [ ] No `_ga` / `_gcl_au` / `_fbp` cookie is set before consent
- [ ] `window.__bkTrackingConsent('granted')` in the console → cookies appear
      and held tags fire
- [ ] A `consent_update` event appears in the dataLayer
- [ ] `window.__bkTrackingConsent('denied')` behaves correspondingly

---

## 8. Regression checks after any tracking change

- [ ] `npm run build` — exit 0
- [ ] `npx tsc --noEmit` — exit 0
- [ ] `npx next lint` — no errors
- [ ] All 13 routes still render, including `/thank-you`
- [ ] Sitemap lists 12 URLs; `/thank-you` is **absent** and `noindex`
- [ ] No horizontal overflow at 375px on any page
- [ ] Mobile CTA bar appears after the hero and does not cover the footer
- [ ] No case study figure, label or evidence wording has changed

---

## 9. Sign-off

Do not describe a platform as "configured" until its row here is complete.

| Platform | ID set | Tags built | Verified in preview | Recording |
|---|---|---|---|---|
| Google Tag Manager | ☐ | ☐ | ☐ | ☐ |
| GA4 | ☐ | ☐ | ☐ | ☐ |
| Google Ads | ☐ | ☐ | ☐ | ☐ |
| Meta Pixel | ☐ | ☐ | ☐ | ☐ |
| Meta CAPI | n/a — not implemented | | | |
| Consent platform | ☐ | ☐ | ☐ | ☐ |
