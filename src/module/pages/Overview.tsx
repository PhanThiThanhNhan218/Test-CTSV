import { useMemo, useState } from 'react';
import { useTasks } from '../store/tasks';
import type { Member } from '../types';
import { Avatar } from '../ui/Avatar';
import { Dot } from '../ui/Dot';
import { Modal } from '../ui/Modal';
import { TaskRow } from '../components/TaskCard';
import { todayVN } from '../lib/dates';
import { isOverdue, memberStats, monthStats, overdueDays, tasksForView } from '../lib/rules';
import { summarize } from '../lib/standup';

export function Overview() {
  const tasks = useTasks((s) => s.tasks);
  const members = useTasks((s) => s.members);
  const viewMonth = useTasks((s) => s.viewMonth);
  const today = todayVN();
  const [picked, setPicked] = useState<Member | null>(null);

  const stats = useMemo(() => monthStats(tasks, viewMonth, today), [tasks, viewMonth, today]);
  const rows = useMemo(() => memberStats(tasks, members, viewMonth, today), [tasks, members, viewMonth, today]);
  const visible = useMemo(() => tasksForView(tasks, viewMonth), [tasks, viewMonth]);
  const attention = useMemo(
    () =>
      visible
        .filter((t) => t.status !== 'done' && (isOverdue(t, today) || t.deadline === today))
        .sort((a, b) => overdueDays(b, today) - overdueDays(a, today)),
    [visible, today],
  );
  const standup = useMemo(() => summarize(visible, members, today), [visible, members, today]);
  const memberById = new Map(members.map((m) => [m.id, m]));
  const open = (id: string) => useTasks.getState().openTask(id);

  return (
    <div className="tm-scroll tm-h-full tm-overflow-y-auto tm-px-5 tm-pb-5 tm-pt-3">
      {/* 4 thẻ metrics */}
      <div className="tm-grid tm-grid-cols-4 tm-gap-3">
        <Metric label="Tổng việc" value={stats.total} sub={stats.carry ? `+${stats.carry} tồn tháng trước` : 'trong tháng'} subTone={stats.carry ? 'danger' : undefined} />
        <Metric label="Đã xong" value={stats.done} sub={`${stats.rate}% hoàn thành`} />
        <Metric label="Đang xử lý" value={stats.inProgress} sub="chưa đến hạn" />
        <Metric label="Quá hạn" value={stats.overdue} danger sub={stats.overdue ? 'cần xử lý ngay' : 'không có'} />
      </div>

      <div className="tm-mt-3 tm-grid tm-grid-cols-[1fr_320px] tm-items-start tm-gap-3">
        <div className="tm-space-y-3">
          {/* Team Workload */}
          <section className="tm-card tm-overflow-hidden">
            <header className="tm-flex tm-h-10 tm-items-center tm-border-b tm-border-line tm-px-4">
              <h2 className="tm-text-base tm-font-semibold">Khối lượng công việc</h2>
              <span className="tm-ml-2 tm-text-xs tm-text-fg-3">Bấm vào nhân sự để xem chi tiết</span>
            </header>
            <table className="tm-w-full tm-text-sm">
              <thead>
                <tr className="tm-h-8 tm-border-b tm-border-line tm-bg-subtle tm-text-left tm-text-xs tm-font-medium tm-text-fg-3">
                  <th className="tm-px-4 tm-font-medium">Nhân sự</th>
                  <th className="tm-w-16 tm-px-2 tm-text-right tm-font-medium">Tổng</th>
                  <th className="tm-w-16 tm-px-2 tm-text-right tm-font-medium">Xong</th>
                  <th className="tm-w-20 tm-px-2 tm-text-right tm-font-medium">Đang làm</th>
                  <th className="tm-w-20 tm-px-2 tm-text-right tm-font-medium">Quá hạn</th>
                  <th className="tm-w-16 tm-px-2 tm-text-right tm-font-medium">Tồn</th>
                  <th className="tm-w-48 tm-px-4 tm-font-medium">Tiến độ</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.member.id}
                    onClick={() => setPicked(r.member)}
                    className="tm-h-9 tm-cursor-pointer tm-border-b tm-border-line last:tm-border-0 hover:tm-bg-subtle"
                  >
                    <td className="tm-px-4">
                      <div className="tm-flex tm-items-center tm-gap-2">
                        <Avatar member={r.member} size={22} />
                        <span className="tm-font-medium">{r.member.name}</span>
                        <span className="tm-text-xs tm-text-fg-3">{r.member.title}</span>
                      </div>
                    </td>
                    <td className="tm-num tm-px-2 tm-text-right">{r.total}</td>
                    <td className="tm-num tm-px-2 tm-text-right tm-text-success">{r.done}</td>
                    <td className="tm-num tm-px-2 tm-text-right">{r.inProgress}</td>
                    <td className={`tm-num tm-px-2 tm-text-right ${r.overdue ? 'tm-font-semibold tm-text-danger' : 'tm-text-fg-3'}`}>{r.overdue}</td>
                    <td className={`tm-num tm-px-2 tm-text-right ${r.carry ? 'tm-text-danger' : 'tm-text-fg-3'}`}>{r.carry}</td>
                    <td className="tm-px-4">
                      <div className="tm-flex tm-items-center tm-gap-2">
                        <div className="tm-h-1 tm-flex-1 tm-overflow-hidden tm-rounded-full tm-bg-muted">
                          <div className="tm-h-full tm-rounded-full tm-bg-success" style={{ width: `${r.rate}%` }} />
                        </div>
                        <span className="tm-num tm-w-9 tm-text-right tm-text-xs tm-text-fg-2">{r.rate}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* Cần chú ý */}
          <section className="tm-card tm-overflow-hidden">
            <header className="tm-flex tm-h-10 tm-items-center tm-border-b tm-border-line tm-px-4">
              <h2 className="tm-text-base tm-font-semibold">Cần chú ý</h2>
              <span className="tm-num tm-ml-2 tm-text-xs tm-text-fg-3">{attention.length} việc quá hạn / đến hạn hôm nay</span>
            </header>
            {attention.length === 0 ? (
              <div className="tm-px-4 tm-py-6 tm-text-center tm-text-sm tm-text-fg-3">Không có việc quá hạn.</div>
            ) : (
              attention.map((t) => (
                <TaskRow key={t.id} task={t} owner={memberById.get(t.ownerId)} today={today} viewMonth={viewMonth} onOpen={() => open(t.id)} />
              ))
            )}
          </section>
        </div>

        {/* Tóm tắt hôm nay (AI Standup) */}
        <aside className="tm-card">
          <header className="tm-flex tm-h-10 tm-items-center tm-justify-between tm-border-b tm-border-line tm-px-4">
            <h2 className="tm-text-base tm-font-semibold">Tóm tắt hôm nay</h2>
            <span className="tm-rounded tm-bg-muted tm-px-1.5 tm-py-px tm-text-2xs tm-font-medium tm-text-fg-2">AI Standup</span>
          </header>
          <div className="tm-space-y-3 tm-px-4 tm-py-3">
            {standup.map((sec) => (
              <div key={sec.title}>
                <h3 className="tm-mb-1.5 tm-text-xs tm-font-medium tm-text-fg-3">{sec.title}</h3>
                {sec.items.length === 0 ? (
                  <p className="tm-text-sm tm-text-fg-3">Không có.</p>
                ) : (
                  <ul className="tm-space-y-1.5">
                    {sec.items.map((it) => (
                      <li key={it.id} className="tm-flex tm-gap-2 tm-text-sm tm-leading-[19px]">
                        <Dot tone={it.tone} className="tm-mt-[7px]" />
                        {it.taskId ? (
                          <button onClick={() => open(it.taskId!)} className="tm-text-left tm-text-fg-2 hover:tm-text-fg">
                            {it.text}
                          </button>
                        ) : (
                          <span className="tm-text-fg-2">{it.text}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </aside>
      </div>

      {picked && (
        <MemberModal member={picked} onClose={() => setPicked(null)} />
      )}
    </div>
  );
}

function Metric({ label, value, sub, danger, subTone }: { label: string; value: number; sub: string; danger?: boolean; subTone?: 'danger' }) {
  return (
    <div className="tm-card tm-px-4 tm-py-3">
      <div className="tm-text-xs tm-font-medium tm-text-fg-3">{label}</div>
      <div className={`tm-num tm-mt-0.5 tm-text-[22px] tm-font-semibold tm-leading-7 ${danger && value ? 'tm-text-danger' : ''}`}>{value}</div>
      <div className={`tm-text-xs ${subTone === 'danger' || (danger && value) ? 'tm-text-danger' : 'tm-text-fg-3'}`}>{sub}</div>
    </div>
  );
}

function MemberModal({ member, onClose }: { member: Member; onClose(): void }) {
  const tasks = useTasks((s) => s.tasks);
  const viewMonth = useTasks((s) => s.viewMonth);
  const today = todayVN();
  const [filter, setFilter] = useState<'open' | 'all' | 'overdue' | 'done'>('open');
  const list = tasksForView(tasks, viewMonth)
    .filter((t) => t.ownerId === member.id || t.collaboratorIds.includes(member.id))
    .filter((t) =>
      filter === 'all' ? true : filter === 'done' ? t.status === 'done' : filter === 'overdue' ? isOverdue(t, today) : t.status !== 'done',
    );
  const tabs = [
    ['open', 'Chưa xong'],
    ['overdue', 'Quá hạn'],
    ['done', 'Hoàn thành'],
    ['all', 'Tất cả'],
  ] as const;
  return (
    <Modal
      width={720}
      onClose={onClose}
      title={
        <span className="tm-flex tm-items-center tm-gap-2">
          <Avatar member={member} size={22} /> {member.name}
        </span>
      }
      subtitle={`${member.title} · gồm việc phụ trách chính và phối hợp`}
    >
      <div className="tm-flex tm-gap-1 tm-border-b tm-border-line tm-px-4 tm-py-2">
        {tabs.map(([k, l]) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={`tm-rounded tm-px-2 tm-py-0.5 tm-text-xs ${filter === k ? 'tm-bg-muted tm-font-medium tm-text-fg' : 'tm-text-fg-2 hover:tm-bg-subtle'}`}
          >
            {l}
          </button>
        ))}
      </div>
      {list.length === 0 ? (
        <div className="tm-px-4 tm-py-8 tm-text-center tm-text-sm tm-text-fg-3">Không có công việc.</div>
      ) : (
        list.map((t) => (
          <TaskRow
            key={t.id}
            task={t}
            today={today}
            showOwner={false}
            viewMonth={viewMonth}
            onOpen={() => (onClose(), useTasks.getState().openTask(t.id))}
          />
        ))
      )}
    </Modal>
  );
}
