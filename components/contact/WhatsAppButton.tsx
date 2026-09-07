'use client';

import { Button } from '@/components/ui/Button';
import { WhatsAppIcon } from '@/components/ui/WhatsAppIcon';
import { hasWhatsApp, whatsappLink, whatsappMessage } from '@/content/site-config';

interface WhatsAppButtonProps {
  label?: string;
  message?: string;
  variant?: 'primary' | 'secondary' | 'primaryOnDark' | 'secondaryOnDark' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  fullWidth?: boolean;
  /** Where on the site this button sits, recorded with the analytics event. */
  location: string;
}

/**
 * WhatsApp CTA.
 *
 * Renders nothing at all when no number is configured. A visible button
 * that leads to a broken wa.me link is worse than no button.
 */
export function WhatsAppButton({
  label = 'Chat on WhatsApp',
  message = whatsappMessage,
  variant = 'secondary',
  size = 'md',
  className,
  fullWidth,
  location,
}: WhatsAppButtonProps) {
  const href = whatsappLink(message);

  if (!hasWhatsApp || !href) return null;

  return (
    <Button
      href={href}
      external
      variant={variant}
      size={size}
      className={className}
      fullWidth={fullWidth}
      analyticsEvent="whatsapp_click"
      analyticsProps={{ location }}
      leadingIcon={<WhatsAppIcon />}
    >
      {label}
    </Button>
  );
}
