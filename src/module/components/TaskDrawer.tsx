import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { useCurrentUser, useTasks } from '../store/tasks';
import { Portal } from '../ui/Portal';
import { Icon } from '../ui/Icon';
import { Avatar } from '../ui/Avatar';
import { InlineSelect } from '../ui/Select';
import { CATEGORIES, PRIORITIES, PRIORITY_LABEL, STATUSES, STATUS_LABEL, type Activity, type Task } from '../types';
import { fmtDateTime, todayVN } from '../lib/dates';
import { TONE_TEXT, carryTag, deadlineInfo, isCarryOver, needsLateReason } from '../lib/rules';
import { canEditTask, canReassign, canToggleChecklist } from '../lib/permissions';
import { AddEvidenceBar, EvidenceRow, evidenceMeta } from './Evidence';

export function TaskDrawer() {
  const id = useTasks((s) => s.openTaskId);
  const task = useTasks((s) => s.tasks.find((t) => t.id === s.openTaskId));
  const guardOpen = useTasks((s) => !!s.guard);
  const close = () => useTasks.getState().openTask(null);

  useEffect(() => {
    if (!id) return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.key === 'Escape' && !guardOpen && !['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)) close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [id, guardOpen]);

  if (!task) return null;
  return (
    <Portal>
      <div className="tm-fixed tm-inset-0 tm-z-drawer">
        <div className="tm-anim-fade tm-absolute tm-inset-0 tm-bg-fg/10" onClick={close} />
        <aside
          role="dialog"
          aria-label="Chi tiết công việc"
          className="tm-anim-drawer tm-absolute tm-bottom-0 tm-right-0 tm-top-0 tm-flex tm-w-[480px] tm-flex-col tm-border-l tm-border-line tm-bg-surface tm-shadow-2xl"
        >
          <DrawerBody key={task.id} task={task} onClose={close} />
        </aside>
      </div>
    </Portal>
  );
}

function DrawerBody({ task, onClose }: { task: Task; onClose(): void }) {
  const user = useCurrentUser();
  const members = useTasks((s) => s.members);
  const viewMonth = useTasks((s) => s.viewMonth);
  const st = useTasks.getState();
  const today = todayVN();
  const editable = canEditTask(user, task);
  const canCheck = canToggleChecklist(user, task);
  const dl = deadlineInfo(task, today);
  const carry = isCarryOver(task, viewMonth) && task.status !== 'done';
  const name = (id: string) => members.find((m) => m.id === id)?.name ?? '—';

  return (
    <>
      {/* (1) Header */}
      <div className="tm-flex tm-h-10 tm-shrink-0 tm-items-center tm-gap-2 tm-border-b tm-border-line tm-px-4 tm-text-xs tm-text-fg-3">
        <span>{task.category}</span>
        {carry && <span className="tm-font-medium tm-text-danger">· {carryTag(task)}</span>}
        {!editable && <span className="tm-ml-1 tm-rounded tm-bg-muted tm-px-1.5 tm-py-px tm-text-2xs tm-text-fg-2">Chỉ xem</span>}
        <button onClick={onClose} className="tm-ml-auto tm-rounded tm-p-1 hover:tm-bg-muted hover:tm-text-fg" aria-label="Đóng (Esc)" title="Đóng (Esc)">
          <Icon name="x" />
        </button>
      </div>

      <div className="tm-scroll tm-min-h-0 tm-flex-1 tm-overflow-y-auto">
        <div className="tm-px-4 tm-pb-3 tm-pt-3">
          <TitleField task={task} editable={editable} />

          <dl className="tm-mt-2 tm-grid tm-grid-cols-[92px_1fr] tm-items-center tm-gap-y-0.5 tm-text-sm">
            <Prop label="Trạng thái">
              <InlineSelect
                value={task.status}
                disabled={!editable}
                onChange={(e) => st.requestStatus(task.id, e.target.value as Task['status'])}
                className={task.status === 'done' ? 'tm-text-success' : ''}
              >
                {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
              </InlineSelect>
            </Prop>
            <Prop label="Ưu tiên">
              <InlineSelect
                value={task.priority}
                disabled={!editable}
                className={task.priority === 'urgent' ? 'tm-font-medium tm-text-danger' : ''}
                onChange={(e) => {
                  const p = e.target.value as Task['priority'];
                  st.updateTask(task.id, { priority: p }, { text: `đổi ưu tiên → ${PRIORITY_LABEL[p]}` });
                }}
              >
                {PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}
              </InlineSelect>
            </Prop>
            <Prop label="Phụ trách">
              <div className="tm-flex tm-items-center tm-gap-1.5 tm-pl-2">
                <Avatar member={members.find((m) => m.id === task.ownerId)} />
                <InlineSelect
                  value={task.ownerId}
                  disabled={!canReassign(user)}
                  className="-tm-ml-1.5 tm-flex-1"
                  onChange={(e) =>
                    st.updateTask(
                      task.id,
                      { ownerId: e.target.value, collaboratorIds: task.collaboratorIds.filter((c) => c !== e.target.value) },
                      { text: `giao lại cho ${name(e.target.value)}` },
                    )
                  }
                >
                  {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </InlineSelect>
              </div>
            </Prop>
            <Prop label="Phối hợp">
              <Collaborators task={task} editable={editable} />
            </Prop>
            <Prop label="Danh mục">
              <InlineSelect
                value={task.category}
                disabled={!editable}
                onChange={(e) => st.updateTask(task.id, { category: e.target.value }, { text: `đổi danh mục → ${e.target.value}` })}
              >
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </InlineSelect>
            </Prop>
            <Prop label="Deadline">
              <div className="tm-flex tm-items-center tm-gap-2">
                <DeadlineField task={task} editable={editable} />
                <span className={`tm-text-xs tm-font-medium ${TONE_TEXT[dl.tone]}`}>{dl.label}</span>
              </div>
            </Prop>
          </dl>

          {needsLateReason(task, today) && <LateReasonBox task={task} editable={editable} />}
          {task.lateReason && !needsLateReason(task, today) && (
            <div className="tm-mt-3 tm-rounded tm-border tm-border-line tm-bg-subtle tm-px-3 tm-py-2 tm-text-sm">
              <div className="tm-label tm-mb-0.5">Lý do trễ hạn</div>
              {task.lateReason}
            </div>
          )}
        </div>

        {/* (2) Mô tả */}
        <Section title="Mô tả">
          <DescriptionField task={task} editable={editable} />
        </Section>

        {/* Minh chứng — nhiều link/tệp, sửa/tải lại được */}
        <EvidenceSection task={task} editable={editable} />

        {/* (3) Checklist */}
        <Checklist task={task} canCheck={canCheck} editable={editable} />

        {/* (4) Activity Log */}
        <Section title="Hoạt động">
          <ol className="tm-relative tm-space-y-2.5 tm-pl-4 before:tm-absolute before:tm-bottom-1 before:tm-left-[3px] before:tm-top-1 before:tm-w-px before:tm-bg-line">
            {[...task.activity].reverse().map((a) => (
              <ActivityRow key={a.id} a={a} actor={name(a.actorId)} />
            ))}
          </ol>
        </Section>
      </div>
    </>
  );
}

function Prop({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="tm-text-fg-3">{label}</dt>
      <dd className="tm-min-w-0">{children}</dd>
    </>
  );
}

function Section({ title, right, children }: { title: string; right?: ReactNode; children: ReactNode }) {
  return (
    <section className="tm-border-t tm-border-line tm-px-4 tm-py-3">
      <div className="tm-mb-2 tm-flex tm-items-center tm-justify-between">
        <h3 className="tm-text-xs tm-font-semibold tm-uppercase tm-tracking-wide tm-text-fg-3">{title}</h3>
        {right}
      </div>
      {children}
    </section>
  );
}

function useAutosize(ref: React.RefObject<HTMLTextAreaElement>, value: string) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = '0px';
    el.style.height = el.scrollHeight + 'px';
  }, [value, ref]);
}

function TitleField({ task, editable }: { task: Task; editable: boolean }) {
  const [v, setV] = useState(task.title);
  const ref = useRef<HTMLTextAreaElement>(null);
  useAutosize(ref, v);
  const commit = () => {
    const t = v.trim();
    if (!t) return setV(task.title);
    if (t !== task.title) useTasks.getState().updateTask(task.id, { title: t }, { text: 'đổi tên công việc' });
  };
  return (
    <textarea
      ref={ref}
      rows={1}
      readOnly={!editable}
      value={v}
      onChange={(e) => setV(e.target.value.replace(/\n/g, ''))}
      onBlur={commit}
      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), e.currentTarget.blur())}
      className="-tm-mx-1 tm-w-[calc(100%+8px)] tm-overflow-hidden tm-rounded tm-px-1 tm-py-0.5 tm-text-md tm-font-semibold tm-leading-snug hover:tm-bg-subtle focus:tm-bg-subtle read-only:hover:tm-bg-transparent"
    />
  );
}

