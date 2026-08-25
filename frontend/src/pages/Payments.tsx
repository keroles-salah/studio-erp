import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, ChevronLeft, ChevronRight, AlertCircle, CreditCard, Plus, X, Loader2,
} from 'lucide-react';
import api from '../lib/api';
import { formatCurrency, formatDate, getPaymentMethodLabel, todayLocalDate } from '../lib/utils';

const METHODS = ['CASH', 'BANK_TRANSFER', 'CARD'];

export default function Payments() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [method, setMethod] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [formError, setFormError] = useState('');

  // ── Form state ──
  const [invoiceId, setInvoiceId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Fetch invoices for dropdown ──
  const { data: invoicesData } = useQuery({
    queryKey: ['invoices-for-payment'],
    queryFn: async () => {
      const r = await api.get('/invoices', { params: { limit: 100 } });
      const all = r.data?.data?.items || [];
      return all.filter((inv: any) => inv.status !== 'PAID' && inv.status !== 'CANCELLED');
    },
    enabled: showModal,
  });

  const invoices = invoicesData || [];

  // ── Fetch payments ──
  const { data, isLoading } = useQuery({
    queryKey: ['payments', { page, search, method, fromDate, toDate }],
    queryFn: async () => {
      const res = await api.get('/payments', { params: { page, search, paymentMethod: method || undefined, startDate: fromDate || undefined, endDate: toDate || undefined } });
      const { items, total, page: currentPage, limit } = res.data.data;
      const mapped = (items || []).map((p: any) => ({
        ...p,
        date: p.paymentDate,
        customerName: p.customer?.fullName || '-',
        invoiceNumber: p.invoice?.invoiceNumber || '-',
        invoiceId: p.invoice?.id || null,
        method: p.paymentMethod,
        reference: p.referenceNumber || '-',
      }));
      return { data: mapped, total, page: currentPage, totalPages: Math.ceil(total / limit) };
    },
  });

  const payments = data?.data || [];
  const totalPages = data?.totalPages || 1;

  // ── Selected invoice info ──
  const selectedInvoice = invoices.find((inv: any) => inv.id === invoiceId);

  // ── Create payment mutation ──
  const createMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        invoiceId,
        amount: Number(amount),
        paymentMethod,
        paymentDate: paymentDate || todayLocalDate(),
      };
      if (referenceNumber.trim()) payload.referenceNumber = referenceNumber.trim();
      if (notes.trim()) payload.notes = notes.trim();
      return api.post('/payments', payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payments'] });
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['reports'] });
      setShowModal(false);
      resetForm();
    },
    onError: (err: any) => {
      setFormError(err?.response?.data?.error?.message || err?.response?.data?.message || err?.message || t('common.error'));
    },
    onSettled: () => setIsSubmitting(false),
  });

  function resetForm() {
    setInvoiceId(''); setAmount(''); setPaymentMethod('');
    setPaymentDate(''); setReferenceNumber(''); setNotes(''); setFormError('');
  }

  function handleSubmit() {
    if (!invoiceId) { setFormError('يجب اختيار الفاتورة'); return; }
    if (!amount || Number(amount) <= 0) { setFormError('يجب إدخال مبلغ صحيح'); return; }
    if (!paymentMethod) { setFormError('يجب اختيار طريقة الدفع'); return; }
    setIsSubmitting(true);
    createMutation.mutate();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900">{t('nav.payments')}</h1>
        <button onClick={() => { resetForm(); setShowModal(true); }} className="btn-primary">
          <Plus className="w-5 h-5" />
          {t('common.add')}
        </button>
      </div>

      {/* ── Create Payment Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto m-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">تسجيل دفعة جديدة</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              {formError && <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">{formError}</div>}

              {/* Invoice select */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">الفاتورة *</label>
                <select value={invoiceId} onChange={e => setInvoiceId(e.target.value)} className="input">
                  <option value="">اختر فاتورة...</option>
                  {invoices.map((inv: any) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoiceNumber} — {inv.customer?.fullName || '-'} — متبقي: {formatCurrency(Number(inv.remainingAmount || 0))}
                    </option>
                  ))}
                </select>
              </div>

              {/* Selected invoice summary */}
              {selectedInvoice && (
                <div className="bg-slate-50 rounded-lg p-3 text-sm space-y-1">
                  <div className="flex justify-between"><span className="text-slate-500">الإجمالي:</span><span className="font-medium">{formatCurrency(selectedInvoice.total)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">المدفوع:</span><span className="font-medium text-emerald-600">{formatCurrency(selectedInvoice.paidAmount)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">المتبقي:</span><span className="font-medium text-red-600">{formatCurrency(selectedInvoice.remainingAmount)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">الحالة:</span><span className="badge-neutral">{selectedInvoice.status}</span></div>
                </div>
              )}

              {/* Amount */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">المبلغ *</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className="input"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                  />
                  {selectedInvoice && amount && (
                    <p className="text-xs text-slate-400 mt-1">
                      المتبقي بعد الدفعة: {formatCurrency(Math.max(0, Number(selectedInvoice.remainingAmount || 0) - Number(amount || 0)))}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">طريقة الدفع *</label>
                  <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="input">
                    <option value="">اختر...</option>
                    {METHODS.map(m => <option key={m} value={m}>{getPaymentMethodLabel(m)}</option>)}
                  </select>
                </div>
              </div>

              {/* Date + Reference */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">تاريخ الدفع</label>
                  <input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} className="input" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">رقم المرجع</label>
                  <input type="text" value={referenceNumber} onChange={e => setReferenceNumber(e.target.value)} className="input" placeholder="اختياري" />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">ملاحظات</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} className="input" rows={2} />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-5 border-t border-slate-100">
              <button onClick={() => setShowModal(false)} className="btn-secondary">{t('common.cancel')}</button>
              <button onClick={handleSubmit} disabled={isSubmitting} className="btn-primary">
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin inline" /> : null}
                {isSubmitting ? t('common.loading') : 'تسجيل الدفعة'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Filters ── */}
      <div className="card p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative">
            <Search className="absolute top-1/2 -translate-y-1/2 start-3 w-5 h-5 text-slate-400" />
            <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="input ps-10" placeholder={t('common.search')} />
          </div>
          <select value={method} onChange={(e) => { setMethod(e.target.value); setPage(1); }} className="input">
            <option value="">{t('common.all')} — الطريقة</option>
            {METHODS.map((m) => <option key={m} value={m}>{getPaymentMethodLabel(m)}</option>)}
          </select>
          <input type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setPage(1); }} className="input" />
          <input type="date" value={toDate} onChange={(e) => { setToDate(e.target.value); setPage(1); }} className="input" />
          <div className="flex items-center text-sm text-slate-500">
            {t('common.total')}: <span className="font-semibold text-slate-700 ms-1">{data?.total || 0}</span>
          </div>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-start font-medium">{t('common.date')}</th>
                <th className="px-4 py-3 text-start font-medium">{t('common.customer')}</th>
                <th className="px-4 py-3 text-start font-medium">{t('common.invoice')}</th>
                <th className="px-4 py-3 text-end font-medium">{t('common.amount')}</th>
                <th className="px-4 py-3 text-start font-medium">الطريقة</th>
                <th className="px-4 py-3 text-start font-medium">المرجع</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 6 }).map((_, j) => (<td key={j} className="px-4 py-3"><div className="h-5 bg-slate-100 rounded animate-pulse" /></td>))}</tr>
                ))
              ) : payments.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-400"><AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />{t('common.noData')}</td></tr>
              ) : (
                payments.map((p: any) => (
                  <tr key={p.id} className="table-row-hover">
                    <td className="px-4 py-3 text-slate-600">{formatDate(p.date)}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{p.customerName}</td>
                    <td className="px-4 py-3">
                      {p.invoiceId ? (<Link to={`/invoices/${p.invoiceId}`} className="text-primary-600 hover:underline">{p.invoiceNumber}</Link>) : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-end font-semibold text-emerald-600">{formatCurrency(p.amount)}</td>
                    <td className="px-4 py-3"><span className="badge-neutral">{getPaymentMethodLabel(p.method)}</span></td>
                    <td className="px-4 py-3 text-slate-500 font-mono text-xs">{p.reference}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <p className="text-sm text-slate-500">{t('common.total')}: {data?.total || 0}</p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="btn-secondary p-1.5"><ChevronRight className="w-4 h-4 rtl:rotate-180" /></button>
              <span className="text-sm text-slate-600 px-2">{page} / {totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="btn-secondary p-1.5"><ChevronLeft className="w-4 h-4 rtl:rotate-180" /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
