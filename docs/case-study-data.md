# Case Study Data

How case study content is structured, and how to edit it without touching a
component.

---

## 1. The pipeline

```
Campaign exports (never committed)
        │
        ▼
docs/evidence-register.md      what each figure is, and how it is known
        │
        ▼
docs/claims-ledger.md          what may be said about it publicly
        │
        ▼
content/evidence/metrics/*.ts  canonical metric records — the only place a figure is stored
        │
        ▼
content/case-studies/*.ts      structured content that renders figures by metric id
        │
        ▼
app/case-studies/<slug>/page.tsx   composition only, no hard-coded numbers
```

**No evidence-backed number is typed into a content module or a page
component.** Every figure is rendered from the canonical metric registry, so a
figure shared by several pages is stored once. To correct a figure, change its
record — see `docs/metric-registry.md`.

---

## 2. Files

| Slug | Content module | Page |
|---|---|---|
| `meta-lead-generation` | `content/case-studies/meta-lead-generation.ts` | `app/case-studies/meta-lead-generation/page.tsx` |
| `measurement-audit` | `content/case-studies/measurement-audit.ts` | `app/case-studies/measurement-audit/page.tsx` |
| `preschool-google-ads` | `content/case-studies/preschool-google-ads.ts` | `app/case-studies/preschool-google-ads/page.tsx` |
| `cross-channel-real-estate` | `content/case-studies/cross-channel-real-estate.ts` | `app/case-studies/cross-channel-real-estate/page.tsx` |

`content/case-studies/index.ts` collects the four `summary` objects. It drives
the homepage section, the case study index, the sitemap and the
"next case study" link. Ordering comes from each summary's `order` field.

---

## 3. Required exports per module

Every case study module exports at least:

| Export | Type | Used by |
|---|---|---|
| `summary` | `CaseStudySummary` | index, cards, metadata, sitemap |
| `sections` | `CaseStudySection[]` | table of contents + anchor ids |
| `heroMetrics` | `Metric[]` | `CaseStudyHero` |
| `limitations` | `string[]` | `LimitationBlock` |
| `limitationsIntro` | `string` | `LimitationBlock` |

`summary` carries the card metrics, the industry/platform labels, the meta
description and the per-case-study CTA.

### The `Metric` shape

```ts
{
  value: '₹32.29',            // formatted for display by the metric registry
  label: '2026 cohort CPL',
  note?: 'optional qualifier',
  evidence: 'calculated',     // drives the visible evidence chip
}
```

Build it with `metric('re.cohort_2026.cpl', '2026 cohort CPL')`, which takes
both the value and the evidence grade from the registry. Grades are defined in
`content/types.ts`; see `docs/evidence-register.md` §1.

---

## 4. Visual components available

Chosen per case study to suit the evidence, from `components/data/`:

| Component | Use | Currently used by |
|---|---|---|
| `MetricCard` / `MetricGrid` | Metric tiles with evidence chips | all four |
| `DataTable` | Campaign tables; scrolls horizontally on mobile | CS1, CS2, CS4 |
| `CohortBars` | Proportional cohort comparison | CS1 |
| `ComparisonBlock` | Two panels, **no winner styling** | CS2, CS4 |
| `StateComparison` | "X reported **vs** Y recorded", never an arrow | CS3 |
| `ScaleFunnel` | Total narrowing to an affected subset | CS2 |
| `FlowDiagram` | Funnel / measurement chain with `ok`/`uncertain`/`unknown` states | CS3, services, about |

### Rules encoded in the components

- `ComparisonBlock` styles both panels identically and always renders a
  caution. It cannot be made to imply a winner.
- `StateComparison` joins its two panels with "vs". An arrow would read as
  "171 leads became 0 leads", which is a claim about outcomes rather than
  about measurement.
- `EvidenceLabel` gives `verified` the accent colour and `reported`/
  `unverified` a quieter warm tone, so the two can never be confused at a
  glance.

---

## 5. Adding a fifth case study

1. Add the figures to `docs/evidence-register.md`.
2. Add any new claim wording to `docs/claims-ledger.md`.
3. Add each figure as a canonical metric in `content/evidence/metrics/`
   (`docs/metric-registry.md`).
4. Create `content/case-studies/<slug>.ts` exporting at least the five
   required exports above, rendering every figure with `fmt()` / `metric()`.
5. Import it in `content/case-studies/index.ts` and give it an `order`.
6. Create `app/case-studies/<slug>/page.tsx`, composing components and
   importing every figure from the content module.
7. Add `export const metadata = buildMetadata({...})` with a canonical path.

The sitemap, the homepage grid, the case study index, breadcrumbs and the
"next case study" link all pick it up automatically from step 5.

---

## 6. Anonymisation switch

`content/anonymise.ts` exports `label(actual, anonymous)`. Every campaign and
account name in the content modules is wrapped in it:

```ts
{ campaign: label('SCE Gayatri', 'Project A'), leads: '296', cpl: '₹19.37' }
```

Setting `ANONYMISE_LABELS = true` switches every table, chart and paragraph
across all four case studies to the neutral variant. No component changes.

This exists because the brief contained two instructions in tension — use the
exact campaign examples, and anonymise clients absent explicit permission.
Names are shown by default per the explicit instruction; the switch makes
reversing that a one-line change. See `docs/claims-ledger.md` §5.
