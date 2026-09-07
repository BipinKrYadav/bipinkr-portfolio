# Tracking & Conversion Architecture

How measurement is wired on bipinkr.in, what each event means, and what has
to be configured before any of it collects data.

> **Current state.** The GTM container `GTM-NTDV5NHD` is installed and loads
> site-wide, configured in `.env.production`. Inside it, GA4 is served by the
> "Google tag – GA4 – Bipin Kumar Portfolio" tag (`G-XDGM90H8WH`) on the
> Initialization - All Pages trigger.
>
> Google Ads and Meta Pixel are **not** configured — no conversion action and
> no pixel exists yet. `NEXT_PUBLIC_GA4_ID`, `NEXT_PUBLIC_GOOGLE_ADS_ID` and
> `NEXT_PUBLIC_META_PIXEL_ID` are intentionally left empty so nothing loads
> alongside the container.

---

## 1. Design principles

| Principle | How it is enforced |
|---|---|
| One tag-management layer | GTM is the only intended loader. GA4, Google Ads and Meta are configured as tags inside it. |
| No hard-coded platform scripts in components | Every script lives in `components/tracking/TrackingScripts.tsx`. Nothing else loads a tag. |
| One transport | Every event goes through `window.dataLayer`. `lib/tracking/dataLayer.ts` is the only file that calls `.push()`. |
| A closed event taxonomy | `TrackingEvent` in `lib/tracking/events.ts` is a union type. Components cannot invent event names. |
| Nothing loads without an ID | An unset or malformed ID means that platform is not loaded at all. |
| Tracking never breaks the page | Every function is wrapped and swallows its own errors. |
| No PII, ever | Only categorical fields and campaign parameters reach an event. |

---

## 2. File map

```
lib/tracking/
├── config.ts        env → validated IDs, feature flags
├── dataLayer.ts     the ONLY window.dataLayer.push in the codebase
├── consent.ts       Consent Mode v2 defaults + CMP integration point
├── attribution.ts   UTM / click-id capture, session-scoped
├── events.ts        the event taxonomy — one typed helper per event
└── lead.ts          form → /thank-you handoff + duplicate-fire guard

components/tracking/
├── TrackingScripts.tsx    GTM + fallback loaders (+ ConsentDefaults)
├── TrackingProvider.tsx   dataLayer init, attribution, page_view
├── CaseStudyView.tsx      case_study_view
└── LeadConversion.tsx     generate_lead — the only place it fires

lib/analytics.ts     thin compatibility shim for the existing track() API
```

---

## 3. Load order

1. **`ConsentDefaults`** — inline `<script>` in `<head>`. Sets Consent Mode v2
   defaults to *denied*. Only when `NEXT_PUBLIC_CONSENT_MODE=required`.
   It is a blocking inline script rather than `next/script` because consent
   defaults must execute before any tag evaluates.
2. **`tracking_config`** — pushes the GA4 / Google Ads / Meta IDs into the
   dataLayer so GTM can read them as variables. The container therefore holds
   no hard-coded IDs and works unchanged across environments.
3. **GTM container** — `afterInteractive`.
4. **Direct loaders** — `gtag.js` and/or the Meta Pixel, **only when no GTM
   container is configured**. This is a fallback, not the intended path.

With no IDs set, steps 1–4 render nothing.

### The `<noscript>` GTM iframe

Deliberately omitted. Every conversion on this site is a JavaScript event, so
the iframe cannot record any of them; it would only add a third-party request
for visitors who cannot be measured anyway.

---

## 4. Event taxonomy

| Event | Fires when | Key parameters |
|---|---|---|
| `page_view` | Initial load and every client-side route change | `page_path`, `page_title`, `page_location` |
| `case_study_view` | A case study page is opened | `case_study_slug`, `case_study_title` |
| `audit_cta_click` | Any "Get a Free Ad Audit" CTA is clicked | `location` |
| `whatsapp_click` | Any WhatsApp CTA is clicked | `location` |
| `contact_form_start` | First focus of a contact form field | `form_id` |
| `contact_form_submit` | Validation passed, request sent to the endpoint | `form_id`, `service` |
| `generate_lead` | **The endpoint confirmed the submission** | `event_id`, `service`, `ad_spend_band`, `lead_type`, UTM params |
| `resume_click` | Resume download | `location` |
| `linkedin_click` | LinkedIn link followed | `location` |

### `location` values

`hero` · `home_final` · `navigation` · `case_study` · `case_studies_index` ·
`services` · `about` · `contact` · `resume` · `privacy` · `tracking` ·
`mobile_bar` · `thank_you` · `footer`

One event name with a `location` parameter, rather than a separate event per
button. Keeps the GA4 event list short and lets one GTM trigger cover all
placements.

