/**
 * Outbound customer message templates. Kept as pure functions so the exact
 * wording is unit-tested and the (side-effecting) provider layer only has to
 * deliver a finished string.
 *
 * When wired to Meta WhatsApp Cloud API these map to approved message
 * templates; the `event` is the template name and `buildBody` mirrors the
 * approved copy for the mock/log driver and for local preview.
 */

export type MessageEvent = 'ORDER_READY' | 'RESERVATION_CONFIRMED';

export interface OrderReadyParams {
  customerName?: string | null;
  orderNumber: string;
  restaurantName: string;
}

export interface ReservationConfirmedParams {
  customerName?: string | null;
  restaurantName: string;
  date: string; // already-formatted, e.g. 2026-08-12
  time: string; // e.g. 20:30
  partySize?: number | null;
}

function greeting(name?: string | null): string {
  const trimmed = name?.trim();
  return trimmed ? `أهلاً ${trimmed}،` : 'أهلاً،';
}

export function buildOrderReadyMessage(p: OrderReadyParams): string {
  return [
    greeting(p.customerName),
    `طلبك رقم ${p.orderNumber} جاهز الآن ✅`,
    `شكراً لاختيارك ${p.restaurantName} 🌟`,
  ].join('\n');
}

export function buildReservationConfirmedMessage(p: ReservationConfirmedParams): string {
  const lines = [
    greeting(p.customerName),
    `تم تأكيد حجزك في ${p.restaurantName} ✅`,
    `📅 التاريخ: ${p.date}`,
    `🕐 الوقت: ${p.time}`,
  ];
  if (p.partySize && p.partySize > 0) {
    lines.push(`👥 عدد الأشخاص: ${p.partySize}`);
  }
  lines.push('نتشرّف بخدمتك 🌟');
  return lines.join('\n');
}
