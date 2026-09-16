# Evidence Register

The authoritative list of every figure published on bipinkr.in, what it is
derived from, and how strongly it is supported.

**Rule:** nothing appears on the public site unless it appears in this
register. If a number cannot be traced to a documented export, it does not
get published.

---

## 1. Evidence grades

The site uses seven grades. They are rendered as visible chips next to
figures, and the visual weighting is deliberate — `verified` carries the
accent colour, `reported` and `unverified` are rendered in a quieter warm
tone so a platform-reported figure never reads as a confirmed one.

| Grade | Meaning | Example |
|---|---|---|
| `documented` | Present in the campaign exports as-is. | `₹8,212.69` cohort spend |
| `verified` | Recorded by the platform in its own results/conversions column. | `1,617` Meta form submissions |
| `calculated` | Derived arithmetically from documented figures. | `₹32.29` cohort CPL |
| `reported` | Platform-reported, not independently corroborated. | `256%` account conversion rate |
| `unverified` | Explicitly not confirmed outside the reporting platform. | `₹50.22` quality-lead result cost |
| `limitation` | A stated boundary of what the evidence supports. | "Lead quality not established" |
| `recommendation` | A proposed action, not a result. | (reserved — not currently used publicly) |

Defined in code at `content/types.ts` (`EvidenceKind`) and rendered by
`components/ui/EvidenceLabel.tsx`.

---

## 2. Source data

| Source | Description | Committed to repo? |
|---|---|---|
| Meta Ads exports | Campaign / ad set / ad level exports across 5 accounts | **No** |
| Google Ads exports | Campaign level exports, conversion diagnostics | **No** |

Raw XLSX/CSV exports are **excluded by `.gitignore`** (`*.xlsx`, `*.xls`,
`*.csv`, `/private/`, `/raw-data/`). They contain account IDs, campaign IDs
and lead-level data and must never enter the repository or the built site.

---

## 3. Site-wide headline figures

Used by the homepage proof strip and the About evidence snapshot.
Source: `content/metrics.ts`.

| Figure | Label | Grade | Notes |
|---|---|---|---|
| `₹1.11L+` | documented ad spend | documented | Sum across 5 accounts. Ad spend, **not** client revenue. |
| `1,617` | Meta form submissions | verified | Lead form submissions recorded by Meta. Not qualified leads. |
| `5` | ad accounts documented | documented | Meta + Google combined. |
| `15 months` | campaign evidence | documented | Span of the exports. |

Methodology note published alongside them:

> Based on documented campaign exports and analysis. Metrics have defined
> limitations and are presented conservatively.

---

## 4. Case study 1 — Meta lead generation

Source: `content/case-studies/meta-lead-generation.ts`.

### Cohorts

| Cohort | Spend | Leads | CPL | Grade |
|---|---|---|---|---|
| 2025 | ₹8,212.69 | 77 | ₹106.66 | documented / calculated |
| 2026 | ₹49,722.95 | 1,540 | ₹32.29 | documented / calculated |

Cohorts are grouped by **campaign start year** and include **only campaigns
that recorded results**. Observed comparison, not a controlled experiment.

Derived observations: spend ≈ 6×, lead volume ≈ 20×, reported CPL fell 69.7%.

### Result types (cost per result)

| Result type | Cost | Grade |
|---|---|---|
| Messaging conversations | ₹31.33 | reported |
| Standard lead generation | ₹39.12 | reported |
| Meta quality-lead optimisation | ₹50.22 | unverified |
| Native calls | ₹157.48 | reported |

`₹50.22` is Meta's cost per quality-optimised result. It is **not** a
qualified-lead cost and is never labelled as one.

### Five campaigns

| Campaign | Leads | CPL |
|---|---|---|
| SCE Gayatri | 296 | ₹19.37 |
| Nutan Construction Project 4 | 341 | ₹21.87 |
| South City Centre 2 | 71 | ₹29.62 |
| Balaji Leads | 181 | ₹30.91 |
| Garden Leads | 281 | ₹34.84 |
| **Combined** | **1,170** | **₹26.22** (₹30,678.43 spend) |

### Variant observations

| Campaign | Original | Variant |
|---|---|---|
| Aqua City | ₹2,519 / 34 leads / ₹74.09 | ₹7,180 / 190 leads / ₹37.79 |
| Urmila | ₹419 / 4 leads / ₹104.66 | ₹733 / 12 leads / ₹61.09 |
| South City Centre | ₹2,103 / 71 leads / ₹29.62 | ₹105 / 0 results |

Decision rationale for the variants is **not** established by the exports and
is not asserted.

### Blended figure

- `1,617` Meta form submissions — verified
- `₹40.77` conservative blended CPL — calculated

`₹40.77` divides **all** lead-objective spend by Meta form submissions and
**includes ₹7,990.31 of lead campaigns with no recorded results**. A more
flattering figure exists by excluding that spend; it is deliberately not used.

### Operational scale

48 campaigns · 51 ad sets · 83 ads/creatives · 13 age ranges · 6 Bihar cities
· 4 lead-related result types · 2 lead optimisation goals
· 3 campaign objectives (awareness, engagement, leads).

Two distinct levels of Meta's taxonomy, both recorded: **campaign objectives**
sit at campaign level, **optimisation goals** at ad set level within the leads
objective. Only lead-objective spend feeds the `₹40.77` blended CPL — awareness
and engagement spend is excluded from it.

