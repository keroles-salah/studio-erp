import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Search, Plus, Eye, ChevronLeft, ChevronRight,
  Phone, Mail, AlertCircle, X, Edit2,
} from 'lucide-react';
import api from '../lib/api';
import { formatCurrency, getInitials } from '../lib/utils';

interface Customer {
  id: string;
  name: string;
  phone: string;
  whatsapp?: string;
  email: string;
  city?: string;
  address?: string;
  notes?: string;
  source: string;
  status: string;
  totalBookings: number;
  totalSpending?: number;
  outstanding?: number;
}

export default function Customers() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['customers', { page, search }],
    queryFn: async () => {
      const res = await api.get('/customers', { params: { page, search } });
      const { items, total, page: currentPage, limit } = res.data.data;
      const mapped: Customer[] = (items || []).map((c: any) => ({
        id: c.id,
        name: c.fullName || c.name || '',
        phone: c.phone || '',
        whatsapp: c.whatsapp || '',
        email: c.email || '',
        city: c.city || '',
        address: c.address || '',
        notes: c.notes || '',
        source: c.source || 'OTHER',
        status: c.customerStatus || c.status || 'ACTIVE',
        totalBookings: Number(c.totalBookings ?? 0),
        totalSpending: Number(c.totalSpending ?? 0),
        outstanding: Number(c.outstanding ?? 0),
      }));
      return { data: mapped, total, page: currentPage, totalPages: Math.ceil(total / limit) };
    },
  });

  const customers = data?.data || [];
  const totalPages = data?.totalPages || 1;

  const openCreate = () => {
    setErrorMsg('');
    setShowModal(true);
  };

  const openEdit = (c: Customer) => {
    setErrorMsg('');
    setEditingCustomer(c);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');
    const fd = new FormData(e.currentTarget);
    const payload: Record<string, any> = Object.fromEntries(fd);
    Object.keys(payload).forEach((k) => { if (payload[k] === '') delete payload[k]; });
    try {
      if (editingCustomer) {
        await api.put(`/customers/${editingCustomer.id}`, payload);
        setEditingCustomer(null);
      } else {
        await api.post('/customers', payload);
        setShowModal(false);
      }
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    } catch (err: any) {
      const data = err?.response?.data;
      let msg = data?.error?.message || 'Failed to save customer';
      const details = data?.error?.details;
      if (details && typeof details === 'object' && Object.keys(details).length) {
        msg = Object.entries(details).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' · ');
      }
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900">{t('nav.customers')}</h1>
        <button onClick={openCreate} className="btn-primary">
          <Plus className="w-5 h-5" />
          {t('common.add')}
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="absolute top-1/2 -translate-y-1/2 start-3 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="input ps-10"
              placeholder={t('common.search')}
            />
          </div>
          <div className="flex items-center text-sm text-slate-500">
            {t('common.total')}: <span className="font-semibold text-slate-700 ms-1">{data?.total || 0}</span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-start font-medium">{t('customer.name')}</th>
                <th className="px-4 py-3 text-start font-medium">{t('customer.phone')}</th>
                <th className="px-4 py-3 text-start font-medium">{t('customer.email')}</th>
                <th className="px-4 py-3 text-center font-medium">{t('customer.totalBookings')}</th>
                <th className="px-4 py-3 text-end font-medium">{t('customer.totalSpending')}</th>
                <th className="px-4 py-3 text-end font-medium">{t('customer.outstanding')}</th>
                <th className="px-4 py-3 text-center font-medium">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-5 bg-slate-100 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    {t('common.noData')}
                  </td>
                </tr>
              ) : (
                customers.map((c: Customer) => (
                  <tr key={c.id} className="table-row-hover">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-semibold">
                          {getInitials(c.name)}
                        </div>
                        <Link to={`/customers/${c.id}`} className="font-medium text-slate-900 hover:text-primary-600">
                          {c.name}
                        </Link>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <span className="flex items-center gap-1 font-mono text-xs">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <bdi dir="ltr">{c.phone}</bdi>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <span className="flex items-center gap-1 text-xs">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <bdi dir="ltr">{c.email}</bdi>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-slate-700">{c.totalBookings}</td>
                    <td className="px-4 py-3 text-end font-medium text-slate-700 whitespace-nowrap">
                      {c.totalSpending ? formatCurrency(c.totalSpending) : '-'}
                    </td>
                    <td className="px-4 py-3 text-end whitespace-nowrap">
                      {c.outstanding !== undefined && c.outstanding > 0 ? (
                        <span className="font-medium text-red-600">{formatCurrency(c.outstanding)}</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(c)}
                          className="btn-ghost p-1.5 text-slate-600 hover:text-primary-700"
                          title="تعديل بيانات العميل"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <Link to={`/customers/${c.id}`} className="btn-ghost p-1.5" title="عرض التفاصيل">
                          <Eye className="w-4 h-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <p className="text-sm text-slate-500">
              {t('common.total')}: {data?.total || 0}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="btn-secondary p-1.5"
              >
                <ChevronRight className="w-4 h-4 rtl:rotate-180" />
              </button>
              <span className="text-sm text-slate-600 px-2">{page} / {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="btn-secondary p-1.5"
              >
                <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Customer Modal */}
      {(showModal || editingCustomer) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => { setShowModal(false); setEditingCustomer(null); }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">
                {editingCustomer ? 'تعديل بيانات العميل' : `${t('common.add')} ${t('common.customer')}`}
              </h2>
              <button onClick={() => { setShowModal(false); setEditingCustomer(null); }} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">{t('customer.name')} *</label>
                <input name="fullName" defaultValue={editingCustomer?.name || ''} required className="input" placeholder="اسم العميل الكامل..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">{t('customer.phone')}</label>
                  <input name="phone" defaultValue={editingCustomer?.phone || ''} className="input font-mono" placeholder="05XXXXXXXX" />
                </div>
                <div>
                  <label className="label">{t('customer.whatsapp')}</label>
                  <input name="whatsapp" defaultValue={editingCustomer?.whatsapp || ''} className="input font-mono" placeholder="رقم الواتساب..." />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">{t('customer.email')}</label>
                  <input name="email" type="email" defaultValue={editingCustomer?.email || ''} className="input" placeholder="example@email.com" />
                </div>
                <div>
                  <label className="label">{t('customer.city')}</label>
                  <input name="city" defaultValue={editingCustomer?.city || ''} className="input" placeholder="المدينة (الرياض، جدة...)" />
                </div>
              </div>
              <div>
                <label className="label">{t('customer.address')}</label>
                <input name="address" defaultValue={editingCustomer?.address || ''} className="input" placeholder="العنوان بالتفصيل..." />
              </div>
              <div>
                <label className="label">{t('booking.notes')}</label>
                <textarea name="notes" defaultValue={editingCustomer?.notes || ''} rows={2} className="input" placeholder="ملاحظات إضافية عن العميل..." />
              </div>
              {errorMsg && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{errorMsg}</div>}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => { setShowModal(false); setEditingCustomer(null); }} className="btn-secondary">{t('common.cancel')}</button>
                <button type="submit" disabled={submitting} className="btn-primary">
                  {submitting ? t('common.loading') : (editingCustomer ? 'حفظ التعديلات' : t('common.save'))}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
