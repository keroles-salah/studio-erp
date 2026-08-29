import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import type { ComponentType } from 'react';
import {
  BarChart3, TrendingUp, Wallet, Calendar, Users, Package,
  CreditCard, FileBarChart, AlertCircle, Download, Printer,
  Wrench, Megaphone, Receipt, BarChart2, Percent, Coins,
  UserPlus, UserCheck, UserX, Check, Hash, Clock, Banknote,
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import api from '../lib/api';
import {
  formatCurrency, formatDate, formatDateTime,
  getPaymentMethodLabel, getBookingStatusLabel, getBookingStatusColor,
  getInvoiceStatusLabel, getInvoiceStatusColor,
  getEquipmentStatusLabel, getEquipmentStatusColor,
  getLeadStatusLabel, getLeadSourceLabel, getCampaignStatusLabel,
  getExpenseCategoryLabel,
} from '../lib/utils';
import {
  MILLION_FORMAT_THRESHOLD,
  THOUSAND_FORMAT_THRESHOLD,
  COMPACT_NUMBER_DECIMALS,
} from '../lib/constants';

// ─── Types ──────────────────────────────────────────────────
interface SummaryObject { [key: string]: unknown; }
interface ReportData { [key: string]: unknown; summary?: SummaryObject; }

type CardFormat = 'currency' | 'number' | 'percent';
type ChartKind = 'donut' | 'bar' | 'line';

interface CardDef {
  key: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  bg: string;
  text: string;
  format: CardFormat;
}

interface SeriesDef { dataKey: string; name: string; color: string; }

interface ChartDef {
  dataPath: string;
  title: string;
  kind: ChartKind;
  labelKind?: string;
  valueFormat?: 'currency' | 'number';
  valueKey?: string;
  series?: SeriesDef[];
}

interface ColumnDef {
  key: string;
  label: string;
  format?: 'currency' | 'date' | 'datetime' | 'number' | 'percent' | 'method' | 'status' | 'text';
  statusKind?: string;
}

interface TableDef {
  dataPath: string;
  title: string;
  showRank?: boolean;
  columns: ColumnDef[];
}

interface ReportConfig {
  key: string;
  label: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  accentBg: string;
  accentText: string;
  cards: CardDef[];
  charts: ChartDef[];
  tables: TableDef[];
}

// ─── Status & label helpers ─────────────────────────────────
const RENTAL_STATUS_LABEL: Record<string, string> = {
  PENDING: 'قيد الانتظار', ACTIVE: 'نشط', COMPLETED: 'مكتمل', CANCELLED: 'ملغي',
};
const LEAD_STATUS_COLOR: Record<string, string> = {
  NEW: 'badge-info', CONTACTED: 'badge-info', QUALIFIED: 'badge-warning',
  PROPOSAL_SENT: 'badge-warning', CONVERTED: 'badge-success', LOST: 'badge-danger',
};
const CAMPAIGN_STATUS_COLOR: Record<string, string> = {
  DRAFT: 'badge-neutral', SCHEDULED: 'badge-info', SENDING: 'badge-info',
  IN_PROGRESS: 'badge-info', SENT: 'badge-info', COMPLETED: 'badge-success',
  CANCELLED: 'badge-danger',
};
const RENTAL_STATUS_COLOR: Record<string, string> = {
  PENDING: 'badge-warning', ACTIVE: 'badge-info', COMPLETED: 'badge-success',
  CANCELLED: 'badge-danger',
};

function translateLabel(label: string, kind?: string): string {
  if (!label) return '—';
  switch (kind) {
    case 'booking-status': return getBookingStatusLabel(label);
    case 'invoice-status': return getInvoiceStatusLabel(label);
    case 'equipment-status': return getEquipmentStatusLabel(label);
    case 'lead-status': return getLeadStatusLabel(label);
    case 'campaign-status': return getCampaignStatusLabel(label);
    case 'rental-status': return RENTAL_STATUS_LABEL[label] ?? label;
    case 'expense-category': return getExpenseCategoryLabel(label);
    case 'lead-source': return getLeadSourceLabel(label);
    case 'payment-method': return getPaymentMethodLabel(label);
    default: return label;
  }
}

function statusColor(status: string, kind?: string): string {
  switch (kind) {
    case 'booking': return getBookingStatusColor(status);
    case 'invoice': return getInvoiceStatusColor(status);
    case 'equipment': return getEquipmentStatusColor(status);
    case 'lead': return LEAD_STATUS_COLOR[status] ?? 'badge-neutral';
    case 'campaign': return CAMPAIGN_STATUS_COLOR[status] ?? 'badge-neutral';
    case 'rental': return RENTAL_STATUS_COLOR[status] ?? 'badge-neutral';
    default: return 'badge-neutral';
  }
}

function resolvePath(data: ReportData, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, k) => {
    if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[k];
    return undefined;
  }, data);
}

