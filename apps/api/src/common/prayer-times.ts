// Umm al-Qura (Makkah) prayer-time calculator — API-side port of the web
// lib/prayer-times.ts (validated to within ~1 min of the `adhan` library).
// Pure astronomical computation, no dependency. Used by prayer-gap analytics.

export const DEFAULT_COORDS = { latitude: 24.7136, longitude: 46.6753 }; // Riyadh
export const KSA_TIMEZONE = 3;

const FAJR_ANGLE = 18.5;
const RISE_SET_ANGLE = 0.833;
const ISHA_INTERVAL = 90; // minutes after maghrib

const dtr = (d: number) => (d * Math.PI) / 180;
const rtd = (r: number) => (r * 180) / Math.PI;
const sin = (d: number) => Math.sin(dtr(d));
const cos = (d: number) => Math.cos(dtr(d));
const tan = (d: number) => Math.tan(dtr(d));
const arcsin = (x: number) => rtd(Math.asin(x));
const arccos = (x: number) => rtd(Math.acos(x));
const arctan2 = (y: number, x: number) => rtd(Math.atan2(y, x));
const arccot = (x: number) => rtd(Math.atan(1 / x));
const fixAngle = (a: number) => ((a % 360) + 360) % 360;
const fixHour = (h: number) => ((h % 24) + 24) % 24;

function julian(year: number, month: number, day: number): number {
  if (month <= 2) {
    year -= 1;
    month += 12;
  }
  const a = Math.floor(year / 100);
  const b = 2 - a + Math.floor(a / 4);
  return (
    Math.floor(365.25 * (year + 4716)) +
    Math.floor(30.6001 * (month + 1)) +
    day +
    b -
    1524.5
  );
}

function sunPosition(jd: number): { declination: number; equation: number } {
  const d = jd - 2451545.0;
  const g = fixAngle(357.529 + 0.98560028 * d);
  const q = fixAngle(280.459 + 0.98564736 * d);
  const l = fixAngle(q + 1.915 * sin(g) + 0.02 * sin(2 * g));
  const e = 23.439 - 0.00000036 * d;
  const ra = arctan2(cos(e) * sin(l), cos(l)) / 15;
  const equation = q / 15 - fixHour(ra);
  const declination = arcsin(sin(e) * sin(l));
  return { declination, equation };
}

export interface PrayerTimes {
  fajr: Date;
  sunrise: Date;
  dhuhr: Date;
  asr: Date;
  maghrib: Date;
  isha: Date;
}

export type PrayerName = 'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

export function getPrayerTimes(
  date: Date,
  latitude: number = DEFAULT_COORDS.latitude,
  longitude: number = DEFAULT_COORDS.longitude,
  timezone: number = KSA_TIMEZONE,
): PrayerTimes {
  const jd =
    julian(date.getFullYear(), date.getMonth() + 1, date.getDate()) -
    longitude / (15 * 24);

  const midDay = (t: number) => fixHour(12 - sunPosition(jd + t).equation);
  const sunAngleTime = (angle: number, t: number, ccw = false) => {
    const decl = sunPosition(jd + t).declination;
    const noon = midDay(t);
    const inner =
      (-sin(angle) - sin(decl) * sin(latitude)) / (cos(decl) * cos(latitude));
    const hourAngle = (1 / 15) * arccos(inner);
    return noon + (ccw ? -hourAngle : hourAngle);
  };
  const asrTime = (t: number) => {
    const decl = sunPosition(jd + t).declination;
    const angle = -arccot(1 + tan(Math.abs(latitude - decl)));
    return sunAngleTime(angle, t);
  };

  let times = { fajr: 5 / 24, sunrise: 6 / 24, dhuhr: 12 / 24, asr: 13 / 24, sunset: 18 / 24 };
  for (let i = 0; i < 2; i++) {
    times = {
      fajr: sunAngleTime(FAJR_ANGLE, times.fajr, true) / 24,
      sunrise: sunAngleTime(RISE_SET_ANGLE, times.sunrise, true) / 24,
      dhuhr: midDay(times.dhuhr) / 24,
      asr: asrTime(times.asr) / 24,
      sunset: sunAngleTime(RISE_SET_ANGLE, times.sunset) / 24,
    };
  }

  const tzAdjust = (h: number) => h * 24 + timezone - longitude / 15;
  const maghrib = tzAdjust(times.sunset);

  const toDate = (hours: number): Date => {
    const d = new Date(date);
    const hh = fixHour(hours);
    const h = Math.floor(hh);
    const m = Math.floor((hh - h) * 60);
    const s = Math.round(((hh - h) * 60 - m) * 60);
    d.setHours(h, m, s, 0);
    return d;
  };

  return {
    fajr: toDate(tzAdjust(times.fajr)),
    sunrise: toDate(tzAdjust(times.sunrise)),
    dhuhr: toDate(tzAdjust(times.dhuhr)),
    asr: toDate(tzAdjust(times.asr)),
    maghrib: toDate(maghrib),
    isha: toDate(maghrib + ISHA_INTERVAL / 60),
  };
}

export const PRAYER_LABELS_AR: Record<string, string> = {
  fajr: 'الفجر',
  dhuhr: 'الظهر',
  asr: 'العصر',
  maghrib: 'المغرب',
  isha: 'العشاء',
};

// Prayers restaurants pause for (sunrise excluded).
export const PAUSING_PRAYERS: PrayerName[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