The case study page displays the 3 campaign objectives; age ranges, result
types and optimisation goals are documented here but omitted from the page.
The `3 campaign objectives` figure is confirmed by the account owner rather
than read from the XLSX exports.

`83` is a count of ads, **not** "83 bilingual creatives" — the exports record
that Hindi and English variants existed but carry no per-creative language
attribute.

---

## 5. Case study 2 — Measurement audit

Source: `content/case-studies/measurement-audit.ts`.

| Figure | Grade |
|---|---|
| ₹1.11L documented spend reviewed | documented |
| 5 accounts | documented |
| ₹38,898.65 associated with unreliable / unverified / inflated measurement | calculated |
| 34.9% of documented spend | calculated |

Reconciliation of the ₹38,898.65:

| Failure mode | Spend |
|---|---|
| Inflated conversion reporting (P4P Google) | ₹10,638.93 |
| Unverified / inactive conversion actions (Pinwheel) | ₹10,979.48 |
| Incomplete / zero-result tracking (Kidzee, Birla, Meta website Lead) | ₹17,280.24 |
| **Total** | **₹38,898.65** |

Reported conversion rates in the affected Google account: 345%, 476%, 160%,
133%; account level 256%. All graded `reported`. **The technical cause is not
established** and none is asserted.

Placeholder values: 3 campaigns with ₹1 conversion values → value-based
reporting not meaningful for those campaigns.

Conversion diagnostics (Pinwheel): 2 unverified, 9 no recent conversions,
0 actively recording.

Scope statement published on the page:

> This was a review of exported reporting, not a technical tracking audit of
> the live accounts.

---

## 6. Case study 3 — Preschool Google Ads

Source: `content/case-studies/preschool-google-ads.ts`.

| Figure | Grade |
|---|---|
| ₹20.19K documented spend | documented |
| 3 preschool Google Ads accounts | documented |
| 12 recorded conversions | verified |
| 171 reported lead-funnel leads vs 0 recorded conversions | reported / verified |

| Account | Spend | Recorded conversions |
|---|---|---|
| A — Pinwheel | ₹10,979.48 | 4 |
| B — Birla Open Minds | ₹6,663.79 | 1 |
| C — Kidzee | ₹2,544.29 | 7 |
| **Total** | **₹20,187.56** | **12** |

Campaign detail:

- **Pinwheel** — PMax ₹8,637.27 / 8,537 clicks / ₹1.01 CPC / 171 reported
  lead-funnel leads / 0 recorded conversions. Search ₹928.39 / 7 clicks /
  ₹132.63 CPC / 4 recorded conversions.
  *The two campaigns do not sum to account spend; the page says so.*
- **Birla Open Minds** — Smart ₹1,395.16 / 1,171 clicks / 0 conversions.
  Search ₹5,268.62 / 759 clicks / 1 conversion.
- **Kidzee** — Smart ₹1,247.53 / 195 clicks / 7 conversions. Search-2
  ₹1,296.76 / 259 clicks / 0 conversions. PMax: conversion tracking setup
  incomplete.

**Terminology fixed on the page:** "verified conversion" = a conversion
recorded in the platform's own conversions column. It does **not** mean an
independently verified business outcome, a confirmed admission, a confirmed
enquiry or a confirmed qualified lead.

---

## 7. Case study 4 — Cross-channel Meta + Google

Source: `content/case-studies/cross-channel-real-estate.ts`.

| Channel | Spend | Recorded outcome | Grade |
|---|---|---|---|
| Meta | ₹6,888.11 | 191 verified leads | verified |
| Google | ₹8,884.64 | 773 clicks | documented |
| **Total** | **₹15,772.75** | 5 campaigns | documented |

Meta: Balaji Leads ₹5,595.49 / 181 leads / ₹30.91 · Balaji Exotica ₹1,292.62 /
10 leads / ₹129.26.

Google: Balaji Project Search ₹6,700.07 / 646 clicks · Search-5 ₹1,814.01 /
111 clicks · Search-2 ₹370.56 / 16 clicks. Blended CPC ₹11.49 ·
13,216 impressions · blended CTR 5.85%.

**Google conversion reporting is unreliable in this dataset** (inflated rates
including 345%, 476%, 191%). Therefore:

- No Google CPL is calculated anywhere.
- The 773 clicks are never described as leads.
- No Meta-versus-Google winner is declared.

---

## 8. Not established by any evidence on this site

Published explicitly in the limitation blocks on each case study:

qualified lead rate · site visits · bookings · admissions · sales · revenue ·
lead-to-sale rate · lead-to-admission rate · true CPA · ROAS · ROI ·
offline attribution · lead quality · technical cause of tracking problems ·
whether PMax or Search produced better business outcomes.

---

## 9. Privacy controls

Never published anywhere in the repo or the built site:

- Meta Ad Account IDs
- Google Customer IDs
- Campaign IDs, ad set IDs, creative IDs
- Client phone numbers
- Lead-level personal information

Campaign/account **names** are published (SCE Gayatri, Balaji, Pinwheel,
Kidzee, Birla Open Minds, etc.). These are project labels, not identifiers.
See `docs/claims-ledger.md` §5 for the open action on client permission, and
`content/anonymise.ts` for the one-flag switch that replaces every name with a
neutral label site-wide.