// ─── Palette ────────────────────────────────────────────────
const PALETTE = ['#c68436', '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#06b6d4', '#ef4444', '#ec4899', '#84cc16', '#f97316', '#14b8a6', '#6366f1'];
const C = {
  revenue: '#10b981',
  expenses: '#ef4444',
  cost: '#ef4444',
  profit: '#c68436',
  value: '#3b82f6',
  count: '#3b82f6',
  converted: '#10b981',
  totalValue: '#8b5cf6',
};

// ─── Report Config ──────────────────────────────────────────
const REPORTS: ReportConfig[] = [
  {
    key: 'revenue',
    label: 'تقرير الإيرادات',
    description: 'إجمالي الإيرادات والمدفوعات خلال الفترة',
    icon: TrendingUp,
    accentBg: 'bg-amber-50', accentText: 'text-amber-600',
    cards: [
      { key: 'totalRevenue', label: 'إجمالي الإيرادات', icon: TrendingUp, bg: 'bg-emerald-50', text: 'text-emerald-600', format: 'currency' },
      { key: 'totalPaid', label: 'إجمالي المدفوع', icon: Wallet, bg: 'bg-teal-50', text: 'text-teal-600', format: 'currency' },
      { key: 'invoiceCount', label: 'عدد الفواتير', icon: Receipt, bg: 'bg-blue-50', text: 'text-blue-600', format: 'number' },
    ],
    charts: [
      { dataPath: 'chartData', title: 'الإيرادات حسب الفترة', kind: 'bar', valueFormat: 'currency', series: [{ dataKey: 'value', name: 'الإيرادات', color: C.revenue }] },
    ],
    tables: [],
  },
  {
    key: 'expenses',
    label: 'تقرير المصروفات',
    description: 'تحليل المصروفات حسب الفئة والفترة',
    icon: Wallet,
    accentBg: 'bg-red-50', accentText: 'text-red-600',
    cards: [
      { key: 'totalExpenses', label: 'إجمالي المصروفات', icon: Coins, bg: 'bg-red-50', text: 'text-red-600', format: 'currency' },
      { key: 'count', label: 'عدد العمليات', icon: Hash, bg: 'bg-slate-100', text: 'text-slate-600', format: 'number' },
    ],
    charts: [
      { dataPath: 'categoryChart', title: 'المصروفات حسب الفئة', kind: 'donut', labelKind: 'expense-category', valueFormat: 'currency' },
      { dataPath: 'trendChart', title: 'المصروفات حسب الفترة', kind: 'bar', valueFormat: 'currency', series: [{ dataKey: 'value', name: 'المصروفات', color: C.expenses }] },
    ],
    tables: [],
  },
  {
    key: 'profit',
    label: 'تقرير الأرباح',
    description: 'الإيرادات مقابل المصروفات وصافي الربح',
    icon: BarChart3,
    accentBg: 'bg-emerald-50', accentText: 'text-emerald-600',
    cards: [
      { key: 'totalRevenue', label: 'إجمالي الإيرادات', icon: TrendingUp, bg: 'bg-emerald-50', text: 'text-emerald-600', format: 'currency' },
      { key: 'totalExpenses', label: 'إجمالي المصروفات', icon: Coins, bg: 'bg-red-50', text: 'text-red-600', format: 'currency' },
      { key: 'totalProfit', label: 'صافي الربح', icon: BarChart3, bg: 'bg-amber-50', text: 'text-amber-600', format: 'currency' },
      { key: 'profitMargin', label: 'هامش الربح', icon: Percent, bg: 'bg-teal-50', text: 'text-teal-600', format: 'percent' },
    ],
    charts: [
      { dataPath: 'chartData', title: 'الإيرادات مقابل المصروفات', kind: 'bar', valueFormat: 'currency', series: [
        { dataKey: 'revenue', name: 'الإيرادات', color: C.revenue },
        { dataKey: 'expenses', name: 'المصروفات', color: C.expenses },
        { dataKey: 'profit', name: 'الربح', color: C.profit },
      ] },
    ],
    tables: [],
  },
  {
    key: 'bookings',
    label: 'تقرير الحجوزات',
    description: 'أداء الحجوزات والقيمة الإجمالية',
    icon: Calendar,
    accentBg: 'bg-blue-50', accentText: 'text-blue-600',
    cards: [
      { key: 'totalBookings', label: 'عدد الحجوزات', icon: Calendar, bg: 'bg-blue-50', text: 'text-blue-600', format: 'number' },
      { key: 'totalValue', label: 'القيمة الإجمالية', icon: Banknote, bg: 'bg-amber-50', text: 'text-amber-600', format: 'currency' },
      { key: 'totalPaid', label: 'المدفوع', icon: Wallet, bg: 'bg-emerald-50', text: 'text-emerald-600', format: 'currency' },
      { key: 'totalRemaining', label: 'المتبقي', icon: Clock, bg: 'bg-orange-50', text: 'text-orange-600', format: 'currency' },
    ],
    charts: [
      { dataPath: 'statusChart', title: 'الحجوزات حسب الحالة', kind: 'donut', labelKind: 'booking-status', valueFormat: 'number' },
      { dataPath: 'trendChart', title: 'الحجوزات حسب الفترة', kind: 'bar', valueFormat: 'number', series: [{ dataKey: 'value', name: 'عدد الحجوزات', color: C.value }] },
    ],
    tables: [],
  },
  {
    key: 'customers',
    label: 'تقرير العملاء',
    description: 'العملاء الجدد وأعلى العملاء إنفاقاً',
    icon: Users,
    accentBg: 'bg-yellow-50', accentText: 'text-yellow-600',
    cards: [
      { key: 'newCustomers', label: 'عملاء جدد', icon: UserPlus, bg: 'bg-yellow-50', text: 'text-yellow-600', format: 'number' },
      { key: 'totalCustomers', label: 'إجمالي العملاء', icon: Users, bg: 'bg-amber-50', text: 'text-amber-600', format: 'number' },
    ],
    charts: [
      { dataPath: 'trendChart', title: 'العملاء الجدد حسب الفترة', kind: 'bar', valueFormat: 'number', series: [{ dataKey: 'value', name: 'عملاء جدد', color: '#f59e0b' }] },
    ],
    tables: [
      {
        dataPath: 'topCustomers', title: 'أعلى العملاء إنفاقاً', showRank: true,
        columns: [
          { key: 'fullName', label: 'العميل' },
          { key: 'totalSpending', label: 'إجمالي الإنفاق', format: 'currency' },
          { key: 'invoiceCount', label: 'عدد الفواتير', format: 'number' },
        ],
      },
    ],
  },
  {
    key: 'equipment',
    label: 'تقرير المعدات',
    description: 'استخدام المعدات وإيراداتها وأرباحها',
    icon: Package,
    accentBg: 'bg-purple-50', accentText: 'text-purple-600',
    cards: [
      { key: 'totalEquipment', label: 'إجمالي المعدات', icon: Package, bg: 'bg-purple-50', text: 'text-purple-600', format: 'number' },
    ],
    charts: [
      { dataPath: 'summary.statusBreakdown', title: 'المعدات حسب الحالة', kind: 'donut', labelKind: 'equipment-status', valueFormat: 'number' },
    ],
    tables: [
      {
        dataPath: 'equipment', title: 'أداء المعدات',
        columns: [
          { key: 'equipmentCode', label: 'الكود' },
          { key: 'name', label: 'الاسم' },
          { key: 'category', label: 'الفئة' },
          { key: 'status', label: 'الحالة', format: 'status', statusKind: 'equipment' },
          { key: 'utilizationCount', label: 'مرات الاستخدام', format: 'number' },
          { key: 'totalRevenue', label: 'الإيرادات', format: 'currency' },
          { key: 'totalCost', label: 'التكلفة', format: 'currency' },
          { key: 'profit', label: 'الربح', format: 'currency' },
        ],
      },
    ],
  },
  {
    key: 'outstanding-payments',
    label: 'الأرصدة المستحقة',
    description: 'الفواتير غير المسددة والأرصدة المتبقية',
    icon: CreditCard,
    accentBg: 'bg-rose-50', accentText: 'text-rose-600',
    cards: [
      { key: 'totalOutstanding', label: 'إجمالي المستحق', icon: CreditCard, bg: 'bg-rose-50', text: 'text-rose-600', format: 'currency' },
      { key: 'invoiceCount', label: 'عدد الفواتير', icon: Receipt, bg: 'bg-blue-50', text: 'text-blue-600', format: 'number' },
    ],
    charts: [
      { dataPath: 'statusChart', title: 'المستحقات حسب الحالة', kind: 'donut', labelKind: 'invoice-status', valueFormat: 'currency' },
    ],
    tables: [
      {
        dataPath: 'details', title: 'الفواتير المستحقة',
        columns: [
          { key: 'invoiceNumber', label: 'رقم الفاتورة' },
          { key: 'customerName', label: 'العميل' },
          { key: 'customerPhone', label: 'الهاتف' },
          { key: 'invoiceDate', label: 'تاريخ الفاتورة', format: 'date' },
          { key: 'total', label: 'الإجمالي', format: 'currency' },
          { key: 'paidAmount', label: 'المدفوع', format: 'currency' },
          { key: 'remainingAmount', label: 'المتبقي', format: 'currency' },
          { key: 'status', label: 'الحالة', format: 'status', statusKind: 'invoice' },
        ],
      },
    ],
  },
  {
    key: 'payment-history',
    label: 'سجل المدفوعات',
    description: 'جميع المدفوعات المستلمة خلال الفترة',
    icon: Receipt,
    accentBg: 'bg-cyan-50', accentText: 'text-cyan-600',
    cards: [
      { key: 'totalReceived', label: 'إجمالي المستلم', icon: Banknote, bg: 'bg-cyan-50', text: 'text-cyan-600', format: 'currency' },
      { key: 'paymentCount', label: 'عدد الدفعات', icon: Receipt, bg: 'bg-sky-50', text: 'text-sky-600', format: 'number' },
    ],
    charts: [
      { dataPath: 'methodChart', title: 'المدفوعات حسب الطريقة', kind: 'donut', labelKind: 'payment-method', valueFormat: 'currency' },
      { dataPath: 'trendChart', title: 'المدفوعات حسب الفترة', kind: 'bar', valueFormat: 'currency', series: [{ dataKey: 'value', name: 'المدفوعات', color: '#06b6d4' }] },
    ],
    tables: [
      {
        dataPath: 'details', title: 'سجل الدفعات',
        columns: [
          { key: 'invoiceNumber', label: 'رقم الفاتورة' },
          { key: 'customerName', label: 'العميل' },
          { key: 'amount', label: 'المبلغ', format: 'currency' },
          { key: 'paymentMethod', label: 'طريقة الدفع', format: 'method' },
          { key: 'paymentDate', label: 'تاريخ الدفع', format: 'date' },
          { key: 'referenceNumber', label: 'المرجع' },
        ],
      },
    ],
  },
];

