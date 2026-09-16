# Metric Registry

The single source for every evidence-backed figure on bipinkr.in.

```
content/evidence/metrics/*.ts     one canonical record per figure
        │
        ▼
lib/metrics                       validation · formulas · formatting
        │
        ▼
content/**/*.ts, app/**           fmt('re.cohort_2026.leads') — never a typed number
        │
        ▼
pages · cards · tables · charts · titles · OG image
```

A figure that appears on six pages is stored once. Change the record and
every placement — including headings, prose, the page `<title>`, the OG card
and chart bar lengths — renders the new value on the next build.

---

## 1. Files

| File | Role |
|---|---|
| `lib/metrics/types.ts` | The metric model |
| `lib/metrics/formulas.ts` | The fixed formula engine |
| `lib/metrics/format.ts` | Display formats (the only place a number becomes text) |
| `lib/metrics/registry.ts` | Loads, validates and resolves the registry |
| `lib/metrics/index.ts` | Public API: `fmt`, `metric`, `metricRow`, `metricPair`, `metricValue`, `evidenceOf` |
| `content/evidence/define.ts` | Helpers for declaring records |
| `content/evidence/metrics/*.ts` | The records, one file per dataset |
| `content/evidence/linked-phrases.ts` | Wording that restates a figure in words |

## 2. Identifiers

`<dataset>.<entity>.<measure>`, lower_snake_case.

| Dataset | Covers |
|---|---|
| `site` | Site-wide headline figures |
| `re` | Meta lead generation, residential real estate |
| `audit` | Measurement audit |
| `pre` | Preschool Google Ads accounts |
| `cc` | Cross-channel Meta + Google |

Entities use the neutral labels from `content/anonymise.ts` (Project A–G,
account A–C, Meta campaign 1–2, Google campaign 1–3). Ids never contain a client
name, account ID, campaign ID or customer ID. An id, once published, does not
change.

Two figures are the same metric only when the source establishes that they
describe the same evidence record — never because their values or campaign
names match. `cc.meta.leads` (191 leads) and
`cc.google.reported_conversion_rate_3` (191%) are unrelated.

## 3. The record

| Field | Meaning |
|---|---|
| `kind` | `raw` (entered from evidence) · `calculated` (fixed formula, no stored value) · `legacy_fixed` (published figure whose inputs are not stored) |
| `value` | The unrounded number. `null` = not recorded, which is different from a recorded `0` and renders as “—” |
| `valueType`, `unit`, `currency` | What the number measures |
| `precision` | `exact` · `lower_bound` (published with “+”) · `rounded_published` |
| `evidenceStatus` | The recorded grade. See §4. `null` = no grade recorded |
| `dataOrigin` | `platform` · `derived` · `owner_confirmed` |
| `sourcePlatform`, `sourceType`, `sourceReference` | Where it came from. The reference is descriptive and non-identifying |
| `reportingPeriod` | Basis, dates and description. Most periods are **not recorded** in the repository yet and say so |
| `formula` | Calculated metrics only |
| `legacyMethodNote` | Legacy metrics only: why it cannot be recalculated and what would unlock it |
| `displayFormat`, `notes` | Default format; free notes |

## 4. Evidence status is human-controlled

The grades keep exactly the meanings defined in `content/types.ts`
(`EvidenceKind`) and shown by `components/ui/EvidenceLabel.tsx`:

| Grade | Meaning (unchanged) |
|---|---|
| Documented | Present in the campaign exports as-is |
| Verified | Recorded by the platform in its own results/conversions column |
| Calculated | Derived arithmetically from documented figures |
| Reported | Platform-reported, not independently corroborated |
| Not independently verified | Not confirmed outside the reporting platform |
| Limitation | A boundary of what the evidence supports |
| Recommendation | A proposed action, not a result |

Rules enforced by the code:

1. **Nothing computes a grade.** Formulas produce values only. Changing a value
   leaves `evidenceStatus` exactly as it was recorded.