function DescriptionField({ task, editable }: { task: Task; editable: boolean }) {
  const [v, setV] = useState(task.description);
  const ref = useRef<HTMLTextAreaElement>(null);
  useAutosize(ref, v);
  return (
    <textarea
      ref={ref}
      rows={2}
      readOnly={!editable}
      value={v}
      placeholder={editable ? 'Thêm mô tả, yêu cầu đầu ra…' : 'Chưa có mô tả'}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => v !== task.description && useTasks.getState().updateTask(task.id, { description: v }, { text: 'cập nhật mô tả' })}
      className="-tm-mx-1 tm-w-[calc(100%+8px)] tm-overflow-hidden tm-rounded tm-px-1 tm-py-0.5 tm-text-sm tm-text-fg-2 hover:tm-bg-subtle focus:tm-bg-subtle read-only:hover:tm-bg-transparent"
    />
  );
}

function DeadlineField({ task, editable }: { task: Task; editable: boolean }) {
  const [v, setV] = useState(task.deadline);
  useEffect(() => setV(task.deadline), [task.deadline]);
  const commit = () => {
    if (!v || v === task.deadline) return setV(task.deadline);
    // Nếu cần popup lý do mà người dùng hủy → trả về giá trị cũ
    useTasks.getState().requestDeadline(task.id, v, { onCancel: () => setV(task.deadline) });
  };
  return (
    <input
      type="date"
      disabled={!editable}
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
      className="tm-num tm-h-7 tm-rounded tm-px-2 tm-text-sm hover:tm-bg-muted disabled:hover:tm-bg-transparent"
    />
  );
}

