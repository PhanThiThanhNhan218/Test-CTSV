import type { Activity, Member, Priority, Status, Task } from '../types';
import { addDays, addMonths, lastDayOfMonth, monthOf } from '../lib/dates';

export const SEED_MEMBERS: Member[] = [
  { id: 'm1', name: 'Nguyễn Thị Thu Hà', initials: 'TH', title: 'Trưởng phòng', role: 'lead' },
  { id: 'm2', name: 'Trần Minh Quân', initials: 'MQ', title: 'Chuyên viên', role: 'staff' },
  { id: 'm3', name: 'Lê Hoàng Anh', initials: 'HA', title: 'Chuyên viên', role: 'staff' },
  { id: 'm4', name: 'Phạm Ngọc Mai', initials: 'NM', title: 'Chuyên viên', role: 'staff' },
  { id: 'm5', name: 'Võ Đức Thịnh', initials: 'ĐT', title: 'Chuyên viên', role: 'staff' },
  { id: 'm6', name: 'Đặng Thảo Vy', initials: 'TV', title: 'Chuyên viên', role: 'staff' },
];

type Spec = [
  title: string,
  category: string,
  owner: string,
  collab: string[],
  priority: Priority,
  status: Status,
  /** tháng hiện tại: lệch ngày so với hôm nay; tháng trước: ngày trong tháng */
  deadline: number,
  extra?: {
    done?: number; // tháng hiện tại: lệch ngày hoàn thành; tháng trước: ngày hoàn thành
    checklist?: [string, boolean][];
    evidence?: string;
    files?: string[]; // tệp minh chứng bổ sung
    lateReason?: string;
    desc?: string;
  },
];

const PREV: Spec[] = [
  ['Tổng hợp danh sách SV nhận học bổng KKHT kỳ II', 'Học bổng', 'm2', ['m4'], 'high', 'done', 10, { done: 9, evidence: 'https://drive.google.com/ds-hb-kkht' }],
  ['Tổ chức Tuần sinh hoạt công dân đầu khóa', 'Sự kiện', 'm5', ['m3', 'm6'], 'urgent', 'done', 15, { done: 15, evidence: 'https://drive.google.com/bao-cao-tshcd', files: ['Danh-sach-diem-danh.xlsx', 'Hinh-anh-su-kien.pdf'] }],
  ['Cập nhật hồ sơ SV khóa 52 lên hệ thống', 'Hồ sơ SV', 'm4', [], 'normal', 'done', 20, { done: 23, evidence: 'https://drive.google.com/hs-k52', lateReason: 'Khoa gửi hồ sơ bổ sung muộn 3 ngày' }],
  ['Rà soát SV diện miễn giảm học phí', 'Học bổng', 'm6', ['m2'], 'high', 'done', 18, { done: 17, evidence: 'https://drive.google.com/mien-giam' }],
  ['Báo cáo công tác tư vấn tâm lý quý III', 'Tư vấn', 'm3', [], 'normal', 'done', 25, { done: 24, evidence: 'https://drive.google.com/tu-van-q3' }],
  ['Xét kỷ luật SV vi phạm quy chế thi', 'Khen thưởng – Kỷ luật', 'm2', ['m1'], 'high', 'done', 28, { done: 27, evidence: 'https://drive.google.com/ky-luat' }],
  ['Chuẩn bị hồ sơ đánh giá ngoài – tiêu chí 5', 'Hành chính', 'm1', ['m4'], 'urgent', 'doing', 26, {
    lateReason: 'Chờ Phòng Đào tạo cung cấp số liệu tốt nghiệp',
    checklist: [['Thu thập minh chứng 5.1–5.3', true], ['Viết báo cáo tự đánh giá', true], ['Rà soát với Hội đồng', false]],
  }],
  ['Cấp giấy xác nhận SV đợt tháng 9', 'Hồ sơ SV', 'm6', [], 'normal', 'doing', 29],
  ['Thống kê SV ngoại trú khu vực Ngũ Hành Sơn', 'Hồ sơ SV', 'm5', ['m3'], 'low', 'todo', 27],
];

