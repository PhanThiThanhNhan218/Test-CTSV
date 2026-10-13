export type Status = 'todo' | 'doing' | 'done';
export type Priority = 'urgent' | 'high' | 'normal' | 'low';
export type Role = 'lead' | 'staff';

export interface Member {
  id: string;
  name: string;
  initials: string;
  title: string;
  role: Role;
}

export interface Evidence {
  id: string;
  kind: 'link' | 'file';
  name: string;
  url?: string;
  size?: number;
  addedAt: string; // ISO
  addedBy: string;
}

/** Minh chứng trước khi gắn vào việc (chưa có id/người thêm). */
export type EvidenceInput = Omit<Evidence, 'id' | 'addedAt' | 'addedBy'>;

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export type ActivityType =
  | 'created'
  | 'status'
  | 'evidence'
  | 'late_reason'
  | 'deadline'
  | 'reopen'
  | 'checklist'
  | 'edit';

export interface Activity {
  id: string;
  at: string; // ISO
  actorId: string;
  type: ActivityType;
  text: string;
  note?: string; // lý do / ghi chú đi kèm
}

export interface Task {
  id: string;
  title: string;
  description: string;
  category: string;
  ownerId: string;
  collaboratorIds: string[];
  priority: Priority;
  status: Status;
  deadline: string; // YYYY-MM-DD (giờ Việt Nam)
  month: string; // YYYY-MM — tháng gốc dùng để thống kê
  order: number;
  checklist: ChecklistItem[];
  /** Một việc có thể phát sinh nhiều tệp/link minh chứng; sửa được sau khi tải lên. */
  evidences: Evidence[];
  lateReason?: string;
  /** Đã từng trễ hạn (dời deadline khi đã quá hạn / hoàn thành muộn) — không mất khi dời ngày */
  wasLate?: boolean;
  completedAt?: string; // YYYY-MM-DD
  /** Đã bị mở lại sau khi hoàn thành → lần hoàn thành tiếp theo phải bổ sung ít nhất 1 minh chứng mới */
  reopened?: boolean;
  createdAt: string;
  activity: Activity[];
}

export const STATUS_LABEL: Record<Status, string> = {
  todo: 'Chưa làm',
  doing: 'Đang làm',
  done: 'Hoàn thành',
};

export const PRIORITY_LABEL: Record<Priority, string> = {
  urgent: 'Khẩn',
  high: 'Cao',
  normal: 'Thường',
  low: 'Thấp',
};

export const PRIORITIES: Priority[] = ['urgent', 'high', 'normal', 'low'];
export const STATUSES: Status[] = ['todo', 'doing', 'done'];

export const CATEGORIES = [
  'Học bổng',
  'Khen thưởng – Kỷ luật',
  'Sự kiện',
  'Hồ sơ SV',
  'Tư vấn',
  'Hành chính',
] as const;
