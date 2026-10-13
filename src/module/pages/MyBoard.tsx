import { useEffect, useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useCurrentUser, useTasks } from '../store/tasks';
import { STATUSES, STATUS_LABEL, type Member, type Status, type Task } from '../types';
import { TaskCard } from '../components/TaskCard';
import { lastDayOfMonth, todayVN } from '../lib/dates';
import { isCarryOver, isOverdue, normalize, tasksForView } from '../lib/rules';
import { canEditTask } from '../lib/permissions';

type Columns = Record<Status, string[]>;

export function MyBoard() {
  const user = useCurrentUser();
  const tasks = useTasks((s) => s.tasks);
  const members = useTasks((s) => s.members);
  const viewMonth = useTasks((s) => s.viewMonth);
  const guardOpen = useTasks((s) => !!s.guard);
  const [withCollab, setWithCollab] = useState(false);
  const [q, setQ] = useState('');
  const today = todayVN();

  const visible = useMemo(() => {
    const nq = normalize(q);
    return tasksForView(tasks, viewMonth).filter(
      (t) =>
        (t.ownerId === user.id || (withCollab && t.collaboratorIds.includes(user.id))) &&
        (!nq || normalize(t.title).includes(nq)),
    );
  }, [tasks, viewMonth, user.id, withCollab, q]);

  const byId = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);
  const memberById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);

  const derived = useMemo<Columns>(() => {
    const cols: Columns = { todo: [], doing: [], done: [] };
    visible.forEach((t) => cols[t.status].push(t.id));
    return cols;
  }, [visible]);

  const [cols, setCols] = useState<Columns>(derived);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Đồng bộ lại với store khi không kéo và không có popup chờ xác nhận (hủy popup → thẻ về cột cũ)
  useEffect(() => {
    if (!activeId && !guardOpen) setCols(derived);
  }, [derived, activeId, guardOpen]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const findCol = (id: string, c: Columns = cols): Status | undefined =>
    (STATUSES as string[]).includes(id) ? (id as Status) : STATUSES.find((s) => c[s].includes(id));

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function onDragOver({ active, over }: DragOverEvent) {
    if (!over) return;
    const aid = String(active.id);
    const oid = String(over.id);
    setCols((prev) => {
      const from = findCol(aid, prev);
      const to = findCol(oid, prev);
      if (!from || !to || from === to) return prev;
      const target = prev[to];
      const idx = (STATUSES as string[]).includes(oid) ? target.length : Math.max(0, target.indexOf(oid));
      return {
        ...prev,
        [from]: prev[from].filter((i) => i !== aid),
        [to]: [...target.slice(0, idx), aid, ...target.slice(idx)],
      };
    });
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    const aid = String(active.id);
    const col = findCol(aid);
    setActiveId(null);
    if (!col || !over) return setCols(derived);
    let list = cols[col];
    const oid = String(over.id);
    if (list.includes(oid) && oid !== aid) {
      list = arrayMove(list, list.indexOf(aid), list.indexOf(oid));
      setCols((p) => ({ ...p, [col]: list }));
    }
    const st = useTasks.getState();
    st.applyOrder(list);
    const task = byId.get(aid);
    if (task && task.status !== col) st.requestStatus(aid, col);
  }

  const overdue = visible.filter((t) => isOverdue(t, today)).length;
  const carry = visible.filter((t) => isCarryOver(t, viewMonth) && t.status !== 'done').length;

  return (
    <div className="tm-flex tm-h-full tm-min-h-0 tm-flex-col">
      <div className="tm-flex tm-h-11 tm-shrink-0 tm-items-center tm-gap-3 tm-px-5">
        <input
          className="tm-input tm-w-64"
          placeholder="Tìm công việc…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <label className="tm-flex tm-cursor-pointer tm-select-none tm-items-center tm-gap-1.5 tm-text-sm tm-text-fg-2">
          <input type="checkbox" checked={withCollab} onChange={(e) => setWithCollab(e.target.checked)} className="tm-h-3.5 tm-w-3.5" />
          Gồm việc phối hợp
        </label>
        <div className="tm-ml-auto tm-flex tm-items-center tm-gap-3 tm-text-xs tm-text-fg-3">
          <span><span className="tm-num tm-font-medium tm-text-fg">{visible.length}</span> việc</span>
          {overdue > 0 && <span className="tm-font-medium tm-text-danger"><span className="tm-num">{overdue}</span> quá hạn</span>}
          {carry > 0 && <span className="tm-text-danger"><span className="tm-num">{carry}</span> tồn tháng trước</span>}
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd} onDragCancel={() => setActiveId(null)}>
        <div className="tm-grid tm-min-h-0 tm-flex-1 tm-grid-cols-3 tm-gap-3 tm-px-5 tm-pb-4">
          {STATUSES.map((s) => (
            <Column
              key={s}
              status={s}
              ids={cols[s]}
              byId={byId}
              memberById={memberById}
              user={user}
              viewMonth={viewMonth}
              today={today}
            />
          ))}
        </div>
        <DragOverlay dropAnimation={{ duration: 160, easing: 'cubic-bezier(.2,.8,.2,1)' }}>
          {activeId && byId.get(activeId) ? (
            <TaskCard task={byId.get(activeId)!} owner={memberById.get(byId.get(activeId)!.ownerId)} viewMonth={viewMonth} today={today} overlay />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

function Column(props: {
  status: Status;
  ids: string[];
  byId: Map<string, Task>;
  memberById: Map<string, Member>;
  user: Member;
  viewMonth: string;
  today: string;
}) {
  const { status, ids } = props;
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <section className={`tm-flex tm-min-h-0 tm-flex-col tm-rounded-lg tm-border tm-transition-colors ${isOver ? 'tm-border-line-strong tm-bg-muted' : 'tm-border-line tm-bg-subtle'}`}>
      <header className="tm-flex tm-h-9 tm-shrink-0 tm-items-center tm-gap-2 tm-px-3">
        <h2 className={`tm-text-sm tm-font-semibold ${status === 'done' ? 'tm-text-success' : ''}`}>{STATUS_LABEL[status]}</h2>
        <span className="tm-num tm-text-xs tm-text-fg-3">{ids.length}</span>
      </header>
      <SortableContext id={status} items={ids} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} className="tm-scroll tm-min-h-[80px] tm-flex-1 tm-space-y-1.5 tm-overflow-y-auto tm-px-2 tm-pb-2">
          {ids.map((id) => {
            const t = props.byId.get(id);
            if (!t) return null;
            return (
              <SortableCard
                key={id}
                task={t}
                owner={props.memberById.get(t.ownerId)}
                disabled={!canEditTask(props.user, t)}
                viewMonth={props.viewMonth}
                today={props.today}
              />
            );
          })}
          {status === 'todo' && <QuickAdd user={props.user} viewMonth={props.viewMonth} />}
          {status !== 'todo' && ids.length === 0 && (
            <div className="tm-flex tm-h-16 tm-items-center tm-justify-center tm-rounded-md tm-border tm-border-dashed tm-border-line tm-text-xs tm-text-fg-3">
              Kéo thẻ vào đây
            </div>
          )}
        </div>
      </SortableContext>
    </section>
  );
}

function SortableCard({ task, owner, disabled, viewMonth, today }: {
  task: Task;
  owner?: Member;
  disabled: boolean;
  viewMonth: string;
  today: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id, disabled });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      onClick={() => useTasks.getState().openTask(task.id)}
      onKeyDown={(e) => {
        listeners?.onKeyDown?.(e);
        if (e.key === 'Enter') useTasks.getState().openTask(task.id);
      }}
      className={`tm-outline-none ${isDragging ? 'tm-opacity-30' : ''} ${disabled ? 'tm-cursor-pointer' : 'tm-cursor-grab active:tm-cursor-grabbing'}`}
      title={disabled ? 'Việc phối hợp — chỉ người phụ trách chính được đổi trạng thái' : undefined}
    >
      <TaskCard task={task} owner={owner} viewMonth={viewMonth} today={today} />
    </div>
  );
}

function QuickAdd({ user, viewMonth }: { user: Member; viewMonth: string }) {
  const [v, setV] = useState('');
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="tm-flex tm-h-8 tm-w-full tm-items-center tm-rounded-md tm-px-2 tm-text-sm tm-text-fg-3 hover:tm-bg-muted hover:tm-text-fg-2">
        + Thêm việc
      </button>
    );
  }
  const submit = () => {
    const title = v.trim();
    if (!title) return setOpen(false);
    const st = useTasks.getState();
    const today = todayVN();
    const end = lastDayOfMonth(viewMonth);
    st.addTasks([{ title, category: 'Hành chính', ownerId: user.id, priority: 'normal', deadline: today > end ? today : end, month: viewMonth }]);
    setV('');
  };
  return (
    <input
      autoFocus
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => (v.trim() ? submit() : setOpen(false))}
      onKeyDown={(e) => {
        if (e.key === 'Enter') submit();
        if (e.key === 'Escape') setOpen(false);
      }}
      placeholder="Tên việc, Enter để thêm…"
      className="tm-h-8 tm-w-full tm-rounded-md tm-border tm-border-line-strong tm-bg-surface tm-px-2.5 tm-text-sm"
    />
  );
}
