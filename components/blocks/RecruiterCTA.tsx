import { Download, Linkedin } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { hasLinkedIn, resumePath, siteConfig } from '@/content/site-config';
import { cn } from '@/lib/utils';

interface RecruiterCTAProps {
  heading: string;
  body?: string;
  className?: string;
  /** Where this block sits, recorded with the analytics event. */
  location: string;
}

/**
 * Secondary-audience CTA for recruiters and hiring managers.
 *
 * The LinkedIn button is omitted entirely when no URL is configured — the
 * brief is explicit that the profile URL must not be invented.
 */
export function RecruiterCTA({ heading, body, className, location }: RecruiterCTAProps) {
  return (
    <div
      className={cn(
        'rounded-card border border-line bg-paper-raised p-6 sm:p-8',
        className,
      )}
    >
      <h2 className="font-serif text-display-sm text-ink">{heading}</h2>

      {body ? (
        <p className="mt-3 max-w-xl text-[0.9375rem] leading-relaxed text-ink-soft">{body}</p>
      ) : null}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Button
          href={resumePath}
          download
          variant="secondary"
          analyticsEvent="resume_click"
          analyticsProps={{ location, file: siteConfig.resumeFile }}
          leadingIcon={<Download aria-hidden="true" className="h-4 w-4" />}
        >
          Download Resume
        </Button>

        {hasLinkedIn ? (
          <Button
            href={siteConfig.linkedinUrl}
            external
            variant="secondary"
            analyticsEvent="linkedin_click"
            analyticsProps={{ location }}
            leadingIcon={<Linkedin aria-hidden="true" className="h-4 w-4" />}
          >
            View LinkedIn
          </Button>
        ) : null}
      </div>

      {/* Build-time hint for the operator; never shipped in a production build. */}
      {!hasLinkedIn && process.env.NODE_ENV === 'development' ? (
        <p className="mt-4 text-xs leading-relaxed text-ink-faint">
          Setup: define NEXT_PUBLIC_LINKEDIN_URL to show the LinkedIn button here.
        </p>
      ) : null}
    </div>
  );
}
