import {
  BarChart3,
  BrainCircuit,
  Eye,
  Gauge,
  LayoutTemplate,
  LineChart,
  Search,
  ShieldCheck,
  Target,
  Workflow,
  type LucideIcon,
} from 'lucide-react';

import type { IconName } from './icon-names';

/** Icon name → component, for `{ "$icon": "…" }` references in snapshot documents. */
export const ICONS: Record<IconName, LucideIcon> = {
  BarChart3,
  BrainCircuit,
  Eye,
  Gauge,
  LayoutTemplate,
  LineChart,
  Search,
  ShieldCheck,
  Target,
  Workflow,
};
