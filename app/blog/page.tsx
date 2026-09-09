import { ArrowRight } from 'lucide-react';
import type { Metadata } from 'next';

import { ArticleCard } from '@/components/blog/ArticleCard';
import { CTASection } from '@/components/blocks/CTASection';
import { Button } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { Section } from '@/components/ui/Section';
import { articles, blogIndexContent } from '@/content/blog';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'Performance Marketing Insights',
  description:
    'Practical lessons from real campaign data, measurement audits, lead generation and performance marketing — with the evidence and the limitations both stated.',
  path: '/blog',
});

export default function BlogPage() {
  return (
    <>
      <section className="border-b border-line bg-paper-sunk pb-section-sm pt-16 sm:pt-20">
        <Container>
          <div className="max-w-3xl">
            <p className="eyebrow-label">{blogIndexContent.eyebrow}</p>
            <h1 className="mt-5 font-serif text-display-lg text-ink">{blogIndexContent.heading}</h1>
            <p className="mt-6 text-lg leading-relaxed text-ink-soft">
              {blogIndexContent.subheading}
            </p>

            <div className="prose-editorial mt-8">
              {blogIndexContent.intro.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </div>
        </Container>
      </section>

      {/* Articles */}
      <Section>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {articles.map((article) => (
            <ArticleCard key={article.slug} article={article} headingLevel="h2" />
          ))}
        </div>

        {/* Honest about the shelf being short, rather than padding it out. */}
        {articles.length < 3 ? (
          <p className="mt-8 max-w-[66ch] border-l-2 border-line-strong pl-4 text-[0.9375rem] leading-relaxed text-ink-faint">
            {blogIndexContent.emptyState}
          </p>
        ) : null}
      </Section>

      {/* Themes — labels, not routes */}
      <Section tone="sunk" bordered spacing="compact" aria-labelledby="themes-heading">
        <h2 id="themes-heading" className="font-serif text-display-sm text-ink">
          {blogIndexContent.themesHeading}
        </h2>

        <dl className="mt-8 grid grid-cols-1 gap-x-12 gap-y-0 sm:grid-cols-2">
          {blogIndexContent.themes.map((theme) => (
            <div key={theme.name} className="border-b border-line py-4">
              <dt className="text-sm font-semibold text-ink">{theme.name}</dt>
              <dd className="mt-1.5 text-sm leading-relaxed text-ink-soft">{theme.description}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-8 flex flex-wrap items-center gap-x-8">
          <Button
            href="/case-studies"
            variant="ghost"
            trailingIcon={<ArrowRight aria-hidden="true" className="h-4 w-4" />}
          >
            Read the case studies
          </Button>
          <Button
            href="/free-ad-audit"
            variant="ghost"
            trailingIcon={<ArrowRight aria-hidden="true" className="h-4 w-4" />}
          >
            What a free ad audit covers
          </Button>
        </div>
      </Section>

      <CTASection
        eyebrow="Next step"
        heading="Want this level of scrutiny on your own account?"
        body="Send me your campaign setup and reporting. I will review the structure, the measurement and the obvious opportunity areas, and tell you plainly what your data supports."
        note="An initial assessment based on the information you provide — not a guarantee of performance."
        location="blog"
      />
    </>
  );
}
