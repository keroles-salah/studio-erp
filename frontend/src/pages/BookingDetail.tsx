import { useTranslation } from 'react-i18next';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight, User, Calendar, MapPin, CreditCard, FileText,
  Package, TrendingUp, AlertCircle,
} from 'lucide-react';
import api from '../lib/api';
import { formatCurrency, formatDate, getBookingStatusColor, getBookingStatusLabel, getEventTypeLabel, getInvoiceStatusColor, getInvoiceStatusLabel, getPaymentMethodLabel } from '../lib/utils';

interface BookingDetail {
  id: string;
  bookingNumber: string;
  status: string;
  customer: { id: string; name: string; phone: string; email: string; };
  eventDate: string;
  eventType: string;
  venue: string;
  guestCount: number;
  notes: string;
  total: number;
  paid: number;
  deposit: number;
  services: { id: string; name: string; quantity: number; price: number; total: number; }[];
  equipment: { id: string; name: string; code: string; quantity: number; }[];
  invoices: { id: string; invoiceNumber: string; date: string; total: number; paid: number; status: string; }[];
  payments: { id: string; amount: number; date: string; method: string; reference: string; }[];
  expenses: { id: string; description: string; amount: number; category: string; }[];
}

function Section({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="card">
      <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
        <Icon className="w-5 h-5 text-slate-400" />
        {title}
      </h3>
      {children}
    </div>
  );
}

