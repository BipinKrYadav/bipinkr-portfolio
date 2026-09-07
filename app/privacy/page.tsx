import type { Metadata } from 'next';

import { WhatsAppButton } from '@/components/contact/WhatsAppButton';
import { Button } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { Section } from '@/components/ui/Section';
import { privacyContent } from '@/content/pages/legal';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'Privacy',
  description:
    'How information submitted through bipinkr.in is collected, used and stored — contact form data, WhatsApp and email communication, analytics and data minimisation.',
  path: '/privacy',
});

export default function PrivacyPage() {
  return (
    <>
      <section className="border-b border-line bg-paper-sunk pb-section-sm pt-16 sm:pt-20">
        <Container width="prose">
          <p className="eyebrow-label">{privacyContent.eyebrow}</p>
          <h1 className="mt-5 font-serif text-display-lg text-ink">{privacyContent.h1}</h1>
          <p className="mt-6 text-lg leading-relaxed text-ink-soft">{privacyContent.intro}</p>
          <p className="mt-5 text-sm text-ink-faint">{privacyContent.lastUpdated}</p>
        </Container>
      </section>

      <Section width="prose">
        {/* Contents */}
        <nav aria-label="Sections on this page" className="border-b border-line pb-8">
          <h2 className="text-micro font-semibold uppercase tracking-[0.11em] text-ink-faint">
            On this page
          </h2>
          <ol className="mt-4 space-y-2">
            {privacyContent.sections.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="rounded-sm text-sm text-ink-soft underline-offset-4 hover:text-ink hover:underline"
                >
                  {section.heading}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="mt-12 space-y-12">
          {privacyContent.sections.map((section) => (
            <section key={section.id} id={section.id} className="scroll-mt-28">
              <h2 className="font-serif text-2xl leading-snug text-ink">{section.heading}</h2>
              <div className="prose-editorial mt-4">
                {section.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-16 rounded-card border border-line bg-paper-raised p-6 sm:p-8">
          <h2 className="font-serif text-xl text-ink">{privacyContent.contactPrompt.heading}</h2>
          <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-soft">
            {privacyContent.contactPrompt.body}
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button href="/contact" variant="secondary">
              Contact page
            </Button>
            <WhatsAppButton
              variant="secondary"
              location="privacy"
              message="Hi Bipin, I have a question about the privacy information on your website."
            />
          </div>
        </div>
      </Section>
    </>
  );
}
