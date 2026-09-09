import type { LucideIcon } from 'lucide-react';

/**
 * Evidence grading.
 *
 * This vocabulary is the spine of the whole site. Every number shown
 * publicly is tagged with how it is known, so a reader never has to guess
 * whether a figure is a platform-reported number, an arithmetic result, or
 * an independently confirmed business outcome.
 */
export type EvidenceKind =
  /** Present in the exported campaign data as-is. */
  | 'documented'
  /** Recorded by the platform in its own results/conversions column. */
  | 'verified'
  /** Derived arithmetically from documented figures. */
  | 'calculated'
  /** A platform-reported figure that the data does not independently corroborate. */
  | 'reported'
  /** Explicitly not established by the available evidence. */
  | 'unverified'
  /** A boundary of what the evidence can support. */
  | 'limitation'
  /** A forward-looking action, not a result. */
  | 'recommendation';

export interface Metric {
  /** The figure itself, already formatted for display. */
  value: string;
  /** What the figure measures. */
  label: string;
  /** Optional qualifier shown beneath the label. */
  note?: string;
  /** How this figure is known. */
  evidence?: EvidenceKind;
}

export interface TableColumn {
  key: string;
  header: string;
  /** Right-align and tabular-align numeric columns. */
  numeric?: boolean;
  /** Hint for column width on wide screens. */
  width?: string;
}

export interface TableRow {
  [key: string]: string;
}

export interface DataTableContent {
  caption?: string;
  columns: TableColumn[];
  rows: TableRow[];
  /** Optional summary row rendered with emphasis (e.g. a blended total). */
  footRow?: TableRow;
  /** Methodology or scope note rendered under the table. */
  note?: string;
}

export interface CaseStudySection {
  /** Anchor id, used by the table of contents. */
  id: string;
  /** Label shown in the table of contents. */
  navLabel: string;
  /** Heading rendered on the page. */
  heading: string;
}

export interface CaseStudyCta {
  heading: string;
  body: string;
}

export interface CaseStudySummary {
  slug: string;
  /** Full editorial title used on the case study page. */
  title: string;
  /** Compact title used on cards and in navigation. */
  cardTitle: string;
  subtitle: string;
  /** One- to two-sentence card description. */
  cardDescription: string;
  /** Meta description for search engines. */
  metaDescription: string;
  industry: string;
  platform: string;
  /** 2–3 metrics shown on the listing card. */
  cardMetrics: Metric[];
  cta: CaseStudyCta;
  order: number;
}

export interface ServiceContent {
  slug: string;
  title: string;
  /** Short description used on the homepage card. */
  summary: string;
  /** Longer description used on the services page. */
  description: string;
  /** Concrete deliverables. */
  includes: string[];
  /** Optional "best suited for" list. */
  bestFor?: string[];
  /** Optional operating principle or honest boundary. */
  principle?: string;
  /**
   * The case study that evidences this service, if one exists.
   *
   * Deliberately optional: a service with no documented case study must not
   * borrow one. Landing pages has none, so it links to none.
   */
  evidence?: {
    slug: string;
    label: string;
  };
  icon: LucideIcon;
}

export interface ProcessStep {
  number: string;
  title: string;
  description: string;
}

export interface FlowNode {
  label: string;
  /** Optional short annotation under the node. */
  note?: string;
  /** Visual state used by the measurement-chain diagram. */
  state?: 'ok' | 'uncertain' | 'unknown';
}
