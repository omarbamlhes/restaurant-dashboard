export function formatSAR(amount: number, locale = 'ar-SA'): string {
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return formatted;
}

export function formatNumber(num: number, locale = 'ar-SA'): string {
  return new Intl.NumberFormat(locale).format(num);
}
