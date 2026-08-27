import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Search, Plus, Eye, ChevronLeft, ChevronRight,
  Phone, Mail, AlertCircle, X,
} from 'lucide-react';
import api from '../lib/api';
import { formatCurrency, getInitials, getLeadSourceLabel } from '../lib/utils';

interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  source: string;
  status: string;
  totalBookings: number;
  totalSpending?: number;
  outstanding?: number;
}

interface PaginatedResponse {
  data: Customer[];
  total: number;
  page: number;
  totalPages: number;
}

export default function Customers() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
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
        email: c.email || '',
        source: c.source || 'OTHER',
        status: c.customerStatus || c.status || 'LEAD',
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');
    const fd = new FormData(e.currentTarget);
    const payload: Record<string, any> = Object.fromEntries(fd);
    Object.keys(payload).forEach((k) => { if (payload[k] === '') delete payload[k]; });
    try {
      await api.post('/customers', payload);
      setShowModal(false);
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
                      <span className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        {c.phone}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <span className="flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        {c.email}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-slate-700">{c.totalBookings}</td>
                    <td className="px-4 py-3 text-end font-medium text-slate-700">
                      {c.totalSpending ? formatCurrency(c.totalSpending) : '-'}
                    </td>
                    <td className="px-4 py-3 text-end">
                      {c.outstanding !== undefined && c.outstanding > 0 ? (
                        <span className="font-medium text-red-600">{formatCurrency(c.outstanding)}</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Link to={`/customers/${c.id}`} className="btn-ghost p-1.5 inline-flex">
                        <Eye className="w-4 h-4" />
                      </Link>
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

      {/* Add Customer Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{t('common.add')} {t('common.customer')}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">{t('customer.name')}</label>
                <input name="fullName" required className="input" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">{t('customer.phone')}</label><input name="phone" className="input" /></div>
                <div><label className="label">{t('customer.whatsapp')}</label><input name="whatsapp" className="input" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">{t('customer.email')}</label><input name="email" type="email" className="input" /></div>
                <div><label className="label">{t('customer.city')}</label><input name="city" className="input" /></div>
              </div>
              <div><label className="label">{t('customer.address')}</label><input name="address" className="input" /></div>
              <div><label className="label">{t('booking.notes')}</label><textarea name="notes" rows={2} className="input" placeholder="ملاحظات إضافية عن العميل..." /></div>
              {errorMsg && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{errorMsg}</div>}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">{t('common.cancel')}</button>
                <button type="submit" disabled={submitting} className="btn-primary">{submitting ? t('common.loading') : t('common.save')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
