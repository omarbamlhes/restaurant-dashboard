'use client';

import { useEffect, useMemo, useState } from 'react';
import { Moon, Sunrise, Sunset, Clock, Sparkles } from 'lucide-react';
import {
  getPrayerTimes,
  getNextPrayer,
  PRAYER_LABELS_AR,
  DEFAULT_COORDS,
  type PrayerName,
} from '@/lib/prayer-times';
import { getHijriDate, isRamadan } from '@/lib/hijri';
import { getPrayerWindow } from '@/lib/prayer-window';
import { cn } from '@/lib/utils';

interface RamadanBannerProps {
  latitude?: number;
  longitude?: number;
  cityLabel?: string;
  /** Force the Ramadan visuals on even outside Ramadan (preview / demo). */
  forcePreview?: boolean;
}

const PRAYER_ORDER: PrayerName[] = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];

function pad(n: number) {
  return String(Math.floor(n)).padStart(2, '0');
}

function countdownParts(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    hours: Math.floor(total / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

export default function RamadanBanner({
  latitude = DEFAULT_COORDS.latitude,
  longitude = DEFAULT_COORDS.longitude,
  cityLabel = 'الرياض',
  forcePreview = false,
}: RamadanBannerProps) {
  // Tick every second so the countdown stays live.
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const hijri = useMemo(() => (now ? getHijriDate(now) : null), [now]);
  const ramadanMode = useMemo(
    () => forcePreview || (now ? isRamadan(now) : false),
    [forcePreview, now],
  );

  const prayers = useMemo(
    () => (now ? getPrayerTimes(now, latitude, longitude, undefined, ramadanMode) : null),
    [now, latitude, longitude, ramadanMode],
  );

  const next = useMemo(
    () => (now ? getNextPrayer(now, latitude, longitude) : null),
    [now, latitude, longitude],
  );

  const prayerWindow = useMemo(
    () => (now ? getPrayerWindow(now, latitude, longitude) : null),
    [now, latitude, longitude],
  );

  // Avoid hydration mismatch: render nothing until the client clock is set.
  if (!now || !hijri || !prayers || !next) return null;

  const fmtTime = (d: Date) =>
    d.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });

  // In Ramadan the hero countdown targets iftar (maghrib) before sunset, then
  // flips to suhoor (next fajr) through the night.
  const beforeIftar = now.getTime() < prayers.maghrib.getTime();
  const heroTarget = ramadanMode
    ? beforeIftar
      ? { label: 'باقٍ على الإفطار', time: prayers.maghrib, icon: Sunset }
      : { label: 'باقٍ على السحور (الفجر)', time: getNextFajr(now, latitude, longitude), icon: Sunrise }
    : { label: `باقٍ على ${PRAYER_LABELS_AR[next.name]}`, time: next.time, icon: Clock };

  const cd = countdownParts(heroTarget.time.getTime() - now.getTime());

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border animate-fade-in-up',
        ramadanMode
          ? 'border-amber-300/40 bg-gradient-to-l from-emerald-950 via-emerald-900 to-teal-900 text-amber-50 shadow-lg shadow-emerald-950/30'
          : 'glass-card',
      )}
    >
      {ramadanMode && <RamadanDecor />}

      {/* Prayer-time indicator — shows while ordering is typically paused */}
      {prayerWindow?.active && (
        <div className={cn(
          'relative flex items-center justify-center gap-2 py-1.5 text-xs font-semibold',
          ramadanMode ? 'bg-amber-400/15 text-amber-100' : 'bg-emerald-600 text-white',
        )}>
          <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
          حان الآن وقت صلاة {prayerWindow.label} · تُستأنف الطلبات بعد {prayerWindow.endsInMinutes} دقيقة
        </div>
      )}

      <div className="relative flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        {/* Right: greeting + hijri date */}
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl',
              ramadanMode ? 'bg-amber-400/15 text-amber-300' : 'bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400',
            )}
          >
            <Moon className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className={cn('text-lg font-bold', ramadanMode ? 'text-amber-100' : 'text-gray-900 dark:text-white')}>
                {ramadanMode ? 'رمضان مبارك' : hijri.monthName}
              </h2>
              {ramadanMode && <Sparkles className="h-4 w-4 text-amber-300" />}
            </div>
            <p className={cn('text-sm', ramadanMode ? 'text-amber-200/80' : 'text-gray-600 dark:text-gray-400')}>
              {hijri.formatted} · {cityLabel}
            </p>
          </div>
        </div>

        {/* Left: hero countdown */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className={cn('flex items-center justify-end gap-1.5 text-xs font-medium', ramadanMode ? 'text-amber-200/90' : 'text-gray-500 dark:text-gray-400')}>
              <heroTarget.icon className="h-3.5 w-3.5" />
              {heroTarget.label}
            </div>
            <div
              className={cn(
                'mt-1 font-bold tabular-nums tracking-tight',
                ramadanMode ? 'text-2xl text-amber-100' : 'text-xl text-gray-900 dark:text-white',
              )}
              dir="ltr"
            >
              {pad(cd.hours)}:{pad(cd.minutes)}:{pad(cd.seconds)}
            </div>
            <div className={cn('text-xs', ramadanMode ? 'text-amber-200/70' : 'text-gray-500 dark:text-gray-400')}>
              {heroTarget.time && fmtTime(heroTarget.time)}
            </div>
          </div>
        </div>
      </div>

      {/* Prayer times strip */}
      <div
        className={cn(
          'relative grid grid-cols-3 gap-px border-t sm:grid-cols-6',
          ramadanMode ? 'border-amber-300/20 bg-emerald-950/30' : 'border-gray-200/60 bg-gray-50/50 dark:border-dark-border/60 dark:bg-dark-hover/30',
        )}
      >
        {PRAYER_ORDER.map((name) => {
          const isNext = name === next.name;
          return (
            <div
              key={name}
              className={cn(
                'flex flex-col items-center gap-0.5 px-2 py-2.5 text-center transition-colors',
                isNext && (ramadanMode ? 'bg-amber-400/10' : 'bg-primary-50 dark:bg-primary-950/40'),
              )}
            >
              <span className={cn('text-[11px]', ramadanMode ? 'text-amber-200/80' : 'text-gray-500 dark:text-gray-400')}>
                {PRAYER_LABELS_AR[name]}
              </span>
              <span
                className={cn(
                  'text-sm font-semibold tabular-nums',
                  isNext
                    ? ramadanMode
                      ? 'text-amber-300'
                      : 'text-primary-600 dark:text-primary-400'
                    : ramadanMode
                      ? 'text-amber-100/90'
                      : 'text-gray-800 dark:text-gray-200',
                )}
              >
                {fmtTime(prayers[name])}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Fajr of the upcoming day — used for the overnight suhoor countdown.
function getNextFajr(now: Date, lat?: number, lng?: number): Date {
  const today = getPrayerTimes(now, lat, lng);
  if (now.getTime() < today.fajr.getTime()) return today.fajr;
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return getPrayerTimes(tomorrow, lat, lng).fajr;
}

// Subtle decorative crescent + stars layer for the Ramadan theme.
function RamadanDecor() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-70">
      <div className="absolute -left-6 -top-8 h-32 w-32 rounded-full bg-amber-400/10 blur-2xl" />
      <div className="absolute right-1/3 top-3 h-1 w-1 rounded-full bg-amber-200/70" />
      <div className="absolute right-1/2 top-8 h-0.5 w-0.5 rounded-full bg-amber-100/60" />
      <div className="absolute left-1/4 top-5 h-1 w-1 rounded-full bg-amber-200/50" />
    </div>
  );
}
