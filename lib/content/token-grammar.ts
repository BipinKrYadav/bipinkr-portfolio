import { METRIC_FORMATS, type FormatOptions, type MetricFormat } from '../metrics/format';

/**
 * The content token grammar.
 *
 * Snapshot documents never contain an evidence-backed figure. They contain
 * references that are resolved when the site is built:
 *
 *   {{metric:<id>}}                    default display format
 *   {{metric:<id>|<format>}}           a specific format
 *   {{metric:<id>|<format>|+}}         with the lower-bound "+" marker
 *   {{metric:<id>||suffix= CPL}}       text appended only when a value exists
 *   {{evidence:<id>}}                  the metric's evidence grade (whole field)
 *   {{label:<actual>|<anonymous>}}     a client or campaign name (anonymisation switch)
 *
 * This module is pure: it imports no registry, so schemas can use it.
 */

const ID = '[a-z0-9_]+(?:\\.[a-z0-9_]+){1,5}';

export const METRIC_TOKEN = new RegExp(`\\{\\{metric:(${ID})(?:\\|([a-z0-9_]*))?((?:\\|[^|{}]+)*)\\}\\}`, 'g');
export const EVIDENCE_TOKEN = new RegExp(`^\\{\\{evidence:(${ID})\\}\\}$`);
export const LABEL_TOKEN = /\{\{label:([^|{}]+)\|([^|{}]+)\}\}/g;
export const METRIC_ID = new RegExp(`^${ID}$`);

const FORMATS = new Set<string>(METRIC_FORMATS);

function assertTokenText(text: string, what: string): void {
  if (/[|{}]/.test(text)) throw new Error(`${what} cannot contain "|", "{" or "}": "${text}"`);
}

export function metricToken(id: string, format?: MetricFormat, options: FormatOptions = {}): string {
  const parts = [format ?? ''];
  if (options.lowerBoundMarker) parts.push('+');
  if (options.suffix !== undefined) {
    assertTokenText(options.suffix, 'A metric suffix');
    parts.push(`suffix=${options.suffix}`);
  }
  while (parts.length > 0 && parts[parts.length - 1] === '') parts.pop();
  return `{{metric:${id}${parts.map((part) => `|${part}`).join('')}}}`;
}

export function evidenceToken(id: string): string {
  return `{{evidence:${id}}}`;
}

export function labelToken(actual: string, anonymous: string): string {
  assertTokenText(actual, 'A label');
  assertTokenText(anonymous, 'A label');
  return `{{label:${actual}|${anonymous}}}`;
}

export interface ParsedMetricToken {
  id: string;
  format: MetricFormat | undefined;
  options: FormatOptions;
}

/** Parses the format and option parts of a metric token; throws on anything unknown. */
export function parseMetricToken(id: string, format: string | undefined, optionText: string): ParsedMetricToken {
  if (format && !FORMATS.has(format)) throw new Error(`Unknown metric format "${format}" in token for ${id}`);
  const options: FormatOptions = {};
  for (const option of optionText.split('|').slice(1)) {
    if (option === '+') options.lowerBoundMarker = true;
    else if (option.startsWith('suffix=')) options.suffix = option.slice('suffix='.length);
    else throw new Error(`Unknown metric token option "${option}" for ${id}`);
  }
  return { id, format: (format || undefined) as MetricFormat | undefined, options };
}

/** True when every `{{…}}` in the text is a well-formed metric or label token. */
export function hasOnlyKnownTokens(text: string): boolean {
  try {
    const remainder = text
      .replace(METRIC_TOKEN, (_, id: string, format: string | undefined, optionText: string) => {
        parseMetricToken(id, format, optionText);
        return '';
      })
      .replace(LABEL_TOKEN, '');
    return !remainder.includes('{{') && !remainder.includes('}}');
  } catch {
    return false;
  }
}

/** Every metric id referenced anywhere in a document value. */
export function collectMetricReferences(value: unknown, into: Set<string> = new Set()): Set<string> {
  if (typeof value === 'string') {
    for (const match of value.matchAll(METRIC_TOKEN)) into.add(match[1]);
    const evidence = EVIDENCE_TOKEN.exec(value);
    if (evidence) into.add(evidence[1]);
  } else if (Array.isArray(value)) {
    for (const item of value) collectMetricReferences(item, into);
  } else if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (typeof record.$metricValue === 'string') into.add(record.$metricValue);
    const pair = record.$pair as { first?: unknown; second?: unknown } | undefined;
    if (pair) {
      if (typeof pair.first === 'string') into.add(pair.first);
      if (typeof pair.second === 'string') into.add(pair.second);
    }
    for (const item of Object.values(record)) collectMetricReferences(item, into);
  }
  return into;
}
