# Claims Ledger

What may and may not be said publicly, and why. This is the safety layer
between the evidence register and the website copy.

**How to use it:** before publishing any new sentence containing a number,
find it here. If it is not here, add it here first — with its grade and its
wording — then publish.

---

## 1. Permanently blocked claims

These must not appear in public copy unless new, stronger evidence is
supplied. Several of them were considered and deliberately rejected.

| Blocked claim | Why it is blocked |
|---|---|
| "2,000+ leads" | Not supported. The verified figure is 1,617 Meta form submissions. |
| "₹4.5 Cr sales" | No revenue evidence of any kind exists. |
| "₹80.22 qualified lead" | No qualified-lead measurement exists. |
| "₹1,00,000 wasted" | The audit found spend with *unreliable measurement*, which is not the same as wasted spend. |
| "83 bilingual creatives" | Exports record 83 ads; no per-creative language attribute. |
| "6 duplicate campaigns consolidated" | Not established by the exports. |
| "guaranteed leads" / "guaranteed ROAS" / "10X ROI" | Outcome guarantees. Unsupportable. |
| "generated ₹4.5 Cr" | No revenue evidence. |
| "qualified leads" for the ₹50.22 Meta result cost | ₹50.22 is Meta's quality-**optimised** result cost, not a verified qualified lead. |

**Status: verified absent.** A full-text search of `app/`, `components/` and
`content/` returns zero matches for every one of these strings.

---

## 2. Forbidden inferences

Never convert one thing into another:

| Never turn | Into |
|---|---|
| clicks | leads |
| reported conversions | sales |
| form submissions | qualified leads |
| conversion value | revenue |
| campaign spend | client revenue |

The Google side of case study 4 is the live test of this rule: 773 clicks are
reported as 773 clicks, and no cost per lead is derived from them.

---

## 3. Approved wording

The left column is banned; the right column is what the site actually says.

| Do not write | Write instead |
|---|---|
| "I reduced CPL by 69.7%" | "Reported CPL fell 69.7% across the observed cohorts." |
| "₹50.22 qualified lead cost" | "Meta quality-lead optimisation — ₹50.22 per result" + unverified chip |
| "171 → 0 leads" | "171 reported lead-funnel leads **vs** 0 recorded conversions" |
| "PMax generated zero leads" | "0 recorded conversions in the platform's conversion column" |
| "Search outperformed PMax" | "The sample and measurement conditions are not comparable enough to make that conclusion." |
| "Google CPL was ₹X" | "Google lead count is not verified from the available evidence." |
| "I don't know" | "The dataset does not establish…" / "The export records…" |

### Headline figure locks

- Case study 1's blended CPL headline is **₹40.77**, not ₹35.83. The
  conservative figure includes the ₹7,990.31 of zero-result lead spend.
- Case study 1's cohort framing is **observed cohorts**, never a controlled
  before/after experiment.

---

## 4. Service-level claim boundaries

| Service | Boundary |
|---|---|
| Meta Ads & Lead Generation | May describe execution and analysis. No outcome promise. |
| Google Ads & Search | May state the principle "check whether the conversion data deserves to be optimised". No performance promise. |
| Landing Pages & Websites | **No conversion-rate improvement may be claimed.** Current evidence does not establish landing page results. Stated on the page itself. |
| Tracking & Measurement | May describe the work. No accuracy guarantee. |

The Free Ad Audit is described as "an initial assessment, not a guarantee of
performance" wherever it is offered.

---

## 5. Open actions

| # | Item | Status |
|---|---|---|
| 1 | **Client permission to name projects publicly.** The brief instructed both "use these exact campaign examples" and "anonymise clients unless permission is explicitly available". Names are currently shown, per the explicit instruction. | **Needs a decision.** Set `ANONYMISE_LABELS = true` in `content/anonymise.ts` to switch every table, chart and paragraph to neutral labels ("Project A", "Preschool account B") with no other code change. |
| 2 | Confirm the 15-month window's exact start and end dates if it is ever stated more precisely than "15 months". | Open |
| 3 | If lead-quality or CRM data becomes available, case study 1's closing section is the place it belongs. | Open |

---

## 6. Positioning guardrails

Approved positioning: **Performance Marketer** — Meta Ads, Google Ads, lead
generation, landing pages & websites, tracking & measurement.

Rejected labels, absent from the site: "360° Digital Marketing Expert",
"AI Expert", "Growth Hacker", "Social Media Guru", "Marketing Ninja",
"10X Growth Expert".

AI is described only as: *"I use AI-assisted workflows for research, analysis,
content development and faster execution — while keeping final decisions
grounded in campaign evidence and human judgement."*

---

## 7. Things that do not exist on this site

Confirmed absent by inspection:

- Testimonials or quotes attributed to any client
- Client logos
- Star ratings, skill bars, percentage-mastery graphics
- Awards or certifications
- Screenshots of Meta Ads Manager or Google Ads
- Fabricated dashboards
- Stock photography
- Invented contact details, phone numbers or email addresses
- A "Book a Call" CTA (no scheduling system is configured)
