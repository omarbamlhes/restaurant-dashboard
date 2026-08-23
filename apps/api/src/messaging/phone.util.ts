/**
 * Normalise a Saudi mobile number to E.164 (+9665XXXXXXXX).
 *
 * Accepts the shapes people actually type: 05XXXXXXXX, 5XXXXXXXX,
 * 9665XXXXXXXX, +9665XXXXXXXX, 009665XXXXXXXX — with or without spaces,
 * dashes or parentheses. Returns null when the input is not a valid Saudi
 * mobile number so callers can skip sending rather than hit the provider with
 * garbage.
 */
export function normalizeSaudiPhone(raw: string | null | undefined): string | null {
  if (!raw) return null;

  // Keep a leading + (if any), drop every other non-digit.
  let s = raw.trim().replace(/[^\d+]/g, '');

  // 00 international prefix → +
  if (s.startsWith('00')) s = '+' + s.slice(2);

  // Strip the + for uniform handling; remember nothing else needs it.
  if (s.startsWith('+')) s = s.slice(1);

  // Now s is digits only. Reduce every accepted shape to the 9-digit
  // subscriber number starting with 5.
  let subscriber: string | null = null;

  if (s.startsWith('966')) {
    subscriber = s.slice(3); // 9665XXXXXXXX → 5XXXXXXXX
  } else if (s.startsWith('05')) {
    subscriber = s.slice(1); // 05XXXXXXXX → 5XXXXXXXX
  } else if (s.startsWith('5')) {
    subscriber = s; // already 5XXXXXXXX
  } else {
    return null;
  }

  // A valid KSA mobile subscriber number is exactly 9 digits and starts with 5.
  if (!/^5\d{8}$/.test(subscriber)) return null;

  return `+966${subscriber}`;
}

/** True when the value normalises to a valid Saudi mobile number. */
export function isValidSaudiPhone(raw: string | null | undefined): boolean {
  return normalizeSaudiPhone(raw) !== null;
}
