import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Activity, ActivityType, Evidence, EvidenceInput, Member, Priority, Status, Task } from '../types';
import { PRIORITY_LABEL, STATUS_LABEL } from '../types';
import { fmtDate, monthOf, todayVN } from '../lib/dates';
import { completionNeedsLateReason, postponeNeedsReason, statusGuard, type GuardKind } from '../lib/rules';
import { SEED_MEMBERS, buildSeed } from './seed';

export interface GuardRequest {
  kind: GuardKind;
  taskId: string;
  to?: Status;
  newDeadline?: string;
  onCancel?: () => void;
}

export interface NewTaskInput {
  title: string;
  category: string;
  ownerId: string;
  priority: Priority;
  deadline: string;
  month: string;
}

interface Callbacks {
  onCancel?: () => void;
}

interface State {
  tasks: Task[];
  members: Member[];
  currentUserId: string;
  viewMonth: string;
  openTaskId: string | null;
  guard: GuardRequest | null;

  setUser(id: string): void;
  setViewMonth(m: string): void;
  openTask(id: string | null): void;

  /** Đổi trạng thái — tự bật popup bắt buộc nếu cần. Trả về true nếu đã áp dụng ngay. */
  requestStatus(id: string, to: Status, cb?: Callbacks): boolean;
  /** Đổi deadline — bắt buộc lý do khi dời hạn việc đã quá hạn. */
  requestDeadline(id: string, deadline: string, cb?: Callbacks): boolean;
  /** Hoàn thành: gắn các minh chứng mới (có thể nhiều) + lý do trễ nếu cần. */
  confirmComplete(added: EvidenceInput[], lateReason?: string): void;
  confirmReopen(reason: string): void;
  confirmPostpone(reason: string): void;
  cancelGuard(): void;

  applyOrder(ids: string[]): void;
  updateTask(id: string, patch: Partial<Task>, log?: { type?: ActivityType; text: string; note?: string }): void;
  setLateReason(id: string, reason: string): void;
  addEvidences(id: string, inputs: EvidenceInput[]): void;
  replaceEvidence(id: string, evidenceId: string, input: EvidenceInput): void;
  /** Việc đã Hoàn thành phải giữ tối thiểu 1 minh chứng. */
  removeEvidence(id: string, evidenceId: string): boolean;
  toggleChecklist(id: string, itemId: string): void;
  addChecklist(id: string, text: string): void;
  removeChecklist(id: string, itemId: string): void;
  addTasks(inputs: NewTaskInput[]): void;
  resetDemo(): void;
}

let n = 0;
const uid = (p: string) => `${p}${Date.now().toString(36)}${(n++).toString(36)}`;

