// Catalogue of delivery channels for DELIVERY orders, tuned for the Saudi
// market. Brand-tinted badges (not official logos) keep this trademark-safe;
// swap `badgeClass` / add real logo assets later if licensed.

export type DeliverySourceKey =
  | 'IN_HOUSE'
  | 'JAHEZ'
  | 'HUNGERSTATION'
  | 'TOYOU'
  | 'KEETA'
  | 'MRSOOL';

export interface DeliverySourceMeta {
  key: DeliverySourceKey;
  label: string; // Arabic label
  short: string;
  /** Single-letter mark shown in the coloured chip. */
  mark: string;
  /** Tailwind classes for the branded chip (bg + text, light & dark). */
  badgeClass: string;
  /** Solid brand-ish colour for the letter mark background. */
  markClass: string;
}

export const DELIVERY_SOURCES: Record<DeliverySourceKey, DeliverySourceMeta> = {
  IN_HOUSE: {
    key: 'IN_HOUSE',
    label: 'توصيل المطعم',
    short: 'المطعم',
    mark: 'م',
    badgeClass: 'bg-slate-100 text-slate-700 dark:bg-slate-800/60 dark:text-slate-300',
    markClass: 'bg-slate-500 text-white',
  },
  JAHEZ: {
    key: 'JAHEZ',
    label: 'جاهز',
    short: 'جاهز',
    mark: 'ج',
    badgeClass: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    markClass: 'bg-red-600 text-white',
  },
  HUNGERSTATION: {
    key: 'HUNGERSTATION',
    label: 'هنقرستيشن',
    short: 'هنقرستيشن',
    mark: 'H',
    badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    markClass: 'bg-amber-400 text-amber-950',
  },
  TOYOU: {
    key: 'TOYOU',
    label: 'تو يو',
    short: 'تو يو',
    mark: 'T',
    badgeClass: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
    markClass: 'bg-teal-600 text-white',
  },
  KEETA: {
    key: 'KEETA',
    label: 'كيتا',
    short: 'كيتا',
    mark: 'K',
    badgeClass: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    markClass: 'bg-yellow-400 text-yellow-950',
  },
  MRSOOL: {
    key: 'MRSOOL',
    label: 'مرسول',
    short: 'مرسول',
    mark: 'M',
    badgeClass: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    markClass: 'bg-orange-500 text-white',
  },
};

export const DELIVERY_SOURCE_ORDER: DeliverySourceKey[] = [
  'IN_HOUSE',
  'JAHEZ',
  'HUNGERSTATION',
  'TOYOU',
  'KEETA',
  'MRSOOL',
];

export function deliverySourceLabel(key: string): string {
  return DELIVERY_SOURCES[key as DeliverySourceKey]?.label ?? key;
}

export function deliverySourceMeta(key: string): DeliverySourceMeta | null {
  return DELIVERY_SOURCES[key as DeliverySourceKey] ?? null;
}
