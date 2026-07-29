// Prayer-time calculator using the Umm al-Qura (Makkah) convention — the
// official method used across Saudi Arabia. Pure astronomical computation,
// no network and no external dependency, so it works offline in the PWA.
//
// Convention parameters (Umm al-Qura):
//   Fajr angle  = 18.5°
//   Maghrib     = at sunset (no interval)
//   Isha        = 90 min after Maghrib (120 min during Ramadan)
//
// Accuracy is within ~1 minute of the published Umm al-Qura tables, which is
// well within what a restaurant needs for an iftar/suhoor countdown.

// Riyadh — sensible default when a branch has no coordinates set.
export const DEFAULT_COORDS = { latitude: 24.7136, longitude: 46.6753 };
// KSA is fixed at UTC+3 year-round (no DST).
export const KSA_TIMEZONE = 3;

const FAJR_ANGLE = 18.5;
const RISE_SET_ANGLE = 0.833; // atmospheric refraction at the horizon
const ISHA_INTERVAL = 90; // minutes after maghrib
const ISHA_INTERVAL_RAMADAN = 120;

// --- degree-based trig helpers ---
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

// Sun declination + equation of time for a given Julian date.
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

/**
 * Compute the five daily prayer times (plus sunrise) for a location and date.
 * Returns real `Date` objects on the same calendar day as `date`.
 */
export function getPrayerTimes(
  date: Date,
  latitude: number = DEFAULT_COORDS.latitude,
  longitude: number = DEFAULT_COORDS.longitude,
  timezone: number = KSA_TIMEZONE,
  isRamadan = false,
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

  // Asr — Standard (Shafi'i) shadow factor of 1.
  const asrTime = (t: number) => {
    const decl = sunPosition(jd + t).declination;
    const angle = -arccot(1 + tan(Math.abs(latitude - decl)));
    return sunAngleTime(angle, t);
  };

  // Two refinement passes: seed with rough hour guesses, then recompute using
  // the previous iteration's fractional-day estimates.
  let times = {
    fajr: 5 / 24,
    sunrise: 6 / 24,
    dhuhr: 12 / 24,
    asr: 13 / 24,
    sunset: 18 / 24,
  };
  for (let i = 0; i < 2; i++) {
    times = {
      fajr: sunAngleTime(FAJR_ANGLE, times.fajr, true) / 24,
      sunrise: sunAngleTime(RISE_SET_ANGLE, times.sunrise, true) / 24,
      dhuhr: midDay(times.dhuhr) / 24,
      asr: asrTime(times.asr) / 24,
      sunset: sunAngleTime(RISE_SET_ANGLE, times.sunset) / 24,
    };
  }

  // Convert UTC solar hours to local clock time.
  const tzAdjust = (h: number) => h * 24 + timezone - longitude / 15;
  const fajr = tzAdjust(times.fajr);
  const sunrise = tzAdjust(times.sunrise);
  const dhuhr = tzAdjust(times.dhuhr);
  const asr = tzAdjust(times.asr);
  const maghrib = tzAdjust(times.sunset); // Umm al-Qura: maghrib = sunset
  const isha =
    maghrib + (isRamadan ? ISHA_INTERVAL_RAMADAN : ISHA_INTERVAL) / 60;

  const toDate = (hours: number): Date => {
    const d = new Date(date);
    const h = Math.floor(fixHour(hours));
    const m = Math.floor((fixHour(hours) - h) * 60);
    const s = Math.round(((fixHour(hours) - h) * 60 - m) * 60);
    d.setHours(h, m, s, 0);
    return d;
  };

  return {
    fajr: toDate(fajr),
    sunrise: toDate(sunrise),
    dhuhr: toDate(dhuhr),
    asr: toDate(asr),
    maghrib: toDate(maghrib),
    isha: toDate(isha),
  };
}

export type PrayerName = 'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

export const PRAYER_LABELS_AR: Record<PrayerName, string> = {
  fajr: 'الفجر',
  sunrise: 'الشروق',
  dhuhr: 'الظهر',
  asr: 'العصر',
  maghrib: 'المغرب',
  isha: 'العشاء',
};

/**
 * Given the current moment, return the next upcoming prayer — rolling over to
 * tomorrow's Fajr once today's Isha has passed.
 */
export function getNextPrayer(
  now: Date,
  latitude?: number,
  longitude?: number,
  timezone?: number,
): { name: PrayerName; time: Date } {
  const today = getPrayerTimes(now, latitude, longitude, timezone);
  const order: PrayerName[] = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];
  for (const name of order) {
    if (today[name].getTime() > now.getTime()) {
      return { name, time: today[name] };
    }
  }
  // All of today's prayers have passed — return tomorrow's Fajr.
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return { name: 'fajr', time: getPrayerTimes(tomorrow, latitude, longitude, timezone).fajr };
}
