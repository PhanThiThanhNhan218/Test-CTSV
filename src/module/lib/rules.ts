import type { Member, Status, Task } from '../types';
import { diffDays, fmtMonthTag, monthOf } from './dates';

export type Tone = 'danger' | 'warn' | 'success' | 'muted';

/* ---------------- Deadline ---------------- */

/** Quá hạn khi đã qua 23:59 ngày deadline (giờ VN) mà chưa hoàn thành. */
export function isOverdue(t: Task, today: string): boolean {
  return t.status !== 'done' && t.deadline < today;
}

export function overdueDays(t: Task, today: string): number {
  return Math.max(0, diffDays(t.deadline, today));
}

export function completedLate(t: Task): boolean {
  return t.status === 'done' && !!t.completedAt && t.completedAt > t.deadline;
}

/** Việc được tính là "trễ" trong thống kê: đang quá hạn, xong muộn, hoặc từng bị dời hạn khi đã trễ. */
export function isLate(t: Task, today: string): boolean {
  return isOverdue(t, today) || completedLate(t) || !!t.wasLate;
}

/** Việc trễ mà chưa có giải trình → hiện cảnh báo đỏ trong drawer & báo cáo. */
export function needsLateReason(t: Task, today: string): boolean {
  return isLate(t, today) && !t.lateReason?.trim();
}

export function deadlineInfo(t: Task, today: string): { label: string; tone: Tone } {
  if (t.status === 'done') {
    return completedLate(t)
      ? { label: `Xong muộn ${diffDays(t.deadline, t.completedAt!)} ngày`, tone: 'success' }
      : { label: 'Đã xong', tone: 'success' };
  }
  const d = diffDays(today, t.deadline);
  if (d < 0) return { label: `Quá hạn ${-d} ngày`, tone: 'danger' };
  if (d === 0) return { label: 'Hôm nay', tone: 'warn' };
  if (d === 1) return { label: 'Ngày mai', tone: 'muted' };
  return { label: `Còn ${d} ngày`, tone: 'muted' };
}

export const TONE_TEXT: Record<Tone, string> = {
  danger: 'tm-text-danger',
  warn: 'tm-text-warn',
  success: 'tm-text-success',
  muted: 'tm-text-fg-3',
};

/* ---------------- Giao thoa tháng ---------------- */

/**
 * Việc tồn từ tháng trước khi đang xem tháng `view`:
 * - chưa xong → ghim đầu bảng, cảnh báo đỏ
 * - đã xong trong tháng đang xem → vẫn hiện ở cột Hoàn thành để người dùng thấy kết quả
 * Việc tồn KHÔNG được cộng vào thống kê tháng `view` (vẫn thuộc tháng gốc).
 */
export function isCarryOver(t: Task, view: string): boolean {
  if (t.month >= view) return false;
  if (t.status !== 'done') return true;
  return !!t.completedAt && monthOf(t.completedAt) === view;
}

export function carryTag(t: Task): string {
  return `Tồn ${fmtMonthTag(t.month)}`;
}

/** Việc hiển thị trên bảng tháng `view`: việc tồn ghim đầu, sau đó theo thứ tự. */
export function tasksForView(tasks: Task[], view: string): Task[] {
  return tasks
    .filter((t) => t.month === view || isCarryOver(t, view))
    .sort((a, b) => {
      const ca = isCarryOver(a, view) && a.status !== 'done' ? 0 : 1;
      const cb = isCarryOver(b, view) && b.status !== 'done' ? 0 : 1;
      return ca - cb || a.order - b.order;
    });
}

/* ---------------- Thống kê ---------------- */

export interface Stats {
  total: number;
  done: number;
  inProgress: number;
  overdue: number;
  onTime: number;
  late: number;
  rate: number; // % hoàn thành
}

export function computeStats(tasks: Task[], today: string): Stats {
  const done = tasks.filter((t) => t.status === 'done');
  const overdue = tasks.filter((t) => isOverdue(t, today)).length;
  const late = tasks.filter((t) => isLate(t, today)).length;
  return {
    total: tasks.length,
    done: done.length,
    inProgress: tasks.length - done.length - overdue,
    overdue,
    onTime: done.filter((t) => !completedLate(t) && !t.wasLate).length,
    late,
    rate: tasks.length ? Math.round((done.length / tasks.length) * 100) : 0,
  };
}

/** Thống kê tháng: chỉ tính việc thuộc tháng gốc, kèm số việc tồn chưa xử lý từ trước. */
export function monthStats(tasks: Task[], month: string, today: string) {
  const own = tasks.filter((t) => t.month === month);
  const carry = tasks.filter((t) => t.month < month && t.status !== 'done');
  return { ...computeStats(own, today), carry: carry.length };
}

export function memberStats(tasks: Task[], members: Member[], month: string, today: string) {
  const own = tasks.filter((t) => t.month === month);
  return members.map((m) => {
    const mine = own.filter((t) => t.ownerId === m.id);
    const carry = tasks.filter((t) => t.ownerId === m.id && t.month < month && t.status !== 'done').length;
    return { member: m, ...computeStats(mine, today), carry };
  });
}

/* ---------------- Ràng buộc chuyển trạng thái ---------------- */

export type GuardKind = 'complete' | 'reopen' | 'postpone';

/**
 * Trả về loại popup bắt buộc khi đổi trạng thái, hoặc null nếu đổi tự do.
 * - → Hoàn thành: bắt buộc minh chứng (+ lý do trễ nếu đang trễ mà chưa giải trình)
 * - Hoàn thành → trạng thái khác: bắt buộc lý do mở lại
 */
export function statusGuard(t: Task, to: Status): GuardKind | null {
  if (t.status === to) return null;
  if (to === 'done') return 'complete';
  if (t.status === 'done') return 'reopen';
  return null;
}

/** Khi hoàn thành: có cần nhập lý do trễ không (tính tại thời điểm hoàn thành). */
export function completionNeedsLateReason(t: Task, today: string): boolean {
  return (t.deadline < today || !!t.wasLate) && !t.lateReason?.trim();
}

/** Dời deadline của việc đã quá hạn về sau → bắt buộc lý do, và việc bị đánh dấu "từng trễ". */
export function postponeNeedsReason(t: Task, newDeadline: string, today: string): boolean {
  return isOverdue(t, today) && newDeadline > t.deadline;
}

/* ---------------- Tìm kiếm không dấu ---------------- */

export function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}
