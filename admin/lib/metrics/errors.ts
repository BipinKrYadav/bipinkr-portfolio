/**
 * Errors from the data layer, in terms the UI can act on. Database errors are
 * classified by SQLSTATE, which PostgREST passes through unchanged, so the
 * same mapping serves the real adapter and the offline test adapter.
 */

export type DataErrorKind =
  | 'unavailable'
  | 'unauthenticated'
  | 'permission_denied'
  | 'validation'
  | 'not_found'
  | 'conflict'
  | 'unknown';

export interface DataError {
  kind: DataErrorKind;
  message: string;
  /** Individual problems, e.g. every formula issue or every archive blocker. */
  details?: string[];
}

export type DataResult<T> = { ok: true; data: T } | { ok: false; error: DataError };

export const ok = <T>(data: T): DataResult<T> => ({ ok: true, data });
export const fail = <T>(kind: DataErrorKind, message: string, details?: string[]): DataResult<T> => ({
  ok: false,
  error: details ? { kind, message, details } : { kind, message },
});

/** Error raised by a gateway: a database or transport failure. */
export class GatewayError extends Error {
  /** SQLSTATE or PostgREST code; 'network' when the database could not be reached. */
  code: string;
  status: number | null;

  constructor(code: string, message: string, status: number | null = null) {
    super(message);
    this.name = 'GatewayError';
    this.code = code;
    this.status = status;
  }
}

const CONSTRAINT_MESSAGES: Record<string, string> = {
  metrics_currency_matches_type: 'Currency must be INR for a currency metric, and empty for any other value type.',
  metrics_raw_shape: 'A raw metric cannot have a formula or a legacy method note.',
  metrics_calculated_shape:
    'A calculated metric needs a formula, no stored value, data origin "derived" and source type "calculation".',
  metrics_legacy_shape: 'A legacy fixed metric needs a value and a method note, and no formula.',
  metrics_period_order: 'The reporting period cannot end before it starts.',
  metrics_formula_check: 'The formula is not one of the supported calculations.',
  metrics_value_check: 'The value must be a finite number.',
  metrics_name_check: 'Name cannot be blank.',
  metrics_description_check: 'Description cannot be blank.',
  metrics_reporting_period_note_check: 'Reporting period note cannot be blank.',
  metrics_currency_check: 'Currency must be INR.',
};

export function toDataError(error: unknown): DataError {
  if (!(error instanceof GatewayError)) {
    return { kind: 'unknown', message: 'Something went wrong. The change was not saved.' };
  }

  const { code, message, status } = error;

  if (code === 'network') {
    return { kind: 'unavailable', message: 'The database could not be reached. Check your connection and try again.' };
  }
  if (code === 'unauthenticated' || code === 'PGRST301' || code === 'PGRST302' || status === 401) {
    return { kind: 'unauthenticated', message: 'Your session has ended. Sign in again with your authenticator code.' };
  }
  if (code === '42501' || status === 403) {
    return { kind: 'permission_denied', message: 'You do not have permission to do this.' };
  }
  if (code === '23514') {
    const constraint = Object.keys(CONSTRAINT_MESSAGES).find((name) => message.includes(`"${name}"`));
    return { kind: 'validation', message: constraint ? CONSTRAINT_MESSAGES[constraint] : 'The change breaks a data rule.' };
  }
  if (code === 'P0001') {
    // Raised by the database's own guards; their messages are written for people.
    return { kind: 'validation', message };
  }
  if (code === '22P02' || code === '22007' || code === '22008' || code === '22003') {
    return { kind: 'validation', message: 'A value has the wrong format.' };
  }
  if (code === '23505') {
    return { kind: 'validation', message: 'That value is already used by another record.' };
  }
  if (code === '23503') {
    return { kind: 'validation', message: 'The change refers to a record that does not exist.' };
  }
  return { kind: 'unknown', message: 'The database rejected the change.' };
}
