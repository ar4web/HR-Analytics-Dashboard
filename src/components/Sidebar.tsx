import { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Award, BarChart3, Building2, ChevronLeft, ChevronRight, Clock, FileText,
  GraduationCap, HelpCircle, LayoutDashboard, LogOut, Settings, UserPlus, Users,
  Wallet, X,
} from 'lucide-react';

interface NavItem {
  key: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
}

const navSections: { title: string; items: NavItem[] }[] = [
  {
    title: 'Overview',
    items: [
      { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { key: 'analytics', label: 'Analytics', icon: BarChart3 },
    ],
  },
  {
    title: 'Workforce',
    items: [
      { key: 'employees', label: 'Employees', icon: Users },
      { key: 'departments', label: 'Departments', icon: Building2 },
      { key: 'recruitment', label: 'Recruitment', icon: UserPlus, badge: 6 },
      { key: 'attendance', label: 'Attendance', icon: Clock },
      { key: 'performance', label: 'Performance', icon: Award },
      { key: 'payroll', label: 'Payroll', icon: Wallet },
    ],
  },
  {
    title: 'Organization',
    items: [
      { key: 'reports', label: 'Reports', icon: FileText, badge: 3 },
      { key: 'training', label: 'Training', icon: GraduationCap },
    ],
  },
];

const bottomItems: NavItem[] = [
  { key: 'settings', label: 'Settings', icon: Settings },
  { key: 'help', label: 'Help & Support', icon: HelpCircle },
];

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

/**
 * App shell navigation.
 *
 * Three presentation states, all driven by CSS so no media query has to run in JS:
 * - mobile drawer: 288px, always labelled, slides in from the left (`mobileOpen`)
 * - desktop expanded: 264px, labelled (default)
 * - desktop rail: 96px (~1 inch), icons only, labels and badges fade to zero width
 *   (`collapsed`). Must stay in sync with the `lg:pl-*` offset on the App root.
 */
export function Sidebar({ collapsed, onToggleCollapsed, mobileOpen, onCloseMobile }: SidebarProps) {
  const [activeKey, setActiveKey] = useState('dashboard');
  const [hovered, setHovered] = useState<{ label: string; top: number; badge?: number } | null>(null);

  // Labels collapse to zero width at lg only — on mobile the drawer always shows them.
  const collapseClasses = collapsed ? 'lg:max-w-0 lg:opacity-0' : '';
  const labelClass = `ms-3 max-w-[132px] overflow-hidden whitespace-nowrap opacity-100 transition-all duration-300 ${collapsed ? 'lg:ms-0 lg:max-w-0 lg:opacity-0' : ''}`;
  const blockClass = `max-w-[132px] overflow-hidden whitespace-nowrap opacity-100 transition-all duration-300 ${collapseClasses}`;

  const renderItem = (item: NavItem) => {
    const Icon = item.icon;
    const isActive = activeKey === item.key;

    return (
      <button
        key={item.key}
        type="button"
        aria-current={isActive ? 'page' : undefined}
        onClick={() => {
          setActiveKey(item.key);
          onCloseMobile();
        }}
        onMouseEnter={(event) => {
          if (!collapsed) return;
          const rect = event.currentTarget.getBoundingClientRect();
          setHovered({ label: item.label, top: rect.top + rect.height / 2, badge: item.badge });
        }}
        onMouseLeave={() => setHovered(null)}
        className={`group relative flex h-12 w-full items-center rounded-xl ps-4 pe-2 text-start transition-colors duration-200 ${
          // ps-7 only when the rail is collapsed: (96 - 40) / 2 = 28px, which also
          // lines the icons up with the 40px brand mark above them.
          collapsed ? 'lg:ps-7' : ''
        } ${
          isActive
            ? 'bg-gradient-to-r from-emerald-50 to-emerald-50/40 text-emerald-700 shadow-[inset_0_1px_0_0_rgb(255_255_255/0.6)] ring-1 ring-emerald-100'
            : 'text-muted hover:bg-sunken-strong/70 hover:text-strong'
        }`}
      >
        {isActive && (
          <span className="absolute start-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-e-full bg-emerald-500" />
        )}

        <span className="relative grid h-10 w-10 shrink-0 place-items-center">
          <Icon className="h-5 w-5" strokeWidth={isActive ? 2.4 : 2} />
          {collapsed && item.badge ? (
            <span className="absolute end-0.5 top-0.5 hidden h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-surface lg:block" />
          ) : null}
        </span>

        <span className={`text-sm font-medium ${labelClass}`}>{item.label}</span>

        {item.badge ? (
          <span
            className={`ms-auto rounded-full px-2 py-0.5 text-[11px] font-semibold transition-all duration-300 ${
              collapsed ? 'lg:max-w-0 lg:overflow-hidden lg:px-0 lg:opacity-0' : ''
            } ${isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-sunken text-body'}`}
          >
            {item.badge}
          </span>
        ) : null}
      </button>
    );
  };

  return (
    <aside
      aria-label="Main navigation"
      className={`glass-rail fixed start-0 top-0 z-[70] flex h-dvh w-[288px] flex-col border-e border-hair-strong/70 shadow-2xl transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] lg:translate-x-0 lg:shadow-rail ${
        collapsed ? 'lg:w-24' : 'lg:w-[264px]'
      } ${mobileOpen ? 'translate-x-0' : '-translate-x-full rtl:translate-x-full'}`}
    >
      {/* Brand */}
      <div className="relative flex h-16 shrink-0 items-center gap-3 overflow-hidden border-b border-hair ps-7 pe-3">
        <span className="pointer-events-none absolute inset-0 bg-gradient-to-r from-emerald-50/80 via-transparent to-transparent" aria-hidden />
        <div className="relative grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/25 ring-1 ring-emerald-600/20">
          <BarChart3 className="h-5 w-5 text-white" />
        </div>
        <div className={blockClass}>
          <p className="text-sm font-bold leading-tight text-strong">HR Analytics</p>
          <p className="text-[11px] text-muted">Workforce Suite</p>
        </div>
        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Close navigation"
          className="ms-auto grid h-8 w-8 shrink-0 place-items-center rounded-lg text-subtle transition-colors hover:bg-sunken hover:text-body lg:hidden"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Collapse / expand handle — desktop only */}
      <button
        type="button"
        onClick={onToggleCollapsed}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        aria-expanded={!collapsed}
        className="absolute -end-3 top-[76px] z-20 hidden h-6 w-6 place-items-center rounded-full border border-hair-strong bg-surface text-subtle shadow-md transition-colors hover:border-emerald-300 hover:text-emerald-600 lg:grid"
      >
        {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
      </button>

      {/* Nav */}
      <nav
        className="flex-1 space-y-5 overflow-y-auto overflow-x-hidden px-3 py-4"
        onScroll={() => setHovered(null)}
      >
        {navSections.map((section) => (
          <div key={section.title}>
            <p
              className={`mb-1 h-5 ps-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-subtle ${blockClass}`}
            >
              {section.title}
            </p>
            <div className="space-y-1">{section.items.map(renderItem)}</div>
          </div>
        ))}
      </nav>

      {/* Footer: secondary nav + account */}
      <div className="shrink-0 space-y-1 border-t border-hair px-3 py-3">
        {bottomItems.map(renderItem)}

        <div className={`mt-2 flex items-center rounded-xl ${collapsed ? 'lg:justify-center' : ''}`}>
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 text-xs font-bold text-white">
            JD
          </div>
          <div className={`${blockClass} ms-3`}>
            <p className="text-sm font-semibold leading-tight text-strong">John Doe</p>
            <p className="text-[11px] text-muted">HR Admin</p>
          </div>
          <button
            type="button"
            aria-label="Sign out"
            className={`ms-auto grid h-8 w-8 shrink-0 place-items-center rounded-lg text-subtle transition-colors hover:bg-sunken hover:text-body ${
              collapsed ? 'lg:hidden' : ''
            }`}
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Rail tooltip */}
      {collapsed && (
        <div
          aria-hidden
          className={`pointer-events-none absolute -translate-y-1/2 z-30 hidden items-center whitespace-nowrap rounded-lg bg-inverse px-2.5 py-1.5 text-xs font-medium text-inverse-fg shadow-xl transition-all duration-150 lg:flex ${
            hovered ? 'translate-x-0 opacity-100' : '-translate-x-2 rtl:translate-x-2 opacity-0'
          }`}
          style={{ top: hovered ? hovered.top : 0, insetInlineStart: 106 }}
        >
          {hovered?.label}
          {hovered?.badge ? (
            <span className="ms-2 rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-semibold">
              {hovered.badge}
            </span>
          ) : null}
        </div>
      )}
    </aside>
  );
}
