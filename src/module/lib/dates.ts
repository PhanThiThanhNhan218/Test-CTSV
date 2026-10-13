/** Mọi mốc "hôm nay" tính theo giờ Việt Nam, deadline là ngày lịch YYYY-MM-DD. */
export const VN_TZ = 'Asia/Ho_Chi_Minh';

export function todayVN(now: Date = new Date()): string {
  // en-CA cho định dạng YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: VN_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export const monthOf = (date: string) => date.slice(0, 7);

function toUTC(date: string) {
  const [y, m, d] = date.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

/** Số ngày từ a đến b (b - a), theo ngày lịch. */
export function diffDays(a: string, b: string): number {
  return Math.round((toUTC(b) - toUTC(a)) / 86_400_000);
}

export function addDays(date: string, n: number): string {
  return new Date(toUTC(date) + n * 86_400_000).toISOString().slice(0, 10);
}

export function addMonths(month: string, n: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return d.toISOString().slice(0, 7);
}

export function lastDayOfMonth(month: string): string {
  return addDays(addMonths(month, 1) + '-01', -1);
}

/** 2026-10-05 → 05/10 */
export function fmtShort(date: string): string {
  const [, m, d] = date.split('-');
  return `${d}/${m}`;
}

/** 2026-10-05 → 05/10/2026 */
export function fmtDate(date: string): string {
  const [y, m, d] = date.split('-');
  return `${d}/${m}/${y}`;
}

/** 2026-10 → Tháng 10/2026 */
export function fmtMonth(month: string): string {
  const [y, m] = month.split('-');
  return `Tháng ${Number(m)}/${y}`;
}

/** 2026-09 → T09 */
export function fmtMonthTag(month: string): string {
  return `T${month.slice(5, 7)}`;
}

export function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat('vi-VN', {
    timeZone: VN_TZ,
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return `${get('day')}/${get('month')} ${get('hour')}:${get('minute')}`;
}

/**
 * Đọc ngày người dùng gõ nhanh: "25/10", "25/10/2026", "2026-10-25", "25-10".
 * Năm mặc định lấy theo tháng đang lập kế hoạch.
 */
export function parseLooseDate(input: string, defaultYear: number): string | null {
  const s = input.trim();
  if (!s) return null;
  let y: number, m: number, d: number;
  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  const vn = s.match(/^(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?$/);
  if (iso) {
    [y, m, d] = [Number(iso[1]), Number(iso[2]), Number(iso[3])];
  } else if (vn) {
    d = Number(vn[1]);
    m = Number(vn[2]);
    y = vn[3] ? Number(vn[3].length === 2 ? '20' + vn[3] : vn[3]) : defaultYear;
  } else {
    return null;
  }
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return dt.toISOString().slice(0, 10);
}
