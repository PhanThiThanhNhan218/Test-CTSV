import type { Member, Task } from '../types';

/** Trưởng phòng: toàn quyền. Chuyên viên: chỉ sửa việc mình phụ trách chính. */
export function canEditTask(user: Member, t: Task): boolean {
  return user.role === 'lead' || t.ownerId === user.id;
}

/** Người phối hợp được tick checklist (không sửa thông tin việc). */
export function canToggleChecklist(user: Member, t: Task): boolean {
  return canEditTask(user, t) || t.collaboratorIds.includes(user.id);
}

export function canReassign(user: Member): boolean {
  return user.role === 'lead';
}

export type ModuleTab = 'overview' | 'my' | 'plan' | 'report';

export function allowedTabs(user: Member): ModuleTab[] {
  return user.role === 'lead' ? ['overview', 'my', 'plan', 'report'] : ['my'];
}
