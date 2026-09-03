import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowRight, Phone, Mail, MapPin, Calendar, CreditCard,
  FileText, MessageSquare, AlertCircle, Edit2, X,
} from 'lucide-react';
import api from '../lib/api';
import { formatCurrency, formatDate, formatDateTime, getBookingStatusColor, getBookingStatusLabel, getCustomerStatusLabel, getInitials, getInvoiceStatusColor, getInvoiceStatusLabel, getLeadSourceLabel, getPaymentMethodLabel } from '../lib/utils';

interface CustomerDetail {
  id: string;
  name: string;
  phone: string;
  whatsapp: string;
  email: string;
  source: string;
  status: string;
  city: string;
  address: string;
  notes: string;
  createdAt: string;
  totalBookings: number;
  totalSpending: number;
  outstanding: number;
  bookings: {
    id: string; bookingNumber: string; eventDate: string;
    status: string; total: number; paid: number; eventType: string;
  }[];
  invoices: {
    id: string; invoiceNumber: string; date: string;
    dueDate: string; total: number; paid: number; status: string;
  }[];
  payments: {
    id: string; amount: number; date: string; method: string; reference: string;
  }[];
  communications: {
    id: string; type: string; subject: string; content: string; date: string;
  }[];
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
        <Icon className="w-4 h-4 text-slate-500" />
      </div>
      <div>
        <p className="text-xs text-slate-400">{label}</p>
        <p className="text-sm font-medium text-slate-700">{value}</p>
      </div>
    </div>
  );
}

