import type { EvidenceKind } from '@/content/types';
import { cn } from '@/lib/utils';

/**
 * Evidence chips.
 *
 * The colour weighting is deliberate and load-bearing: "verified" is the
 * only chip that carries the accent colour. "Reported" and "unverified"
 * are rendered in a warmer, quieter tone so a platform-reported figure can
 * never be mistaken at a glance for a confirmed one.
 */
const styles: Record<EvidenceKind, { label: string; className: string; title: string }> = {
  documented: {
    label: 'Documented',
    className: 'border-line-strong bg-paper-sunk text-ink-soft',
    title: 'Present in the campaign exports as-is.',
  },
  verified: {
    label: 'Verified',
    className: 'border-accent-line bg-accent-soft text-evidence-verified',
    title: 'Recorded by the platform in its own results or conversions column.',
  },
  calculated: {
    label: 'Calculated',
    className: 'border-[#C7D2E4] bg-[#EEF2F8] text-evidence-calculated',
    title: 'Derived arithmetically from documented figures.',
  },
  reported: {
    label: 'Reported',
    className: 'border-[#E2D3B0] bg-[#F8F2E4] text-evidence-reported',
    title: 'A platform-reported figure the data does not independently corroborate.',
  },
  unverified: {
    label: 'Not independently verified',
    className: 'border-[#E2D3B0] bg-[#F8F2E4] text-evidence-reported',
    title: 'Not confirmed by anything outside the reporting platform.',
  },
  limitation: {
    label: 'Limitation',
    className: 'border-[#E3C6C0] bg-[#F9EDEA] text-evidence-limitation',
    title: 'A boundary of what this evidence can support.',
  },
  recommendation: {
    label: 'Recommendation',
    className: 'border-[#D2CEDE] bg-[#F1EFF6] text-evidence-recommendation',
    title: 'A proposed action, not a result.',
  },
};

interface EvidenceLabelProps {
  kind: EvidenceKind;
  /** Override the default wording, e.g. "Reported CPL". */
  children?: string;
  className?: string;
  size?: 'sm' | 'xs';
}

export function EvidenceLabel({ kind, children, className, size = 'sm' }: EvidenceLabelProps) {
  const style = styles[kind];

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-pill border font-semibold uppercase tracking-[0.08em]',
        // 10px floor: the previous 9px was below comfortable legibility for
        // uppercase, letter-spaced text at this weight.
        size === 'xs' ? 'px-1.5 py-0.5 text-[0.625rem]' : 'px-2 py-0.5 text-micro',
        style.className,
        className,
      )}
      title={style.title}
    >
      {children ?? style.label}
    </span>
  );
}

export const evidenceTitles = styles;
