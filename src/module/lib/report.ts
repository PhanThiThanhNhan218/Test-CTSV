import type { Evidence, Member, Task } from '../types';
import { PRIORITY_LABEL, STATUS_LABEL } from '../types';
import { fmtDate, fmtMonth } from './dates';
import { completedLate, isLate, isOverdue, memberStats, monthStats, overdueDays } from './rules';

export interface BlockerRow {
  task: Task;
  owner?: Member;
  state: string;
  carry: boolean;
}

/** Gom dữ liệu cho báo cáo tháng — dùng chung cho bản xem A4 và file Excel. */
export function buildReport(tasks: Task[], members: Member[], month: string, today: string) {
  const own = tasks.filter((t) => t.month === month);
  const byId = new Map(members.map((m) => [m.id, m]));
  const describe = (t: Task) =>
    isOverdue(t, today)
      ? `Quá hạn ${overdueDays(t, today)} ngày`
      : completedLate(t)
        ? `Xong muộn (${fmtDate(t.completedAt!)})`
        : t.wasLate
          ? t.status === 'done' ? 'Đã dời hạn · đã xong' : 'Đã dời hạn'
          : STATUS_LABEL[t.status];

  const blockers: BlockerRow[] = [
    ...own.filter((t) => isLate(t, today)).map((t) => ({ task: t, owner: byId.get(t.ownerId), state: describe(t), carry: false })),
    // Việc tồn tháng trước chưa xử lý — vẫn là điểm nghẽn, nhưng không tính vào năng suất tháng này
    ...tasks
      .filter((t) => t.month < month && t.status !== 'done')
      .map((t) => ({ task: t, owner: byId.get(t.ownerId), state: describe(t), carry: true })),
  ].sort((a, b) => Number(a.task.status === 'done') - Number(b.task.status === 'done') || a.task.deadline.localeCompare(b.task.deadline));

  const highlights = own
    .filter((t) => t.status === 'done' && (t.priority === 'urgent' || t.priority === 'high'))
    .sort((a, b) => (a.completedAt ?? '').localeCompare(b.completedAt ?? ''));

  return {
    title: `BÁO CÁO TỔNG KẾT CÔNG VIỆC ${fmtMonth(month).toUpperCase()}`,
    stats: monthStats(tasks, month, today),
    people: memberStats(tasks, members, month, today).filter((r) => r.total > 0 || r.carry > 0),
    blockers,
    highlights,
    byId,
  };
}

export type ReportData = ReturnType<typeof buildReport>;

const evidenceText = (evs: Evidence[]) => evs.map((e) => e.url ?? e.name).join('\n');

export async function exportExcel(data: ReportData, month: string) {
  const { default: writeXlsxFile } = await import('write-excel-file');
  const H = (value: string) => ({ value, fontWeight: 'bold' as const, backgroundColor: '#F4F4F5' });
  const S = (value: string | undefined) => ({ value: value ?? '', wrap: true });
  const N = (value: number) => ({ value, type: Number });

  const people = [
    ['STT', 'Họ tên', 'Chức danh', 'Được giao', 'Hoàn thành', 'Đúng hạn', 'Trễ hạn', 'Quá hạn', 'Tỷ lệ (%)', 'Tồn tháng trước'].map(H),
    ...data.people.map((r, i) => [N(i + 1), S(r.member.name), S(r.member.title), N(r.total), N(r.done), N(r.onTime), N(r.late), N(r.overdue), N(r.rate), N(r.carry)]),
  ];
  const blockers = [
    ['STT', 'Công việc', 'Danh mục', 'Phụ trách', 'Deadline', 'Tình trạng', 'Lý do trễ hạn', 'Ghi chú'].map(H),
    ...data.blockers.map((b, i) => [
      N(i + 1), S(b.task.title), S(b.task.category), S(b.owner?.name), S(fmtDate(b.task.deadline)), S(b.state),
      S(b.task.lateReason || 'Chưa giải trình'), S(b.carry ? `Tồn ${b.task.month}` : ''),
    ]),
  ];
  const highlights = [
    ['STT', 'Công việc', 'Danh mục', 'Phụ trách', 'Ưu tiên', 'Ngày hoàn thành', 'Minh chứng'].map(H),
    ...data.highlights.map((t, i) => [
      N(i + 1), S(t.title), S(t.category), S(data.byId.get(t.ownerId)?.name), S(PRIORITY_LABEL[t.priority]),
      S(t.completedAt ? fmtDate(t.completedAt) : ''), S(evidenceText(t.evidences)),
    ]),
  ];

  await writeXlsxFile([people, blockers, highlights] as never, {
    sheets: ['Năng suất cá nhân', 'Điểm nghẽn', 'Kết quả nổi bật'],
    columns: [
      [{ width: 5 }, { width: 24 }, { width: 14 }, { width: 10 }, { width: 11 }, { width: 10 }, { width: 9 }, { width: 9 }, { width: 9 }, { width: 14 }],
      [{ width: 5 }, { width: 44 }, { width: 18 }, { width: 22 }, { width: 11 }, { width: 22 }, { width: 50 }, { width: 10 }],
      [{ width: 5 }, { width: 44 }, { width: 18 }, { width: 22 }, { width: 9 }, { width: 14 }, { width: 50 }],
    ],
    fontFamily: 'Arial',
    fontSize: 10,
    stickyRowsCount: 1,
    fileName: `Bao-cao-CTSV-${month}.xlsx`,
  });
}
