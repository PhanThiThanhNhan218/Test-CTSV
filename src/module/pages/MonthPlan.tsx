import { useEffect, useMemo, useRef, useState, type ClipboardEvent, type KeyboardEvent } from 'react';
import { useTasks } from '../store/tasks';
import { CATEGORIES, PRIORITIES, PRIORITY_LABEL, type Member, type Priority } from '../types';
import { Avatar } from '../ui/Avatar';
import { fmtDate, fmtMonth, monthOf, parseLooseDate } from '../lib/dates';
import { normalize } from '../lib/rules';

type ColKey = 'title' | 'category' | 'owner' | 'priority' | 'deadline';
interface Row {
  key: number;
  title: string;
  category: string;
  owner: string;
  priority: string;
  deadline: string;
}
interface Col {
  key: ColKey;
  label: string;
  width?: number;
  kind: 'text' | 'select' | 'date';
}

const COLS: Col[] = [
  { key: 'title', label: 'Tên việc', kind: 'text' },
  { key: 'category', label: 'Danh mục', width: 180, kind: 'select' },
  { key: 'owner', label: 'Người phụ trách', width: 190, kind: 'select' },
  { key: 'priority', label: 'Độ ưu tiên', width: 110, kind: 'select' },
  { key: 'deadline', label: 'Deadline', width: 130, kind: 'date' },
];

let keySeq = 1;
const blankRow = (): Row => ({ key: keySeq++, title: '', category: '', owner: '', priority: PRIORITY_LABEL.normal, deadline: '' });
const isBlank = (r: Row) => !r.title.trim() && !r.category.trim() && !r.owner.trim() && !r.deadline.trim();

/* ---------- Đối chiếu giá trị gõ/dán với dữ liệu hệ thống ---------- */
function resolveCategory(raw: string) {
  const n = normalize(raw);
  if (!n) return undefined;
  return CATEGORIES.find((c) => normalize(c) === n) ?? CATEGORIES.find((c) => normalize(c).startsWith(n));
}
function resolveOwner(raw: string, members: Member[]) {
  const n = normalize(raw);
  if (!n) return undefined;
  const exact = members.find((m) => normalize(m.name) === n || normalize(m.initials) === n);
  if (exact) return exact;
  const partial = members.filter((m) => normalize(m.name).endsWith(n) || normalize(m.name).includes(n));
  return partial.length === 1 ? partial[0] : undefined;
}
function resolvePriority(raw: string): Priority | undefined {
  const n = normalize(raw);
  if (!n) return undefined;
  return PRIORITIES.find((p) => normalize(PRIORITY_LABEL[p]) === n || p === n);
}

type CellState = 'ok' | 'error' | 'warn' | 'empty';

