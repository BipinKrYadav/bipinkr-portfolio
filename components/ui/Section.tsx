import type { ReactNode } from 'react';

import { Container } from './Container';
import { cn } from '@/lib/utils';

interface SectionProps {
  children: ReactNode;
  className?: string;
  containerClassName?: string;
  /** Page ground, a slightly sunk warm tone, or a dark contrast band. */
  tone?: 'paper' | 'sunk' | 'night';
  /** Vertical rhythm. */
  spacing?: 'default' | 'compact' | 'none';
  /** Hairline separator above the section. */
  bordered?: boolean;
  width?: 'wide' | 'prose' | 'measure';
  id?: string;
  'aria-labelledby'?: string;
}

const tones = {
  paper: 'bg-paper text-ink',
  sunk: 'bg-paper-sunk text-ink',
  night: 'bg-night text-ink-inverse on-night',
} as const;

const spacings = {
  default: 'py-section',
  compact: 'py-section-sm',
  none: '',
} as const;

export function Section({
  children,
  className,
  containerClassName,
  tone = 'paper',
  spacing = 'default',
  bordered = false,
  width = 'wide',
  id,
  ...rest
}: SectionProps) {
  return (
    <section
      id={id}
      className={cn(tones[tone], spacings[spacing], bordered && 'border-t border-line', className)}
      {...rest}
    >
      <Container width={width} className={containerClassName}>
        {children}
      </Container>
    </section>
  );
}