export default function BookingDetail() {
  const { t } = useTranslation();
  const { id } = useParams();

  const { data, isLoading, isError } = useQuery<BookingDetail>({
    queryKey: ['booking', id],
    queryFn: async () => {
      const res = await api.get(`/bookings/${id}`);
      const b = res.data.data;
      return {
        ...b,
        total: Number(b.total ?? 0),
        paid: Number(b.paidAmount ?? 0),
        remaining: Number(b.remainingAmount ?? 0),
        customer: b.customer ? { id: b.customer.id, name: b.customer.fullName, phone: b.customer.phone || '', email: b.customer.email || '' } : { id: '', name: '—', phone: '', email: '' },
        eventDate: b.event?.eventDate || null,
        eventType: b.event?.eventType || null,
        venue: b.event?.venueName || '-',
        guestCount: null,
        services: (b.services || []).map((s: any) => ({ id: s.id, name: s.service?.name || '-', quantity: s.quantity, price: Number(s.unitPrice ?? 0), total: Number(s.total ?? 0) })),
        equipment: (b.equipment || []).map((e: any) => ({ id: e.id, name: e.equipment?.name || '-', code: e.equipment?.equipmentCode || '-', quantity: e.quantity })),
        invoices: (b.invoices || []).map((inv: any) => ({ ...inv, date: inv.invoiceDate, paid: Number(inv.paidAmount ?? 0), total: Number(inv.total ?? 0) })),
        payments: (b.payments || []).map((p: any) => ({ ...p, date: p.paymentDate, method: p.paymentMethod, reference: p.referenceNumber || '-', amount: Number(p.amount ?? 0) })),
        expenses: (b.expenses || []).map((e: any) => ({ ...e, amount: Number(e.amount ?? 0) })),
      };
    },
    retry: 1,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-slate-100 rounded animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card animate-pulse h-64" />
          <div className="card animate-pulse h-64" />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="card text-center py-16 px-4 space-y-4">
        <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mx-auto">
          <AlertCircle className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">لم يتم العثور على هذا الحجز</h2>
          <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
            المعرف المطلوب ({id}) غير موجود في قاعدة البيانات أو ربما تم حذفه مسبقاً.
          </p>
        </div>
        <div className="pt-2">
          <Link to="/bookings" className="btn-primary inline-flex items-center gap-2">
            <ArrowRight className="w-4 h-4 rtl:rotate-180" />
            الانتقال إلى جدول الحجوزات
          </Link>
        </div>
      </div>
    );
  }

  const remaining = data.total - data.paid;
  const totalExpenses = data.expenses?.reduce((sum, e) => sum + e.amount, 0) || 0;
  const profit = data.total - totalExpenses;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <Link to="/bookings" className="text-slate-500 hover:text-primary-600 flex items-center gap-1">
            <ArrowRight className="w-4 h-4 rtl:rotate-180" />
            {t('nav.bookings')}
          </Link>
          <span className="text-slate-300">/</span>
          <span className="font-medium text-slate-700">{data.bookingNumber}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card p-5">
          <p className="text-sm text-slate-500">{t('common.total')}</p>
          <p className="text-2xl font-bold text-slate-900">{formatCurrency(data.total)}</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-slate-500">{t('common.paid')}</p>
          <p className="text-2xl font-bold text-emerald-600">{formatCurrency(data.paid)}</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-slate-500">{t('common.remaining')}</p>
          <p className={`text-2xl font-bold ${remaining > 0 ? 'text-red-600' : 'text-slate-700'}`}>{formatCurrency(remaining)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section title={t('common.customer')} icon={User}>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">{t('customer.name')}</span>
              <Link to={`/customers/${data.customer.id}`} className="font-medium text-primary-600 hover:underline">{data.customer.name}</Link>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">{t('customer.phone')}</span>
              <span className="text-slate-700">{data.customer.phone}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">{t('customer.email')}</span>
              <span className="text-slate-700">{data.customer.email}</span>
            </div>
          </div>
        </Section>

        <Section title={t('booking.eventDate')} icon={Calendar}>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">{t('common.date')}</span>
              <span className="text-slate-700">{formatDate(data.eventDate)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">نوع المناسبة</span>
              <span className="text-slate-700">{getEventTypeLabel(data.eventType)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">{t('booking.venue')}</span>
              <span className="text-slate-700">{data.venue}</span>
            </div>
          </div>
        </Section>


        <Section title={t('common.equipment')} icon={Package}>
          {data.equipment?.length ? (
            <div className="space-y-2">
              {data.equipment.map((e) => (
                <div key={e.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                  <div>
                    <p className="text-sm font-medium text-slate-700">{e.name}</p>
                    <p className="text-xs text-slate-400">{e.code}</p>
                  </div>
                  <span className="badge-neutral">x{e.quantity}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-center text-slate-400 py-4">{t('common.noData')}</p>}
        </Section>

        <Section title={t('nav.invoices')} icon={FileText}>
          {data.invoices?.length ? (
            <div className="space-y-2">
              {data.invoices.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                  <div>
                    <Link to={`/invoices/${inv.id}`} className="text-sm font-medium text-primary-600 hover:underline">{inv.invoiceNumber}</Link>
                    <p className="text-xs text-slate-400">{formatDate(inv.date)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">{formatCurrency(inv.total)}</span>
                    <span className={getInvoiceStatusColor(inv.status)}>{getInvoiceStatusLabel(inv.status)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="text-center text-slate-400 py-4">{t('common.noData')}</p>}
        </Section>

        <Section title={t('nav.payments')} icon={CreditCard}>
          {data.payments?.length ? (
            <div className="space-y-2">
              {data.payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                  <div>
                    <p className="text-sm font-medium text-slate-700">{getPaymentMethodLabel(p.method)} — {p.reference}</p>
                    <p className="text-xs text-slate-400">{formatDate(p.date)}</p>
                  </div>
                  <span className="font-semibold text-emerald-600">{formatCurrency(p.amount)}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-center text-slate-400 py-4">{t('common.noData')}</p>}
        </Section>
      </div>

      {/* Profit Summary */}
      <div className="card">
        <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-slate-400" />
          {t('dashboard.netProfit')}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-primary-50">
            <p className="text-sm text-slate-500">{t('common.total')}</p>
            <p className="text-xl font-bold text-primary-700">{formatCurrency(data.total)}</p>
          </div>
          <div className="p-4 rounded-lg bg-red-50">
            <p className="text-sm text-slate-500">{t('dashboard.expenses')}</p>
            <p className="text-xl font-bold text-red-600">{formatCurrency(totalExpenses)}</p>
          </div>
          <div className="p-4 rounded-lg bg-emerald-50">
            <p className="text-sm text-slate-500">{t('dashboard.netProfit')}</p>
            <p className="text-xl font-bold text-emerald-600">{formatCurrency(profit)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