export function MonthPlan() {
  const members = useTasks((s) => s.members);
  const viewMonth = useTasks((s) => s.viewMonth);
  const monthCount = useTasks((s) => s.tasks.filter((t) => t.month === s.viewMonth).length);
  const year = Number(viewMonth.slice(0, 4));
  const storageKey = `ctsv-plan-draft-${viewMonth}`;

  const [rows, setRows] = useState<Row[]>(() => loadDraft(storageKey));
  const [active, setActive] = useState({ r: 0, c: 0 });
  const [editing, setEditing] = useState<{ value: string } | null>(null);
  const [flash, setFlash] = useState('');
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => setRows(loadDraft(storageKey)), [storageKey]);
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(rows.filter((r) => !isBlank(r))));
    } catch {
      /* bỏ qua khi trình duyệt chặn storage */
    }
  }, [rows, storageKey]);

  /* ---------- Kiểm tra từng ô ---------- */
  const check = (r: Row, k: ColKey): { state: CellState; msg?: string } => {
    if (isBlank(r)) return { state: 'empty' };
    const raw = r[k].trim();
    switch (k) {
      case 'title':
        return raw ? { state: 'ok' } : { state: 'error', msg: 'Thiếu tên việc' };
      case 'category':
        return !raw ? { state: 'error', msg: 'Chọn danh mục' } : resolveCategory(raw) ? { state: 'ok' } : { state: 'error', msg: `Không có danh mục "${raw}"` };
      case 'owner':
        return !raw ? { state: 'error', msg: 'Chọn người phụ trách' } : resolveOwner(raw, members) ? { state: 'ok' } : { state: 'error', msg: `Không tìm thấy nhân sự "${raw}"` };
      case 'priority':
        return resolvePriority(raw) ? { state: 'ok' } : { state: 'error', msg: 'Ưu tiên: Khẩn / Cao / Thường / Thấp' };
      case 'deadline': {
        if (!raw) return { state: 'error', msg: 'Nhập deadline (dd/mm)' };
        const d = parseLooseDate(raw, year);
        if (!d) return { state: 'error', msg: 'Ngày không hợp lệ' };
        return monthOf(d) !== viewMonth ? { state: 'warn', msg: `Ngoài ${fmtMonth(viewMonth).toLowerCase()}` } : { state: 'ok' };
      }
    }
  };

  const summary = useMemo(() => {
    let valid = 0, errors = 0, warns = 0;
    rows.forEach((r) => {
      if (isBlank(r)) return;
      const states = COLS.map((c) => check(r, c.key).state);
      const e = states.filter((s) => s === 'error').length;
      errors += e;
      warns += states.filter((s) => s === 'warn').length;
      if (!e) valid++;
    });
    return { valid, errors, warns };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, members, viewMonth]);

  /* ---------- Thao tác dữ liệu ---------- */
  const setCell = (r: number, k: ColKey, value: string) =>
    setRows((rs) => {
      const next = rs.map((row, i) => (i === r ? { ...row, [k]: value } : row));
      if (r === next.length - 1 && !isBlank(next[r])) next.push(blankRow());
      return next;
    });

  const normalizeValue = (k: ColKey, v: string) => {
    if (k === 'category') return resolveCategory(v) ?? v;
    if (k === 'owner') return resolveOwner(v, members)?.name ?? v;
    if (k === 'priority') {
      const p = resolvePriority(v);
      return p ? PRIORITY_LABEL[p] : v;
    }
    if (k === 'deadline') {
      const d = parseLooseDate(v, year);
      return d ? fmtDate(d) : v;
    }
    return v;
  };

  const move = (dr: number, dc: number) => {
    let nc = active.c + dc, nr = active.r + dr;
    if (nc >= COLS.length) (nc = 0), nr++;
    if (nc < 0) (nc = COLS.length - 1), nr--;
    if (nr >= rows.length) setRows((rs) => (rs.length <= nr ? [...rs, blankRow()] : rs));
    setActive({ r: Math.max(0, nr), c: nc });
  };

  // Focus đồng bộ để không mất phím khi người dùng gõ liên tục sau Tab/Enter
  const focusGrid = () => gridRef.current?.focus({ preventScroll: true });

  const commit = (value: string, then?: 'down' | 'right' | 'left') => {
    const k = COLS[active.c].key;
    setCell(active.r, k, normalizeValue(k, value));
    setEditing(null);
    if (then === 'down') move(1, 0);
    if (then === 'right') move(0, 1);
    if (then === 'left') move(0, -1);
    focusGrid();
  };

  const startEdit = (initial?: string) => setEditing({ value: initial ?? rows[active.r]?.[COLS[active.c].key] ?? '' });

  function onGridKey(e: KeyboardEvent<HTMLDivElement>) {
    if (editing) return;
    const k = COLS[active.c].key;
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key === 'Backspace') {
      e.preventDefault();
      setRows((rs) => (rs.length > 1 ? rs.filter((_, i) => i !== active.r) : [blankRow()]));
      setActive((a) => ({ ...a, r: Math.max(0, Math.min(a.r, rows.length - 2)) }));
      return;
    }
    if (mod && e.key.toLowerCase() === 'd') {
      e.preventDefault();
      if (active.r > 0) setCell(active.r, k, rows[active.r - 1][k]);
      return;
    }
    if (mod && e.key === 'Enter') return void (e.preventDefault(), submit());
    switch (e.key) {
      case 'ArrowUp': e.preventDefault(); return move(-1, 0);
      case 'ArrowDown': e.preventDefault(); return move(1, 0);
      case 'ArrowLeft': e.preventDefault(); return move(0, -1);
      case 'ArrowRight': e.preventDefault(); return move(0, 1);
      case 'Tab': e.preventDefault(); return move(0, e.shiftKey ? -1 : 1);
      case 'Enter':
      case 'F2': e.preventDefault(); return startEdit();
      case 'Delete':
      case 'Backspace': e.preventDefault(); return setCell(active.r, k, '');
    }
    if (e.key.length === 1 && !mod && !e.altKey) {
      e.preventDefault();
      startEdit(e.key);
    }
  }

  /** Dán nhiều dòng/cột từ Excel (TSV) bắt đầu từ ô đang chọn. */
  function onPaste(e: ClipboardEvent<HTMLDivElement>) {
    if (editing) return;
    const text = e.clipboardData.getData('text/plain');
    if (!text) return;
    e.preventDefault();
    const matrix = text.replace(/\r/g, '').replace(/\n$/, '').split('\n').map((l) => l.split('\t'));
    setRows((rs) => {
      const next = [...rs];
      matrix.forEach((cells, i) => {
        const ri = active.r + i;
        while (next.length <= ri) next.push(blankRow());
        const row = { ...next[ri] };
        cells.forEach((v, j) => {
          const col = COLS[active.c + j];
          if (col) row[col.key] = normalizeValue(col.key, v.trim());
        });
        next[ri] = row;
      });
      if (!isBlank(next[next.length - 1])) next.push(blankRow());
      return next;
    });
    setFlash(`Đã dán ${matrix.length} dòng`);
  }

  function submit() {
    if (summary.errors || !summary.valid) return;
    const inputs = rows
      .filter((r) => !isBlank(r))
      .map((r) => ({
        title: r.title.trim(),
        category: resolveCategory(r.category)!,
        ownerId: resolveOwner(r.owner, members)!.id,
        priority: resolvePriority(r.priority)!,
        deadline: parseLooseDate(r.deadline, year)!,
        month: viewMonth,
      }));
    useTasks.getState().addTasks(inputs);
    setRows([blankRow()]);
    setActive({ r: 0, c: 0 });
    setFlash(`Đã giao ${inputs.length} việc vào ${fmtMonth(viewMonth).toLowerCase()}`);
  }

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(''), 2600);
    return () => clearTimeout(t);
  }, [flash]);

  const canSubmit = summary.valid > 0 && summary.errors === 0;

  return (
    <div className="tm-flex tm-h-full tm-min-h-0 tm-flex-col tm-px-5 tm-pb-4">
      <div className="tm-flex tm-h-11 tm-shrink-0 tm-items-center tm-gap-3">
        <div className="tm-text-sm tm-text-fg-2">
          Nhập hàng loạt cho <span className="tm-font-medium tm-text-fg">{fmtMonth(viewMonth)}</span>
          <span className="tm-ml-2 tm-text-fg-3">· đã có {monthCount} việc trong tháng</span>
        </div>
        <span className="tm-ml-auto tm-text-xs tm-text-fg-3">Dán trực tiếp từ Excel (Ctrl+V) · Ctrl+D chép ô trên · Ctrl+⌫ xóa dòng</span>
      </div>

      <div className="tm-card tm-flex tm-min-h-0 tm-flex-1 tm-flex-col tm-overflow-hidden">
        <div
          ref={gridRef}
          tabIndex={0}
          onKeyDown={onGridKey}
          onPaste={onPaste}
          className="tm-scroll tm-min-h-0 tm-flex-1 tm-overflow-auto tm-outline-none"
          role="grid"
          aria-label="Bảng lập kế hoạch tháng"
        >
          <table className="tm-w-full tm-table-fixed tm-text-sm">
            <colgroup>
              <col style={{ width: 40 }} />
              {COLS.map((c) => <col key={c.key} style={c.width ? { width: c.width } : undefined} />)}
            </colgroup>
            <thead className="tm-sticky tm-top-0 tm-z-[2]">
              <tr className="tm-h-8 tm-bg-subtle tm-text-left tm-text-xs tm-text-fg-3">
                <th className="tm-border-b tm-border-r tm-border-line tm-text-center tm-font-medium">#</th>
                {COLS.map((c) => (
                  <th key={c.key} className="tm-border-b tm-border-r tm-border-line tm-px-2 tm-font-medium last:tm-border-r-0">
                    {c.label} <span className="tm-text-danger">*</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={row.key} className="tm-h-8">
                  <td className={`tm-num tm-border-b tm-border-r tm-border-line tm-text-center tm-text-xs ${active.r === ri ? 'tm-bg-muted tm-text-fg' : 'tm-bg-subtle tm-text-fg-3'}`}>
                    {ri + 1}
                  </td>
                  {COLS.map((col, ci) => {
                    const isActive = active.r === ri && active.c === ci;
                    const { state, msg } = check(row, col.key);
                    return (
                      <td
                        key={col.key}
                        title={msg}
                        onMouseDown={(e) => {
                          if (isActive && !editing && col.kind !== 'text') {
                            e.preventDefault();
                            return startEdit();
                          }
                          if (!isActive) {
                            if (editing) setEditing(null);
                            setActive({ r: ri, c: ci });
                          }
                        }}
                        onDoubleClick={() => startEdit()}
                        className={`tm-relative tm-overflow-visible tm-whitespace-nowrap tm-border-b tm-border-r tm-border-line tm-px-2 last:tm-border-r-0 ${
                          state === 'error' ? 'tm-bg-danger/[0.05]' : state === 'warn' ? 'tm-bg-caution/[0.07]' : ''
                        }`}
                      >
                        {isActive && (
                          <span className="tm-pointer-events-none tm-absolute tm-inset-[-1px] tm-z-[1] tm-border-2 tm-border-[rgb(var(--tm-focus))]" />
                        )}
                        {state === 'error' && !isActive && (
                          <span className="tm-pointer-events-none tm-absolute tm-inset-0 tm-border tm-border-danger/60" />
                        )}
                        {isActive && editing ? (
                          <CellEditor
                            col={col}
                            initial={editing.value}
                            members={members}
                            onCommit={commit}
                            onCancel={() => (setEditing(null), focusGrid())}
                          />
                        ) : (
                          <CellView col={col} value={row[col.key]} state={state} members={members} />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <button
            onClick={() => (setRows((rs) => [...rs, blankRow()]), setActive({ r: rows.length, c: 0 }), focusGrid())}
            className="tm-h-8 tm-w-full tm-px-3 tm-text-left tm-text-sm tm-text-fg-3 hover:tm-bg-subtle hover:tm-text-fg-2"
          >
            + Thêm dòng
          </button>
        </div>

        <footer className="tm-flex tm-h-11 tm-shrink-0 tm-items-center tm-gap-4 tm-border-t tm-border-line tm-bg-subtle tm-px-4 tm-text-xs">
          <span className="tm-text-fg-2"><span className="tm-num tm-font-medium tm-text-fg">{summary.valid}</span> dòng hợp lệ</span>
          {summary.errors > 0 && <span className="tm-font-medium tm-text-danger"><span className="tm-num">{summary.errors}</span> ô lỗi — sửa trước khi giao</span>}
          {summary.warns > 0 && <span className="tm-text-caution"><span className="tm-num">{summary.warns}</span> deadline ngoài tháng</span>}
          {flash && <span className="tm-anim-fade tm-font-medium tm-text-success">{flash}</span>}
          <button className="tm-btn tm-ml-auto" onClick={() => (setRows([blankRow()]), setActive({ r: 0, c: 0 }))}>Xóa bảng</button>
          <button className="tm-btn-primary" disabled={!canSubmit} onClick={submit} title="Ctrl + Enter">
            Giao việc ({summary.valid})
          </button>
        </footer>
      </div>
    </div>
  );
}

function loadDraft(key: string): Row[] {
  try {
    const saved = JSON.parse(localStorage.getItem(key) ?? '[]') as Omit<Row, 'key'>[];
    if (Array.isArray(saved) && saved.length) return [...saved.map((r) => ({ ...r, key: keySeq++ })), blankRow()];
  } catch {
    /* noop */
  }
  return [blankRow(), blankRow(), blankRow()];
}

function CellView({ col, value, state, members }: { col: Col; value: string; state: CellState; members: Member[] }) {
  if (!value) return <span className="tm-text-fg-3/0">.</span>;
  const err = state === 'error';
  if (col.key === 'owner') {
    const m = resolveOwner(value, members);
    return (
      <span className="tm-flex tm-items-center tm-gap-1.5 tm-truncate">
        {m && <Avatar member={m} />}
        <span className={`tm-truncate ${err ? 'tm-text-danger' : ''}`}>{value}</span>
      </span>
    );
  }
  if (col.key === 'priority') {
    return <span className={`tm-block tm-truncate ${err ? 'tm-text-danger' : resolvePriority(value) === 'urgent' ? 'tm-font-medium tm-text-danger' : ''}`}>{value}</span>;
  }
  return (
    <span className={`tm-block tm-truncate ${col.kind === 'date' ? 'tm-num' : ''} ${err ? 'tm-text-danger' : state === 'warn' ? 'tm-text-caution' : ''}`}>
      {value}
    </span>
  );
}

function CellEditor({ col, initial, members, onCommit, onCancel }: {
  col: Col;
  initial: string;
  members: Member[];
  onCommit(v: string, then?: 'down' | 'right' | 'left'): void;
  onCancel(): void;
}) {
  const [v, setV] = useState(initial);
  const [hi, setHi] = useState(0);
  const doneRef = useRef(false);
  const finish = (value: string, then?: 'down' | 'right' | 'left') => {
    if (doneRef.current) return;
    doneRef.current = true;
    onCommit(value, then);
  };
  const options = useMemo(() => {
    if (col.kind !== 'select') return [];
    const all =
      col.key === 'category' ? [...CATEGORIES] : col.key === 'owner' ? members.map((m) => m.name) : PRIORITIES.map((p) => PRIORITY_LABEL[p]);
    // Lần mở đầu (giá trị cũ) → hiện đủ danh sách; khi gõ → lọc không dấu
    const n = normalize(v);
    return v === initial && initial.length !== 1 ? all : all.filter((o) => normalize(o).includes(n));
  }, [v, col, members, initial]);

  useEffect(() => setHi(0), [v]);

  const pick = (then?: 'down' | 'right' | 'left') => finish(col.kind === 'select' && options[hi] ? options[hi] : v, then);

  return (
    <>
      <input
        autoFocus
        value={v}
        onFocus={(e) => (initial.length === 1 ? e.currentTarget.setSelectionRange(1, 1) : e.currentTarget.select())}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => finish(v)}
        placeholder={col.kind === 'date' ? 'dd/mm' : undefined}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'Escape') return void ((doneRef.current = true), onCancel());
          if (e.key === 'Enter') return void (e.preventDefault(), pick('down'));
          if (e.key === 'Tab') return void (e.preventDefault(), pick(e.shiftKey ? 'left' : 'right'));
          if (col.kind === 'select' && e.key === 'ArrowDown') return void (e.preventDefault(), setHi((h) => Math.min(h + 1, options.length - 1)));
          if (col.kind === 'select' && e.key === 'ArrowUp') return void (e.preventDefault(), setHi((h) => Math.max(h - 1, 0)));
        }}
        className="tm-relative tm-z-[2] tm-h-full tm-w-full tm-bg-transparent tm-text-sm"
      />
      {col.kind === 'select' && options.length > 0 && (
        <ul className="tm-absolute tm-left-[-2px] tm-top-full tm-z-[5] tm-mt-0.5 tm-max-h-56 tm-min-w-[calc(100%+4px)] tm-overflow-auto tm-rounded-md tm-border tm-border-line tm-bg-surface tm-py-1 tm-shadow-lg">
          {options.map((o, i) => (
            <li
              key={o}
              onMouseDown={(e) => (e.preventDefault(), finish(o, 'down'))}
              onMouseEnter={() => setHi(i)}
              className={`tm-flex tm-h-7 tm-cursor-pointer tm-items-center tm-gap-2 tm-px-2.5 tm-text-sm ${i === hi ? 'tm-bg-muted' : ''}`}
            >
              {col.key === 'owner' && <Avatar member={members.find((m) => m.name === o)} />}
              {o}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
