# Bàn làm việc — Module Quản lý công việc & Báo cáo phòng CTSV

Module React + TailwindCSS gắn vào webapp quản lý có sẵn của Phòng Công tác sinh viên.
Trong app mẹ, mục **"Bàn làm việc"** là module này; bàn làm việc cũ đổi tên thành **"Quản lý chung"**.

```bash
npm install
npm run dev        # http://localhost:5173 — mô phỏng khung app mẹ + module
npm test           # unit test quy tắc nghiệp vụ
npm run build
```

## 5 màn hình

| Tab | Đường dẫn | Nội dung |
|---|---|---|
| Tổng quan phòng | `/ban-lam-viec/tong-quan` | 4 metrics, bảng khối lượng công việc (bấm nhân sự → modal lọc việc), danh sách cần chú ý, widget "Tóm tắt hôm nay" (AI Standup) |
| Không gian của tôi | `/ban-lam-viec/cua-toi` | Kanban 3 cột kéo thả, thêm việc nhanh, lọc "gồm việc phối hợp" |
| *(Right Drawer)* | mọi màn | Header/thuộc tính · Mô tả · Minh chứng · Checklist tiến độ · Activity Log |
| Lập kế hoạch tháng | `/ban-lam-viec/ke-hoach` | Lưới nhập liệu kiểu Excel: phím mũi tên/Tab/Enter, dán nhiều dòng từ Excel, Ctrl+D, Ctrl+⌫ |
| Báo cáo tháng | `/ban-lam-viec/bao-cao` | Văn bản A4, Xuất PDF (in qua iframe riêng) / Xuất Excel (.xlsx 3 sheet) |

## Quy tắc nghiệp vụ (`src/module/lib/rules.ts`)

- **Hoàn thành** (kéo thả hoặc đổi trạng thái): bắt buộc popup minh chứng. Một việc có **nhiều link/tệp**, sửa / tải lại / xóa được sau khi lưu; việc đã Hoàn thành luôn giữ ≥ 1 minh chứng.
- **Trễ hạn**: hoàn thành muộn → bắt buộc "Lý do trễ hạn". Việc quá hạn chưa xong → drawer hiện ô "Cần giải trình"; báo cáo ghi "Chưa giải trình".
- **Dời hạn việc đã quá hạn** → bắt buộc lý do, việc vẫn tính là đã trễ (`wasLate`).
- **Mở lại việc đã xong** → bắt buộc lý do; giữ minh chứng cũ, lần hoàn thành sau phải bổ sung ≥ 1 minh chứng mới.
- **Giao thoa tháng**: việc tháng trước chưa xong được ghim đầu bảng với nhãn đỏ "Tồn T09", nhưng vẫn thuộc tháng gốc khi thống kê (không đếm hai lần).
- **Phân quyền**: Trưởng phòng toàn quyền; Chuyên viên chỉ thấy "Không gian của tôi", chỉ sửa việc mình phụ trách chính; người phối hợp chỉ tick checklist.
- "Hôm nay" và quá hạn tính theo giờ Việt Nam (quá 23:59 ngày deadline).

## Tích hợp vào app mẹ

```tsx
import { TaskModule, configureEvidenceUpload } from './module';

// Nối kho lưu trữ thật cho tệp minh chứng (bản demo chỉ lưu tên/dung lượng)
configureEvidenceUpload(async (file) => {
  const { url } = await api.upload(file);
  return { kind: 'file', name: file.name, size: file.size, url };
});

<Route path="/ban-lam-viec/*" element={<TaskModule currentUserId={me.id} zIndexBase={1000} />} />
```

- **Không đụng CSS app mẹ**: mọi class Tailwind có tiền tố `tm-`, preflight toàn cục bị tắt và chỉ reset bên trong `.ctsv-module`.
- **Màu & font** là CSS variables (`--tm-*` trong `src/module/module.css`), app mẹ ghi đè được (kể cả dark mode).
- **Drawer/Modal** render qua portal riêng, z-index lấy từ `zIndexBase`.
- **Dữ liệu**: store Zustand (`src/module/store/tasks.ts`) lưu localStorage; thay bằng API bằng cách đổi các action trong store, UI giữ nguyên.
- **AI Standup**: `summarize()` trong `src/module/lib/standup.ts` hiện sinh theo quy tắc; thay bằng lời gọi backend AI, giữ nguyên kiểu trả về.

## Cấu trúc

```
src/
  shell/            Khung app mẹ mô phỏng (sidebar CTSV, header) — không thuộc module
  module/
    index.tsx       <TaskModule/>, tabs, chọn tháng
    store/          Zustand store + dữ liệu mẫu
    lib/            rules, dates, permissions, standup, report, print, adapters
    ui/             Avatar, Modal, Portal, Icon, Select, Dot
    components/     TaskCard, TaskDrawer, GuardModal, Evidence
    pages/          Overview, MyBoard, MonthPlan, MonthReport
```