const CUR: Spec[] = [
  ['Xét học bổng khuyến khích học tập HK1', 'Học bổng', 'm2', ['m4', 'm6'], 'urgent', 'doing', -3, {
    desc: 'Xét theo Quy định 2025. Đối chiếu điểm rèn luyện và điểm học tập với Phòng Đào tạo trước khi trình Hội đồng.',
    checklist: [['Lấy dữ liệu điểm từ PĐT', true], ['Lọc SV đủ điều kiện', true], ['Lập danh sách dự kiến', false], ['Họp Hội đồng xét duyệt', false], ['Ban hành quyết định', false]],
  }],
  ['Tổng hợp điểm rèn luyện HK2 năm 2025–2026', 'Hồ sơ SV', 'm4', ['m2'], 'high', 'doing', -5, {
    checklist: [['Nhận file từ 8 khoa', true], ['Kiểm tra sai lệch', false], ['Trình ký', false]],
  }],
  ['Kế hoạch Ngày hội việc làm 2026', 'Sự kiện', 'm5', ['m3', 'm6', 'm1'], 'urgent', 'doing', 0, {
    checklist: [['Chốt danh sách doanh nghiệp', true], ['Thiết kế sơ đồ gian hàng', true], ['Gửi thư mời', false], ['Phân công tình nguyện viên', false]],
  }],
  ['Phản hồi kiến nghị SV qua cổng thông tin', 'Tư vấn', 'm3', [], 'normal', 'todo', 0],
  ['Hoàn thiện quy trình cấp giấy xác nhận online', 'Hành chính', 'm6', ['m2'], 'high', 'todo', -2],
  ['Danh sách SV khen thưởng cấp ĐHĐN', 'Khen thưởng – Kỷ luật', 'm2', [], 'high', 'todo', 4],
  ['Tập huấn cán bộ lớp khóa 52', 'Sự kiện', 'm3', ['m5'], 'normal', 'todo', 6, {
    checklist: [['Đặt hội trường', false], ['Chuẩn bị tài liệu', false]],
  }],
  ['Cập nhật bảo hiểm y tế SV năm nhất', 'Hồ sơ SV', 'm4', [], 'normal', 'todo', 9],
  ['Đối soát kinh phí học bổng tài trợ', 'Học bổng', 'm6', ['m1'], 'high', 'todo', 12],
  ['Khảo sát nhu cầu ký túc xá HK2', 'Tư vấn', 'm5', [], 'low', 'todo', 15],
  ['Báo cáo tình hình SV nghỉ học dài ngày', 'Hồ sơ SV', 'm3', ['m4'], 'normal', 'doing', 3],
  ['Soạn thảo quy chế khen thưởng mới', 'Khen thưởng – Kỷ luật', 'm1', ['m2'], 'high', 'doing', 8, {
    checklist: [['Tham khảo quy chế các trường', true], ['Dự thảo lần 1', false], ['Lấy ý kiến các khoa', false]],
  }],
  ['Giải quyết hồ sơ vay vốn tín dụng SV', 'Học bổng', 'm2', [], 'normal', 'doing', 1],
  ['Tổ chức đối thoại SV với Ban Giám hiệu', 'Sự kiện', 'm5', ['m1', 'm3'], 'urgent', 'doing', 5],
  ['Rà soát SV có hoàn cảnh khó khăn', 'Tư vấn', 'm6', [], 'normal', 'doing', -1],
  ['Gửi danh sách SV nhận học bổng Vallet', 'Học bổng', 'm2', ['m6'], 'high', 'done', -4, { done: -4, evidence: 'https://drive.google.com/vallet' }],
  ['Tổng kết Tuần lễ chào tân SV', 'Sự kiện', 'm5', ['m3'], 'normal', 'done', -6, { done: -1, evidence: 'https://drive.google.com/tong-ket-tan-sv', files: ['Bao-cao-tong-ket.docx', 'Ket-qua-khao-sat.xlsx'], lateReason: 'Chờ số liệu khảo sát từ Đoàn trường' }],
  ['Cấp thẻ SV bổ sung khóa 52', 'Hồ sơ SV', 'm4', [], 'normal', 'done', -2, { done: -2, evidence: 'https://drive.google.com/the-sv' }],
  ['Báo cáo SV diện chính sách gửi Sở LĐTBXH', 'Hành chính', 'm6', ['m1'], 'urgent', 'done', -1, { done: -1, evidence: 'https://drive.google.com/bc-chinh-sach' }],
  ['Tư vấn chuyển ngành cho SV năm 2', 'Tư vấn', 'm3', [], 'low', 'done', -7, { done: -8, evidence: 'https://drive.google.com/tv-chuyen-nganh' }],
  ['Quyết định khen thưởng SV đạt giải Olympic', 'Khen thưởng – Kỷ luật', 'm2', ['m1'], 'high', 'done', -3, { done: -3, evidence: 'https://drive.google.com/qd-olympic', files: ['QD-khen-thuong-Olympic.pdf'] }],
  ['Kiểm tra nội trú ký túc xá đợt 1', 'Hồ sơ SV', 'm5', ['m4'], 'normal', 'done', -5, { done: -6, evidence: 'https://drive.google.com/kiem-tra-ktx' }],
];