### Important: page_view responsibilities

Page views are split between two owners so neither double-counts:

| Navigation | Who records it |
|---|---|
| Full document load | The Google tag on **Initialization - All Pages** (its automatic page view) |
| Client-side route change | This site's `page_view` dataLayer push |

`TrackingProvider` therefore **skips the very first page view** and pushes only
on subsequent route changes. A static export navigates without a document
load, so those views are invisible to the tag platform and would otherwise go
unrecorded entirely.

**Leave the Google tag's automatic page view ON.** To capture SPA navigations
in GA4, add a **GA4 Event tag** named `page_view` triggered on the *custom
event* `page_view`. Because the first load never pushes that event, the two
cannot collide.

---

## 5. Conversion definitions

### Primary conversion: `generate_lead`

**Definition:** a contact form submission that the form endpoint returned a
success response for.

It fires from exactly one place — `components/tracking/LeadConversion.tsx`, on
`/thank-you`. It **cannot** fire on any of the following:

- opening or focusing the form
- clicking any CTA, including WhatsApp
- failing validation
- clicking submit
- a submission that errored or was rejected
- submitting with **no form endpoint configured**
- refreshing `/thank-you`, or opening its URL directly

**Mechanism.** On a confirmed submission the form writes a pending record to
`sessionStorage` (`bk_pending_lead`) containing a random `eventId`, the
selected service and the ad spend band — nothing else — then navigates to
`/thank-you`. That page calls `claimPendingLead()`, which *removes the record
as it reads it* and adds the id to a fired list. A refresh finds nothing to
claim. Records older than 30 minutes are ignored.

If `sessionStorage` is unavailable, the conversion is not recorded. That is
the correct failure direction: under-count rather than invent a conversion.

### Secondary signal: `whatsapp_click`

An **intent** signal, never a conversion. The site cannot observe whether a
message was ever sent. Do not import it into Google Ads or Meta as a primary
conversion action, and do not optimise bidding toward it.

| | `whatsapp_click` | `generate_lead` |
|---|---|---|
| Means | A chat window was opened | A submission was accepted |
| Confirms a message was sent | No | n/a |
| Confirms a qualified lead | No | **No** |
| Use as a conversion | No | Yes |

### What none of it establishes

`generate_lead` confirms a submission was accepted. It does not establish that
the enquiry is relevant, becomes a conversation, becomes work, or produces
revenue. That distinction is the entire argument of this portfolio, and it is
published for visitors at `/how-this-site-is-tracked`.

---

## 6. Google Tag Manager setup

Create a container, set `NEXT_PUBLIC_GTM_ID`, then build.

**Variables** — create Data Layer Variables for:
`ga4_measurement_id`, `google_ads_id`, `meta_pixel_id`, `location`,
`case_study_slug`, `case_study_title`, `service`, `ad_spend_band`, `event_id`,
`page_path`, `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`,
`utm_term`, `gclid`, `fbclid`.

**Triggers** — one Custom Event trigger per event name in §4.

**Tags** — GA4 Configuration (page view OFF), GA4 Event tags per event, Google
Ads Conversion Linker, Google Ads Conversion Tracking on `generate_lead`, Meta
Pixel base + Lead event on `generate_lead`.

---

## 7. GA4

Set `NEXT_PUBLIC_GA4_ID` (`G-XXXXXXXXXX`). With GTM configured this ID is only
pushed to the dataLayer for the container to read; GA4 itself is loaded by the
GTM tag.

Mark `generate_lead` as a **key event** in GA4
(Admin → Events → mark as key event). GA4 already treats `generate_lead` as a
recommended event name, so it maps without custom configuration.

Register custom dimensions for `location`, `case_study_slug`, `service` and
`ad_spend_band` if you want them available in reports.

---

## 8. Google Ads

Set `NEXT_PUBLIC_GOOGLE_ADS_ID` (`AW-XXXXXXXXX`).

**The conversion action ID and label are NOT configured in this codebase and
must not be.** They belong in GTM:

1. Google Ads → Goals → Conversions → **New conversion action** → Website.
2. Choose *Submit lead form*. Google issues a Conversion ID (`AW-…`) and a
   **Conversion Label**.
3. In GTM, create a **Google Ads Conversion Tracking** tag. Put the
   Conversion ID and Conversion Label into that tag.
4. Trigger it on the `generate_lead` custom event.
5. Add a **Conversion Linker** tag firing on All Pages.

Alternative, recommended once GA4 has data: import the GA4 `generate_lead` key
event into Google Ads instead of a separate Ads tag. That guarantees one
definition of a conversion across both platforms.

Do not set a conversion value until there is evidence for one. An invented
value produces an invented ROAS, which is the exact failure the measurement
audit case study is about.

---