function Collaborators({ task, editable }: { task: Task; editable: boolean }) {
  const members = useTasks((s) => s.members);
  const st = useTasks.getState();
  const available = members.filter((m) => m.id !== task.ownerId && !task.collaboratorIds.includes(m.id));
  return (
    <div className="tm-flex tm-min-h-7 tm-flex-wrap tm-items-center tm-gap-1 tm-pl-2">
      {task.collaboratorIds.length === 0 && !editable && <span className="tm-text-fg-3">—</span>}
      {task.collaboratorIds.map((id) => {
        const m = members.find((x) => x.id === id);
        return (
          <span key={id} className="tm-group tm-inline-flex tm-items-center tm-gap-0.5 tm-rounded tm-bg-muted tm-py-px tm-pl-1.5 tm-pr-1 tm-text-xs tm-text-fg-2">
            {m?.name}
            {editable && (
              <button
                aria-label={`Bỏ ${m?.name}`}
                className="tm-text-fg-3 hover:tm-text-fg"
                onClick={() =>
                  st.updateTask(task.id, { collaboratorIds: task.collaboratorIds.filter((c) => c !== id) }, { text: `bỏ phối hợp: ${m?.name}` })
                }
              >
                <Icon name="x" size={10} />
              </button>
            )}
          </span>
        );
      })}
      {editable && available.length > 0 && (
        <select
          value=""
          aria-label="Thêm người phối hợp"
          onChange={(e) => {
            const m = members.find((x) => x.id === e.target.value);
            st.updateTask(task.id, { collaboratorIds: [...task.collaboratorIds, e.target.value] }, { text: `thêm phối hợp: ${m?.name}` });
          }}
          className="tm-h-6 tm-w-[64px] tm-cursor-pointer tm-appearance-none tm-rounded tm-px-1.5 tm-text-xs tm-text-fg-3 hover:tm-bg-muted"
        >
          <option value="">+ Thêm</option>
          {available.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      )}
    </div>
  );
}

function LateReasonBox({ task, editable }: { task: Task; editable: boolean }) {
  const [v, setV] = useState('');
  const ok = v.trim().length >= 5;
  return (
    <div className="tm-mt-3 tm-rounded tm-border tm-border-danger/30 tm-bg-danger/[0.04] tm-px-3 tm-py-2">
      <div className="tm-text-sm tm-font-medium tm-text-danger">Cần giải trình lý do trễ hạn</div>
      {editable ? (
        <div className="tm-mt-1.5 tm-flex tm-gap-1.5">
          <input
            className="tm-input"
            placeholder="Nhập lý do trễ hạn…"
            value={v}
            onChange={(e) => setV(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && ok && useTasks.getState().setLateReason(task.id, v.trim())}
          />
          <button className="tm-btn-primary" disabled={!ok} onClick={() => useTasks.getState().setLateReason(task.id, v.trim())}>
            Lưu
          </button>
        </div>
      ) : (
        <div className="tm-mt-0.5 tm-text-xs tm-text-fg-2">Người phụ trách chưa giải trình.</div>
      )}
    </div>
  );
}

function EvidenceSection({ task, editable }: { task: Task; editable: boolean }) {
  const members = useTasks((s) => s.members);
  const st = useTasks.getState();
  const name = (id: string) => members.find((m) => m.id === id)?.name ?? '—';
  const lockLast = task.status === 'done' && task.evidences.length <= 1;
  if (!editable && task.evidences.length === 0) return null;
  return (
    <Section
      title="Minh chứng"
      right={task.evidences.length > 0 && <span className="tm-num tm-text-xs tm-text-fg-3">{task.evidences.length}</span>}
    >
      {task.evidences.length > 0 && (
        <ul className="-tm-mx-1 tm-mb-1.5">
          {task.evidences.map((e) => (
            <EvidenceRow
              key={e.id}
              evidence={e}
              meta={evidenceMeta(e, name)}
              canEdit={editable}
              canRemove={!lockLast}
              removeHint="Việc đã hoàn thành phải giữ ít nhất 1 minh chứng"
              onReplace={(next) => st.replaceEvidence(task.id, e.id, next)}
              onRemove={() => st.removeEvidence(task.id, e.id)}
            />
          ))}
        </ul>
      )}
      {editable && <AddEvidenceBar onAdd={(items) => st.addEvidences(task.id, items)} />}
    </Section>
  );
}

function Checklist({ task, canCheck, editable }: { task: Task; canCheck: boolean; editable: boolean }) {
  const [draft, setDraft] = useState('');
  const st = useTasks.getState();
  const done = task.checklist.filter((c) => c.done).length;
  const total = task.checklist.length;
  return (
    <Section
      title="Checklist tiến độ"
      right={total > 0 && <span className="tm-num tm-text-xs tm-text-fg-3">{done}/{total}</span>}
    >
      {total > 0 && (
        <div className="tm-mb-2 tm-h-1 tm-overflow-hidden tm-rounded-full tm-bg-muted">
          <div className="tm-h-full tm-bg-success tm-transition-all" style={{ width: `${(done / total) * 100}%` }} />
        </div>
      )}
      <ul className="-tm-mx-1">
        {task.checklist.map((c) => (
          <li key={c.id} className="tm-group tm-flex tm-items-center tm-gap-2 tm-rounded tm-px-1 tm-py-1 hover:tm-bg-subtle">
            <input
              type="checkbox"
              checked={c.done}
              disabled={!canCheck}
              onChange={() => st.toggleChecklist(task.id, c.id)}
              className="tm-h-3.5 tm-w-3.5 tm-cursor-pointer tm-accent-[rgb(var(--tm-accent))]"
            />
            <span className={`tm-flex-1 tm-text-sm ${c.done ? 'tm-text-fg-3 tm-line-through' : ''}`}>{c.text}</span>
            {editable && (
              <button
                onClick={() => st.removeChecklist(task.id, c.id)}
                className="tm-invisible tm-text-fg-3 hover:tm-text-danger group-hover:tm-visible"
                aria-label="Xóa mục"
              >
                <Icon name="x" size={12} />
              </button>
            )}
          </li>
        ))}
      </ul>
      {editable && (
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && draft.trim()) {
              st.addChecklist(task.id, draft.trim());
              setDraft('');
            }
          }}
          placeholder="+ Thêm đầu việc con (Enter)"
          className="tm-mt-1 tm-h-7 tm-w-full tm-rounded tm-px-1 tm-text-sm hover:tm-bg-subtle focus:tm-bg-subtle"
        />
      )}
    </Section>
  );
}

