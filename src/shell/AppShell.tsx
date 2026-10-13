import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import './shell.css';
import { TaskModule } from '../module';

/** Icon theo phong cách app mẹ (line icons). */
const I = {
  grid: <svg viewBox="0 0 24 24"><rect x="4" y="4" width="6.5" height="6.5" rx="1" /><rect x="13.5" y="4" width="6.5" height="6.5" rx="1" /><rect x="4" y="13.5" width="6.5" height="6.5" rx="1" /><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1" /></svg>,
  board: <svg viewBox="0 0 24 24"><rect x="3.5" y="4" width="17" height="16" rx="2" /><path d="M9.5 4v16M15 4v16" /><path d="M5.5 8h2M11.5 8h1.5M11.5 11h1.5M17 8h1.5" /></svg>,
  cap: <svg viewBox="0 0 24 24"><path d="M2.5 9.5L12 5l9.5 4.5L12 14 2.5 9.5z" /><path d="M6.5 11.5v4c1.5 1.5 3.5 2.2 5.5 2.2s4-.7 5.5-2.2v-4" /></svg>,
  doc: <svg viewBox="0 0 24 24"><path d="M14 3.5H7a1.5 1.5 0 00-1.5 1.5v14A1.5 1.5 0 007 20.5h10a1.5 1.5 0 001.5-1.5V8L14 3.5z" /><path d="M14 3.5V8h4.5M9 12.5h6M9 16h6" /></svg>,
  award: <svg viewBox="0 0 24 24"><circle cx="12" cy="9" r="5" /><path d="M9 13.2L8 20.5l4-2.2 4 2.2-1-7.3" /></svg>,
};

const NAV = [
  { to: '/quan-ly-chung', label: 'Quản lý chung', icon: I.grid },
  { to: '/ban-lam-viec', label: 'Bàn làm việc', icon: I.board, isNew: true },
  { to: '/ho-so-sinh-vien', label: 'Hồ sơ sinh viên', icon: I.cap },
  { to: '/quyet-dinh', label: 'Quyết định & Văn bản', icon: I.doc },
  { to: '/khen-thuong', label: 'Khen thưởng & Chính sách', icon: I.award },
];

export function AppShell() {
  const { pathname } = useLocation();
  const current = NAV.find((n) => pathname.startsWith(n.to)) ?? NAV[1];

  return (
    <div className="app">
      <aside className="sb">
        <div className="sb-brand">
          <div className="sb-logo">CTSV</div>
          <div>
            <div className="sb-org">Phòng Công tác sinh viên</div>
            <div className="sb-sub">Trường Đại học Kinh tế – Đại học Đà Nẵng</div>
          </div>
        </div>
        <button className="sb-cta">+ Tiếp nhận quyết định</button>
        <nav className="sb-nav">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} className={({ isActive }) => `sb-item${isActive ? ' active' : ''}`}>
              {n.icon}
              {n.label}
              {n.isNew && <span className="sb-badge">Mới</span>}
            </NavLink>
          ))}
        </nav>
        <div className="sb-recent">
          <div className="sb-recent-h"><span>Gần đây</span><span>+</span></div>
          <div className="sb-search">Tìm thẻ</div>
          <div className="sb-tree">
            <div>⌄&nbsp; fd</div>
            <div className="sel">Khoahi</div>
            <div className="child">Thẻ #2</div>
          </div>
        </div>
        <div className="sb-foot">
          <div className="sb-collapse"><span>&lt;</span></div>
          <div className="sb-user">
            <div className="sb-ava">Q</div>
            <div>
              <div className="sb-uname">quantri</div>
              <div className="sb-urole">Quản trị</div>
            </div>
          </div>
        </div>
      </aside>

      <div className="main">
        <header className="ph">
          {current.icon}
          <h1>{current.label}</h1>
        </header>
        <div className="content">
          <Routes>
            <Route path="/" element={<Navigate to="/ban-lam-viec" replace />} />
            {/* Module mới — toàn bộ workspace nằm dưới route con này */}
            <Route path="/ban-lam-viec/*" element={<TaskModule demoControls />} />
            <Route path="/quan-ly-chung" element={<Placeholder>Màn hình "Quản lý chung" (bàn làm việc cũ) của app mẹ</Placeholder>} />
            <Route path="*" element={<Placeholder>Màn hình có sẵn của app mẹ</Placeholder>} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

function Placeholder({ children }: { children: ReactNode }) {
  return <div className="placeholder">{children}</div>;
}
