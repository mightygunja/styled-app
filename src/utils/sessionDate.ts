// Bookings store scheduledDate as "YYYY-MM-DD h:mm AM" (see
// stylistBookingsService.create). That is not an ISO string, so new Date()
// returns Invalid Date on Hermes/JavaScriptCore and Safari even though V8
// tolerates it. Parse the exact stored format by hand, in local time.

const SESSION_DATE_RE = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T]+(\d{1,2}):(\d{2})\s*([AaPp][Mm])?)?$/;

/** Parses a stored session date. Returns null when it cannot be read. */
export function parseSessionDate(value: unknown): Date | null {
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  if (typeof value !== 'string' || !value.trim()) return null;

  const match = value.trim().match(SESSION_DATE_RE);
  if (match) {
    const [, y, mo, d, h, mi, meridiem] = match;
    let hours = h ? parseInt(h, 10) : 0;
    const minutes = mi ? parseInt(mi, 10) : 0;
    if (meridiem) {
      const pm = meridiem.toUpperCase() === 'PM';
      if (pm && hours < 12) hours += 12;
      if (!pm && hours === 12) hours = 0;
    }
    const parsed = new Date(parseInt(y, 10), parseInt(mo, 10) - 1, parseInt(d, 10), hours, minutes);
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  // Anything else (e.g. a genuine ISO timestamp) gets the engine's parser.
  const fallback = new Date(value);
  return isNaN(fallback.getTime()) ? null : fallback;
}

/** Millisecond timestamp for sorting; unparseable dates sort last. */
export function sessionDateMs(value: unknown): number {
  const parsed = parseSessionDate(value);
  return parsed ? parsed.getTime() : Number.MAX_SAFE_INTEGER;
}

/** "9/20/2026" style date, or the raw stored string if it cannot be parsed. */
export function formatSessionDay(value: unknown): string {
  const parsed = parseSessionDate(value);
  if (!parsed) return typeof value === 'string' ? value : '';
  return parsed.toLocaleDateString();
}

/** "2:00 PM" style time, or '' if it cannot be parsed. */
export function formatSessionTime(value: unknown): string {
  const parsed = parseSessionDate(value);
  if (!parsed) return '';
  const h = parsed.getHours();
  const m = parsed.getMinutes();
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${m < 10 ? '0' : ''}${m} ${h < 12 ? 'AM' : 'PM'}`;
}
