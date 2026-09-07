import type { ElementType, ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface ContainerProps {
  children: ReactNode;
  className?: string;
  /** `wide` for full sections, `prose` for long-form reading columns. */
  width?: 'wide' | 'prose' | 'measure';
  as?: ElementType;
}

const widths = {
  wide: 'max-w-container',
  prose: 'max-w-prose',
  measure: 'max-w-measure',
} as const;

export function Container({ children, className, width = 'wide', as: Tag = 'div' }: ContainerProps) {
  return (
    <Tag className={cn('mx-auto w-full px-5 sm:px-8', widths[width], className)}>{children}</Tag>
  );
}
