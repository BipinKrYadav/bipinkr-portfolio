'use client';

/**
 * Campaign attribution.
 *
 * Captures UTM parameters on the first page of a session and preserves them
 * for the rest of it, so a lead submitted three pages later can still be
 * attributed to the campaign that brought the visitor in.
 *
 * Scope and limits, deliberately:
 * - `sessionStorage` only. It clears when the tab closes, is never sent
 *   anywhere by itself, and is not readable across sites.
 * - Campaign metadata only. No name, email, IP, fingerprint or identifier of
 *   any kind is captured here.
 * - First-touch within the session wins. A visitor who arrives from a
 *   campaign and later navigates internally keeps the original attribution.
 */

const STORAGE_KEY = 'bk_attribution';

/** The five standard UTM parameters, plus the Google/Meta click ids. */
const UTM_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
] as const;

const CLICK_ID_KEYS = ['gclid', 'wbraid', 'gbraid', 'fbclid'] as const;

export type UtmKey = (typeof UTM_KEYS)[number];
export type ClickIdKey = (typeof CLICK_ID_KEYS)[number];

export type Attribution = Partial<Record<UtmKey | ClickIdKey, string>> & {
  /** Referring hostname only — never the full referring URL. */
  referrer_host?: string;
  /** Path the visitor first landed on this session. */
  landing_page?: string;
};

/** Guards against oversized or junk values ending up in an event. */
function sanitise(value: string | null): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim().slice(0, 120);
  return trimmed.length > 0 ? trimmed : undefined;
}

function read(): Attribution | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Attribution) : null;
  } catch {
    // Private mode, disabled storage, or corrupt JSON.
    return null;
  }
}

function write(value: Attribution): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Storage unavailable — attribution is simply not preserved.
  }
}

/**
 * Reads campaign parameters from the current URL.
 * Returns an empty object when the URL carries none.
 */
function fromCurrentUrl(): Attribution {
  const result: Attribution = {};

  try {
    const params = new URLSearchParams(window.location.search);

    for (const key of UTM_KEYS) {
      const value = sanitise(params.get(key));
      if (value) result[key] = value;
    }

    for (const key of CLICK_ID_KEYS) {
      const value = sanitise(params.get(key));
      if (value) result[key] = value;
    }
  } catch {
    return {};
  }

  return result;
}

/**
 * Captures attribution once per session.
 *
 * Called on first mount. Subsequent calls are cheap no-ops unless the
 * visitor arrives on a *new* campaign URL mid-session, which overwrites the
 * stored record — a fresh campaign click is genuinely new attribution.
 */
export function captureAttribution(): Attribution {
  if (typeof window === 'undefined') return {};

  const existing = read();
  const fromUrl = fromCurrentUrl();
  const hasCampaignInUrl = Object.keys(fromUrl).length > 0;

  if (existing && !hasCampaignInUrl) return existing;

  let referrerHost: string | undefined;
  try {
    if (document.referrer) {
      const url = new URL(document.referrer);
      // Ignore internal navigation; only external referrers are meaningful.
      if (url.hostname !== window.location.hostname) referrerHost = url.hostname;
    }
  } catch {
    referrerHost = undefined;
  }

  const captured: Attribution = {
    ...(existing ?? {}),
    ...fromUrl,
  };

  if (!captured.landing_page) captured.landing_page = window.location.pathname;
  if (!captured.referrer_host && referrerHost) captured.referrer_host = referrerHost;

  write(captured);
  return captured;
}

/** Returns the stored attribution, or an empty object. */
export function getAttribution(): Attribution {
  if (typeof window === 'undefined') return {};
  return read() ?? {};
}

/**
 * Flattens attribution into event parameters.
 * Keys are already namespaced (`utm_*`, `gclid`, …) so no prefix is added.
 */
export function attributionParams(): Record<string, string> {
  const attribution = getAttribution();
  const params: Record<string, string> = {};

  for (const [key, value] of Object.entries(attribution)) {
    if (typeof value === 'string' && value.length > 0) params[key] = value;
  }

  return params;
}
