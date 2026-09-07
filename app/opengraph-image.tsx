import { ImageResponse } from 'next/og';

import { siteConfig } from '@/content/site-config';

// Required by `output: 'export'` — the card is rendered once at build time.
export const dynamic = 'force-static';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = `${siteConfig.name} — ${siteConfig.role}`;

/**
 * Site-wide Open Graph card, rendered to a PNG at build time.
 *
 * Typography and the evidence figures carry the card — no stock imagery,
 * no fabricated dashboard screenshot.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          backgroundColor: '#FBFAF7',
          padding: '72px 80px',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              fontSize: 22,
              letterSpacing: 3,
              textTransform: 'uppercase',
              color: '#0E5D55',
              fontWeight: 600,
            }}
          >
            Performance Marketing · Meta Ads · Google Ads
          </div>

          <div
            style={{
              marginTop: 34,
              fontSize: 68,
              lineHeight: 1.08,
              color: '#15161A',
              fontWeight: 600,
              maxWidth: 940,
            }}
          >
            Performance marketing that turns ad spend into measurable growth.
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            borderTop: '1px solid #E6E2DA',
            paddingTop: 32,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 34, color: '#15161A', fontWeight: 600 }}>
              {siteConfig.name}
            </div>
            <div style={{ fontSize: 24, color: '#767B84', marginTop: 8 }}>
              {siteConfig.location}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 48 }}>
            {/*
              No rupee glyph here: the OG renderer's font fallback cannot
              resolve it, and a missing-glyph box on the social card is worse
              than choosing metrics that do not need one.
            */}
            {[
              { value: '1,617', label: 'Meta form submissions' },
              { value: '15 months', label: 'campaign evidence' },
            ].map((metric) => (
              <div key={metric.label} style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: 40, color: '#15161A', fontWeight: 600 }}>
                  {metric.value}
                </div>
                <div style={{ fontSize: 20, color: '#767B84', marginTop: 6 }}>{metric.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
