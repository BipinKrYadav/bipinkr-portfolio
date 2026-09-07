import Script from 'next/script';

import { CONSENT_DEFAULT_SCRIPT } from '@/lib/tracking/consent';
import {
  consentRequired,
  hasGa4,
  hasGoogleAds,
  hasGtm,
  hasMetaPixel,
  trackingConfig,
  trackingEnabled,
} from '@/lib/tracking/config';

/**
 * The only place tracking scripts are loaded.
 *
 * Order matters and is enforced here:
 *
 *   1. Consent Mode v2 defaults (denied)  — only when consent mode is on
 *   2. Platform ID config into dataLayer  — so GTM can read them as variables
 *   3. GTM container                      — the tag-management layer
 *   4. Direct loaders                     — only as a fallback when GTM is absent
 *
 * With no IDs configured this component renders `null`: no script tag, no
 * third-party request, no cookie. That is the default state of the repo.
 */
/**
 * Step 1: Consent Mode v2 defaults.
 *
 * Rendered into <head> by the root layout as a plain inline <script>, not
 * via next/script. Consent defaults must execute *synchronously, before any
 * tag* — a deferred or hydration-timed script would let GTM evaluate first,
 * which is exactly the failure this is meant to prevent. Google's own
 * documentation specifies a blocking inline script for this reason.
 *
 * Renders nothing unless consent mode is `required`.
 */
export function ConsentDefaults() {
  if (!consentRequired) return null;

  return (
    <script
      id="consent-default"
      // Static string from lib/tracking/consent.ts. No user or env input.
      dangerouslySetInnerHTML={{ __html: CONSENT_DEFAULT_SCRIPT }}
    />
  );
}

export function TrackingScripts() {
  if (!trackingEnabled) return null;

  return (
    <>
      {/*
        2. Platform IDs into the dataLayer.
        GTM tags read these as dataLayer variables, so the container holds no
        hard-coded IDs and the same container works across environments.
      */}
      <Script id="tracking-config" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          window.dataLayer.push(${JSON.stringify({
            event: 'tracking_config',
            ga4_measurement_id: trackingConfig.ga4Id || undefined,
            google_ads_id: trackingConfig.googleAdsId || undefined,
            meta_pixel_id: trackingConfig.metaPixelId || undefined,
            consent_mode: trackingConfig.consentMode,
          })});
        `}
      </Script>

      {/* 3. Google Tag Manager — the primary tag-management layer. */}
      {hasGtm ? (
        <>
          <Script id="gtm-loader" strategy="afterInteractive">
            {`
              (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
              new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
              j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
              'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
              })(window,document,'script','dataLayer','${trackingConfig.gtmId}');
            `}
          </Script>

          {/*
            The <noscript> iframe is intentionally omitted. It cannot fire
            any of this site's conversions (they are all JavaScript events),
            it adds a third-party request for visitors who cannot be measured
            anyway, and Next.js cannot place it immediately after <body>.
          */}
        </>
      ) : null}

      {/*
        4. Direct loaders — fallback only.

        These run *only* when no GTM container is configured. GTM is the
        intended path: configure GA4, Google Ads and Meta Pixel as tags
        inside the container rather than relying on these.
      */}
      {!hasGtm && (hasGa4 || hasGoogleAds) ? (
        <>
          <Script
            id="gtag-loader"
            src={`https://www.googletagmanager.com/gtag/js?id=${
              trackingConfig.ga4Id || trackingConfig.googleAdsId
            }`}
            strategy="afterInteractive"
          />
          <Script id="gtag-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              window.gtag = gtag;
              gtag('js', new Date());
              ${hasGa4 ? `gtag('config', '${trackingConfig.ga4Id}');` : ''}
              ${hasGoogleAds ? `gtag('config', '${trackingConfig.googleAdsId}');` : ''}
            `}
          </Script>
        </>
      ) : null}

      {!hasGtm && hasMetaPixel ? (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window,document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${trackingConfig.metaPixelId}');
            fbq('track', 'PageView');
          `}
        </Script>
      ) : null}
    </>
  );
}
