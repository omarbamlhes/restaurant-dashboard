export function formatSAR(amount: number, locale = 'ar-SA'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'SAR',
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatNumber(num: number, locale = 'ar-SA'): string {
  return new Intl.NumberFormat(locale).format(num);
}