// ─── Value formatters ───────────────────────────────────────
function formatCardValue(card: CardDef, value: unknown): string {
  if (value === null || value === undefined) return '—';
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value);
  if (card.format === 'currency') return formatCurrency(n);
  if (card.format === 'percent') return `${n}%`;
  return n.toLocaleString('en-US');
}

function compactNumber(v: number): string {
  if (Math.abs(v) >= MILLION_FORMAT_THRESHOLD) return `${(v / MILLION_FORMAT_THRESHOLD).toFixed(COMPACT_NUMBER_DECIMALS)}M`;
  if (Math.abs(v) >= THOUSAND_FORMAT_THRESHOLD) return `${(v / THOUSAND_FORMAT_THRESHOLD).toFixed(COMPACT_NUMBER_DECIMALS)}K`;
  return String(v);
}

// ─── Sub-components ─────────────────────────────────────────
function SummaryCard({ card, value }: { card: CardDef; value: unknown }) {
  const Icon = card.icon;
  return (
    <div className="card p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl ${card.bg} ${card.text} flex items-center justify-center shrink-0`}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="min-w-0">
        <p className="text-sm text-slate-500 mb-0.5">{card.label}</p>
        <p className="text-2xl font-bold text-slate-900 tabular-nums leading-tight">{formatCardValue(card, value)}</p>
      </div>
    </div>
  );
}

