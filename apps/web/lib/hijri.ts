// Hijri (Umm al-Qura) calendar helpers built on the platform Intl calendar —
// no dependency, and it uses the same Umm al-Qura data Saudi Arabia observes.

const HIJRI_MONTHS_AR = [
  'محرم',
  'صفر',
  'ربيع الأول',
  'ربيع الآخر',
  'جمادى الأولى',
  'جمادى الآخرة',
  'رجب',
  'شعبان',
  'رمضان',
  'شوال',
  'ذو القعدة',
  'ذو الحجة',
];

export interface HijriDate {
  day: number;
  month: number; // 1-12
  year: number;
  monthName: string;
  formatted: string; // e.g. "١٥ رمضان ١٤٤٦ هـ"
}

// Numeric parts come from the en-latn locale so we can parse integers reliably,
// independent of how any given runtime localises Arabic-Indic digits.
function hijriParts(date: Date): { day: number; month: number; year: number } {
  const fmt = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  });
  const parts = fmt.formatToParts(date);
  const get = (type: string) =>
    parseInt(parts.find((p) => p.type === type)?.value ?? '0', 10);
  return { day: get('day'), month: get('month'), year: get('year') };
}

export function getHijriDate(date: Date = new Date()): HijriDate {
  const { day, month, year } = hijriParts(date);
  const formatted = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
  return {
    day,
    month,
    year,
    monthName: HIJRI_MONTHS_AR[month - 1] ?? '',
    formatted,
  };
}

/** True when the given date falls in Ramadan (9th Hijri month). */
export function isRamadan(date: Date = new Date()): boolean {
  return hijriParts(date).month === 9;
}

/** Full Gregorian + Hijri weekday/date string for a dashboard header. */
export function formatGregorianArabic(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('ar-SA', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}
