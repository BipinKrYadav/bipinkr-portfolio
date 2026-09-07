'use client';

import { AlertCircle, CheckCircle2, Loader2, Settings2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/Button';
import { adSpendOptions, formCopy, serviceOptions, setupNotice } from '@/content/pages/contact';
import { hasFormEndpoint, siteConfig } from '@/content/site-config';
import { track } from '@/lib/analytics';
import { trackContactFormSubmit } from '@/lib/tracking/events';
import { storePendingLead } from '@/lib/tracking/lead';
import { cn } from '@/lib/utils';

type FieldName =
  | 'name'
  | 'email'
  | 'company'
  | 'service'
  | 'problem'
  | 'phone'
  | 'adSpend'
  | 'website';

type Errors = Partial<Record<FieldName, string>>;
type Status = 'idle' | 'submitting' | 'success' | 'error';

const REQUIRED: FieldName[] = ['name', 'email', 'company', 'service', 'problem'];

const LABELS: Record<FieldName, string> = {
  name: 'Name',
  email: 'Email',
  company: 'Business / Company',
  service: 'Service',
  problem: 'What are you trying to solve?',
  phone: 'WhatsApp / Phone',
  adSpend: 'Monthly ad spend',
  website: 'Website / Landing page',
};

/**
 * Names used inside error sentences. The visible label for `problem` is a
 * question, which does not read as a noun in "<X> is required."
 */
const ERROR_NAMES: Record<FieldName, string> = {
  ...LABELS,
  problem: 'A short description of the problem',
};

/** Deliberately permissive: it catches typos, it does not police addresses. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function validate(values: Record<FieldName, string>): Errors {
  const errors: Errors = {};

  for (const field of REQUIRED) {
    if (values[field].trim().length === 0) {
      errors[field] = `${ERROR_NAMES[field]} is required.`;
    }
  }

  if (!errors.email && !EMAIL_PATTERN.test(values.email.trim())) {
    errors.email = 'Enter an email address I can reply to.';
  }

  if (!errors.problem && values.problem.trim().length < 10) {
    errors.problem = 'A sentence or two helps me give you a useful answer.';
  }

  return errors;
}

export function ContactForm() {
  const [status, setStatus] = useState<Status>('idle');
  const [errors, setErrors] = useState<Errors>({});
  // A ref, not state: `onFocusCapture` can fire twice before React commits a
  // state update, which would emit `contact_form_start` more than once.
  const startedRef = useRef(false);
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);

  // Move focus to the result message once it has actually rendered, so
  // screen reader users land on the outcome rather than hunting for it.
  useEffect(() => {
    if (status === 'success' || status === 'error') {
      statusRef.current?.focus();
    }
  }, [status]);

  /** Fires contact_form_start once, on first interaction. */
  const handleFirstInteraction = () => {
    if (startedRef.current) return;
    startedRef.current = true;
    track('contact_form_start');
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const values = Object.fromEntries(
      (Object.keys(LABELS) as FieldName[]).map((field) => [
        field,
        String(formData.get(field) ?? ''),
      ]),
    ) as Record<FieldName, string>;

    const nextErrors = validate(values);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      // Move focus to the first field with a problem.
      const firstError = (Object.keys(LABELS) as FieldName[]).find((field) => nextErrors[field]);
      if (firstError) {
        formRef.current?.querySelector<HTMLElement>(`[name="${firstError}"]`)?.focus();
      }
      return;
    }

    if (!hasFormEndpoint) {
      // No endpoint: say so rather than faking a successful submission.
      // Deliberately no tracking here — nothing was submitted, so there is
      // no submit attempt to measure and certainly no conversion.
      setStatus('error');
      return;
    }

    setStatus('submitting');

    // Fires when the submission process BEGINS. Not the conversion: this
    // request can still fail, and measuring attempts separately is how you
    // notice an endpoint that has quietly broken.
    trackContactFormSubmit({ service: values.service });

    try {
      const response = await fetch(siteConfig.formEndpoint, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: formData,
      });

      if (!response.ok) throw new Error(`Form endpoint responded ${response.status}`);

      // Confirmed accepted. Record the handoff — categorical fields only,
      // no name, email, phone, company or message body — then send the
      // visitor to /thank-you, which fires `generate_lead` exactly once.
      storePendingLead({ service: values.service, adSpendBand: values.adSpend });

      setStatus('success');
      formRef.current?.reset();
      router.push('/thank-you/');
    } catch {
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <div
        ref={statusRef}
        tabIndex={-1}
        role="status"
        className="rounded-card border border-accent-line bg-accent-soft p-8"
      >
        <CheckCircle2 aria-hidden="true" className="h-6 w-6 text-accent" />
        <h3 className="mt-4 font-serif text-display-sm text-ink">{formCopy.successHeading}</h3>
        <p className="mt-3 max-w-lg text-[1.0625rem] leading-relaxed text-ink-soft">
          {formCopy.successBody}
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Setup state: shown when no endpoint is configured. */}
      {!hasFormEndpoint ? (
        <div
          role="note"
          className="mb-8 rounded-card border border-[#E2D3B0] bg-[#F8F2E4] p-5"
        >
          <div className="flex gap-3">
            <Settings2 aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-evidence-reported" />
            <div>
              <p className="text-sm font-semibold text-ink">{setupNotice.heading}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{setupNotice.body}</p>
              {process.env.NODE_ENV === 'development' ? (
                <p className="mt-2 text-xs leading-relaxed text-ink-faint">
                  {setupNotice.developerNote}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <form
        ref={formRef}
        onSubmit={handleSubmit}
        onFocusCapture={handleFirstInteraction}
        noValidate
        className="space-y-6"
      >
        {/* Honeypot: bots fill it, people never see it. */}
        <div aria-hidden="true" className="absolute h-px w-px overflow-hidden opacity-0">
          <label htmlFor="company-website">Do not fill this in</label>
          <input id="company-website" name="_gotcha" type="text" tabIndex={-1} autoComplete="off" />
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <Field name="name" label={LABELS.name} required autoComplete="name" error={errors.name} />
          <Field
            name="email"
            label={LABELS.email}
            type="email"
            required
            autoComplete="email"
            error={errors.email}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <Field
            name="company"
            label={LABELS.company}
            required
            autoComplete="organization"
            error={errors.company}
          />
          <Field
            name="phone"
            label={LABELS.phone}
            type="tel"
            autoComplete="tel"
            hint="Optional"
            error={errors.phone}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <SelectField
            name="service"
            label={LABELS.service}
            required
            options={serviceOptions}
            placeholder="Select a service"
            error={errors.service}
          />
          <SelectField
            name="adSpend"
            label={LABELS.adSpend}
            options={adSpendOptions}
            placeholder="Select a range"
            hint="Optional"
            error={errors.adSpend}
          />
        </div>

        <Field
          name="website"
          label={LABELS.website}
          type="url"
          inputMode="url"
          placeholder="https://"
          hint="Optional"
          autoComplete="url"
          error={errors.website}
        />

        <Field
          name="problem"
          label={LABELS.problem}
          required
          textarea
          hint="Campaign performance, tracking you do not trust, leads that are not converting — whatever the actual issue is."
          error={errors.problem}
        />

        {/* Failure state */}
        {status === 'error' ? (
          <div
            ref={statusRef}
            tabIndex={-1}
            role="alert"
            className="rounded-card border border-[#E3C6C0] bg-[#F9EDEA] p-5"
          >
            <div className="flex gap-3">
              <AlertCircle
                aria-hidden="true"
                className="mt-0.5 h-5 w-5 shrink-0 text-evidence-limitation"
              />
              <div>
                <p className="text-sm font-semibold text-ink">
                  {hasFormEndpoint ? formCopy.errorHeading : setupNotice.heading}
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
                  {hasFormEndpoint ? formCopy.errorBody : setupNotice.body}
                </p>
              </div>
            </div>
          </div>
        ) : null}

        <div className="flex flex-col gap-4 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
          <Button
            type="submit"
            size="lg"
            disabled={status === 'submitting'}
            leadingIcon={
              status === 'submitting' ? (
                <Loader2 aria-hidden="true" className="h-4 w-4 motion-safe:animate-spin" />
              ) : undefined
            }
          >
            {status === 'submitting' ? formCopy.submittingLabel : formCopy.submitLabel}
          </Button>

          <p className="max-w-xs text-xs leading-relaxed text-ink-faint">{formCopy.privacyNote}</p>
        </div>
      </form>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Field primitives                                                    */
/* ------------------------------------------------------------------ */

interface FieldProps {
  name: FieldName;
  label: string;
  type?: string;
  required?: boolean;
  textarea?: boolean;
  hint?: string;
  error?: string;
  placeholder?: string;
  autoComplete?: string;
  inputMode?: 'url' | 'tel' | 'email' | 'text';
}

// `text-base` (16px) is deliberate and must not be reduced: iOS Safari
// auto-zooms the viewport when a focused input is smaller than 16px, which
// jerks the page mid-form on the site's only conversion path.
const controlClasses =
  'w-full rounded-card border bg-paper-raised px-3.5 py-2.5 text-base text-ink placeholder:text-ink-faint/70 transition-colors';

function Field({
  name,
  label,
  type = 'text',
  required = false,
  textarea = false,
  hint,
  error,
  placeholder,
  autoComplete,
  inputMode,
}: FieldProps) {
  const hintId = hint ? `${name}-hint` : undefined;
  const errorId = error ? `${name}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={textarea ? '' : 'min-w-0'}>
      <label htmlFor={name} className="block text-sm font-medium text-ink">
        {label}
        {required ? (
          <span className="ml-1 text-evidence-limitation" aria-hidden="true">
            *
          </span>
        ) : null}
        {required ? <span className="sr-only"> (required)</span> : null}
      </label>

      {hint ? (
        <p id={hintId} className="mt-1 max-w-[66ch] text-xs leading-relaxed text-ink-faint">
          {hint}
        </p>
      ) : null}

      {textarea ? (
        <textarea
          id={name}
          name={name}
          rows={5}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          placeholder={placeholder}
          className={cn(controlClasses, 'mt-2 resize-y', error ? 'border-evidence-limitation' : 'border-line-strong')}
        />
      ) : (
        <input
          id={name}
          name={name}
          type={type}
          required={required}
          inputMode={inputMode}
          autoComplete={autoComplete}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          placeholder={placeholder}
          className={cn(controlClasses, 'mt-2', error ? 'border-evidence-limitation' : 'border-line-strong')}
        />
      )}

      {error ? (
        <p id={errorId} role="alert" className="mt-2 text-sm text-evidence-limitation">
          {error}
        </p>
      ) : null}
    </div>
  );
}

interface SelectFieldProps {
  name: FieldName;
  label: string;
  options: { value: string; label: string }[];
  placeholder: string;
  required?: boolean;
  hint?: string;
  error?: string;
}

function SelectField({
  name,
  label,
  options,
  placeholder,
  required = false,
  hint,
  error,
}: SelectFieldProps) {
  const hintId = hint ? `${name}-hint` : undefined;
  const errorId = error ? `${name}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="min-w-0">
      <label htmlFor={name} className="block text-sm font-medium text-ink">
        {label}
        {required ? (
          <span className="ml-1 text-evidence-limitation" aria-hidden="true">
            *
          </span>
        ) : null}
        {required ? <span className="sr-only"> (required)</span> : null}
      </label>

      {hint ? (
        <p id={hintId} className="mt-1 max-w-[66ch] text-xs leading-relaxed text-ink-faint">
          {hint}
        </p>
      ) : null}

      <select
        id={name}
        name={name}
        required={required}
        defaultValue=""
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(controlClasses, 'mt-2 appearance-none', error ? 'border-evidence-limitation' : 'border-line-strong')}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.label}>
            {option.label}
          </option>
        ))}
      </select>

      {error ? (
        <p id={errorId} role="alert" className="mt-2 text-sm text-evidence-limitation">
          {error}
        </p>
      ) : null}
    </div>
  );
}