let seq = 0;
const uid = (p: string) => `${p}${(++seq).toString(36)}`;

export function buildSeed(today: string): Task[] {
  seq = 0;
  const month = monthOf(today);
  const prev = addMonths(month, -1);
  const start = month + '-01';
  const end = lastDayOfMonth(month);
  const clamp = (d: string) => (d < start ? start : d > end ? end : d);
  const createdIso = (date: string) => new Date(date + 'T02:00:00Z').toISOString();

  const make = (spec: Spec, isPrev: boolean, i: number): Task => {
    const [title, category, ownerId, collaboratorIds, priority, status, dl, extra = {}] = spec;
    const deadline = isPrev ? `${prev}-${String(dl).padStart(2, '0')}` : clamp(addDays(today, dl));
    const completedAt =
      status === 'done' && extra.done !== undefined
        ? isPrev
          ? `${prev}-${String(extra.done).padStart(2, '0')}`
          : clamp(addDays(today, extra.done))
        : undefined;
    const created = isPrev ? `${prev}-01` : start;
    const activity: Activity[] = [
      { id: uid('a'), at: createdIso(created), actorId: 'm1', type: 'created', text: 'tạo công việc' },
    ];
    if (status !== 'todo') {
      activity.push({ id: uid('a'), at: createdIso(addDays(created, 2)), actorId: ownerId, type: 'status', text: 'chuyển sang Đang làm' });
    }
    if (extra.lateReason && status !== 'done') {
      activity.push({ id: uid('a'), at: createdIso(deadline), actorId: ownerId, type: 'late_reason', text: 'giải trình trễ hạn', note: extra.lateReason });
    }
    if (completedAt) {
      if (extra.lateReason) {
        activity.push({ id: uid('a'), at: createdIso(completedAt), actorId: ownerId, type: 'late_reason', text: 'giải trình trễ hạn', note: extra.lateReason });
      }
      activity.push({ id: uid('a'), at: createdIso(completedAt), actorId: ownerId, type: 'evidence', text: 'đính kèm minh chứng', note: extra.evidence });
      activity.push({ id: uid('a'), at: createdIso(completedAt), actorId: ownerId, type: 'status', text: 'chuyển sang Hoàn thành' });
    }
    return {
      id: uid('t'),
      title,
      description: extra.desc ?? '',
      category,
      ownerId,
      collaboratorIds,
      priority,
      status,
      deadline,
      month: isPrev ? prev : month,
      order: i,
      checklist: (extra.checklist ?? []).map(([text, done]) => ({ id: uid('c'), text, done })),
      evidences: (extra.evidence ? [extra.evidence, ...(extra.files ?? [])] : []).map((e) =>
        e.startsWith('http')
          ? { id: uid('e'), kind: 'link' as const, name: e.replace(/^https?:\/\//, ''), url: e, addedAt: createdIso(completedAt!), addedBy: ownerId }
          : { id: uid('e'), kind: 'file' as const, name: e, size: 180_000 + e.length * 9_000, addedAt: createdIso(completedAt!), addedBy: ownerId },
      ),
      lateReason: extra.lateReason,
      completedAt,
      createdAt: createdIso(created),
      activity,
    };
  };

  return [...PREV.map((s, i) => make(s, true, i)), ...CUR.map((s, i) => make(s, false, i + 100))];
}
