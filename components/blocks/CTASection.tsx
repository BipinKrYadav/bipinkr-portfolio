import { ArrowRight } from 'lucide-react';

import { WhatsAppButton } from '@/components/contact/WhatsAppButton';
import { Button } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { PRIMARY_CTA } from '@/content/navigation';
import { cn } from '@/lib/utils';

interface CTASectionProps {
  eyebrow?: string;
  heading: string;
  body?: string;
  note?: string;
  /** Where this CTA sits, recorded with the analytics event. */
  location: string;
  primaryLabel?: string;
  tone?: 'dark' | 'light';
  className?: string;
}

/**
 * The site-wide conversion block.
 *
 * One primary action everywhere ("Get a Free Ad Audit") and one secondary
 * (WhatsApp, which hides itself when unconfigured). Deliberately no "Book a
 * Call" — there is no scheduling system behind it.
 */
export function CTASection({
  eyebrow,
  heading,
  body,
  note,
  location,
  primaryLabel = PRIMARY_CTA.label,
  tone = 'dark',
  className,
}: CTASectionProps) {
  const dark = tone === 'dark';

  return (
    <section
      className={cn(
        dark ? 'bg-night on-night' : 'border-t border-line bg-paper-sunk',
        'py-section',
        className,
      )}
    >
      <Container>
        <div className="max-w-3xl">
          {eyebrow ? (
            <p
              className={cn(
                'mb-4 text-eyebrow font-semibold uppercase tracking-[0.13em]',
                dark ? 'text-[#7FC6BC]' : 'text-accent',
              )}
            >
              {eyebrow}
            </p>
          ) : null}

          <h2
            className={cn(
              'font-serif text-display-md',
              dark ? 'text-ink-inverse' : 'text-ink',
            )}
          >
            {heading}
          </h2>

          {body ? (
            <p
              className={cn(
                'mt-5 max-w-[66ch] text-[1.0625rem] leading-relaxed',
                dark ? 'text-ink-inverse/70' : 'text-ink-soft',
              )}
            >
              {body}
            </p>
          ) : null}

          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button
              href={PRIMARY_CTA.href}
              size="lg"
              variant={dark ? 'primaryOnDark' : 'primary'}
              analyticsEvent="audit_cta_click"
              analyticsProps={{ location }}
              trailingIcon={<ArrowRight aria-hidden="true" className="h-4 w-4" />}
            >
              {primaryLabel}
            </Button>

            <WhatsAppButton
              size="lg"
              variant={dark ? 'secondaryOnDark' : 'secondary'}
              location={location}
            />
          </div>

          {note ? (
            <p
              className={cn(
                'mt-6 max-w-[66ch] text-[0.875rem] leading-relaxed',
                dark ? 'text-ink-inverse/55' : 'text-ink-faint',
              )}
            >
              {note}
            </p>
          ) : null}
        </div>
      </Container>
    </section>
  );
}