export const useTasks = create<State>()(
  persist(
    (set, get) => {
      const log = (type: ActivityType, text: string, note?: string): Activity => ({
        id: uid('a'),
        at: new Date().toISOString(),
        actorId: get().currentUserId,
        type,
        text,
        note,
      });
      const patchTask = (id: string, fn: (t: Task) => Task) =>
        set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? fn(t) : t)) }));
      const find = (id: string) => get().tasks.find((t) => t.id === id);
      const toEvidence = (i: EvidenceInput): Evidence => ({
        ...i,
        id: uid('e'),
        addedAt: new Date().toISOString(),
        addedBy: get().currentUserId,
      });

      return {
        tasks: buildSeed(todayVN()),
        members: SEED_MEMBERS,
        currentUserId: 'm1',
        viewMonth: monthOf(todayVN()),
        openTaskId: null,
        guard: null,

        setUser: (id) => set({ currentUserId: id }),
        setViewMonth: (m) => set({ viewMonth: m }),
        openTask: (id) => set({ openTaskId: id }),

        requestStatus(id, to, cb) {
          const t = find(id);
          if (!t || t.status === to) return false;
          const kind = statusGuard(t, to);
          if (kind) {
            set({ guard: { kind, taskId: id, to, onCancel: cb?.onCancel } });
            return false;
          }
          patchTask(id, (t) => ({
            ...t,
            status: to,
            activity: [...t.activity, log('status', `chuyển sang ${STATUS_LABEL[to]}`)],
          }));
          return true;
        },

        requestDeadline(id, deadline, cb) {
          const t = find(id);
          if (!t || !deadline || t.deadline === deadline) return false;
          if (postponeNeedsReason(t, deadline, todayVN())) {
            set({ guard: { kind: 'postpone', taskId: id, newDeadline: deadline, onCancel: cb?.onCancel } });
            return false;
          }
          patchTask(id, (t) => ({
            ...t,
            deadline,
            activity: [...t.activity, log('deadline', `đổi hạn ${fmtDate(t.deadline)} → ${fmtDate(deadline)}`)],
          }));
          return true;
        },

        confirmComplete(added, lateReason) {
          const g = get().guard;
          if (!g) return;
          const today = todayVN();
          patchTask(g.taskId, (t) => {
            const needReason = completionNeedsLateReason(t, today);
            const acts = [...t.activity];
            if (needReason && lateReason) acts.push(log('late_reason', 'giải trình trễ hạn', lateReason));
            const evs = added.map(toEvidence);
            if (evs.length) acts.push(log('evidence', `đính kèm ${evs.length} minh chứng`, evs.map((e) => e.name).join(', ')));
            acts.push(log('status', `chuyển sang ${STATUS_LABEL.done}`));
            return {
              ...t,
              status: 'done',
              completedAt: today,
              reopened: false,
              evidences: [...t.evidences, ...evs],
              lateReason: needReason && lateReason ? lateReason : t.lateReason,
              activity: acts,
            };
          });
          set({ guard: null });
        },

        confirmReopen(reason) {
          const g = get().guard;
          if (!g || !g.to) return;
          const to = g.to;
          patchTask(g.taskId, (t) => ({
            ...t,
            status: to,
            completedAt: undefined,
            // giữ nguyên các minh chứng cũ; lần hoàn thành sau bắt buộc bổ sung minh chứng mới
            reopened: true,
            activity: [...t.activity, log('reopen', `mở lại → ${STATUS_LABEL[to]}`, reason)],
          }));
          set({ guard: null });
        },

        confirmPostpone(reason) {
          const g = get().guard;
          if (!g || !g.newDeadline) return;
          const nd = g.newDeadline;
          patchTask(g.taskId, (t) => ({
            ...t,
            deadline: nd,
            wasLate: true,
            lateReason: t.lateReason?.trim() ? t.lateReason : reason,
            activity: [...t.activity, log('deadline', `dời hạn ${fmtDate(t.deadline)} → ${fmtDate(nd)}`, reason)],
          }));
          set({ guard: null });
        },

        cancelGuard() {
          get().guard?.onCancel?.();
          set({ guard: null });
        },

        applyOrder(ids) {
          const pos = new Map(ids.map((id, i) => [id, i]));
          set((s) => ({
            tasks: s.tasks.map((t) => (pos.has(t.id) ? { ...t, order: pos.get(t.id)! } : t)),
          }));
        },

        updateTask(id, patch, l) {
          patchTask(id, (t) => ({
            ...t,
            ...patch,
            activity: l ? [...t.activity, log(l.type ?? 'edit', l.text, l.note)] : t.activity,
          }));
        },

        setLateReason(id, reason) {
          patchTask(id, (t) => ({
            ...t,
            lateReason: reason,
            activity: [...t.activity, log('late_reason', 'giải trình trễ hạn', reason)],
          }));
        },

        addEvidences(id, inputs) {
          if (!inputs.length) return;
          const evs = inputs.map(toEvidence);
          patchTask(id, (t) => ({
            ...t,
            evidences: [...t.evidences, ...evs],
            activity: [...t.activity, log('evidence', `thêm ${evs.length} minh chứng`, evs.map((e) => e.name).join(', '))],
          }));
        },

        replaceEvidence(id, evidenceId, input) {
          patchTask(id, (t) => {
            const old = t.evidences.find((e) => e.id === evidenceId);
            if (!old) return t;
            const ev = toEvidence(input);
            return {
              ...t,
              evidences: t.evidences.map((e) => (e.id === evidenceId ? ev : e)),
              activity: [...t.activity, log('evidence', 'thay minh chứng', `${old.name} → ${ev.name}`)],
            };
          });
        },

        removeEvidence(id, evidenceId) {
          const t = find(id);
          if (!t || (t.status === 'done' && t.evidences.length <= 1)) return false;
          const old = t.evidences.find((e) => e.id === evidenceId);
          patchTask(id, (t) => ({
            ...t,
            evidences: t.evidences.filter((e) => e.id !== evidenceId),
            activity: [...t.activity, log('evidence', 'xóa minh chứng', old?.name)],
          }));
          return true;
        },

        toggleChecklist(id, itemId) {
          patchTask(id, (t) => {
            const item = t.checklist.find((c) => c.id === itemId);
            if (!item) return t;
            return {
              ...t,
              checklist: t.checklist.map((c) => (c.id === itemId ? { ...c, done: !c.done } : c)),
              activity: [...t.activity, log('checklist', `${item.done ? 'bỏ tick' : 'hoàn thành'} "${item.text}"`)],
            };
          });
        },

        addChecklist(id, text) {
          patchTask(id, (t) => ({ ...t, checklist: [...t.checklist, { id: uid('c'), text, done: false }] }));
        },

        removeChecklist(id, itemId) {
          patchTask(id, (t) => ({ ...t, checklist: t.checklist.filter((c) => c.id !== itemId) }));
        },

        addTasks(inputs) {
          const base = Math.max(0, ...get().tasks.map((t) => t.order)) + 1;
          const now = new Date().toISOString();
          const created: Task[] = inputs.map((i, k) => ({
            id: uid('t'),
            title: i.title,
            description: '',
            category: i.category,
            ownerId: i.ownerId,
            collaboratorIds: [],
            priority: i.priority,
            status: 'todo',
            deadline: i.deadline,
            month: i.month,
            order: base + k,
            checklist: [],
            evidences: [],
            createdAt: now,
            activity: [log('created', `tạo công việc · ưu tiên ${PRIORITY_LABEL[i.priority]}`)],
          }));
          set((s) => ({ tasks: [...s.tasks, ...created] }));
        },

        resetDemo() {
          set({ tasks: buildSeed(todayVN()), viewMonth: monthOf(todayVN()), openTaskId: null, guard: null });
        },
      };
    },
    {
      name: 'ctsv-task-module',
      version: 2, // v2: nhiều minh chứng / việc
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ tasks: s.tasks, currentUserId: s.currentUserId }),
      // Dữ liệu demo: đổi cấu trúc thì nạp lại bộ mẫu
      migrate: () => ({ tasks: buildSeed(todayVN()), currentUserId: 'm1' }) as unknown as State,
    },
  ),
);

/* ---------- selectors ---------- */
export const useCurrentUser = () =>
  useTasks((s) => s.members.find((m) => m.id === s.currentUserId) ?? s.members[0]);

export const useMember = (id: string | undefined) => useTasks((s) => s.members.find((m) => m.id === id));
