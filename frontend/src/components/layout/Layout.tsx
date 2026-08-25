import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { cn, getInitials, getRoleLabel } from '../../lib/utils';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  CalendarDays,
  CalendarRange,
  Package,
  Wrench,
  FileText,
  CreditCard,
  Receipt,
  BarChart3,
  UserCog,
  Settings,
  LogOut,
  Menu,
  X,
  Globe,
  Search,
  Bell,
  ChevronDown,
} from 'lucide-react';
import NotificationBell from './NotificationBell';
import SearchBox from './SearchBox';

interface LayoutProps {
  children: React.ReactNode;
}

const navGroups = [
  {
    label: 'nav.overview',
    items: [
      { to: '/dashboard', icon: LayoutDashboard, key: 'nav.dashboard' },
      { to: '/calendar', icon: CalendarRange, key: 'nav.calendar' },
    ],
  },
  {
    label: 'nav.relationships',
    items: [
      { to: '/customers', icon: Users, key: 'nav.customers' },
    
      { to: '/bookings', icon: CalendarDays, key: 'nav.bookings' },
    ],
  },
  {
    label: 'nav.operations',
    items: [
      { to: '/equipment', icon: Wrench, key: 'nav.equipment' },
    ],
  },
  {
    label: 'nav.finance',
    items: [
      { to: '/invoices', icon: FileText, key: 'nav.invoices' },
      { to: '/payments', icon: CreditCard, key: 'nav.payments' },
      { to: '/expenses', icon: Receipt, key: 'nav.expenses' },
      { to: '/reports', icon: BarChart3, key: 'nav.reports' },
    ],
  },
  {
    label: 'nav.system',
    items: [
      { to: '/users', icon: UserCog, key: 'nav.users' },
      { to: '/settings', icon: Settings, key: 'nav.settings' },
    ],
  },
];

export default function Layout({ children }: LayoutProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { data: currentUser } = useQuery({
    queryKey: ['auth-me'],
    queryFn: async () => {
      try {
        const res = await api.get('/auth/me');
        return res.data.data;
      } catch {
        try {
          return JSON.parse(localStorage.getItem('user') || '{}');
        } catch {
          return null;
        }
      }
    },
  });

  const userName = currentUser?.name || 'مستخدم النظام';
  const userEmail = currentUser?.email || '';
  const userRole = getRoleLabel(currentUser?.role?.name || '');
  const userInitials = getInitials(userName);
  const isEmployee = currentUser?.role?.name === 'EMPLOYEE';

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    window.dispatchEvent(new CustomEvent('auth-logout'));
    navigate('/login', { replace: true });
  };

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'ar' ? 'en' : 'ar');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {sidebarOpen && (
        <button
          type="button"
          aria-label="إغلاق القائمة"
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 start-0 z-50 flex w-[17.5rem] flex-col overflow-hidden bg-slate-950 text-white shadow-2xl transition-transform duration-300 lg:translate-x-0 lg:shadow-none',
          sidebarOpen ? 'max-lg:translate-x-0' : 'max-lg:ltr:-translate-x-full max-lg:rtl:translate-x-full',
        )}
      >
        <div className="pointer-events-none absolute -top-24 -end-24 h-56 w-56 rounded-full bg-primary-500/15 blur-3xl" />
        <div className="relative flex h-[4.75rem] items-center justify-between border-b border-white/10 px-5">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="REAL HOME LENS" className="h-10 w-10 object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.35)]" />
            <div>
              <p className="text-[15px] font-bold tracking-tight">REAL HOME LENS</p>
              <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500">نظام الإدارة</p>
            </div>
          </div>
          <button
            type="button"
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="إغلاق القائمة"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="relative flex-1 space-y-5 overflow-y-auto px-3 py-5">
          {navGroups.filter(g => !isEmployee || g.label !== 'nav.system').map((group) => (
            <div key={group.label}>
              <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600">
                {t(group.label)}
              </p>
              <div className="space-y-1">
                {group.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) => cn('sidebar-link', isActive && 'sidebar-link-active')}
                  >
                    <item.icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.9} />
                    <span>{t(item.key)}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="relative space-y-3 border-t border-white/10 p-3">
          <div className="flex items-center gap-3 rounded-xl bg-white/[0.06] p-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-500/20 text-sm font-bold text-primary-300">
              {userInitials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{userName}</p>
              <p className="truncate text-xs text-slate-400">{userRole}{userEmail ? ` · ${userEmail}` : ''}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={toggleLanguage} className="sidebar-link justify-center px-2 text-xs">
              <Globe className="h-4 w-4" />
              <span>{i18n.language === 'ar' ? 'الإنجليزية' : 'العربية'}</span>
            </button>
            <button type="button" onClick={handleLogout} className="sidebar-link justify-center px-2 text-xs text-red-300 hover:text-red-200">
              <LogOut className="h-4 w-4" />
              <span>{t('auth.logout')}</span>
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-col lg:ms-[17.5rem]">
        <header className="sticky top-0 z-30 flex h-[4.75rem] items-center justify-between border-b border-slate-200/80 bg-white/85 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              className="rounded-xl p-2 text-slate-600 transition hover:bg-slate-100 lg:hidden"
              onClick={() => setSidebarOpen(true)}
              aria-label="فتح القائمة"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden h-10 w-px bg-slate-200 sm:block lg:hidden" />
            <SearchBox />
            <p className="truncate text-sm font-semibold text-slate-700 sm:hidden">REAL HOME LENS</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button type="button" onClick={toggleLanguage} className="hidden items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 sm:flex">
              <Globe className="h-4 w-4" />
              {i18n.language === 'ar' ? 'إنجليزي' : 'عربي'}
            </button>
            <NotificationBell />
            <div className="hidden h-8 w-px bg-slate-200 sm:block" />
            <div className="hidden items-center gap-2.5 sm:flex">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-50 text-sm font-bold text-primary-700">{userInitials}</div>
              <div className="hidden text-start lg:block">
                <p className="text-xs font-bold text-slate-800">{userName}</p>
                <p className="text-[11px] text-slate-400">{userRole}</p>
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
