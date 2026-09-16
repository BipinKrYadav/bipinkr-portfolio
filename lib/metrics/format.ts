/**
 * Display formatting for metric values.
 *
 * This is the only place a metric's number becomes text. Values are stored
 * unrounded; each format rounds for display only. Indian digit grouping
 * (1,11,000) is used throughout, matching how the site already writes rupees.
 */

export type MetricFormat =
  /** ₹49,722.95 */
  | 'inr'
  /** ₹2,519 */
  | 'inr_whole'
  /** ₹1.11L */
  | 'inr_lakh'
  /** ₹38.9K */
  | 'inr_thousands_1dp'
  /** ₹20.19K */
  | 'inr_thousands_2dp'
  /** 1,540 */
  | 'integer'
  /** 35% */
  | 'percent_0dp'
  /** 34.9% */
  | 'percent_1dp'
  /** 5.85% */
  | 'percent_2dp'
  /** 6× */
  | 'multiple_0dp'
  /** 1.8× */
  | 'multiple_1dp'
  /** 15 months */
  | 'months'
  /** five */
  | 'words'
  /** Five */
  | 'words_capitalised';

/** Every format, for schemas and token validation. Kept in step with `MetricFormat` by the type check below. */
export const METRIC_FORMATS = [
  'inr',
  'inr_whole',
  'inr_lakh',
  'inr_thousands_1dp',
  'inr_thousands_2dp',
  'integer',
  'percent_0dp',
  'percent_1dp',
  'percent_2dp',
  'multiple_0dp',
  'multiple_1dp',
  'months',
  'words',
  'words_capitalised',
] as const satisfies readonly MetricFormat[];

type MissingFormats = Exclude<MetricFormat, (typeof METRIC_FORMATS)[number]>;
const everyFormatListed: [MissingFormats] extends [never] ? true : never = true;
void everyFormatListed;

export interface FormatOptions {
  /** Append "+" when the stored value is only a lower bound. */
  lowerBoundMarker?: boolean;
  /** Text appended only when a value exists, e.g. " CPL". A missing value still renders as "—". */
  suffix?: string;
}

/** Rendered wherever a value is missing or not calculable. */
export const EMPTY_VALUE = '—';

const numberFormats = new Map<number, Intl.NumberFormat>();

function grouped(value: number, decimals: number): string {
  let format = numberFormats.get(decimals);
  if (!format) {
    format = new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    numberFormats.set(decimals, format);
  }
  return format.format(value);
}

const WORDS = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen',
  'nineteen', 'twenty',
];

function inWords(value: number): string {
  return Number.isInteger(value) && value >= 0 && value < WORDS.length
    ? WORDS[value]
    : grouped(value, 0);
}

export function formatValue(
  value: number | null,
  format: MetricFormat,
  isLowerBound = false,
  options: FormatOptions = {},
): string {
  if (value === null) return EMPTY_VALUE;
  return `${formatNumber(value, format, options.lowerBoundMarker && isLowerBound ? '+' : '')}${options.suffix ?? ''}`;
}

function formatNumber(value: number, format: MetricFormat, marker: string): string {
  switch (format) {
    case 'inr':
      return `₹${grouped(value, 2)}${marker}`;
    case 'inr_whole':
      return `₹${grouped(value, 0)}${marker}`;
    case 'inr_lakh':
      return `₹${grouped(value / 100_000, 2)}L${marker}`;
    case 'inr_thousands_1dp':
      return `₹${grouped(value / 1_000, 1)}K${marker}`;
    case 'inr_thousands_2dp':
      return `₹${grouped(value / 1_000, 2)}K${marker}`;
    case 'integer':
      return `${grouped(value, 0)}${marker}`;
    case 'percent_0dp':
      return `${grouped(value, 0)}%`;
    case 'percent_1dp':
      return `${grouped(value, 1)}%`;
    case 'percent_2dp':
      return `${grouped(value, 2)}%`;
    case 'multiple_0dp':
      return `${grouped(value, 0)}×`;
    case 'multiple_1dp':
      return `${grouped(value, 1)}×`;
    case 'months':
      return `${grouped(value, 0)} ${value === 1 ? 'month' : 'months'}`;
    case 'words':
      return inWords(value);
    case 'words_capitalised': {
      const words = inWords(value);
      return words.charAt(0).toUpperCase() + words.slice(1);
    }
  }
}
