import { label } from '../../content/anonymise';
import type { EvidenceKind } from '../../content/types';
import { evidenceOf, fmt, metricPair, metricValue } from '../metrics';
import { ICONS } from './icons';
import type { IconName } from './icon-names';
import { EVIDENCE_TOKEN, LABEL_TOKEN, METRIC_TOKEN, parseMetricToken } from './token-grammar';

/**
 * Renders a snapshot document into the values the pages consume.
 *
 * - metric tokens            → formatted figures (canonical registry)
 * - `{{evidence:<id>}}`      → the metric's evidence grade (absent when ungraded)
 * - label tokens             → client/campaign names (anonymisation switch)
 * - `{ "$pair": … }`         → a paired figure, re-checking mixed grades
 * - `{ "$metricValue": id }` → the unrounded number (chart geometry)
 * - `{ "$icon": name }`      → the icon component
 *
 * Any token left unresolved is an error, so a typo fails the build.
 */

function renderString(value: string): string | EvidenceKind | undefined {
  const evidence = EVIDENCE_TOKEN.exec(value);
  if (evidence) return evidenceOf(evidence[1]);

  const rendered = value
    .replace(METRIC_TOKEN, (_, id: string, format: string | undefined, optionText: string) => {
      const token = parseMetricToken(id, format, optionText);
      return fmt(token.id, token.format, token.options);
    })
    .replace(LABEL_TOKEN, (_, actual: string, anonymous: string) => label(actual, anonymous));

  if (rendered.includes('{{')) throw new Error(`Unresolved content token in "${value}"`);
  return rendered;
}

function renderValue(value: unknown): unknown {
  if (typeof value === 'string') return renderString(value);
  if (Array.isArray(value)) return value.map(renderValue);
  if (value === null || typeof value !== 'object') return value;

  const record = value as Record<string, unknown>;

  if ('$pair' in record) {
    const pair = record.$pair as {
      first: string;
      second: string;
      separator?: string;
      format?: Parameters<typeof fmt>[1];
      evidence?: EvidenceKind;
    };
    return metricPair(pair.first, pair.second, renderString(record.label as string) as string, {
      separator: pair.separator,
      format: pair.format,
      evidence: pair.evidence,
    });
  }
  if ('$metricValue' in record) return metricValue(record.$metricValue as string);
  if ('$icon' in record) {
    const icon = ICONS[record.$icon as IconName];
    if (!icon) throw new Error(`Unknown icon "${String(record.$icon)}"`);
    return icon;
  }

  const output: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(record)) {
    const rendered = renderValue(item);
    if (rendered !== undefined) output[key] = rendered;
  }
  return output;
}

export function renderContent<T>(content: unknown): T {
  return renderValue(content) as T;
}
