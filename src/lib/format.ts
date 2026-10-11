// Africa/Lagos is a fixed UTC+1 (no DST), so we avoid Intl time-zone support, which varies by JS engine.
const LAGOS_OFFSET_MS = 60 * 60 * 1000;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const p2 = (n: number) => String(n).padStart(2, '0');

const lagos = (d: Date) => new Date(d.getTime() + LAGOS_OFFSET_MS); // read with getUTC*

/** "8:05 AM" */
export const fmtTime = (iso?: string | null) => {
  if (!iso) return '—';
  const d = lagos(new Date(iso));
  const h = d.getUTCHours();
  return `${h % 12 || 12}:${p2(d.getUTCMinutes())} ${h < 12 ? 'AM' : 'PM'}`;
};
/** "Monday, 5 October 2026" */
export const fmtLongDate = (d = new Date()) => {
  const l = lagos(d);
  return `${DAYS_LONG[l.getUTCDay()]}, ${l.getUTCDate()} ${MONTHS_LONG[l.getUTCMonth()]} ${l.getUTCFullYear()}`;
};
/** "5 Oct 2026" from an ISO instant */
export const fmtDate = (iso?: string | null) => {
  if (!iso) return 'Never';
  const l = lagos(new Date(iso));
  return `${l.getUTCDate()} ${MONTHS[l.getUTCMonth()]} ${l.getUTCFullYear()}`;
};
/** "5 Oct 2026, 8:05 AM" */
export const fmtDateTime = (iso?: string | null) => (iso ? `${fmtDate(iso)}, ${fmtTime(iso)}` : '—');

/** "YYYY-MM-DD" date-only string → "05 Oct 2026" */
export const fmtDay = (ymd?: string) => {
  if (!ymd) return 'Select date';
  const [y, m, d] = ymd.split('-').map(Number);
  return `${p2(d)} ${MONTHS[m - 1]} ${y}`;
};
/** "YYYY-MM-DD" → "Mon, 5 Oct" */
export const fmtDayShort = (ymd: string) => {
  const [y, m, d] = ymd.split('-').map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return { dow: DAYS[dow], day: d, month: MONTHS[m - 1], label: `${DAYS[dow]}, ${d} ${MONTHS[m - 1]}` };
};
/** "2026-10" → "October 2026" */
export const fmtMonth = (ym: string) => {
  const [y, m] = ym.split('-').map(Number);
  return `${MONTHS_LONG[m - 1]} ${y}`;
};
export const shiftMonth = (ym: string, by: number) => {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + by, 1));
  return `${d.getUTCFullYear()}-${p2(d.getUTCMonth() + 1)}`;
};

export const todayISO = () => {
  const l = lagos(new Date());
  return `${l.getUTCFullYear()}-${p2(l.getUTCMonth() + 1)}-${p2(l.getUTCDate())}`;
};
export const thisMonth = () => todayISO().slice(0, 7);
/** Local-time Date → "YYYY-MM-DD" (pickers return device-local dates) */
export const toYMD = (d: Date) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
export const fromYMD = (ymd: string) => {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const toHM = (d: Date) => `${p2(d.getHours())}:${p2(d.getMinutes())}`;
export const fromHM = (hm: string) => {
  const [h, m] = (hm || '00:00').split(':').map(Number);
  const d = new Date();
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
};
/** "16:30:00" → "4:30 PM" */
export const fmtHM = (hm?: string) => {
  if (!hm) return '—';
  const [h, m] = hm.split(':').map(Number);
  return `${h % 12 || 12}:${p2(m)} ${h < 12 ? 'AM' : 'PM'}`;
};

export const dur = (m?: number | null) => (m == null ? '—' : `${Math.floor(m / 60)}h ${p2(m % 60)}m`);
export const greeting = () => {
  const h = lagos(new Date()).getUTCHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};
/** Lagos wall-clock "HH:MM" for a server instant, for comparing with "16:30" thresholds */
export const lagosHM = (iso: string) => {
  const l = lagos(new Date(iso));
  return `${p2(l.getUTCHours())}:${p2(l.getUTCMinutes())}`;
};
export const titleCase = (s: string) => s.replace(/[_-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
