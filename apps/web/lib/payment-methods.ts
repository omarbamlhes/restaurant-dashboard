// Central catalogue of the payment rails the POS supports, tuned for the
// Saudi market. Kept in sync with the Prisma `PaymentMethod` enum. We use
// brand-tinted text badges (not logos) to stay clear of trademark assets.

export type PaymentMethodKey =
  | 'CASH'
  | 'CARD'
  | 'MADA'
  | 'STC_PAY'
  | 'APPLE_PAY'
  | 'TABBY'
  | 'TAMARA'
  | 'SPLIT';

export type PaymentCategory = 'cash' | 'cashless' | 'split';

export interface PaymentMethodMeta {
  key: PaymentMethodKey;
  label: string; // Arabic label
  short: string; // compact label for badges/tables
  category: PaymentCategory;
  isBnpl?: boolean; // buy-now-pay-later (Tabby / Tamara)
  /** Tailwind classes for a small branded pill (bg + text, light & dark). */
  badgeClass: string;
}

export const PAYMENT_METHODS: Record<PaymentMethodKey, PaymentMethodMeta> = {
  CASH: {
    key: 'CASH',
    label: 'نقدي',
    short: 'نقدي',
    category: 'cash',
    badgeClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  },
  CARD: {
    key: 'CARD',
    label: 'بطاقة',
    short: 'بطاقة',
    category: 'cashless',
    badgeClass: 'bg-slate-100 text-slate-700 dark:bg-slate-800/60 dark:text-slate-300',
  },
  MADA: {
    key: 'MADA',
    label: 'مدى',
    short: 'مدى',
    category: 'cashless',
    badgeClass: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  },
  STC_PAY: {
    key: 'STC_PAY',
    label: 'STC Pay',
    short: 'STC Pay',
    category: 'cashless',
    badgeClass: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  },
  APPLE_PAY: {
    key: 'APPLE_PAY',
    label: 'Apple Pay',
    short: 'Apple Pay',
    category: 'cashless',
    badgeClass: 'bg-gray-200 text-gray-800 dark:bg-gray-700/60 dark:text-gray-100',
  },
  TABBY: {
    key: 'TABBY',
    label: 'تابي (تقسيط)',
    short: 'تابي',
    category: 'cashless',
    isBnpl: true,
    badgeClass: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
  },
  TAMARA: {
    key: 'TAMARA',
    label: 'تمارا (تقسيط)',
    short: 'تمارا',
    category: 'cashless',
    isBnpl: true,
    badgeClass: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  },
  SPLIT: {
    key: 'SPLIT',
    label: 'مقسم',
    short: 'مقسم',
    category: 'split',
    badgeClass: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  },
};

/** Ordered list for rendering the POS payment picker. */
export const PAYMENT_METHOD_ORDER: PaymentMethodKey[] = [
  'CASH',
  'CARD',
  'MADA',
  'STC_PAY',
  'APPLE_PAY',
  'TABBY',
  'TAMARA',
  'SPLIT',
];

export function paymentLabel(key: string): string {
  return PAYMENT_METHODS[key as PaymentMethodKey]?.label ?? key;
}

export function paymentBadgeClass(key: string): string {
  return (
    PAYMENT_METHODS[key as PaymentMethodKey]?.badgeClass ??
    'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
  );
}
