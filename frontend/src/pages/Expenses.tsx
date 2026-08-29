import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Search, Plus, TrendingDown, AlertCircle, Wallet, X, Pencil, Trash2,
} from 'lucide-react';
import api from '../lib/api';
import { formatCurrency, formatDate, getExpenseCategoryLabel, getPaymentMethodLabel } from '../lib/utils';
import { LARGE_PAGE_SIZE } from '../lib/constants';

interface Expense {
  id: string;
  date: string;
  category: string;
  description: string;
  amount: number;
  supplierName: string;
  bookingNumber: string;
  bookingId?: string;
  paymentMethod?: string;
  notes?: string;
}

interface ExpenseSummary {
  byCategory: { category: string; total: number }[];
  total: number;
}

const CATEGORIES = ['EQUIPMENT_RENTAL', 'MAINTENANCE', 'MARKETING', 'OTHER', 'STAFF', 'STUDIO_RENT', 'TRANSPORTATION', 'UTILITIES'];

export default function Expenses() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState<Expense | null>(null);
  const [actionError, setActionError] = useState('');

  const { data: bookingsList } = useQuery({
    queryKey: ['expenses-bookings'],
    queryFn: async () => {
      const res = await api.get('/bookings', { params: { limit: LARGE_PAGE_SIZE, sortBy: 'createdAt', sortOrder: 'desc' } });
      return (res.data.data.items || []).map((b: any) => ({ id: b.id, label: b.bookingNumber }));
    },
    enabled: showModal,
  });

  const openCreate = () => {
    setEditing(null);
    setErrorMsg('');
    setShowModal(true);
  };

  const openEdit = (e: Expense) => {
    setEditing(e);
    setErrorMsg('');
    setShowModal(true);
  };

  const doDelete = async () => {
    if (!deleting) return;
    setSubmitting(true);
    setActionError('');
    try {
      await api.delete(`/expenses/${deleting.id}`);
      setDeleting(null);
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    } catch (err: any) {
      const data = err?.response?.data;
      setActionError(data?.error?.message || 'Failed to delete expense');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');
    const fd = new FormData(e.currentTarget);
    const payload: Record<string, any> = Object.fromEntries(fd);
    Object.keys(payload).forEach((k) => { if (payload[k] === '') delete payload[k]; });
    payload.amount = parseFloat(fd.get('amount') as string) || 0;
    if (payload.bookingId === '') delete payload.bookingId;
    if (editing && payload.expenseDate === undefined && editing.date) {
      // keep original date if the date input was not changed server-side required on update? (optional, date input always submits)
    }
    try {
      if (editing) {
        await api.patch(`/expenses/${editing.id}`, payload);
      } else {
        await api.post('/expenses', payload);
      }
      setShowModal(false);
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    } catch (err: any) {
      const data = err?.response?.data;
      let msg = data?.error?.message || 'Failed to save expense';
      const details = data?.error?.details;
      if (details && typeof details === 'object' && Object.keys(details).length) {
        msg = Object.entries(details).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' · ');
      }
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const { data, isLoading } = useQuery({
    queryKey: ['expenses', { search, category, fromDate, toDate }],
    queryFn: async () => {
      const res = await api.get('/expenses', { params: { search: search || undefined, category: category || undefined, dateFrom: fromDate || undefined, dateTo: toDate || undefined } });
      const { items, summary, total } = res.data.data;
      const mapped = (items || []).map((e: any) => ({
        ...e,
        date: e.expenseDate || e.date,
        amount: Number(e.amount ?? 0),
        supplierName: e.supplier || '-',
        bookingNumber: e.booking?.bookingNumber || '-',
        bookingId: e.bookingId || undefined,
        paymentMethod: e.paymentMethod || undefined,
        notes: e.notes || undefined,
      }));
      return { data: mapped, summary, total };
    },
  });

  const expenses = data?.data || [];
  const summary = data?.summary;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900">{t('nav.expenses')}</h1>
        <button onClick={openCreate} className="btn-primary">
          <Plus className="w-5 h-5" />
          {t('common.add')}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">{t('common.total')} {t('dashboard.expenses')}</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(summary?.total || 0)}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center">
              <Wallet className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
        {summary?.byCategory?.slice(0, 3).map((cat: any) => (
          <div key={cat.category} className="card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">{getExpenseCategoryLabel(cat.category)}</p>
                <p className="text-xl font-bold text-slate-900">{formatCurrency(cat.total)}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center">
                <TrendingDown className="w-6 h-6 text-slate-500" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative">
            <Search className="absolute top-1/2 -translate-y-1/2 start-3 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input ps-10"
              placeholder={t('common.search')}
            />
          </div>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="input">
            <option value="">{t('common.all')} — الفئة</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{getExpenseCategoryLabel(c)}</option>)}
          </select>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="input" />
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="input" />
          <div className="flex items-center text-sm text-slate-500">
            {t('common.total')}: <span className="font-semibold text-slate-700 ms-1">{data?.total ?? expenses.length}</span>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-start font-medium">{t('common.date')}</th>
                <th className="px-4 py-3 text-start font-medium">الفئة</th>
                <th className="px-4 py-3 text-start font-medium">الوصف</th>
                <th className="px-4 py-3 text-end font-medium">{t('common.amount')}</th>
                <th className="px-4 py-3 text-start font-medium">طريقة الدفع</th>
                <th className="px-4 py-3 text-start font-medium">{t('common.booking')}</th>
                <th className="px-4 py-3 text-end font-medium">{t('common.actions') || 'إجراءات'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-5 bg-slate-100 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    {t('common.noData')}
                  </td>
                </tr>
              ) : (
                expenses.map((e: Expense) => (
                  <tr key={e.id} className="table-row-hover">
                    <td className="px-4 py-3 text-slate-600">{formatDate(e.date)}</td>
                    <td className="px-4 py-3"><span className="badge-neutral">{getExpenseCategoryLabel(e.category)}</span></td>
                    <td className="px-4 py-3 text-slate-700">{e.description}</td>
                    <td className="px-4 py-3 text-end font-medium text-red-600">{formatCurrency(e.amount)}</td>
                    <td className="px-4 py-3 text-slate-600">{e.paymentMethod ? getPaymentMethodLabel(e.paymentMethod) : '—'}</td>
                    <td className="px-4 py-3 text-slate-500">{e.bookingNumber || '—'}</td>
                    <td className="px-4 py-3 text-end">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => openEdit(e)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-primary-600 hover:bg-primary-50"
                          title={t('common.edit')}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => { setDeleting(e); setActionError(''); }}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50"
                          title={t('common.delete')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{editing ? t('common.edit') : t('common.add')} {t('dashboard.expenses')}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4" key={editing ? editing.id : 'new'}>
              <div>
                <label className="label">{t('expense.category')}</label>
                <select name="category" required defaultValue={editing?.category || ''} className="input">
                  <option value="">{t('common.all')}</option>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{getExpenseCategoryLabel(c)}</option>)}
                </select>
              </div>
              <div><label className="label">{t('expense.description')}</label><input name="description" required defaultValue={editing?.description || ''} className="input" placeholder="وصف المصروف..." /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">{t('common.amount')}</label><input name="amount" type="number" step="0.01" min="0.01" required defaultValue={editing?.amount ?? ''} className="input" /></div>
                <div><label className="label">{t('common.date')}</label><input name="expenseDate" type="date" required defaultValue={editing?.date ? String(editing.date).slice(0, 10) : ''} className="input" /></div>
              </div>
              <div>
                <label className="label">{t('booking.paymentMethod')}</label>
                <select name="paymentMethod" defaultValue={editing?.paymentMethod || 'CASH'} className="input">
                  {['CASH', 'BANK_TRANSFER', 'CARD'].map((m) => <option key={m} value={m}>{getPaymentMethodLabel(m)}</option>)}
                </select>
              </div>
              <div>
                <label className="label">{t('common.booking')} (اختياري)</label>
                <select name="bookingId" defaultValue={editing?.bookingId || ''} className="input">
                  <option value="">— بدون حجز مرتبط —</option>
                  {(bookingsList || []).map((b: any) => <option key={b.id} value={b.id}>{b.label}</option>)}
                </select>
              </div>
              <div><label className="label">{t('booking.notes')}</label><textarea name="notes" rows={2} defaultValue={editing?.notes || ''} className="input" placeholder="ملاحظات إضافية..." /></div>
              {errorMsg && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{errorMsg}</div>}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">{t('common.cancel')}</button>
                <button type="submit" disabled={submitting} className="btn-primary">{submitting ? t('common.loading') : t('common.save')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => !submitting && setDeleting(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-2">{t('common.delete')} — {getExpenseCategoryLabel(deleting.category)}</h2>
            <p className="text-sm text-slate-600 mb-1">{deleting.description}</p>
            <p className="text-lg font-bold text-red-600 mb-4">{formatCurrency(deleting.amount)}</p>
            {actionError && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">{actionError}</div>}
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleting(null)} disabled={submitting} className="btn-secondary">{t('common.cancel')}</button>
              <button onClick={doDelete} disabled={submitting} className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50">
                {submitting ? t('common.loading') : (t('common.delete') || 'حذف')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
