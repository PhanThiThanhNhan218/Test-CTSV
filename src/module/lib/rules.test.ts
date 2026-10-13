import { describe, expect, it } from 'vitest';
import type { Task } from '../types';
import { addMonths, diffDays, parseLooseDate, todayVN } from './dates';
import {
  completionNeedsLateReason,
  computeStats,
  deadlineInfo,
  isCarryOver,
  isLate,
  monthStats,
  needsLateReason,
  normalize,
  postponeNeedsReason,
  statusGuard,
  tasksForView,
} from './rules';

const T = (p: Partial<Task>): Task => ({
  id: Math.random().toString(36),
  title: 'Việc',
  description: '',
  category: 'Học bổng',
  ownerId: 'm1',
  collaboratorIds: [],
  priority: 'normal',
  status: 'todo',
  deadline: '2026-10-20',
  month: '2026-10',
  order: 0,
  checklist: [],
  evidences: [],
  createdAt: '',
  activity: [],
  ...p,
});

const today = '2026-10-13';

describe('dates', () => {
  it('tính hôm nay theo giờ Việt Nam', () => {
    // 18:30 UTC ngày 12 = 01:30 ngày 13 ở VN
    expect(todayVN(new Date('2026-10-12T18:30:00Z'))).toBe('2026-10-13');
  });
  it('cộng tháng qua năm', () => {
    expect(addMonths('2026-12', 1)).toBe('2027-01');
    expect(addMonths('2026-01', -1)).toBe('2025-12');
  });
  it('đọc ngày gõ nhanh', () => {
    expect(parseLooseDate('25/10', 2026)).toBe('2026-10-25');
    expect(parseLooseDate('5/1/27', 2026)).toBe('2027-01-05');
    expect(parseLooseDate('2026-10-31', 2026)).toBe('2026-10-31');
    expect(parseLooseDate('31/2', 2026)).toBeNull();
    expect(parseLooseDate('abc', 2026)).toBeNull();
  });
  it('diffDays', () => expect(diffDays('2026-09-30', '2026-10-02')).toBe(2));
});

describe('deadlineInfo', () => {
  it('quá hạn → đỏ', () => expect(deadlineInfo(T({ deadline: '2026-10-10' }), today)).toEqual({ label: 'Quá hạn 3 ngày', tone: 'danger' }));
  it('hôm nay → cam', () => expect(deadlineInfo(T({ deadline: today }), today).tone).toBe('warn'));
  it('còn hạn → xám', () => expect(deadlineInfo(T({ deadline: '2026-10-18' }), today)).toEqual({ label: 'Còn 5 ngày', tone: 'muted' }));
  it('đã xong → xanh', () => expect(deadlineInfo(T({ status: 'done', completedAt: '2026-10-01' }), today).tone).toBe('success'));
});

describe('trễ hạn & giải trình', () => {
  it('quá hạn chưa giải trình', () => {
    const t = T({ deadline: '2026-10-01' });
    expect(isLate(t, today)).toBe(true);
    expect(needsLateReason(t, today)).toBe(true);
    expect(needsLateReason({ ...t, lateReason: 'Chờ số liệu' }, today)).toBe(false);
  });
  it('dời hạn không xóa được dấu trễ', () => {
    const t = T({ deadline: '2026-10-30', wasLate: true });
    expect(isLate(t, today)).toBe(true);
  });
  it('xong muộn vẫn tính trễ', () => {
    expect(isLate(T({ status: 'done', deadline: '2026-10-05', completedAt: '2026-10-07' }), today)).toBe(true);
  });
  it('dời hạn việc quá hạn cần lý do; việc chưa quá hạn thì không', () => {
    expect(postponeNeedsReason(T({ deadline: '2026-10-10' }), '2026-10-25', today)).toBe(true);
    expect(postponeNeedsReason(T({ deadline: '2026-10-20' }), '2026-10-25', today)).toBe(false);
  });
});

describe('ràng buộc chuyển trạng thái', () => {
  it('→ Hoàn thành bắt buộc popup', () => expect(statusGuard(T({ status: 'doing' }), 'done')).toBe('complete'));
  it('mở lại việc đã xong bắt buộc lý do', () => expect(statusGuard(T({ status: 'done' }), 'doing')).toBe('reopen'));
  it('Chưa làm ↔ Đang làm tự do', () => expect(statusGuard(T({ status: 'todo' }), 'doing')).toBeNull());
  it('hoàn thành khi đã trễ phải nhập lý do', () => {
    expect(completionNeedsLateReason(T({ deadline: '2026-10-12' }), today)).toBe(true);
    expect(completionNeedsLateReason(T({ deadline: today }), today)).toBe(false);
  });
});

describe('giao thoa tháng', () => {
  const prevOpen = T({ month: '2026-09', deadline: '2026-09-28', status: 'doing', order: 9 });
  const prevDoneNow = T({ month: '2026-09', deadline: '2026-09-28', status: 'done', completedAt: '2026-10-02' });
  const prevDoneOld = T({ month: '2026-09', status: 'done', completedAt: '2026-09-20' });
  const cur = T({ order: 0 });

  it('việc tồn ghim đầu bảng', () => {
    expect(isCarryOver(prevOpen, '2026-10')).toBe(true);
    expect(isCarryOver(prevDoneNow, '2026-10')).toBe(true);
    expect(isCarryOver(prevDoneOld, '2026-10')).toBe(false);
    expect(tasksForView([cur, prevDoneOld, prevOpen], '2026-10')[0]).toBe(prevOpen);
  });
  it('không đếm hai lần: việc tồn không cộng vào thống kê tháng mới', () => {
    const s = monthStats([cur, prevOpen, prevDoneNow], '2026-10', today);
    expect(s.total).toBe(1);
    expect(s.carry).toBe(1);
  });
});

describe('computeStats', () => {
  it('đếm đúng', () => {
    const s = computeStats(
      [T({ status: 'done', completedAt: '2026-10-01' }), T({ deadline: '2026-10-01' }), T({ status: 'doing' })],
      today,
    );
    expect(s).toMatchObject({ total: 3, done: 1, overdue: 1, inProgress: 1, rate: 33 });
  });
});

it('normalize bỏ dấu tiếng Việt', () => expect(normalize('Đặng Thảo Vy')).toBe('dang thao vy'));
