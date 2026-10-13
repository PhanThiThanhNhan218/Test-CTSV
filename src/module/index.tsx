import { useEffect } from 'react';
import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import './module.css';
import { useCurrentUser, useTasks } from './store/tasks';
import { ModuleConfig } from './ui/Portal';
import { Icon } from './ui/Icon';
import { TaskDrawer } from './components/TaskDrawer';
import { GuardModal } from './components/GuardModal';
import { Overview } from './pages/Overview';
import { MyBoard } from './pages/MyBoard';
import { MonthPlan } from './pages/MonthPlan';
import { MonthReport } from './pages/MonthReport';
import { allowedTabs, type ModuleTab } from './lib/permissions';
import { addMonths, fmtMonth, monthOf, todayVN } from './lib/dates';

export { configureEvidenceUpload } from './lib/adapters';

const TABS: { key: ModuleTab; path: string; label: string }[] = [
  { key: 'overview', path: 'tong-quan', label: 'Tổng quan phòng' },
  { key: 'my', path: 'cua-toi', label: 'Không gian của tôi' },
  { key: 'plan', path: 'ke-hoach', label: 'Lập kế hoạch tháng' },
  { key: 'report', path: 'bao-cao', label: 'Báo cáo tháng' },
];

export interface TaskModuleProps {
  /** Người đang đăng nhập (id trong danh sách nhân sự). App mẹ truyền vào; bỏ trống = dùng bộ chuyển vai trò demo. */
  currentUserId?: string;
  /** z-index nền cho drawer/modal để không bị header/sidebar app mẹ che. */
  zIndexBase?: number;
  /** Hiện bộ chuyển người dùng/vai trò để demo phân quyền. */
  demoControls?: boolean;
}

/**
 * Module "Bàn làm việc" — gắn vào router app mẹ dưới một route con, ví dụ:
 *   <Route path="/ban-lam-viec/*" element={<TaskModule currentUserId={me.id} />} />
 */
export function TaskModule({ currentUserId, zIndexBase = 1000, demoControls = false }: TaskModuleProps) {
  useEffect(() => {
    if (currentUserId) useTasks.getState().setUser(currentUserId);
  }, [currentUserId]);

  const user = useCurrentUser();
  const tabs = TABS.filter((t) => allowedTabs(user).includes(t.key));
  const home = user.role === 'lead' ? 'tong-quan' : 'cua-toi';

  return (
    <ModuleConfig.Provider value={{ zIndexBase }}>
      <div className="ctsv-module tm-flex tm-h-full tm-min-h-0 tm-flex-col tm-bg-bg" style={{ ['--tm-z' as string]: zIndexBase }}>
        <nav className="tm-flex tm-h-10 tm-shrink-0 tm-items-end tm-gap-5 tm-border-b tm-border-line tm-bg-surface tm-px-5">
          {tabs.map((t) => (
            <NavLink
              key={t.key}
              to={t.path}
              className={({ isActive }) =>
                `-tm-mb-px tm-flex tm-h-10 tm-items-center tm-border-b-2 tm-text-sm tm-font-medium tm-transition-colors ${
                  isActive ? 'tm-border-fg tm-text-fg' : 'tm-border-transparent tm-text-fg-3 hover:tm-text-fg-2'
                }`
              }
            >
              {t.label}
            </NavLink>
          ))}
          <div className="tm-ml-auto tm-flex tm-h-10 tm-items-center tm-gap-3">
            <MonthSwitcher />
            {demoControls && <DemoUserSwitch />}
          </div>
        </nav>

        <main className="tm-min-h-0 tm-flex-1">
          <Routes>
            <Route index element={<Navigate to={home} replace />} />
            {tabs.map((t) => (
              <Route key={t.key} path={t.path} element={<Page tab={t.key} />} />
            ))}
            <Route path="*" element={<Navigate to={home} replace />} />
          </Routes>
        </main>

        <TaskDrawer />
        <GuardModal />
      </div>
    </ModuleConfig.Provider>
  );
}

function Page({ tab }: { tab: ModuleTab }) {
  switch (tab) {
    case 'overview': return <Overview />;
    case 'my': return <MyBoard />;
    case 'plan': return <MonthPlan />;
    case 'report': return <MonthReport />;
  }
}

function MonthSwitcher() {
  const viewMonth = useTasks((s) => s.viewMonth);
  const setViewMonth = useTasks((s) => s.setViewMonth);
  const current = monthOf(todayVN());
  return (
    <div className="tm-flex tm-items-center tm-gap-0.5">
      <button className="tm-rounded tm-p-1 tm-text-fg-3 hover:tm-bg-muted hover:tm-text-fg" onClick={() => setViewMonth(addMonths(viewMonth, -1))} aria-label="Tháng trước">
        <Icon name="left" />
      </button>
      <span className="tm-num tm-w-[104px] tm-text-center tm-text-sm tm-font-medium">{fmtMonth(viewMonth)}</span>
      <button className="tm-rounded tm-p-1 tm-text-fg-3 hover:tm-bg-muted hover:tm-text-fg" onClick={() => setViewMonth(addMonths(viewMonth, 1))} aria-label="Tháng sau">
        <Icon name="right" />
      </button>
      {viewMonth !== current && (
        <button className="tm-ml-1 tm-text-xs tm-text-fg-3 hover:tm-text-fg" onClick={() => setViewMonth(current)}>
          Về tháng này
        </button>
      )}
    </div>
  );
}

function DemoUserSwitch() {
  const members = useTasks((s) => s.members);
  const currentUserId = useTasks((s) => s.currentUserId);
  const setUser = useTasks((s) => s.setUser);
  return (
    <div className="tm-flex tm-items-center tm-gap-2 tm-border-l tm-border-line tm-pl-3">
      <span className="tm-text-xs tm-text-fg-3">Xem với vai trò</span>
      <select
        value={currentUserId}
        onChange={(e) => setUser(e.target.value)}
        className="tm-h-7 tm-cursor-pointer tm-rounded tm-border tm-border-line tm-bg-surface tm-px-1.5 tm-text-xs"
      >
        {members.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name} — {m.title}
          </option>
        ))}
      </select>
      <button
        className="tm-text-xs tm-text-fg-3 hover:tm-text-fg"
        title="Khôi phục dữ liệu mẫu"
        onClick={() => confirm('Khôi phục toàn bộ dữ liệu mẫu?') && useTasks.getState().resetDemo()}
      >
        Đặt lại
      </button>
    </div>
  );
}
