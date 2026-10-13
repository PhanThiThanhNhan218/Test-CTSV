import { useMemo, useRef, useState, type ReactNode } from 'react';
import { useCurrentUser, useTasks } from '../store/tasks';
import { PRIORITY_LABEL } from '../types';
import { Icon } from '../ui/Icon';
import { EvidenceLink } from '../components/Evidence';
import { fmtDate, fmtMonth, fmtMonthTag, fmtShort, todayVN } from '../lib/dates';
import { buildReport, exportExcel } from '../lib/report';
import { printElement } from '../lib/print';

export function MonthReport() {
  const tasks = useTasks((s) => s.tasks);
  const members = useTasks((s) => s.members);
  const viewMonth = useTasks((s) => s.viewMonth);
  const user = useCurrentUser();
  const today = todayVN();
  const [busy, setBusy] = useState(false);
  const paperRef = useRef<HTMLElement>(null);
  const data = useMemo(() => buildReport(tasks, members, viewMonth, today), [tasks, members, viewMonth, today]);
  const s = data.stats;
  const [y, m, d] = today.split('-');

  return (
    <div className="tm-flex tm-h-full tm-min-h-0 tm-flex-col">
      <div className="tm-flex tm-h-11 tm-shrink-0 tm-items-center tm-gap-2 tm-px-5">
        <span className="tm-text-sm tm-text-fg-2">Bản xem trước khổ A4 · {fmtMonth(viewMonth)}</span>
        <div className="tm-ml-auto tm-flex tm-gap-2">
          <button className="tm-btn" onClick={() => paperRef.current && printElement(paperRef.current, `Bao-cao-CTSV-${viewMonth}`)}>
            <Icon name="download" size={13} /> Xuất PDF
          </button>
          <button
            className="tm-btn-primary"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await exportExcel(data, viewMonth);
              } finally {
                setBusy(false);
              }
            }}
          >
            <Icon name="download" size={13} /> {busy ? 'Đang xuất…' : 'Xuất Excel'}
          </button>
        </div>
      </div>

      <div className="tm-scroll tm-min-h-0 tm-flex-1 tm-overflow-y-auto tm-bg-muted tm-px-5 tm-py-5">
        {/* Trang A4: 210mm, lề 18–20mm */}
        <article ref={paperRef} className="tm-print-area tm-mx-auto tm-min-h-[297mm] tm-w-[210mm] tm-bg-white tm-px-[20mm] tm-py-[18mm] tm-text-[12px] tm-leading-[18px] tm-text-black tm-shadow-sm tm-ring-1 tm-ring-line">
          <header className="tm-grid tm-grid-cols-2 tm-text-center tm-text-[11.5px] tm-leading-[16px]">
            <div>
              <div>ĐẠI HỌC ĐÀ NẴNG</div>
              <div>TRƯỜNG ĐẠI HỌC KINH TẾ</div>
              <div className="tm-font-semibold">PHÒNG CÔNG TÁC SINH VIÊN</div>
              <div className="tm-mx-auto tm-mt-1 tm-h-px tm-w-20 tm-bg-black" />
            </div>
            <div>
              <div className="tm-font-semibold">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
              <div className="tm-font-semibold">Độc lập – Tự do – Hạnh phúc</div>
              <div className="tm-mx-auto tm-mt-1 tm-h-px tm-w-32 tm-bg-black" />
              <div className="tm-mt-2 tm-italic">Đà Nẵng, ngày {d} tháng {m} năm {y}</div>
            </div>
          </header>

          <h1 className="tm-mt-7 tm-text-center tm-text-[15px] tm-font-bold">{data.title}</h1>
          <p className="tm-mt-1 tm-text-center tm-italic">
            (Số liệu chốt ngày {fmtDate(today)}; việc tồn từ tháng trước được theo dõi riêng, không cộng vào thống kê tháng)
          </p>

          <H2 n="I">Tổng quan số liệu</H2>
          <table className="tm-w-full tm-text-center">
            <thead>
              <tr>
                {['Tổng việc', 'Hoàn thành', 'Đúng hạn', 'Trễ hạn', 'Đang quá hạn', 'Tỷ lệ hoàn thành', 'Tồn tháng trước'].map((h) => (
                  <Th key={h}>{h}</Th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <Td center>{s.total}</Td>
                <Td center>{s.done}</Td>
                <Td center>{s.onTime}</Td>
                <Td center className={s.late ? 'tm-text-danger' : ''}>{s.late}</Td>
                <Td center className={s.overdue ? 'tm-font-semibold tm-text-danger' : ''}>{s.overdue}</Td>
                <Td center>{s.rate}%</Td>
                <Td center className={s.carry ? 'tm-text-danger' : ''}>{s.carry}</Td>
              </tr>
            </tbody>
          </table>

          <H2 n="II">Năng suất cá nhân</H2>
          <table className="tm-w-full">
            <thead>
              <tr>
                <Th w={32}>STT</Th>
                <Th left>Họ và tên</Th>
                <Th w={56}>Được giao</Th>
                <Th w={64}>Hoàn thành</Th>
                <Th w={56}>Đúng hạn</Th>
                <Th w={48}>Trễ</Th>
                <Th w={56}>Quá hạn</Th>
                <Th w={48}>Tỷ lệ</Th>
              </tr>
            </thead>
            <tbody>
              {data.people.map((r, i) => (
                <tr key={r.member.id}>
                  <Td center>{i + 1}</Td>
                  <Td>{r.member.name}<span className="tm-text-[#777]"> · {r.member.title}</span></Td>
                  <Td center>{r.total}</Td>
                  <Td center>{r.done}</Td>
                  <Td center>{r.onTime}</Td>
                  <Td center className={r.late ? 'tm-text-danger' : ''}>{r.late}</Td>
                  <Td center className={r.overdue ? 'tm-font-semibold tm-text-danger' : ''}>{r.overdue}</Td>
                  <Td center>{r.rate}%</Td>
                </tr>
              ))}
            </tbody>
          </table>

          <H2 n="III">Điểm nghẽn &amp; lý do trễ hạn</H2>
          {data.blockers.length === 0 ? (
            <p className="tm-italic">Không có công việc trễ hạn trong tháng.</p>
          ) : (
            <table className="tm-w-full">
              <thead>
                <tr>
                  <Th w={32}>STT</Th>
                  <Th left>Công việc</Th>
                  <Th w={86} left>Phụ trách</Th>
                  <Th w={46}>Hạn</Th>
                  <Th w={92} left>Tình trạng</Th>
                  <Th left w={170}>Lý do trễ hạn</Th>
                </tr>
              </thead>
              <tbody>
                {data.blockers.map((b, i) => (
                  <tr key={b.task.id}>
                    <Td center>{i + 1}</Td>
                    <Td>
                      {b.task.title}
                      {b.carry && <span className="tm-ml-1 tm-text-[10.5px] tm-font-semibold tm-text-danger">[Tồn {fmtMonthTag(b.task.month)}]</span>}
                    </Td>
                    <Td>{b.owner?.name}</Td>
                    <Td center>{fmtShort(b.task.deadline)}</Td>
                    <Td className={b.task.status !== 'done' ? 'tm-text-danger' : ''}>{b.state}</Td>
                    <Td className={b.task.lateReason ? '' : 'tm-font-semibold tm-text-danger'}>{b.task.lateReason || 'Chưa giải trình'}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <H2 n="IV">Kết quả nổi bật</H2>
          {data.highlights.length === 0 ? (
            <p className="tm-italic">Chưa có công việc ưu tiên cao hoàn thành trong tháng.</p>
          ) : (
            <table className="tm-w-full">
              <thead>
                <tr>
                  <Th w={32}>STT</Th>
                  <Th left>Công việc</Th>
                  <Th w={86} left>Phụ trách</Th>
                  <Th w={46}>Ưu tiên</Th>
                  <Th w={50}>Xong</Th>
                  <Th left w={170}>Minh chứng</Th>
                </tr>
              </thead>
              <tbody>
                {data.highlights.map((t, i) => (
                  <tr key={t.id}>
                    <Td center>{i + 1}</Td>
                    <Td>{t.title}</Td>
                    <Td>{data.byId.get(t.ownerId)?.name}</Td>
                    <Td center>{PRIORITY_LABEL[t.priority]}</Td>
                    <Td center>{t.completedAt ? fmtShort(t.completedAt) : ''}</Td>
                    <Td>
                      <div className="tm-space-y-0.5 [&_a]:tm-text-[#1d4ed8]">
                        {t.evidences.map((e) => (
                          <div key={e.id} className="tm-text-[11px]">
                            <EvidenceLink evidence={e} />
                          </div>
                        ))}
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <footer className="tm-mt-10 tm-grid tm-grid-cols-2 tm-text-center">
            <div />
            <div>
              <div className="tm-font-semibold">NGƯỜI LẬP BÁO CÁO</div>
              <div className="tm-italic tm-text-[#666]">(Ký, ghi rõ họ tên)</div>
              <div className="tm-mt-14 tm-font-semibold">{user.name}</div>
            </div>
          </footer>
        </article>
      </div>
    </div>
  );
}

function H2({ n, children }: { n: string; children: ReactNode }) {
  return (
    <h2 className="tm-mb-1.5 tm-mt-5 tm-text-[13px] tm-font-bold">
      {n}. {children}
    </h2>
  );
}

function Th({ children, w, left }: { children: ReactNode; w?: number; left?: boolean }) {
  return (
    <th style={w ? { width: w } : undefined} className={`tm-border tm-border-[#999] tm-bg-[#f4f4f5] tm-px-1.5 tm-py-1 tm-text-[11px] tm-font-semibold ${left ? 'tm-text-left' : 'tm-text-center'}`}>
      {children}
    </th>
  );
}

function Td({ children, center, className = '' }: { children: ReactNode; center?: boolean; className?: string }) {
  return (
    <td className={`tm-border tm-border-[#999] tm-px-1.5 tm-py-1 tm-align-top ${center ? 'tm-num tm-text-center' : ''} ${className}`}>{children}</td>
  );
}
