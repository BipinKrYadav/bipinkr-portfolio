/**
 * Tracking configuration.
 *
 * Every ID is read from a public environment variable and is optional. An
 * unset — or malformed — ID means that platform is simply not loaded. The
 * site builds, renders and converts identically with all of them empty.
 *
 * IDs are interpolated into script URLs, so each is validated against its
 * platform's documented format. A value that does not match is treated as
 * absent rather than injected, which keeps a typo (or a hostile env value)
 * from ending up inside a <script src>.
 */

/**
 * Read as literal member expressions, never `process.env[key]`.
 *
 * Next.js substitutes these textually at build time; a computed lookup is
 * skipped by that substitution and resolves to `undefined` in the browser,
 * where `process` does not exist. See the same note in
 * `content/site-config.ts`. Do not refactor into a lookup helper.
 */
const clean = (value: string | undefined): string =>
  typeof value === 'string' ? value.trim() : '';

const rawEnv = {
  gtmId: clean(process.env.NEXT_PUBLIC_GTM_ID),
  ga4Id: clean(process.env.NEXT_PUBLIC_GA4_ID),
  googleAdsId: clean(process.env.NEXT_PUBLIC_GOOGLE_ADS_ID),
  metaPixelId: clean(process.env.NEXT_PUBLIC_META_PIXEL_ID),
  consentMode: clean(process.env.NEXT_PUBLIC_CONSENT_MODE),
  trackingDebug: clean(process.env.NEXT_PUBLIC_TRACKING_DEBUG),
};

/** Returns the value only when it matches the platform's ID format. */
const validated = (value: string, pattern: RegExp): string =>
  pattern.test(value) ? value : '';

const GTM_PATTERN = /^GTM-[A-Z0-9]{4,10}$/i;
const GA4_PATTERN = /^G-[A-Z0-9]{6,12}$/i;
const GOOGLE_ADS_PATTERN = /^AW-\d{9,12}$/i;
const META_PIXEL_PATTERN = /^\d{10,20}$/;

/**
 * Consent handling.
 *
 * - `off`      No consent gating. Tags load normally. Appropriate only where
 *              consent is not legally required, or where consent is handled
 *              entirely outside this site.
 * - `required` Google Consent Mode v2 defaults are set to *denied* before GTM
 *              loads. Tags stay held until a real consent platform calls
 *              `grantConsent()`. This site does not ship a consent banner —
 *              see `lib/tracking/consent.ts`.
 */
export type ConsentMode = 'off' | 'required';

const rawConsentMode = rawEnv.consentMode.toLowerCase();
const consentMode: ConsentMode = rawConsentMode === 'required' ? 'required' : 'off';

export const trackingConfig = {
  /** Primary tag-management layer. Everything else is configured inside it. */
  gtmId: validated(rawEnv.gtmId, GTM_PATTERN),

  /**
   * These three are normally configured as tags *inside* GTM rather than
   * loaded directly. They are exposed here for two reasons: they are pushed
   * into the dataLayer so GTM tags can read them as variables, and they act
   * as a direct-load fallback when no GTM container is configured.
   */
  ga4Id: validated(rawEnv.ga4Id, GA4_PATTERN),
  googleAdsId: validated(rawEnv.googleAdsId, GOOGLE_ADS_PATTERN),
  metaPixelId: validated(rawEnv.metaPixelId, META_PIXEL_PATTERN),

  consentMode,

  /** Mirrors every dataLayer push to the console. Never on in production. */
  debug: rawEnv.trackingDebug === 'true' && process.env.NODE_ENV !== 'production',
} as const;

export const hasGtm = trackingConfig.gtmId.length > 0;
export const hasGa4 = trackingConfig.ga4Id.length > 0;
export const hasGoogleAds = trackingConfig.googleAdsId.length > 0;
export const hasMetaPixel = trackingConfig.metaPixelId.length > 0;

/** True when at least one platform is configured. */
export const trackingEnabled = hasGtm || hasGa4 || hasGoogleAds || hasMetaPixel;

/**
 * True when GTM is absent but a platform ID is set, meaning that platform is
 * loaded directly instead. GTM is the intended path; this is the fallback.
 */
export const usesDirectLoad = !hasGtm && (hasGa4 || hasMetaPixel);

export const consentRequired = trackingConfig.consentMode === 'required';
