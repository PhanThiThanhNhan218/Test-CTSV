import { useRef, useState } from 'react';
import type { Evidence, EvidenceInput } from '../types';
import { Icon } from '../ui/Icon';
import { fmtSize, uploadEvidence } from '../lib/adapters';
import { fmtDateTime } from '../lib/dates';

export const isValidUrl = (s: string) => /^https?:\/\/\S+\.\S+/.test(s.trim());
export const linkInput = (url: string): EvidenceInput => ({
  kind: 'link',
  url: url.trim(),
  name: url.trim().replace(/^https?:\/\//, ''),
});

/** Hiển thị một minh chứng: link mở tab mới, tệp hiển thị tên + dung lượng. */
export function EvidenceLink({ evidence }: { evidence: EvidenceInput }) {
  if (evidence.kind === 'link' && evidence.url) {
    return (
      <a
        href={evidence.url}
        target="_blank"
        rel="noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="tm-flex tm-min-w-0 tm-items-center tm-gap-1.5 tm-text-fg hover:tm-underline"
      >
        <Icon name="link" size={13} className="tm-text-fg-3" />
        <span className="tm-truncate">{evidence.name}</span>
      </a>
    );
  }
  return (
    <span className="tm-flex tm-min-w-0 tm-items-center tm-gap-1.5" title="Bản demo chỉ lưu tên tệp — app mẹ nối kho lưu trữ thật qua configureEvidenceUpload()">
      <Icon name="file" size={13} className="tm-text-fg-3" />
      <span className="tm-truncate">{evidence.name}</span>
      {evidence.size ? <span className="tm-shrink-0 tm-text-xs tm-text-fg-3">{fmtSize(evidence.size)}</span> : null}
    </span>
  );
}

/** Thanh thêm minh chứng: dán link + Enter, hoặc chọn nhiều tệp một lúc. */
export function AddEvidenceBar({ onAdd, autoFocus, invalid }: { onAdd(items: EvidenceInput[]): void; autoFocus?: boolean; invalid?: boolean }) {
  const [url, setUrl] = useState('');
  const [err, setErr] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const addLink = () => {
    if (!url.trim()) return;
    if (!isValidUrl(url)) return setErr(true);
    onAdd([linkInput(url)]);
    setUrl('');
    setErr(false);
  };

  return (
    <div>
      <div className="tm-flex tm-gap-1.5">
        <input
          autoFocus={autoFocus}
          className={`tm-input ${err || invalid ? 'tm-border-danger' : ''}`}
          placeholder="Dán link minh chứng (https://…) rồi Enter"
          value={url}
          onChange={(e) => (setUrl(e.target.value), setErr(false))}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addLink())}
          onBlur={() => url.trim() && isValidUrl(url) && addLink()}
        />
        <input
          ref={fileRef}
          type="file"
          multiple
          hidden
          onChange={async (e) => {
            const files = Array.from(e.target.files ?? []);
            e.target.value = '';
            if (files.length) onAdd(await Promise.all(files.map(uploadEvidence)));
          }}
        />
        <button type="button" className="tm-btn tm-shrink-0" onClick={() => fileRef.current?.click()}>
          <Icon name="file" size={13} /> Tải tệp
        </button>
      </div>
      {err && <p className="tm-mt-1 tm-text-xs tm-text-danger">Link phải bắt đầu bằng http:// hoặc https://</p>}
    </div>
  );
}

interface RowProps {
  evidence: EvidenceInput & Partial<Pick<Evidence, 'addedAt' | 'addedBy'>>;
  meta?: string;
  canEdit: boolean;
  canRemove: boolean;
  removeHint?: string;
  onReplace(next: EvidenceInput): void;
  onRemove(): void;
}

/** Một dòng minh chứng có thể Thay (link: sửa tại chỗ, tệp: chọn tệp khác) hoặc Xóa. */
export function EvidenceRow({ evidence, meta, canEdit, canRemove, removeHint, onReplace, onRemove }: RowProps) {
  const [editing, setEditing] = useState(false);
  const [url, setUrl] = useState(evidence.url ?? '');
  const fileRef = useRef<HTMLInputElement>(null);

  if (editing) {
    const ok = isValidUrl(url);
    const save = () => {
      if (!ok) return;
      onReplace(linkInput(url));
      setEditing(false);
    };
    return (
      <li className="tm-flex tm-items-center tm-gap-1.5 tm-py-1">
        <input
          autoFocus
          className={`tm-input ${ok ? '' : 'tm-border-danger'}`}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') save();
            if (e.key === 'Escape') (e.stopPropagation(), setEditing(false));
          }}
        />
        <button className="tm-btn-primary" disabled={!ok} onClick={save}>Lưu</button>
        <button className="tm-btn" onClick={() => setEditing(false)}>Hủy</button>
      </li>
    );
  }

  return (
    <li className="tm-group tm-flex tm-h-8 tm-items-center tm-gap-2 tm-rounded tm-px-1 tm-text-sm hover:tm-bg-subtle">
      <div className="tm-min-w-0 tm-flex-1">
        <EvidenceLink evidence={evidence} />
      </div>
      {meta && <span className="tm-shrink-0 tm-text-2xs tm-text-fg-3 group-hover:tm-hidden">{meta}</span>}
      {canEdit && (
        <span className="tm-hidden tm-shrink-0 tm-items-center tm-gap-0.5 group-hover:tm-flex">
          <input
            ref={fileRef}
            type="file"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (f) onReplace(await uploadEvidence(f));
            }}
          />
          <button
            className="tm-rounded tm-px-1.5 tm-py-0.5 tm-text-xs tm-text-fg-2 hover:tm-bg-muted hover:tm-text-fg"
            onClick={() => (evidence.kind === 'link' ? setEditing(true) : fileRef.current?.click())}
          >
            {evidence.kind === 'link' ? 'Sửa' : 'Tải lại'}
          </button>
          <button
            className="tm-rounded tm-px-1.5 tm-py-0.5 tm-text-xs tm-text-fg-2 hover:tm-bg-muted hover:tm-text-danger disabled:tm-opacity-40 disabled:hover:tm-text-fg-2"
            disabled={!canRemove}
            title={!canRemove ? removeHint : undefined}
            onClick={onRemove}
          >
            Xóa
          </button>
        </span>
      )}
    </li>
  );
}

export function evidenceMeta(e: Evidence, memberName: (id: string) => string) {
  return `${memberName(e.addedBy).split(' ').slice(-1)[0]} · ${fmtDateTime(e.addedAt)}`;
}
