export const CLINIC_TIMEZONE = 'Asia/Kolkata';

export const DAY_NAMES_EN = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export const DAY_SHORT_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Returns today's date string (YYYY-MM-DD) in Asia/Kolkata timezone.
 */
export function getTodayIST(): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: CLINIC_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(new Date());
}

/**
 * Returns current time minutes since midnight in Asia/Kolkata timezone.
 */
export function getCurrentMinutesIST(): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: CLINIC_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  const h = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
  const m = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
  return h * 60 + m;
}

/**
 * Parses HH:MM (or HH:MM:SS) to minutes since midnight.
 */
export function timeToMinutes(t: string): number {
  const [hh, mm] = t.split(':').map(Number);
  return (hh || 0) * 60 + (mm || 0);
}

/**
 * Formats minutes since midnight to HH:MM (24-hour).
 */
export function minutesToTime(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Formats 24-hour HH:MM string to 12-hour display (e.g., "09:30 AM").
 */
export function formatTime12h(time24: string | null | undefined): string {
  if (!time24) return '—';
  const [hStr, mStr] = time24.split(':');
  const h = Number(hStr);
  const m = Number(mStr ?? 0);
  if (Number.isNaN(h)) return time24;
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(hour12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
}

/**
 * Returns day-of-week (0=Sunday .. 6=Saturday) for a YYYY-MM-DD date string safely.
 */
export function getDayOfWeekFromDateString(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return 0;
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return dt.getUTCDay();
}

/**
 * Formats YYYY-MM-DD nicely (e.g., "Sat, 21 Nov 2026").
 */
export function formatDateReadable(dateStr: string): string {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return dateStr;
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return new Intl.DateTimeFormat('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(dt);
}

/**
 * Formats ISO timestamp in IST.
 */
export function formatTimestampIST(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: CLINIC_TIMEZONE,
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

/**
 * Generates an array of YYYY-MM-DD strings starting from todayIST for `days` count.
 */
export function getUpcomingDatesIST(days = 30): string[] {
  const today = getTodayIST();
  const [y, m, d] = today.split('-').map(Number);
  const start = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const result: string[] = [];
  for (let i = 0; i < days; i++) {
    const dt = new Date(start.getTime() + i * 86400000);
    const yyyy = dt.getUTCFullYear();
    const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(dt.getUTCDate()).padStart(2, '0');
    result.push(`${yyyy}-${mm}-${dd}`);
  }
  return result;
}
