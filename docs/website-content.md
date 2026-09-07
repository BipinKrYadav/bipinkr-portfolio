# Website Content

Where every piece of copy lives, so it can be edited without touching a
component.

---

## 1. Principle

Content is separated from UI. Page components under `app/` compose layout and
import their copy from `content/`. To change wording, edit `content/`.

```
content/
├── site-config.ts          identity, contact, env-driven configuration
├── navigation.ts           nav links + the single primary CTA
├── metrics.ts              the four site-wide proof figures
├── services.ts             four services, funnel nodes, process steps
├── types.ts                shared types incl. the evidence vocabulary
├── anonymise.ts            campaign/account label switch
├── pages/
│   ├── home.ts             hero, intro, why-work-with-me, about snippet, final CTA
│   ├── about.ts            approach, experience, capabilities, principles, focus
│   ├── contact.ts          audit offer, form fields/copy, setup notice
│   └── legal.ts            privacy, resume, 404
└── case-studies/
    ├── index.ts            ordered summaries
    └── <slug>.ts           one module per case study
```

---

## 2. Route map

| Route | Page component | Content source |
|---|---|---|
| `/` | `app/page.tsx` | `content/pages/home.ts`, `metrics.ts`, `services.ts`, `case-studies/index.ts` |
| `/case-studies` | `app/case-studies/page.tsx` | `content/case-studies/index.ts` |
| `/case-studies/meta-lead-generation` | …`/meta-lead-generation/page.tsx` | `content/case-studies/meta-lead-generation.ts` |
| `/case-studies/measurement-audit` | …`/measurement-audit/page.tsx` | `content/case-studies/measurement-audit.ts` |
| `/case-studies/preschool-google-ads` | …`/preschool-google-ads/page.tsx` | `content/case-studies/preschool-google-ads.ts` |
| `/case-studies/cross-channel-meta-google` | …`/cross-channel-meta-google/page.tsx` | `content/case-studies/cross-channel-meta-google.ts` |
| `/services` | `app/services/page.tsx` | `content/services.ts` |
| `/about` | `app/about/page.tsx` | `content/pages/about.ts` |
| `/contact` | `app/contact/page.tsx` | `content/pages/contact.ts` |
| `/resume` | `app/resume/page.tsx` | `content/pages/legal.ts` (`resumeContent`) |
| `/privacy` | `app/privacy/page.tsx` | `content/pages/legal.ts` (`privacyContent`) |
| 404 | `app/not-found.tsx` | `content/pages/legal.ts` (`notFoundContent`) |

Generated at build: `app/sitemap.ts` → `/sitemap.xml`, `app/robots.ts` →
`/robots.txt`, `app/opengraph-image.tsx` → the social card PNG.

---

## 3. Homepage section order

Fixed sequence in `app/page.tsx`:

1. Hero
2. Proof strip
3. Intro / problem statement
4. Services
5. Selected case studies
6. How I work
7. Why work with me
8. About snippet
9. Final CTA
10. Footer (from the root layout)

---

## 4. CTA system

| Slot | Label | Source |
|---|---|---|
| Primary, everywhere | **Get a Free Ad Audit** → `/contact` | `PRIMARY_CTA` in `content/navigation.ts` |
| Secondary | **Chat on WhatsApp** | `components/contact/WhatsAppButton.tsx` |
| Per case study | Bespoke heading + body | each module's `summary.cta` |

Case study CTAs:

| Case study | Heading |
|---|---|
| Meta lead generation | Running Meta lead campaigns? |
| Measurement audit | Not sure whether your conversion data is trustworthy? |
| Preschool Google Ads | Seeing conversions you can't confidently explain? |
| Cross-channel | Running both Meta and Google Ads? |

> **Note on the brief.** Sections 17 and 19 of the brief listed these CTAs and
> two visuals against swapped case-study numbers relative to sections 7–10.
> Sections 7–10 are internally consistent and were followed: the "171 vs 0"
> visual sits with the preschool Google Ads study, and the two-platform
> Meta/Google comparison sits with the cross-channel study.

The WhatsApp button renders **nothing** when `NEXT_PUBLIC_WHATSAPP_NUMBER` is
unset, rather than producing a broken `wa.me` link. There is no "Book a Call"
CTA anywhere, because no scheduling system is configured.

---

## 5. Configuration surface

`content/site-config.ts` reads these public environment variables. All are
optional; each unset value hides its feature instead of faking it.

| Variable | Effect when unset |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Falls back to `https://bipinkr.in` |
| `NEXT_PUBLIC_FORM_ENDPOINT` | Contact form shows a setup notice and does not pretend to send |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | Every WhatsApp button is hidden |
| `NEXT_PUBLIC_CONTACT_EMAIL` | Email contact card hidden |
| `NEXT_PUBLIC_LINKEDIN_URL` | Every LinkedIn button hidden |
| `NEXT_PUBLIC_RESUME_FILE` | Defaults to `bipin-kumar-resume.pdf` |
| `NEXT_PUBLIC_ANALYTICS_PROVIDER` | No analytics script; zero third-party requests |

See `.env.example` for the annotated template.

---

## 6. Tone rules

Applied throughout, from the brief:

- Confident, practical, analytical, transparent, human. Not arrogant, not
  defensive.
- Never "I don't know". Instead: *"The available evidence supports…"*,
  *"The export records…"*, *"The dataset does not establish…"*.
- Limitations are presented as part of the analysis, not as a disclaimer
  banner bolted on at the end.
- Methodology notes sit at readable size directly beneath the figures they
  qualify — the qualification is part of the claim.

---

## 7. Design system

Tokens live in `tailwind.config.ts`; base styles in `app/globals.css`.

- **Ground** warm off-white `#FBFAF7`, raised surfaces white, sunk `#F4F2ED`
- **Ink** `#15161A` → soft `#4B5058` → faint `#767B84`
- **Accent** one restrained deep teal `#0E5D55`
- **Dark bands** `#17191C`, used for contrast sections only
- **Type** Source Serif 4 (display + metric numerals), Inter (UI/body), both
  self-hosted via `next/font` — no third-party font request
- **Evidence colours** carry meaning; `verified` gets the accent, `reported`
  and `unverified` get a quieter warm tone

Deliberately absent: gradients, glassmorphism, 3D, decorative illustration,
stock photography, fake dashboards, skill bars, star ratings.

Motion is enhancement only; `prefers-reduced-motion: reduce` collapses all
animation and transition durations in `app/globals.css`.
