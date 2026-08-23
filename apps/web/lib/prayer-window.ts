// "Prayer mode" helper — decides whether the current moment falls inside a
// prayer window, during which many Saudi restaurants pause taking orders.
// Built on the Umm al-Qura prayer times in ./prayer-times.

import {
  getPrayerTimes,
  PRAYER_LABELS_AR,
  DEFAULT_COORDS,
  type PrayerName,
} from './prayer-times';

// Minutes after the adhan during which ordering is considered paused
// (covers adhan → iqama → the prayer itself). Sunrise is excluded — it is not
// a congregational prayer and restaurants don't close for it.
export const PRAYER_PAUSE_MINUTES = 25;

const PAUSING_PRAYERS: PrayerName[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

export interface PrayerWindow {
  active: boolean;
  prayer: PrayerName | null;
  label: string | null;
  /** Minutes until the current pause window ends (0 when inactive). */
  endsInMinutes: number;
  /** When the window ends (null when inactive). */
  endsAt: Date | null;
}

/**
 * Is `now` inside a prayer pause window? Returns the active prayer and how long
 * until ordering resumes. Coordinates default to Riyadh.
 */
export function getPrayerWindow(
  now: Date = new Date(),
  latitude: number = DEFAULT_COORDS.latitude,
  longitude: number = DEFAULT_COORDS.longitude,
  pauseMinutes: number = PRAYER_PAUSE_MINUTES,
): PrayerWindow {
  const times = getPrayerTimes(now, latitude, longitude);
  for (const prayer of PAUSING_PRAYERS) {
    const start = times[prayer].getTime();
    const end = start + pauseMinutes * 60000;
    if (now.getTime() >= start && now.getTime() < end) {
      const endsAt = new Date(end);
      return {
        active: true,
        prayer,
        label: PRAYER_LABELS_AR[prayer],
        endsInMinutes: Math.max(1, Math.ceil((end - now.getTime()) / 60000)),
        endsAt,
      };
    }
  }
  return { active: false, prayer: null, label: null, endsInMinutes: 0, endsAt: null };
}
