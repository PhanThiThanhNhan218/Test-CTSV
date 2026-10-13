import { useRef, useState } from 'react';
import { useTasks } from '../store/tasks';
import { Modal } from '../ui/Modal';
import { STATUS_LABEL, type Evidence, type EvidenceInput } from '../types';
import { fmtDate, todayVN } from '../lib/dates';
import { completionNeedsLateReason, overdueDays } from '../lib/rules';
import { AddEvidenceBar, EvidenceRow } from './Evidence';

/** Popup bắt buộc khi: hoàn thành (minh chứng + lý do trễ), mở lại việc đã xong, dời hạn việc quá hạn. */
export function GuardModal() {
  const guard = useTasks((s) => s.guard);
  const task = useTasks((s) => s.tasks.find((t) => t.id === s.guard?.taskId));
  if (!guard || !task) return null;
  // key → reset state mỗi lần mở cho một yêu cầu mới
  return <GuardBody key={guard.taskId + guard.kind + (guard.to ?? '') + (guard.newDeadline ?? '')} />;
}

function GuardBody() {
  const guard = useTasks((s) => s.guard)!;
  const task = useTasks((s) => s.tasks.find((t) => t.id === s.guard?.taskId))!;
  const { cancelGuard, confirmComplete, confirmReopen, confirmPostpone } = useTasks.getState();
  const today = todayVN();

  if (guard.kind === 'complete') {
    return (
      <CompleteForm
        title={task.title}
        existing={task.evidences}
        reopened={!!task.reopened}
        needLateReason={completionNeedsLateReason(task, today)}
        lateInfo={task.deadline < today ? `Hạn ${fmtDate(task.deadline)} · trễ ${overdueDays(task, today)} ngày` : 'Việc đã từng bị dời hạn'}
        onCancel={cancelGuard}
        onConfirm={confirmComplete}
      />
    );
  }

  const isReopen = guard.kind === 'reopen';
  return (
    <ReasonForm
      heading={isReopen ? `Mở lại công việc → ${STATUS_LABEL[guard.to!]}` : 'Dời hạn việc đã quá hạn'}
      subtitle={task.title}
      label={isReopen ? 'Lý do mở lại' : 'Lý do trễ hạn / dời hạn'}
      hint={
        isReopen
          ? 'Các minh chứng hiện có được giữ lại. Khi hoàn thành lại cần bổ sung ít nhất 1 minh chứng mới.'
          : `Dời ${fmtDate(task.deadline)} → ${fmtDate(guard.newDeadline!)}. Việc vẫn được tính là đã trễ một lần trong báo cáo.`
      }
      confirmText={isReopen ? 'Mở lại' : 'Dời hạn'}
      onCancel={cancelGuard}
      onConfirm={isReopen ? confirmReopen : confirmPostpone}
    />
  );
}

