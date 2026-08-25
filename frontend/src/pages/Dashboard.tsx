import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  CalendarClock,
  CreditCard,
  Users,
  UserPlus,
  Wallet,
  ArrowUpRight,
  Plus,
  CalendarPlus,
  UserRoundPlus,
  CalendarDays,
  Clock3,
  MapPin,
  MoreHorizontal,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import api from '../lib/api';
import { formatCurrency, formatDate, getPaymentMethodLabel } from '../lib/utils';

interface DashboardData {
  topCards: {
    totalRevenue: number;
    monthlyRevenue: number;
    monthlyExpenses: number;
    netProfit: number;
    upcomingEventsCount: number;
    pendingPayments: number;
    totalCustomers: number;
    newLeads: number;
  };
  charts: {
    revenue: { label: string; value: number }[];
    expenses: { categories: string[]; data: Record<string, any>[] };
    profit: { label: string; revenue: number; expenses: number; profit: number }[];
    revenueByService: { label: string; value: number }[];
    leadsBySource: { label: string; value: number }[];
  };
  upcomingEvents: {
    id: string;
    eventType: string;
    eventDate: string;
    startTime: string | null;
    endTime: string | null;
    venueName: string | null;
    venueAddress: string | null;
    city: string | null;
    customer: { id: string; fullName: string } | null;
    services: { id: string; name: string }[];
    bookingStatus: string | null;
    bookingNumber: string | null;
  }[];
  recentPayments: {
    id: string;
    amount: number;
    paymentMethod: string;
    paymentDate: string;
    referenceNumber: string | null;
    invoiceNumber: string | null;
    customerName: string | null;
  }[];
  recentCustomers: {
    id: string;
    fullName: string;
    phone: string;
    source: string;
    customerStatus: string;
    createdAt: string;
  }[];
  recentBookings: {
    id: string;
    bookingNumber: string;
    status: string;
    total: number;
    customer: { id: string; fullName: string } | null;
    eventType: string | null;
    eventDate: string | null;
    createdAt: string;
  }[];
  equipmentStatus: { status: string; count: number }[];
}

const statConfig = [
  { key: 'totalRevenue', icon: DollarSign, iconClass: 'bg-amber-50 text-amber-600', accent: 'from-amber-500 to-yellow-400' },
  { key: 'monthlyRevenue', icon: TrendingUp, iconClass: 'bg-yellow-50 text-yellow-600', accent: 'from-yellow-500 to-amber-400' },
  { key: 'monthlyExpenses', icon: TrendingDown, iconClass: 'bg-red-50 text-red-600', accent: 'from-red-500 to-orange-400' },
  { key: 'netProfit', icon: Wallet, iconClass: 'bg-amber-100 text-amber-700', accent: 'from-amber-600 to-yellow-500' },
  { key: 'upcomingEventsCount', icon: CalendarClock, iconClass: 'bg-amber-50 text-amber-600', accent: 'from-amber-500 to-orange-400' },
  { key: 'pendingPayments', icon: CreditCard, iconClass: 'bg-rose-50 text-rose-600', accent: 'from-rose-500 to-pink-400' },
  { key: 'totalCustomers', icon: Users, iconClass: 'bg-yellow-50 text-yellow-700', accent: 'from-yellow-400 to-amber-300' },
  { key: 'newLeads', icon: UserPlus, iconClass: 'bg-orange-50 text-orange-600', accent: 'from-orange-400 to-amber-500' },
] as const;

function StatCard({ label, value, icon: Icon, iconClass, accent, index }: {
  label: string;
  value: string;
  icon: any;
  iconClass: string;
  accent: string;
  index: number;
}) {
  return (
    <div className={`card animate-in-up animate-delay-${Math.min(index, 3)} relative overflow-hidden p-4 sm:p-5 flex flex-col justify-between`}>
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${accent}`} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-slate-500 sm:text-sm">{label}</p>
          <p className="truncate text-lg font-bold tracking-tight text-slate-900 sm:text-xl mt-1.5">{value}</p>
        </div>
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${iconClass}`}>
          <Icon className="h-5 w-5" strokeWidth={2.1} />
        </div>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="card animate-pulse p-5">
      <div className="flex items-center justify-between">
        <div className="space-y-3">
          <div className="h-3 w-24 rounded bg-slate-200" />
          <div className="h-7 w-32 rounded bg-slate-200" />
          <div className="h-3 w-20 rounded bg-slate-200" />
        </div>
        <div className="h-11 w-11 rounded-2xl bg-slate-200" />
      </div>
    </div>
  );
}

