'use client';

import { useEffect, useState } from 'react';
import { getPrayerWindow, type PrayerWindow } from '@/lib/prayer-window';

const INACTIVE: PrayerWindow = {
  active: false,
  prayer: null,
  label: null,
  endsInMinutes: 0,
  endsAt: null,
};

// Synthetic active window used by the preview toggle so staff can see the
// prayer-mode behaviour outside actual prayer times.
const PREVIEW_WINDOW: PrayerWindow = {
  active: true,
  prayer: 'dhuhr',
  label: 'الظهر',
  endsInMinutes: 12,
  endsAt: null,
};

/**
 * Live prayer-window state, recomputed every 30s. Returns `active: false` on
 * the server / first render to avoid hydration mismatch. Coordinates default
 * to Riyadh inside getPrayerWindow. Pass `preview` to force an active window.
 */
export function usePrayerWindow(
  latitude?: number,
  longitude?: number,
  preview = false,
): PrayerWindow {
  const [win, setWin] = useState<PrayerWindow>(INACTIVE);

  useEffect(() => {
    const update = () => setWin(getPrayerWindow(new Date(), latitude, longitude));
    update();
    const id = setInterval(update, 30000);
    return () => clearInterval(id);
  }, [latitude, longitude]);

  return preview ? PREVIEW_WINDOW : win;
}