function CompleteForm(props: {
  title: string;
  existing: Evidence[];
  reopened: boolean;
  needLateReason: boolean;
  lateInfo: string;
  onCancel(): void;
  onConfirm(added: EvidenceInput[], lateReason?: string): void;
}) {
  const [drafts, setDrafts] = useState<(EvidenceInput & { key: number })[]>([]);
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);
  const keyRef = useRef(0);

  // Mở lại → phải bổ sung minh chứng mới; còn lại chỉ cần tổng ≥ 1
  const evidenceOk = props.reopened ? drafts.length > 0 : drafts.length + props.existing.length > 0;
  const reasonOk = !props.needLateReason || reason.trim().length >= 5;
  const valid = evidenceOk && reasonOk;

  const submit = () => {
    setTouched(true);
    if (valid) props.onConfirm(drafts.map(({ key: _k, ...d }) => d), props.needLateReason ? reason.trim() : undefined);
  };

  return (
    <Modal
      title="Hoàn thành công việc"
      subtitle={props.title}
      width={480}
      onClose={props.onCancel}
      footer={
        <>
          <span className="tm-mr-auto tm-text-xs tm-text-fg-3">Ctrl + Enter để xác nhận</span>
          <button className="tm-btn" onClick={props.onCancel}>Hủy</button>
          <button className="tm-btn-primary" onClick={submit} disabled={touched && !valid}>
            Xác nhận hoàn thành
          </button>
        </>
      }
    >
      <div className="tm-space-y-4 tm-px-4 tm-py-3.5" onKeyDown={(e) => e.key === 'Enter' && (e.metaKey || e.ctrlKey) && submit()}>
        <div>
          <div className="tm-mb-1.5 tm-flex tm-items-baseline tm-justify-between">
            <span className="tm-text-sm tm-font-medium">
              Minh chứng <span className="tm-text-danger">*</span>
            </span>
            <span className="tm-text-xs tm-text-fg-3">Nhiều link / tệp · sửa được sau khi lưu</span>
          </div>
          <AddEvidenceBar
            autoFocus
            invalid={touched && !evidenceOk}
            onAdd={(items) => setDrafts((d) => [...d, ...items.map((i) => ({ ...i, key: ++keyRef.current }))])}
          />
          {(drafts.length > 0 || props.existing.length > 0) && (
            <ul className="tm-mt-2 tm-rounded tm-border tm-border-line tm-px-1 tm-py-0.5">
              {props.existing.map((e) => (
                <EvidenceRow key={e.id} evidence={e} meta="đã có" canEdit={false} canRemove={false} onReplace={() => {}} onRemove={() => {}} />
              ))}
              {drafts.map((d) => (
                <EvidenceRow
                  key={d.key}
                  evidence={d}
                  meta="mới"
                  canEdit
                  canRemove
                  onReplace={(next) => setDrafts((all) => all.map((x) => (x.key === d.key ? { ...next, key: d.key } : x)))}
                  onRemove={() => setDrafts((all) => all.filter((x) => x.key !== d.key))}
                />
              ))}
            </ul>
          )}
          {touched && !evidenceOk && (
            <p className="tm-mt-1 tm-text-xs tm-text-danger">
              {props.reopened ? 'Việc đã bị mở lại — cần bổ sung ít nhất 1 minh chứng mới.' : 'Cần ít nhất 1 link hoặc tệp minh chứng.'}
            </p>
          )}
        </div>

        {props.needLateReason && (
          <div>
            <div className="tm-mb-1.5 tm-flex tm-items-baseline tm-justify-between">
              <span className="tm-text-sm tm-font-medium">
                Lý do trễ hạn <span className="tm-text-danger">*</span>
              </span>
              <span className="tm-text-xs tm-text-danger">{props.lateInfo}</span>
            </div>
            <textarea
              rows={3}
              className={`tm-w-full tm-rounded tm-border tm-bg-surface tm-px-2 tm-py-1.5 tm-text-sm ${
                touched && !reasonOk ? 'tm-border-danger' : 'tm-border-line focus:tm-border-line-strong'
              }`}
              placeholder="VD: Chờ Phòng Đào tạo gửi số liệu…"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            {touched && !reasonOk && <p className="tm-mt-1 tm-text-xs tm-text-danger">Bắt buộc giải trình (tối thiểu 5 ký tự).</p>}
          </div>
        )}
      </div>
    </Modal>
  );
}

function ReasonForm(props: {
  heading: string;
  subtitle: string;
  label: string;
  hint: string;
  confirmText: string;
  onCancel(): void;
  onConfirm(reason: string): void;
}) {
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);
  const ok = reason.trim().length >= 5;
  const submit = () => {
    setTouched(true);
    if (ok) props.onConfirm(reason.trim());
  };
  return (
    <Modal
      title={props.heading}
      subtitle={props.subtitle}
      onClose={props.onCancel}
      footer={
        <>
          <button className="tm-btn" onClick={props.onCancel}>Hủy</button>
          <button className="tm-btn-primary" onClick={submit} disabled={touched && !ok}>{props.confirmText}</button>
        </>
      }
    >
      <div className="tm-px-4 tm-py-3.5">
        <div className="tm-mb-1.5 tm-text-sm tm-font-medium">
          {props.label} <span className="tm-text-danger">*</span>
        </div>
        <textarea
          autoFocus
          rows={3}
          className={`tm-w-full tm-rounded tm-border tm-bg-surface tm-px-2 tm-py-1.5 tm-text-sm ${
            touched && !ok ? 'tm-border-danger' : 'tm-border-line focus:tm-border-line-strong'
          }`}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.metaKey || e.ctrlKey) && submit()}
        />
        {touched && !ok && <p className="tm-mt-1 tm-text-xs tm-text-danger">Bắt buộc nhập lý do (tối thiểu 5 ký tự).</p>}
        <p className="tm-mt-2 tm-text-xs tm-text-fg-3">{props.hint}</p>
      </div>
    </Modal>
  );
}