function formatMonthKey(key: string, lang: string): string {
  const [y, m] = key.split('-');
  const d = new Date(Number(y), Number(m) - 1, 1);
  try {
    return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-EG' : 'en-US', {
      month: 'short',
      year: 'numeric',
    }).format(d);
  } catch {
    return key;
  }
}

export default function Dashboard() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await api.get('/dashboard');
      return res.data.data;
    },
  });

  const cards = data?.topCards;
  const statLabels: Record<string, string> = {
    totalRevenue: t('dashboard.totalRevenue'),
    monthlyRevenue: t('dashboard.monthlyRevenue'),
    monthlyExpenses: t('dashboard.expenses'),
    netProfit: t('dashboard.netProfit'),
    upcomingEventsCount: t('dashboard.upcomingEvents'),
    pendingPayments: t('dashboard.pendingPayments'),
    totalCustomers: t('dashboard.totalCustomers'),
    newLeads: t('dashboard.newLeads'),
  };
  const currencyKeys = ['totalRevenue', 'monthlyRevenue', 'monthlyExpenses', 'netProfit', 'pendingPayments'];

  const profitData = data?.charts?.profit || [];
  const firstMonthLabel = profitData[0]?.label ? formatMonthKey(profitData[0].label, i18n.language) : '';
  const lastMonthLabel = profitData[profitData.length - 1]?.label ? formatMonthKey(profitData[profitData.length - 1].label, i18n.language) : '';

  const equipmentTotal = data?.equipmentStatus?.reduce((sum, item) => sum + item.count, 0) || 0;
  const equipmentAvailable = data?.equipmentStatus
    ?.filter((item) => ['AVAILABLE', 'IN_USE', 'RESERVED'].includes(item.status))
    .reduce((sum, item) => sum + item.count, 0) || 0;
  const equipmentHealthPct = equipmentTotal > 0 ? Math.round((equipmentAvailable / equipmentTotal) * 100) : 0;
  const equipmentHealthLabel = equipmentHealthPct >= 80 ? 'جيد' : equipmentHealthPct >= 50 ? 'مقبول' : 'بحاجة لصيانة';
  const equipmentHealthColor = equipmentHealthPct >= 80 ? 'bg-emerald-500' : equipmentHealthPct >= 50 ? 'bg-amber-500' : 'bg-red-500';

  // Check if date is today or tomorrow
  const getEventDateBadge = (dateStr: string | null) => {
    if (!dateStr) return null;
    const eventD = new Date(dateStr);
    const today = new Date();
    const isToday = eventD.toDateString() === today.toDateString();
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const isTomorrow = eventD.toDateString() === tomorrow.toDateString();

    if (isToday) {
      return <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[9px] font-extrabold text-emerald-800">اليوم</span>;
    }
    if (isTomorrow) {
      return <span className="rounded-md bg-primary-100 px-1.5 py-0.5 text-[9px] font-extrabold text-primary-800">غداً</span>;
    }
    return null;
  };

  return (
    <div className="w-full space-y-6">
      <section className="animate-in-up flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-primary-600">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            {t('dashboard.today')}
          </div>
          <h1 className="page-title">{t('dashboard.title')}</h1>
          <p className="muted-text mt-1">{t('dashboard.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className="btn-secondary" onClick={() => navigate('/reports')}>
            <BarChart className="h-4 w-4" />
            <span className="hidden sm:inline">{t('dashboard.viewReports')}</span>
          </button>
          <button type="button" className="btn-primary" onClick={() => navigate('/bookings')}>
            <Plus className="h-4 w-4" />
            {t('dashboard.newBooking')}
          </button>
        </div>
      </section>

      {/* Stat Cards with Growth Indicators */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        {isLoading || !cards
          ? Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
          : statConfig.map((cfg, index) => {
              const value = cards[cfg.key as keyof typeof cards];
              const isCurrency = currencyKeys.includes(cfg.key);
              return (
                <StatCard
                  key={cfg.key}
                  index={index}
                  label={statLabels[cfg.key]}
                  value={isCurrency ? formatCurrency(value) : String(value)}
                  icon={cfg.icon}
                  iconClass={cfg.iconClass}
                  accent={cfg.accent}
                />
              );
            })}
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <div className="card animate-in-up animate-delay-1 p-4 sm:p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <p className="mb-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">الأداء</p>
              <h2 className="text-lg font-bold text-slate-900">{t('dashboard.revenueOverview')}</h2>
            </div>
            <button type="button" className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" aria-label="خيارات أخرى">
              <MoreHorizontal className="h-5 w-5" />
            </button>
          </div>
          {isLoading ? (
            <div className="h-72 animate-pulse rounded-xl bg-slate-100" />
          ) : (
            <ResponsiveContainer width="100%" height={285}>
              <BarChart data={data?.charts?.profit || []} barGap={8}>
                <CartesianGrid vertical={false} stroke="#e8eef5" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} width={42} />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: 14, border: '1px solid #e2e8f0', boxShadow: '0 12px 30px rgba(15,23,42,0.1)', fontSize: 12 }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
                <Bar dataKey="revenue" name={t('dashboard.totalRevenue')} fill="#c68436" radius={[6, 6, 0, 0]} barSize={12} />
                <Bar dataKey="expenses" name={t('dashboard.expenses')} fill="#fda29b" radius={[6, 6, 0, 0]} barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card animate-in-up animate-delay-2 bg-slate-950 p-5 text-white sm:p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <p className="mb-1 text-xs font-bold uppercase tracking-[0.14em] text-primary-300">نظرة شهرية</p>
              <h2 className="text-lg font-bold">{t('dashboard.profitTrend')}</h2>
            </div>
            <div className="rounded-xl bg-white/10 p-2 text-primary-300"><TrendingUp className="h-5 w-5" /></div>
          </div>
          <div className="mb-4 flex items-end justify-between">
            <div>
              <p className="text-3xl font-bold tracking-tight">{cards ? formatCurrency(cards.netProfit) : '—'}</p>
              <p className="mt-1 text-xs text-slate-400">صافي الربح التراكمي</p>
            </div>
          </div>
          {isLoading ? (
            <div className="h-40 animate-pulse rounded-xl bg-white/10" />
          ) : (
            <ResponsiveContainer width="100%" height={165}>
              <LineChart data={data?.charts?.profit || []}>
                <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.09)" />
                <XAxis dataKey="label" hide />
                <YAxis hide />
                <Tooltip contentStyle={{ borderRadius: 12, border: 'none', fontSize: 12 }} />
                <Line type="monotone" dataKey="profit" stroke="#eac96c" strokeWidth={3} dot={{ r: 3, fill: '#c68436', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
          <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-4 text-xs text-slate-400">
            <span>{firstMonthLabel}</span>
            <span>{lastMonthLabel}</span>
          </div>
        </div>
      </section>

      {/* Today's & Upcoming Schedule Section */}
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_300px]">
        <div className="card animate-in-up animate-delay-1">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-slate-900 flex items-center gap-2">
                <span>{t('dashboard.upcomingEvents')}</span>
                <span className="rounded-full bg-primary-50 px-2 py-0.5 text-[10px] font-bold text-primary-700">اليوم والغد</span>
              </h2>
              <p className="mt-1 text-xs text-slate-400">جدول جلسات التصوير والمواعيد المجدولة</p>
            </div>
            <button type="button" onClick={() => navigate('/calendar')} className="text-xs font-bold text-primary-600 hover:text-primary-700">{t('dashboard.viewAll')}</button>
          </div>
          {isLoading ? (
            <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-[62px] animate-pulse rounded-xl bg-slate-100" />)}</div>
          ) : data?.upcomingEvents?.length ? (
            <div className="space-y-2">
              {data.upcomingEvents.slice(0, 4).map((event) => (
                <button type="button" key={event.id} onClick={() => navigate(`/bookings/${event.id}`)} className="flex w-full items-center gap-3 rounded-xl p-2.5 text-start transition hover:bg-slate-50 border border-slate-100/60">
                  <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-xl bg-primary-50 text-primary-700">
                    <span className="text-[10px] font-bold">{event.eventDate ? new Date(event.eventDate).toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : 'en-US', { month: 'short' }) : '—'}</span>
                    <span className="text-sm font-extrabold leading-none">{event.eventDate ? new Date(event.eventDate).getDate() : '—'}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-sm font-bold text-slate-800">{event.customer?.fullName || '—'}</p>
                      {getEventDateBadge(event.eventDate)}
                    </div>
                    <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-400"><MapPin className="h-3 w-3 shrink-0" />{event.venueName || event.city || event.eventType || '—'}</p>
                  </div>
                  <div className="shrink-0 text-end">
                    <p className="flex items-center justify-end gap-1 text-xs font-bold text-slate-700"><Clock3 className="h-3 w-3 text-slate-400" />{event.startTime || '—'}</p>
                    <p className="mt-1 text-[10px] text-slate-400">{event.bookingNumber || '—'}</p>
                  </div>
                </button>
              ))}
            </div>
          ) : <p className="py-8 text-center text-sm text-slate-400">{t('common.noData')}</p>}
        </div>

        <div className="card animate-in-up animate-delay-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-slate-900">{t('dashboard.pendingPayments')}</h2>
              <p className="mt-1 text-xs text-slate-400">آخر العمليات المالية المسجلة</p>
            </div>
            <button type="button" onClick={() => navigate('/payments')} className="text-xs font-bold text-primary-600 hover:text-primary-700">{t('dashboard.viewAll')}</button>
          </div>
          {isLoading ? (
            <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-[62px] animate-pulse rounded-xl bg-slate-100" />)}</div>
          ) : data?.recentPayments?.length ? (
            <div className="space-y-2">
              {data.recentPayments.slice(0, 4).map((payment) => (
                <div key={payment.id} className="flex items-center gap-3 rounded-xl p-2.5 transition hover:bg-slate-50">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><CreditCard className="h-4 w-4" /></div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-800">{payment.customerName || '—'}</p>
                    <p className="mt-0.5 truncate text-xs text-slate-400">{getPaymentMethodLabel(payment.paymentMethod)} · {formatDate(payment.paymentDate)}</p>
                  </div>
                  <p className="shrink-0 text-sm font-extrabold text-emerald-600">{formatCurrency(payment.amount)}</p>
                </div>
              ))}
            </div>
          ) : <p className="py-8 text-center text-sm text-slate-400">{t('common.noData')}</p>}
        </div>

        <div className="card animate-in-up animate-delay-3">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-slate-900">{t('dashboard.quickActions')}</h2>
              <p className="mt-1 text-xs text-slate-400">اختصارات العمل اليومي</p>
            </div>
            <Sparkles className="h-5 w-5 text-amber-400" />
          </div>
          <div className="space-y-2">
            {[
              { label: t('dashboard.newBooking'), icon: CalendarPlus, path: '/bookings', tone: 'bg-primary-50 text-primary-600' },
              { label: t('dashboard.newCustomer'), icon: UserRoundPlus, path: '/customers', tone: 'bg-amber-50 text-amber-600' },
              { label: t('dashboard.viewCalendar'), icon: CalendarDays, path: '/calendar', tone: 'bg-amber-50 text-amber-600' },
            ].map((action) => (
              <button type="button" key={action.path} onClick={() => navigate(action.path)} className="group flex w-full items-center gap-3 rounded-xl border border-slate-100 p-3 text-start transition hover:border-primary-100 hover:bg-primary-50/40">
                <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${action.tone}`}><action.icon className="h-4 w-4" /></span>
                <span className="flex-1 text-sm font-bold text-slate-700">{action.label}</span>
                <ArrowUpRight className="h-4 w-4 text-slate-300 transition group-hover:text-primary-500" />
              </button>
            ))}
          </div>
          <div className="mt-4 rounded-xl bg-slate-50 p-3">
            <p className="mb-2 text-xs font-bold text-slate-700">{t('dashboard.equipmentHealth')}</p>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span className="text-xs text-slate-500">{equipmentAvailable} من {equipmentTotal} وحدة متاحة</span>
              <span className="ms-auto text-xs font-bold text-emerald-600">{equipmentHealthLabel}</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
              <div className={`h-full rounded-full ${equipmentHealthColor}`} style={{ width: `${equipmentHealthPct}%` }} />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
