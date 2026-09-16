/**
 * Icons a snapshot document may reference by name. The components themselves
 * are mapped in ./icons.ts; this list stays import-free so schemas can use it.
 */
export const ICON_NAMES = [
  'BarChart3',
  'BrainCircuit',
  'Eye',
  'Gauge',
  'LayoutTemplate',
  'LineChart',
  'Search',
  'ShieldCheck',
  'Target',
  'Workflow',
] as const;

export type IconName = (typeof ICON_NAMES)[number];