const ACT_TONE: Partial<Record<Activity['type'], string>> = {
  late_reason: 'tm-bg-danger',
  reopen: 'tm-bg-warn',
  evidence: 'tm-bg-success',
};

function ActivityRow({ a, actor }: { a: Activity; actor: string }) {
  const isDone = a.type === 'status' && a.text.includes('Hoàn thành');
  return (
    <li className="tm-relative tm-text-xs">
      <span
        className={`tm-absolute -tm-left-4 tm-top-[5px] tm-h-[7px] tm-w-[7px] tm-rounded-full tm-ring-2 tm-ring-surface ${
          ACT_TONE[a.type] ?? (isDone ? 'tm-bg-success' : 'tm-bg-line-strong')
        }`}
      />
      <div className="tm-text-fg-2">
        <span className="tm-font-medium tm-text-fg">{actor}</span> {a.text}
        <span className="tm-num tm-ml-1.5 tm-text-fg-3">{fmtDateTime(a.at)}</span>
      </div>
      {a.note && (
        <div className={`tm-mt-0.5 tm-break-words ${a.type === 'late_reason' ? 'tm-text-danger' : 'tm-text-fg-2'}`}>
          {a.type === 'evidence' ? '↳ ' : '“'}
          {a.note}
          {a.type === 'evidence' ? '' : '”'}
        </div>
      )}
    </li>
  );
}
