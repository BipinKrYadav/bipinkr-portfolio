# Content Snapshot

Since Phase 3A the site is built from **`snapshot/baseline.json`**: one
validated JSON file holding the canonical metrics and the page content that the
future admin panel will edit. The Phase 2 TypeScript source is kept intact and
is both the generator input and the emergency fallback.

```
content/evidence/**, content/pages/**,       (Phase 2 TypeScript source)
content/services.ts, content/metrics.ts,
content/case-studies/**
        │  npm run snapshot:export   (token mode: figures become references)
        ▼
snapshot/baseline.json                        (strict Zod schemas, public fields only)
        │  read from disk during `next build` only
        ▼
lib/metrics (registry) + lib/content (adapters, renderer)
        ▼
pages → the same static export as before
```

The exported site never reads the snapshot at runtime and makes no database or
Supabase request.

---

## 1. What is in the snapshot

| Section | Contents |
|---|---|
| `metrics` | All canonical metrics, public projection (no `sourceReference`, no internal `notes`) |
| `linkedPhrases` | Wording that restates a figure and needs review when it changes |
| `media` | Media metadata (empty until the media phase) |
| `documents.proofStrip` | Headline figures (`content/metrics.ts`) |
| `documents.homepage` | `content/pages/home.ts` |
| `documents.about` | `content/pages/about.ts` |
| `documents.services` | `content/services.ts` |
| `documents.contact` | Contact and thank-you page copy (`content/pages/contact.ts`) |
| `documents.caseStudyIndex` | Case study index copy and related links |
| `documents.caseStudies.<slug>` | The four case studies |

**Not in the snapshot (still read from TypeScript):** navigation, site
configuration and environment values, the contact form configuration (its
labels are submitted to the form provider and sent as tracking parameters),
the blog, the Free Ad Audit, privacy, resume and tracking pages. Their figures
still come from the snapshot metrics, through `fmt()`.

## 2. References instead of values

Documents never contain an evidence-backed figure:

| In the snapshot | Rendered at build |
|---|---|
| `{{metric:<id>}}`, `{{metric:<id>\|<format>}}`, `…\|+` (lower bound), `…\|suffix= CPL` | The formatted figure from the registry |
| `"{{evidence:<id>}}"` | The metric's evidence grade (absent when ungraded) |
| `{{label:<real>\|<anonymous>}}` | The name, honouring `ANONYMISE_LABELS` |
| `{ "$pair": { first, second, separator?, format?, evidence? }, "label" }` | A paired figure; the mixed-grade check runs again |
| `{ "$metricValue": "<id>" }` | The unrounded number (chart bar lengths) |
| `{ "$icon": "<Name>" }` | An allow-listed icon |

Editorial titles, H1s, slugs and links are **fixed text** — the schema rejects
tokens in those fields.

## 3. Files

| File | Role |
|---|---|
| `snapshot/baseline.json` | The generated snapshot |
| `lib/snapshot/schema.ts` | Strict Zod schemas (compile-time checked against the metric model) |
| `lib/snapshot/load.ts` | Reads and validates the snapshot, checks every metric reference |
| `lib/snapshot/source.ts` | `CONTENT_SOURCE` switch |
| `lib/snapshot/public-metric.ts` | Drops private metric fields |
| `lib/content/token-grammar.ts` | Token syntax (pure) |
| `lib/content/render.ts` | Resolves tokens and references |
| `lib/content/document.ts` | Snapshot document or TypeScript fallback |
| `lib/content/**` adapters | Same export names as the TypeScript modules; pages import these |
| `scripts/snapshot/*` | Exporter, checker, document catalog, Node module hooks |

## 4. Commands

```
npm run snapshot:export   regenerate snapshot/baseline.json from the TypeScript source
npm run snapshot:check    validate the snapshot and prove it matches the source
```

`snapshot:check` fails when: the schema or a reference is invalid; metrics or
linked phrases differ from the source; any document renders differently from
its TypeScript module; or the file is out of date with the source.

## 5. Changing a figure or content today

Until the admin panel exists, the TypeScript source remains the place to edit:

1. Edit the metric in `content/evidence/metrics/` or the copy in its content module.
2. `npm run snapshot:export`
3. `npm run snapshot:check`
4. `npm run typecheck && npm run lint && npm run build`
5. Commit the source change **and** the regenerated `snapshot/baseline.json` together.

The build reads the snapshot, so a source edit without step 2 does not reach
the site — `snapshot:check` reports it as out of date.

## 6. Emergency fallback

```
CONTENT_SOURCE=typescript npm run build
```

Builds directly from the TypeScript source, bypassing the snapshot. Verified in
Phase 3A to produce output identical to the snapshot build.

`CONTENT_SNAPSHOT=<path>` builds from a different snapshot file (used later for
release snapshots).