function ChartBlock({ def, data }: { def: ChartDef; data: ReportData }) {
  const raw = resolvePath(data, def.dataPath) as Record<string, unknown>[] | undefined;
  if (!Array.isArray(raw) || !raw.length) return null;
  const money = def.valueFormat === 'currency';

  const chartData = raw.map((r) => {
    const label = translateLabel(String(r.label ?? r.name ?? ''), def.labelKind);
    return { ...r, label };
  });

  const tooltipFmt = (v: number | string) =>
    money ? formatCurrency(Number(v)) : Number(v).toLocaleString('en-US');

  if (def.kind === 'donut') {
    const valueKey = def.valueKey || 'value';
    const donutData = chartData.map((r) => {
      const rec = r as Record<string, unknown>;
      return { name: String(rec.label ?? ''), value: Number(rec[valueKey] ?? 0) };
    });
    const total = donutData.reduce((s, d) => s + d.value, 0);
    return (
      <div className="card print-avoid-break">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900">{def.title}</h3>
          {total > 0 && (
            <span className="text-sm font-semibold text-slate-500 tabular-nums">
              {money ? formatCurrency(total) : total.toLocaleString('en-US')}
            </span>
          )}
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={donutData} dataKey="value" nameKey="name"
              cx="50%" cy="50%" innerRadius={68} outerRadius={112}
              paddingAngle={2} stroke="#ffffff" strokeWidth={2}
            >
              {donutData.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
            </Pie>
            <Tooltip formatter={(v) => tooltipFmt(Number(v))} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  const series = def.series || [{ dataKey: 'value', name: 'القيمة', color: C.value }];
  const isLine = def.kind === 'line';
  const ChartTag = isLine ? LineChart : BarChart;

  return (
    <div className="card print-avoid-break">
      <h3 className="font-semibold text-slate-900 mb-4">{def.title}</h3>
      <ResponsiveContainer width="100%" height={320}>
        <ChartTag data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} angle={-25} textAnchor="end" height={65} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={compactNumber} width={48} />
          <Tooltip formatter={(v) => tooltipFmt(Number(v))} />
          <Legend />
          {series.map((s) =>
            isLine ? (
              <Line key={s.dataKey} type="monotone" dataKey={s.dataKey} name={s.name} stroke={s.color} strokeWidth={2} dot={{ r: 3 }} />
            ) : (
              <Bar key={s.dataKey} dataKey={s.dataKey} name={s.name} fill={s.color} radius={[4, 4, 0, 0]} maxBarSize={44} />
            )
          )}
        </ChartTag>
      </ResponsiveContainer>
    </div>
  );
}

function StatusBadge({ status, kind }: { status: string; kind?: string }) {
  return <span className={`badge ${statusColor(status, kind)}`}>{translateLabel(status, kind === 'rental' ? 'rental-status' : kind)}</span>;
}

function formatCell(col: ColumnDef, val: unknown): React.ReactNode {
  if (val === null || val === undefined) return <span className="text-slate-300">—</span>;
  switch (col.format) {
    case 'currency': return <span className="font-semibold tabular-nums">{formatCurrency(Number(val))}</span>;
    case 'date': return formatDate(String(val));
    case 'datetime': return formatDateTime(String(val));
    case 'number': return <span className="tabular-nums">{Number(val).toLocaleString('en-US')}</span>;
    case 'percent': return `${Number(val)}%`;
    case 'method': return getPaymentMethodLabel(String(val));
    case 'status': return <StatusBadge status={String(val)} kind={col.statusKind} />;
    default: return String(val);
  }
}

function DetailTable({ def, data }: { def: TableDef; data: ReportData }) {
  const rows = resolvePath(data, def.dataPath) as Record<string, unknown>[] | undefined;
  if (!Array.isArray(rows) || !rows.length) return null;
  return (
    <div className="card overflow-hidden p-0 print-avoid-break">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <h3 className="font-semibold text-slate-900">{def.title}</h3>
        <span className="text-xs font-medium text-slate-400">{rows.length} عنصر</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              {def.showRank && <th className="px-4 py-3 text-start font-semibold w-12">#</th>}
              {def.columns.map((c) => (
                <th key={c.key} className="px-4 py-3 text-start font-semibold whitespace-nowrap">{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row, i) => (
              <tr key={i} className="table-row-hover">
                {def.showRank && <td className="px-4 py-3 text-slate-400 font-semibold">{i + 1}</td>}
                {def.columns.map((c) => (
                  <td key={c.key} className="px-4 py-3 text-slate-700 whitespace-nowrap">{formatCell(c, row[c.key])}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────
export default function Reports() {
  const { t } = useTranslation();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const report = REPORTS.find((r) => r.key === selectedKey) || null;

  const { data, isLoading, error } = useQuery<ReportData>({
    queryKey: ['report', selectedKey, fromDate, toDate],
    queryFn: async () => {
      const res = await api.get(`/reports/${selectedKey}`, { params: { fromDate, toDate } });
      return res.data.data as ReportData;
    },
    enabled: !!selectedKey,
  });

  const dateRangeLabel = !fromDate && !toDate
    ? 'كل الفترات'
    : `${fromDate ? `من ${formatDate(fromDate)}` : ''}${toDate ? ` إلى ${formatDate(toDate)}` : ''}`.trim();

  const exportCSV = () => {
    if (!data || !report) return;
    const escape = (cell: unknown): string => {
      const s = String(cell ?? '');
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    const lines: string[][] = [];
    const summary = data.summary || {};
    for (const card of report.cards) {
      const v = summary[card.key];
      if (v === undefined) continue;
      lines.push([card.label, String(v)]);
    }
    for (const ch of report.charts) {
      const arr = resolvePath(data, ch.dataPath) as Record<string, unknown>[] | undefined;
      if (!Array.isArray(arr) || !arr.length) continue;
      lines.push([]);
      lines.push([ch.title]);
      const cols = Object.keys(arr[0]);
      lines.push(cols.map((c) => translateLabel(c, ch.labelKind)));
      arr.forEach((row) => lines.push(cols.map((c) => escape(row[c] ?? ''))));
    }
    for (const tb of report.tables) {
      const arr = resolvePath(data, tb.dataPath) as Record<string, unknown>[] | undefined;
      if (!Array.isArray(arr) || !arr.length) continue;
      lines.push([]);
      lines.push([tb.title]);
      lines.push(tb.columns.map((c) => c.label));
      arr.forEach((row) => lines.push(tb.columns.map((c) => escape(row[c.key] ?? ''))));
    }
    if (!lines.length) return;
    const csv = '\ufeff' + lines.map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.key}-report-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ── Grid selection ────────────────────────────────────────
  if (!report) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="page-title">{t('nav.reports')}</h1>
          <p className="muted-text mt-1">اختر تقريراً لعرض تحليلات مفصّلة وقابلة للطباعة والتصدير</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {REPORTS.map((r) => (
            <button
              key={r.key}
              onClick={() => setSelectedKey(r.key)}
              className="card p-5 text-start hover:shadow-md transition-all group border-slate-200/80 hover:border-primary-200"
            >
              <div className={`w-12 h-12 rounded-xl ${r.accentBg} ${r.accentText} flex items-center justify-center mb-3 group-hover:scale-105 transition-transform`}>
                <r.icon className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-slate-900 group-hover:text-primary-600">{r.label}</h3>
              <p className="text-sm text-slate-400 mt-1 leading-5">{r.description}</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const summary = data?.summary || {};
  const Icon = report.icon;
  const hasCharts = report.charts.some((c) => Array.isArray(resolvePath(data || {}, c.dataPath)) && (resolvePath(data || {}, c.dataPath) as unknown[]).length > 0);
  const hasTables = report.tables.some((tb) => Array.isArray(resolvePath(data || {}, tb.dataPath)) && (resolvePath(data || {}, tb.dataPath) as unknown[]).length > 0);

  return (
    <div className="space-y-6" id="report-print">
      {/* Header */}
      <div className="print:hidden flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <button onClick={() => setSelectedKey(null)} className="btn-secondary text-sm">
            ← {t('nav.reports')}
          </button>
          <div className={`w-11 h-11 rounded-xl ${report.accentBg} ${report.accentText} flex items-center justify-center`}>
            <Icon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">{report.label}</h1>
            <p className="text-sm text-slate-500">{report.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => window.print()} className="btn-secondary text-sm">
            <Printer className="w-4 h-4" /> طباعة
          </button>
          <button onClick={exportCSV} disabled={!data} className="btn-secondary text-sm disabled:opacity-50">
            <Download className="w-4 h-4" /> {t('common.export')}
          </button>
        </div>
      </div>

      {/* Print-only header */}
      <div className="hidden print:block mb-4">
        <div className="flex items-center justify-between border-b-2 border-slate-900 pb-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${report.accentBg} ${report.accentText} flex items-center justify-center`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-500">REAL HOME LENS</p>
              <h1 className="text-2xl font-bold text-slate-900">{report.label}</h1>
            </div>
          </div>
          <div className="text-end text-sm text-slate-500">
            <p className="font-semibold text-slate-700">{dateRangeLabel}</p>
            <p>{formatDateTime(new Date())}</p>
          </div>
        </div>
      </div>

      {/* Date filters */}
      <div className="card p-4 print:hidden">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="label">من تاريخ</label>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="input" />
          </div>
          <div>
            <label className="label">إلى تاريخ</label>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="input" />
          </div>
          {(fromDate || toDate) && (
            <button onClick={() => { setFromDate(''); setToDate(''); }} className="btn-secondary text-sm">مسح الفلاتر</button>
          )}
          <div className="ms-auto text-sm text-slate-500">
            <span className="font-semibold text-slate-700">{dateRangeLabel}</span>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="card animate-pulse h-96" />
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <AlertCircle className="w-12 h-12 mb-3 opacity-50" />
          <p>حدث خطأ أثناء تحميل التقرير</p>
        </div>
      ) : !data ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <AlertCircle className="w-12 h-12 mb-3 opacity-50" />
          <p>{t('common.noData')}</p>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {report.cards.map((card) => (
              <SummaryCard key={card.key} card={card} value={summary[card.key]} />
            ))}
          </div>

          {/* Charts */}
          {report.charts.map((ch) => (
            <ChartBlock key={ch.dataPath} def={ch} data={data} />
          ))}

          {/* Tables */}
          {report.tables.map((tb) => (
            <DetailTable key={tb.dataPath} def={tb} data={data} />
          ))}

          {/* Empty state */}
          {!hasCharts && !hasTables && (
            <div className="card flex flex-col items-center justify-center py-16 text-slate-400">
              <FileBarChart className="w-12 h-12 mb-3 opacity-50" />
              <p className="font-medium text-slate-500">لا توجد بيانات في هذه الفترة</p>
              <p className="text-sm mt-1">جرّب تغيير نطاق التاريخ أو امسح الفلاتر</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