export default function CustomerDetail() {
  const { t } = useTranslation();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [showEdit, setShowEdit] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { data, isLoading } = useQuery<CustomerDetail>({
    queryKey: ['customer', id],
    queryFn: async () => {
      const res = await api.get(`/customers/${id}`);
      const d = res.data.data;
      return {
        ...d,
        name: d.fullName,
        outstanding: d.outstandingBalance ?? 0,
        bookings: (d.bookings ?? []).map((b: any) => ({ ...b, eventDate: b.event?.eventDate || null, eventType: b.event?.eventType || null, total: Number(b.total ?? 0), paid: Number(b.paidAmount ?? 0) })),
        invoices: (d.invoices ?? []).map((inv: any) => ({ ...inv, date: inv.invoiceDate, dueDate: inv.dueDate, total: Number(inv.total ?? 0), paid: Number(inv.paidAmount ?? 0) })),
        payments: (d.payments ?? []).map((p: any) => ({ ...p, date: p.paymentDate, method: p.paymentMethod, reference: p.referenceNumber || '-', amount: Number(p.amount ?? 0) })),
      };
    },
  });

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');
    const fd = new FormData(e.currentTarget);
    const payload: Record<string, any> = Object.fromEntries(fd);
    Object.keys(payload).forEach((k) => { if (payload[k] === '') delete payload[k]; });
    try {
      await api.put(`/customers/${id}`, payload);
      setShowEdit(false);
      queryClient.invalidateQueries({ queryKey: ['customer', id] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    } catch (err: any) {
      const respData = err?.response?.data;
      let msg = respData?.error?.message || 'فشل حفظ بيانات العميل';
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-slate-100 rounded animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="card animate-pulse h-96" />
          <div className="lg:col-span-2 card animate-pulse h-96" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <AlertCircle className="w-12 h-12 mb-3 opacity-50" />
        <p>{t('common.noData')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb & Action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm">
          <Link to="/customers" className="text-slate-500 hover:text-primary-600 flex items-center gap-1">
            <ArrowRight className="w-4 h-4 rtl:rotate-180" />
            {t('nav.customers')}
          </Link>
          <span className="text-slate-300">/</span>
          <span className="font-medium text-slate-700">{data.name}</span>
        </div>

        <button
          type="button"
          onClick={() => { setErrorMsg(''); setShowEdit(true); }}
          className="btn-primary flex items-center gap-1.5 self-start sm:self-auto text-sm"
        >
          <Edit2 className="w-4 h-4" /> تعديل بيانات العميل
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Sidebar */}
        <div className="space-y-6">
          <div className="card text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 text-white flex items-center justify-center text-2xl font-bold mx-auto mb-4">
              {getInitials(data.name)}
            </div>
            <h2 className="text-xl font-bold text-slate-900">{data.name}</h2>
            <span className={`mt-2 inline-block ${
              data.status === 'VIP' ? 'badge-info'
              : data.status === 'ACTIVE' ? 'badge-success'
              : data.status === 'BLACKLISTED' ? 'badge-danger'
              : 'badge-neutral'
            }`}>{getCustomerStatusLabel(data.status)}</span>
          </div>

          <div className="card">
            <h3 className="font-semibold text-slate-900 mb-3">بيانات التواصل</h3>
            <div className="divide-y divide-slate-50">
              <InfoRow icon={Phone} label={t('customer.phone')} value={data.phone} />
              <InfoRow icon={Phone} label={t('customer.whatsapp')} value={data.whatsapp} />
              <InfoRow icon={Mail} label={t('customer.email')} value={data.email} />
              <InfoRow icon={MapPin} label={t('customer.city')} value={data.city} />
              <InfoRow icon={Calendar} label={t('common.date')} value={formatDate(data.createdAt)} />
            </div>
          </div>

          {/* Summary */}
          <div className="card space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">{t('customer.totalBookings')}</span>
              <span className="font-bold text-slate-900">{data.totalBookings}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">{t('customer.totalSpending')}</span>
              <span className="font-bold text-emerald-600">{formatCurrency(data.totalSpending)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">{t('customer.outstanding')}</span>
              <span className={`font-bold ${data.outstanding > 0 ? 'text-red-600' : 'text-slate-700'}`}>
                {formatCurrency(data.outstanding)}
              </span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Bookings */}
          <div className="card">
            <h3 className="font-semibold text-slate-900 mb-4">{t('nav.bookings')}</h3>
            {data.bookings?.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-slate-500 text-start">
                    <tr>
                      <th className="pb-2 text-start font-medium">{t('booking.number')}</th>
                      <th className="pb-2 text-start font-medium">{t('booking.eventDate')}</th>
                      <th className="pb-2 text-start font-medium">{t('common.status')}</th>
                      <th className="pb-2 text-end font-medium">{t('common.total')}</th>
                      <th className="pb-2 text-end font-medium">{t('common.remaining')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {data.bookings.map((b) => (
                      <tr key={b.id} className="table-row-hover">
                        <td className="py-3">
                          <Link to={`/bookings/${b.id}`} className="text-primary-600 hover:underline">{b.bookingNumber}</Link>
                        </td>
                        <td className="py-3 text-slate-600">{formatDate(b.eventDate)}</td>
                        <td className="py-3"><span className={getBookingStatusColor(b.status)}>{getBookingStatusLabel(b.status)}</span></td>
                        <td className="py-3 text-end font-medium">{formatCurrency(b.total)}</td>
                        <td className="py-3 text-end text-red-600">{formatCurrency(b.total - b.paid)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-center text-slate-400 py-6">{t('common.noData')}</p>
            )}
          </div>

          {/* Invoices */}
          <div className="card">
            <h3 className="font-semibold text-slate-900 mb-4">{t('nav.invoices')}</h3>
            {data.invoices?.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-slate-500">
                    <tr>
                      <th className="pb-2 text-start font-medium">{t('invoice.number')}</th>
                      <th className="pb-2 text-start font-medium">{t('invoice.date')}</th>
                      <th className="pb-2 text-start font-medium">{t('invoice.dueDate')}</th>
                      <th className="pb-2 text-end font-medium">{t('common.total')}</th>
                      <th className="pb-2 text-end font-medium">{t('common.remaining')}</th>
                      <th className="pb-2 text-start font-medium">{t('common.status')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {data.invoices.map((inv) => (
                      <tr key={inv.id} className="table-row-hover">
                        <td className="py-3">
                          <Link to={`/invoices/${inv.id}`} className="text-primary-600 hover:underline">{inv.invoiceNumber}</Link>
                        </td>
                        <td className="py-3 text-slate-600">{formatDate(inv.date)}</td>
                        <td className="py-3 text-slate-600">{formatDate(inv.dueDate)}</td>
                        <td className="py-3 text-end font-medium">{formatCurrency(inv.total)}</td>
                        <td className="py-3 text-end text-red-600">{formatCurrency(inv.total - inv.paid)}</td>
                        <td className="py-3"><span className={getInvoiceStatusColor(inv.status)}>{getInvoiceStatusLabel(inv.status)}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-center text-slate-400 py-6">{t('common.noData')}</p>
            )}
          </div>

          {/* Payments */}
          <div className="card">
            <h3 className="font-semibold text-slate-900 mb-4">{t('nav.payments')}</h3>
            {data.payments?.length ? (
              <div className="space-y-2">
                {data.payments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                    <div className="flex items-center gap-3">
                      <CreditCard className="w-4 h-4 text-slate-400" />
                      <div>
                        <p className="text-sm font-medium text-slate-700">{getPaymentMethodLabel(p.method)} — {p.reference}</p>
                        <p className="text-xs text-slate-400">{formatDate(p.date)}</p>
                      </div>
                    </div>
                    <span className="font-semibold text-emerald-600">{formatCurrency(p.amount)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-slate-400 py-6">{t('common.noData')}</p>
            )}
          </div>

          {/* Communications */}
          <div className="card">
            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-slate-400" />
              {t('nav.marketing')}
            </h3>
            {data.communications?.length ? (
              <div className="space-y-3">
                {data.communications.map((c) => (
                  <div key={c.id} className="p-3 rounded-lg border border-slate-100">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-slate-700">{c.subject}</span>
                      <span className="text-xs text-slate-400">{formatDateTime(c.date)}</span>
                    </div>
                    <p className="text-sm text-slate-500">{c.content}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-slate-400 py-6">{t('common.noData')}</p>
            )}
          </div>
        </div>
      </div>

      {/* Edit Customer Modal */}
      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowEdit(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">تعديل بيانات العميل</h2>
              <button onClick={() => setShowEdit(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="label">{t('customer.name')} *</label>
                <input name="fullName" defaultValue={data.name || ''} required className="input" placeholder="اسم العميل الكامل..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">{t('customer.phone')}</label>
                  <input name="phone" defaultValue={data.phone || ''} className="input font-mono" placeholder="05XXXXXXXX" />
                </div>
                <div>
                  <label className="label">{t('customer.whatsapp')}</label>
                  <input name="whatsapp" defaultValue={data.whatsapp || ''} className="input font-mono" placeholder="رقم الواتساب..." />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">{t('customer.email')}</label>
                  <input name="email" type="email" defaultValue={data.email || ''} className="input" placeholder="example@email.com" />
                </div>
                <div>
                  <label className="label">{t('customer.city')}</label>
                  <input name="city" defaultValue={data.city || ''} className="input" placeholder="المدينة (الرياض، جدة...)" />
                </div>
              </div>
              <div>
                <label className="label">{t('customer.address')}</label>
                <input name="address" defaultValue={data.address || ''} className="input" placeholder="العنوان بالتفصيل..." />
              </div>
              <div>
                <label className="label">{t('booking.notes')}</label>
                <textarea name="notes" defaultValue={data.notes || ''} rows={2} className="input" placeholder="ملاحظات إضافية عن العميل..." />
              </div>
              {errorMsg && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{errorMsg}</div>}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowEdit(false)} className="btn-secondary">{t('common.cancel')}</button>
                <button type="submit" disabled={submitting} className="btn-primary">
                  {submitting ? t('common.loading') : 'حفظ التعديلات'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
