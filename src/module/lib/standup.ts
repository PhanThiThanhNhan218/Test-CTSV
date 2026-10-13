import type { Member, Task } from '../types';
import { diffDays } from './dates';
import { isOverdue, overdueDays } from './rules';

export type StandupTone = 'success' | 'danger' | 'warn';

export interface StandupItem {
  id: string;
  tone: StandupTone;
  text: string;
  taskId?: string;
}

export interface StandupSection {
  title: string;
  items: StandupItem[];
}

/**
 * "AI Standup" — bản demo sinh tóm tắt theo quy tắc từ dữ liệu.
 * Để gắn mô hình AI thật, thay hàm này bằng lời gọi tới backend (giữ nguyên kiểu trả về).
 */
export function summarize(tasks: Task[], members: Member[], today: string): StandupSection[] {
  const name = (id: string) => members.find((m) => m.id === id)?.name.split(' ').slice(-1)[0] ?? '—';

  const highlights = tasks
    .filter((t) => t.status === 'done' && t.completedAt && diffDays(t.completedAt, today) <= 2)
    .sort((a, b) => (b.completedAt! > a.completedAt! ? 1 : -1))
    .slice(0, 3)
    .map<StandupItem>((t) => ({
      id: 'h' + t.id,
      tone: 'success',
      taskId: t.id,
      text: `${name(t.ownerId)} hoàn thành "${t.title}"${t.evidences.length ? ` (${t.evidences.length} minh chứng)` : ''}`,
    }));

  const blockers = tasks
    .filter((t) => isOverdue(t, today))
    .sort((a, b) => overdueDays(b, today) - overdueDays(a, today))
    .slice(0, 3)
    .map<StandupItem>((t) => ({
      id: 'b' + t.id,
      tone: 'danger',
      taskId: t.id,
      text: `"${t.title}" trễ ${overdueDays(t, today)} ngày — ${name(t.ownerId)}${
        t.lateReason ? `: ${t.lateReason}` : ', chưa giải trình'
      }`,
    }));

  const dueToday = tasks.filter((t) => t.status !== 'done' && t.deadline === today);
  const due: StandupItem[] = dueToday.length
    ? [
        {
          id: 'due',
          tone: 'warn',
          text: `${dueToday.length} việc đến hạn hôm nay: ${dueToday
            .slice(0, 2)
            .map((t) => t.title)
            .join(', ')}${dueToday.length > 2 ? '…' : ''}`,
        },
      ]
    : [];

  return [
    { title: 'Hoàn thành nổi bật', items: highlights },
    { title: 'Điểm nghẽn cần lưu ý', items: [...blockers, ...due] },
  ];
}
