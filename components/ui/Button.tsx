'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

import { track, type AnalyticsEvent, type AnalyticsProps } from '@/lib/analytics';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'primaryOnDark' | 'secondaryOnDark';
type Size = 'md' | 'lg' | 'sm';

interface BaseProps {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  className?: string;
  /** Fires this analytics event on click. No-op when analytics is unconfigured. */
  analyticsEvent?: AnalyticsEvent;
  analyticsProps?: AnalyticsProps;
  /** Icon rendered after the label. */
  trailingIcon?: ReactNode;
  leadingIcon?: ReactNode;
  fullWidth?: boolean;
}

interface LinkProps extends BaseProps {
  href: string;
  /** Force an external anchor (adds rel/target). Auto-detected for http(s). */
  external?: boolean;
  download?: boolean;
  type?: never;
  disabled?: never;
  onClick?: never;
}

interface ButtonElementProps extends BaseProps {
  href?: never;
  external?: never;
  download?: never;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  onClick?: () => void;
}

type ButtonProps = LinkProps | ButtonElementProps;

const base =
  'inline-flex items-center justify-center gap-2 rounded-pill font-semibold transition-[background-color,color,border-color,transform] duration-200 ease-out disabled:pointer-events-none disabled:opacity-55 motion-safe:active:translate-y-px';

const variants: Record<Variant, string> = {
  primary: 'bg-accent text-white hover:bg-accent-hover',
  secondary:
    'border border-line-strong bg-paper-raised text-ink hover:border-ink hover:bg-paper-raised',
  ghost: 'text-accent hover:text-accent-hover underline-offset-4 hover:underline px-0',
  primaryOnDark: 'bg-paper-raised text-ink hover:bg-white',
  secondaryOnDark:
    'border border-night-line bg-transparent text-ink-inverse hover:border-ink-inverse/60 hover:bg-white/5',
};

const sizes: Record<Size, string> = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-5 py-2.5 text-[0.9375rem]',
  lg: 'px-7 py-3.5 text-base',
};

export function Button(props: ButtonProps) {
  const {
    children,
    variant = 'primary',
    size = 'md',
    className,
    analyticsEvent,
    analyticsProps,
    trailingIcon,
    leadingIcon,
    fullWidth,
  } = props;

  // The ghost variant is inline text, so it takes no horizontal padding.
  // `min-h-11` (44px) keeps it a comfortable touch target without adding a
  // visible box — the extra height is transparent padding around the label.
  const classes = cn(
    base,
    variants[variant],
    variant === 'ghost' ? 'min-h-[2.75rem] py-2 text-[0.9375rem]' : sizes[size],
    fullWidth && 'w-full',
    className,
  );

  const handleClick = () => {
    if (analyticsEvent) track(analyticsEvent, analyticsProps);
  };

  const content = (
    <>
      {leadingIcon}
      {children}
      {trailingIcon}
    </>
  );

  if ('href' in props && props.href) {
    const isExternal =
      props.external ??
      (/^(https?:)?\/\//.test(props.href) || props.href.startsWith('mailto:'));

    if (isExternal || props.download) {
      return (
        <a
          href={props.href}
          className={classes}
          onClick={handleClick}
          {...(props.download ? { download: true } : {})}
          {...(isExternal && !props.download
            ? { target: '_blank', rel: 'noopener noreferrer' }
            : {})}
        >
          {content}
        </a>
      );
    }

    return (
      <Link href={props.href} className={classes} onClick={handleClick}>
        {content}
      </Link>
    );
  }

  const { type = 'button', disabled, onClick } = props as ButtonElementProps;

  return (
    <button
      type={type}
      disabled={disabled}
      className={classes}
      onClick={() => {
        handleClick();
        onClick?.();
      }}
    >
      {content}
    </button>
  );
}
