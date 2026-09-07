'use client';

import { useEffect, useRef } from 'react';

import { trackCaseStudyView } from '@/lib/tracking/events';

interface CaseStudyViewProps {
  slug: string;
  title: string;
}

/**
 * Emits `case_study_view` when a case study page is opened.
 *
 * Mounted once per case study page. Renders nothing and adds no markup, so
 * it cannot affect layout, SEO or the document outline.
 *
 * Parameters are the slug and title only. Nothing identifying a client, an
 * account or a lead is ever sent — the campaign figures on these pages stay
 * on the page.
 */
export function CaseStudyView({ slug, title }: CaseStudyViewProps) {
  const fired = useRef(false);

  useEffect(() => {
    // React runs effects twice in development Strict Mode; the guard keeps
    // the event single-fire there too.
    if (fired.current) return;
    fired.current = true;

    trackCaseStudyView({ case_study_slug: slug, case_study_title: title });
  }, [slug, title]);

  return null;
}
