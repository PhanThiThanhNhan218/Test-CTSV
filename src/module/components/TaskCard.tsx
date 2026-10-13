import { memo } from 'react';
import type { Member, Task } from '../types';
import { STATUS_LABEL } from '../types';
import { Avatar } from '../ui/Avatar';
import { TONE_TEXT, carryTag, deadlineInfo, isCarryOver } from '../lib/rules';

interface CardProps {
  task: Task;
  owner?: Member;
  viewMonth: string;
  today: string;
  overlay?: boolean;
}

/** Task card siêu gọn: Tên → Mảng (chữ xám) → Đếm ngược deadline → Avatar góc phải. */
export const TaskCard = memo(function TaskCard({ task, owner, viewMonth, today, overlay }: CardProps) {
  const dl = deadlineInfo(task, today);
  const carry = isCarryOver(task, viewMonth);
  const pinned = carry && task.status !== 'done';
  const done = task.checklist.filter((c) => c.done).length;
  return (
    <div
      className={`tm-group tm-relative tm-rounded-md tm-border tm-bg-surface tm-px-2.5 tm-py-2 tm-transition-shadow ${
        overlay ? 'tm-rotate-[0.6deg] tm-border-line-strong tm-shadow-lg' : 'tm-border-line hover:tm-border-line-strong'
      }`}
    >
      {pinned && <span className="tm-absolute tm-bottom-1.5 tm-left-0 tm-top-1.5 tm-w-[2px] tm-rounded-r tm-bg-danger" />}
      <div className={`tm-text-[13.5px] tm-font-medium tm-leading-[19px] tm-line-clamp-2 ${task.status === 'done' ? 'tm-text-fg-2' : ''}`}>
        {task.title}
      </div>
      <div className="tm-mt-1 tm-flex tm-items-center tm-gap-1.5 tm-text-xs tm-text-fg-3">
        {task.priority === 'urgent' && task.status !== 'done' && <span className="tm-font-medium tm-text-danger">Khẩn</span>}
        <span className="tm-truncate">{task.category}</span>
        {carry && <span className={pinned ? 'tm-font-medium tm-text-danger' : ''}>· {carryTag(task)}</span>}
      </div>
      <div className="tm-mt-1.5 tm-flex tm-items-center tm-gap-2">
        <span className={`tm-text-xs tm-font-medium ${TONE_TEXT[dl.tone]}`}>{dl.label}</span>
        {task.checklist.length > 0 && (
          <span className="tm-num tm-text-xs tm-text-fg-3">
            {done}/{task.checklist.length}
          </span>
        )}
        <span className="tm-ml-auto">
          <Avatar member={owner} />
        </span>
      </div>
    </div>
  );
});

/** Hàng công việc dạng bảng — dùng trong modal nhân sự & danh sách cần chú ý. */
export function TaskRow({ task, owner, today, viewMonth, onOpen, showOwner = true }: {
  task: Task;
  owner?: Member;
  today: string;
  viewMonth?: string;
  onOpen(): void;
  showOwner?: boolean;
}) {
  const dl = deadlineInfo(task, today);
  return (
    <button
      onClick={onOpen}
      className="tm-grid tm-h-8 tm-w-full tm-grid-cols-[1fr_140px_96px_110px] tm-items-center tm-gap-3 tm-border-b tm-border-line tm-px-4 tm-text-left tm-text-sm last:tm-border-0 hover:tm-bg-subtle"
    >
      <span className="tm-flex tm-min-w-0 tm-items-center tm-gap-2">
        {showOwner && <Avatar member={owner} />}
        <span className="tm-truncate">{task.title}</span>
        {viewMonth && isCarryOver(task, viewMonth) && task.status !== 'done' && (
          <span className="tm-shrink-0 tm-text-2xs tm-font-medium tm-text-danger">{carryTag(task)}</span>
        )}
      </span>
      <span className="tm-truncate tm-text-xs tm-text-fg-3">{task.category}</span>
      <span className={`tm-text-xs ${task.status === 'done' ? 'tm-text-success' : 'tm-text-fg-2'}`}>{STATUS_LABEL[task.status]}</span>
      <span className={`tm-text-right tm-text-xs tm-font-medium ${TONE_TEXT[dl.tone]}`}>{dl.label}</span>
    </button>
  );
}