2. **A figure shows one grade everywhere.** `metric()` always takes the chip from
   the registry and has no override.
3. **A combined figure must state its grade** when its parts differ.
   `metricPair()` throws for “171 vs 0” (reported / verified) unless the grade is
   given explicitly — it is `reported`, as it has always been published.
4. The grades migrated into the registry are the ones already published on the
   site or recorded in `docs/evidence-register.md`. Figures that never carried a
   grade (most table cells) are `null`, not assumed.

**To mark a figure Verified, a person must check the original source and set it.**
Entering or recalculating a number never does.

## 5. Formulas

| `fn` | Computes |
|---|---|
| `ratio` | numerator ÷ denominator (CPL, CPC) |
| `percent` | part ÷ whole × 100 (CTR) |
| `sum` | term + term + … |
| `difference` | minuend − subtrahend |
| `pct_decrease` | (from − to) ÷ from × 100 |
| `pct_increase` | (to − from) ÷ from × 100 |
| `multiple` | value ÷ base |
| `min` / `max` | smallest / largest input |
| `spread` | largest ÷ smallest input |
| `count` | number of listed rows |

There is no expression language. Missing inputs or a zero denominator return
`null` (“—”). Values are computed unrounded; rounding happens only in the format.

## 6. Validation

`lib/metrics/registry.ts` validates on load and **fails the build** on: an
invalid or duplicate id, a missing name or description, currency on a
non-currency figure, a raw metric with a formula, a calculated metric with a
stored value, a legacy figure without a method note, a formula input that does
not exist, a circular formula, or a linked phrase pointing at an unknown metric.

## 7. Linked phrases

Some wording restates a figure rather than rendering it: “roughly a third”,
“increased approximately”, “Nearly two thousand recorded clicks”, “One recorded
conversion”. Generating that wording would mean software choosing claim
language, so it stays as written and is listed in
`content/evidence/linked-phrases.ts` against the metrics it depends on. When one
of those metrics changes, the phrase must be reviewed.

### Editorial titles are not generated

SEO titles and H1s are editorial copy and stay fixed when a metric changes.
Where a title quotes a figure (the Meta lead generation title quotes ₹106.66
and ₹32.29), it is listed as a linked phrase and must be reviewed by hand.

## 8. Changing a figure (until the admin panel exists)

1. Check the figure against the original source.
2. Edit `value` in `content/evidence/metrics/<dataset>.ts`. Update
   `reportingPeriod`, `sourceReference` and `notes` as needed.
3. Change `evidenceStatus` only if the new check supports a different grade.
4. Review the linked phrases for that metric and anything depending on it.
5. For a `legacy_fixed` figure whose inputs you now have: enter the inputs as raw
   metrics and convert the record to `calculated`. Confirm the calculated value
   before publishing — it may differ from the published legacy figure.
6. Record the change in `docs/evidence-register.md` and, for new wording,
   `docs/claims-ledger.md`.
7. `npm run typecheck && npm run lint && npm run build`.

## 9. Figures intentionally not linked

| Figure | Why |
|---|---|
| `1,617` vs cohorts `77 + 1,540` | Arithmetically equal, but not documented as defined by that sum |
| `₹40.77` | Reproduces from the cohort spends + ₹7,990.31, but that numerator is not confirmed — held as legacy |
| Top-5 “South City Centre 2” vs variant “South City Centre” | Same leads and CPL, different campaign names |
| Meta lead generation “Balaji Leads” (`re.project_d.*`) vs cross-channel Meta campaign 1 (`cc.meta_1.*`) | Same name, 181 leads and ₹30.91, but no source establishes they are the same evidence record |
| Measurement audit 345% / 476% vs cross-channel 345% / 476% | Not established as the same campaign records |
| Blog “0 conversion actions actively recording in the reviewed setup” | The article scopes it to three accounts; the recorded diagnostic belongs to account A |