## 9. Meta Pixel

Set `NEXT_PUBLIC_META_PIXEL_ID` (numeric).

Map `generate_lead` → the standard **Lead** event. Pass `event_id` as the
Pixel's `eventID` parameter so a future server-side call can be deduplicated
against it:

```js
fbq('track', 'Lead', {}, { eventID: <event_id from dataLayer> });
```

With GTM configured, the Pixel is loaded by a GTM tag. Without GTM, the site
loads the Pixel directly and fires `PageView` only — the `Lead` event still
requires the GTM tag, because deduplication needs the `event_id`.

---

## 10. Meta Conversions API — future architecture

**Not implemented, and deliberately so.** CAPI requires a server, an access
token and a place to keep it. This is a static export with no backend, so
there is nowhere to hold a credential that would not immediately be public.

The architecture it is *prepared* for:

```
Browser Pixel  ──┐
                 ├──  same event_id  ──►  Meta deduplicates  ──►  one conversion
Server CAPI    ──┘
```

Both calls send the same `event_id`. Meta matches the pair and counts one
conversion, so browser-side blocking (ad blockers, ITP, no-JS) is covered by
the server call without inflating the total.

To build it later:

1. Stand up an endpoint — a serverless function is enough. It must not live
   in this repo's client bundle.
2. Store the CAPI access token server-side. Never in `NEXT_PUBLIC_*`.
3. On a confirmed submission, send `Lead` server-side with the **same
   `event_id`** the browser used, plus hashed match keys if and only if there
   is a lawful basis and the visitor was told.
4. Verify deduplication in Events Manager → Test Events.

`event_id` is already generated per submission (`createEventId()`) and already
travels with `generate_lead`. That is the whole hook; the rest is server work.

---

## 11. UTM handling

`lib/tracking/attribution.ts` captures, on the first page of a session:

`utm_source` · `utm_medium` · `utm_campaign` · `utm_content` · `utm_term` ·
`gclid` · `wbraid` · `gbraid` · `fbclid` · referrer **hostname only** ·
landing path.

- Stored in `sessionStorage`, cleared when the tab closes.
- First-touch within the session wins; arriving on a *new* campaign URL
  overwrites it, because that is genuinely new attribution.
- Values are trimmed to 120 characters.
- Attached to `generate_lead`, so a conversion carries the campaign that
  produced it.

No cross-site identifier, fingerprint or profile is created.

---

## 12. Consent architecture

Controlled by `NEXT_PUBLIC_CONSENT_MODE`:

| Value | Behaviour |
|---|---|
| `off` (default) | No consent signal. Tags load normally. |
| `required` | Consent Mode v2 defaults set to **denied** in `<head>` before GTM. `ads_data_redaction` on. Tags held until consent is granted. |

**This site ships no consent banner and makes no legal determination.** What
it provides is the integration point. A real CMP calls:

```js
window.__bkTrackingConsent('granted');
window.__bkTrackingConsent('denied');
window.__bkTrackingConsent({ analytics_storage: 'granted' });
```

Each call issues a Consent Mode `update` and pushes a `consent_update` event
so GTM can trigger on it. `wait_for_update: 500` gives a CMP half a second to
report a stored decision, so returning visitors who already consented are not
lost.

Set `required` **before** enabling advertising tags for any audience where
consent is legally required.

---

## 13. Testing procedure

See `docs/tracking-qa.md` for the full checklist. In short:

1. Set the IDs in `.env.local`, `npm run build`, serve `/out`.
2. GTM Preview — connect and walk the site; confirm each event and its
   parameters.
3. GA4 DebugView — confirm the same events arrive with the right names.
4. Submit the form once end to end; confirm exactly one `generate_lead`.
5. Refresh `/thank-you`; confirm **no** second `generate_lead`.
6. Meta Events Manager → Test Events; confirm `Lead` with an `event_id`.
7. Google Ads → conversion diagnostics; confirm the action is recording.

---

## 14. Environment variables

```bash
NEXT_PUBLIC_GTM_ID=            # GTM-XXXXXXX   — primary layer
NEXT_PUBLIC_GA4_ID=            # G-XXXXXXXXXX
NEXT_PUBLIC_GOOGLE_ADS_ID=     # AW-123456789  — label goes in GTM, not here
NEXT_PUBLIC_META_PIXEL_ID=     # numeric
NEXT_PUBLIC_CONSENT_MODE=off   # off | required
NEXT_PUBLIC_TRACKING_DEBUG=    # true → log every push (dev only)
```

All optional. All public by nature — they ship in the HTML. None is a secret,
and none may be a placeholder: leave them blank until the real containers
exist.

Each is format-validated (`lib/tracking/config.ts`). A malformed value is
treated as absent rather than interpolated into a script URL.
