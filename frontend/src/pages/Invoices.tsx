import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Search, Eye, ChevronLeft, ChevronRight, AlertCircle, FileText, X, Plus, Trash2, UserPlus,
} from 'lucide-react';
import api from '../lib/api';
import { formatCurrency, formatDate, getEquipmentStatusLabel, getInvoiceItemTypeLabel, getInvoiceStatusColor, getInvoiceStatusLabel, todayLocalDate } from '../lib/utils';
import { LARGE_PAGE_SIZE } from '../lib/constants';

interface Invoice {
  id: string;
  invoiceNumber: string;
  customerName: string;
  date: string;
  dueDate: string;
  total: number;
  paid: number;
  status: string;
}

interface PaginatedResponse {
  data: Invoice[];
  total: number;
  page: number;
  totalPages: number;
}

interface CustomerOption {
  id: string;
  fullName: string;
}

interface BookingOption {
  id: string;
  bookingNumber: string;
  customer: { fullName: string } | null;
}

interface InvoiceRow {
  description: string;
  itemType: string;
  referenceId: string;
  quantity: number;
  unitPrice: number;
  discount: number;
}

interface EquipmentOption {
  id: string;
  equipmentCode: string;
  name: string;
  status: string;
  rentalPrice: string | number | null;
}

const STATUSES = ['DRAFT', 'SENT', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED'];
const ITEM_TYPES = ['EQUIPMENT', 'RENTAL', 'ADDITIONAL_CHARGE', 'DISCOUNT'];

// ─── Map real backend shape to the list interface ──────────────
function mapInvoiceList(raw: any): Invoice {
  return {
    id: raw.id,
    invoiceNumber: raw.invoiceNumber,
    customerName: raw.customer?.fullName ?? '—',
    date: raw.invoiceDate,
    dueDate: raw.dueDate,
    total: Number(raw.total ?? 0),
    paid: Number(raw.paidAmount ?? 0),
    status: raw.status,
  };
}

const emptyRow = (): InvoiceRow => ({
  description: '',
  itemType: 'EQUIPMENT',
  referenceId: '',
  quantity: 1,
  unitPrice: 0,
  discount: 0,
});

export default function Invoices() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  // ─── Create modal state ───
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [bookingId, setBookingId] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(todayLocalDate());
  const [dueDate, setDueDate] = useState('');
  const [invoiceDiscount, setInvoiceDiscount] = useState(0);
  const [taxRate, setTaxRate] = useState(0);
  const { data: settings } = useQuery<Record<string, any>>({
    queryKey: ['settings-tax'],
    queryFn: async () => {
      const res = await api.get('/settings/studio');
      return res.data.data || {};
    },
  });
  useEffect(() => {
    const enabled = settings?.finance?.['studio.tax_enabled'] === 'true';
    const r = Number(settings?.finance?.['studio.tax_rate']);
    if (!enabled) {
      setTaxRate(0);
    } else if (Number.isFinite(r) && r >= 0) {
      setTaxRate(r);
    } else {
      setTaxRate(0);
    }
  }, [settings]);
  const [notes, setNotes] = useState('');
  const [rows, setRows] = useState<InvoiceRow[]>([emptyRow()]);

  // quick customer creation inside invoice modal
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [custError, setCustError] = useState('');
  const [newCust, setNewCust] = useState({
    fullName: '', phone: '', whatsapp: '', email: '', city: '', address: '', notes: '',
  });
  const setCust = (k: string, v: string) => setNewCust((f) => ({ ...f, [k]: v }));

  const createCustomer = useMutation({
    mutationFn: async () => {
      const res = await api.post('/customers', {
        fullName: newCust.fullName.trim(),
        phone: newCust.phone.trim() || null,
        whatsapp: newCust.whatsapp.trim() || null,
        email: newCust.email.trim() || null,
        city: newCust.city.trim() || null,
        address: newCust.address.trim() || null,
        notes: newCust.notes.trim() || null,
        source: 'WALK_IN',
        customerStatus: 'ACTIVE',
      });
      return res.data.data as CustomerOption;
    },
    onSuccess: (cust) => {
      queryClient.invalidateQueries({ queryKey: ['customers-options'] });
      setCustomerId(cust.id);
      setShowNewCustomer(false);
      setCustError('');
      setNewCust({ fullName: '', phone: '', whatsapp: '', email: '', city: '', address: '', notes: '' });
    },
    onError: (err: any) => {
      setCustError(err?.response?.data?.message || err?.response?.data?.error || 'حدث خطأ أثناء حفظ العميل');
    },
  });

  const submitNewCustomer = () => {
    if (!newCust.fullName.trim()) {
      setCustError('اسم العميل مطلوب');
      return;
    }
    setCustError('');
    createCustomer.mutate();
  };

  const { data, isLoading } = useQuery({
    queryKey: ['invoices', { page, search, status }],
    queryFn: async () => {
      const params: Record<string, string | number> = { page };
      if (search.trim()) params.search = search.trim();
      if (status) params.status = status;
      const res = await api.get('/invoices', { params });
      const { items, total, page: currentPage, limit } = res.data.data;
      return {
        data: items.map(mapInvoiceList),
        total,
        page: currentPage,
        totalPages: Math.ceil(total / limit),
      } as PaginatedResponse;
    },
  });

  // Customers + bookings for the modal selects
  const { data: customers } = useQuery({
    queryKey: ['customers-options'],
    queryFn: async () => {
      const res = await api.get('/customers', { params: { limit: LARGE_PAGE_SIZE } });
      return res.data.data.items as CustomerOption[];
    },
  });

  const { data: bookings } = useQuery({
    queryKey: ['bookings-options'],
    queryFn: async () => {
      const res = await api.get('/bookings', { params: { limit: LARGE_PAGE_SIZE } });
      return res.data.data.items as BookingOption[];
    },
  });

  const { data: equipmentOptions } = useQuery({
    queryKey: ['equipment-options'],
    queryFn: async () => {
      const res = await api.get('/equipment', { params: { limit: LARGE_PAGE_SIZE } });
      return res.data.data.items as EquipmentOption[];
    },
  });

  const invoices = data?.data || [];
  const totalPages = data?.totalPages || 1;

  // ─── Computed totals ───
  const subtotal = rows.reduce(
    (sum, r) => sum + Math.max(0, (r.quantity || 0) * (r.unitPrice || 0) - (r.discount || 0)),
    0,
  );
  const disc = Math.min(invoiceDiscount || 0, subtotal);
  const taxAmount = subtotal > 0 ? Math.round(((subtotal - disc) * (taxRate || 0)) / 100 * 100) / 100 : 0;
  const grandTotal = Math.round((subtotal - disc + taxAmount) * 100) / 100;

  const updateRow = (i: number, patch: Partial<InvoiceRow>) => {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  };

  const selectEquipment = (i: number, eqId: string) => {
    const eq = (equipmentOptions ?? []).find((x) => x.id === eqId);
    updateRow(i, {
      referenceId: eqId,
      description: eq ? eq.name : '',
      unitPrice: eq && eq.rentalPrice != null ? Number(eq.rentalPrice) : 0,
    });
  };

  // ─── Submit create ───
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const validRows = rows.filter((r) => r.description.trim());
    if (!customerId) {
      setErrorMsg('اختر العميل أولاً');
      return;
    }
    if (validRows.length === 0) {
      setErrorMsg('أضف على الأقل بند واحد بالوصف');
      return;
    }
    setSaving(true);
    try {
      await api.post('/invoices', {
        customerId,
        bookingId: bookingId || null,
        invoiceDate: new Date(invoiceDate).toISOString(),
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        discount: disc,
        notes: notes.trim() || null,
        items: validRows.map((r) => ({
          description: r.description.trim(),
          itemType: r.itemType,
          referenceId: r.referenceId || null,
          quantity: r.quantity || 1,
          unitPrice: r.unitPrice || 0,
          discount: r.discount || 0,
          total: Math.max(0, (r.quantity || 0) * (r.unitPrice || 0) - (r.discount || 0)),
        })),
      });
      setShowModal(false);
      setRows([emptyRow()]);
      setCustomerId('');
      setBookingId('');
      setInvoiceDiscount(0);
      setDueDate('');
      setNotes('');
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.error?.message || 'حصل خطأ أثناء إنشاء الفاتورة');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900">{t('nav.invoices')}</h1>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <FileText className="w-5 h-5" />
          {t('common.create')}
        </button>
      </div>

      <div className="card p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="input">
            <option value="">{t('common.all')} — {t('common.status')}</option>
            {STATUSES.map((s) => <option key={s} value={s}>{getInvoiceStatusLabel(s)}</option>)}
          </select>
          <div className="flex items-center text-sm text-slate-500">
            {t('common.total')}: <span className="font-semibold text-slate-700 ms-1">{data?.total || 0}</span>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-start font-medium">{t('invoice.number')}</th>
                <th className="px-4 py-3 text-start font-medium">{t('common.customer')}</th>
                <th className="px-4 py-3 text-start font-medium">{t('invoice.date')}</th>
                <th className="px-4 py-3 text-end font-medium">{t('common.total')}</th>
                <th className="px-4 py-3 text-end font-medium">{t('common.paid')}</th>
                <th className="px-4 py-3 text-end font-medium">{t('common.remaining')}</th>
                <th className="px-4 py-3 text-start font-medium">{t('common.status')}</th>
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
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    {t('common.noData')}
                  </td>
                </tr>
              ) : (
                invoices.map((inv: Invoice) => (
                  <tr key={inv.id} className="table-row-hover">
                    <td className="px-4 py-3">
                      <Link to={`/invoices/${inv.id}`} className="font-medium text-primary-600 hover:underline">
                        {inv.invoiceNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{inv.customerName}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(inv.date)}</td>
                    <td className="px-4 py-3 text-end font-medium">{formatCurrency(inv.total)}</td>
                    <td className="px-4 py-3 text-end text-emerald-600">{formatCurrency(inv.paid)}</td>
                    <td className="px-4 py-3 text-end text-red-600">{formatCurrency(Math.max(0, inv.total - inv.paid))}</td>
                    <td className="px-4 py-3"><span className={getInvoiceStatusColor(inv.status)}>{getInvoiceStatusLabel(inv.status)}</span></td>
                    <td className="px-4 py-3 text-center">
                      <Link to={`/invoices/${inv.id}`} className="btn-ghost p-1.5 inline-flex">
                        <Eye className="w-4 h-4" />
                      </Link>
                    </td>
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
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="btn-secondary p-1.5">
                <ChevronRight className="w-4 h-4 rtl:rotate-180" />
              </button>
              <span className="text-sm text-slate-600 px-2">{page} / {totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="btn-secondary p-1.5">
                <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─── Create Invoice Modal ─── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-900">إنشاء فاتورة جديدة</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-5">
              {/* Customer + Booking */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label">العميل *</label>
                  <div className="flex gap-2">
                    <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="input" required>
                      <option value="">— اختر العميل —</option>
                      {(customers ?? []).map((c) => (
                        <option key={c.id} value={c.id}>{c.fullName}</option>
                      ))}
                    </select>
                    <button type="button" onClick={() => { setShowNewCustomer((v) => !v); setCustError(''); }} className="btn-secondary flex items-center gap-1 whitespace-nowrap px-3">
                      <UserPlus className="w-4 h-4" /> {showNewCustomer ? 'إلغاء' : 'عميل جديد'}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="label">الحجز (اختياري)</label>
                  <select
                    value={bookingId}
                    onChange={(e) => {
                      const bid = e.target.value;
                      setBookingId(bid);
                      if (bid) {
                        const bk = (bookings ?? []).find((b) => b.id === bid);
                        if (bk?.customer) setCustomerId(bk.customer ? (customers ?? []).find((c) => c.fullName === bk.customer!.fullName)?.id ?? customerId : customerId);
                      }
                    }}
                    className="input"
                  >
                    <option value="">— بدون حجز —</option>
                    {(bookings ?? []).map((b) => (
                      <option key={b.id} value={b.id}>{b.bookingNumber} — {b.customer?.fullName ?? ''}</option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="label">تاريخ الفاتورة</label>
                  <input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} className="input" />
                </div>
              </div>

              {showNewCustomer && (
                <div className="rounded-xl border border-primary-200 bg-primary-50/40 p-4 space-y-3">
                  <p className="text-sm font-semibold text-slate-700">إضافة عميل جديد — سيتم حفظه تلقائياً في قاعدة البيانات</p>
                  {custError && (
                    <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">{custError}</div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="label">الاسم *</label>
                      <input value={newCust.fullName} onChange={(e) => setCust('fullName', e.target.value)} className="input" placeholder="مثال: أحمد محمد" />
                    </div>
                    <div>
                      <label className="label">الهاتف</label>
                      <input value={newCust.phone} onChange={(e) => setCust('phone', e.target.value)} className="input" placeholder="05xxxxxxxx" />
                    </div>
                    <div>
                      <label className="label">واتساب</label>
                      <input value={newCust.whatsapp} onChange={(e) => setCust('whatsapp', e.target.value)} className="input" placeholder="05xxxxxxxx" />
                    </div>
                    <div>
                      <label className="label">البريد الإلكتروني</label>
                      <input type="email" value={newCust.email} onChange={(e) => setCust('email', e.target.value)} className="input" placeholder="example@email.com" />
                    </div>
                    <div>
                      <label className="label">المدينة</label>
                      <input value={newCust.city} onChange={(e) => setCust('city', e.target.value)} className="input" placeholder="مثال: الرياض" />
                    </div>
                    <div>
                      <label className="label">العنوان</label>
                      <input value={newCust.address} onChange={(e) => setCust('address', e.target.value)} className="input" placeholder="مثال: حي العليا" />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="label">ملاحظات</label>
                      <input value={newCust.notes} onChange={(e) => setCust('notes', e.target.value)} className="input" />
                    </div>
                    <div className="sm:col-span-2 flex justify-end gap-2">
                      <button type="button" onClick={() => setShowNewCustomer(false)} className="btn-secondary">إلغاء</button>
                      <button type="button" onClick={submitNewCustomer} disabled={createCustomer.isPending} className="btn-primary">
                        {createCustomer.isPending ? 'جارٍ الحفظ...' : 'حفظ العميل'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="label mb-0 font-bold">بنود الفاتورة *</label>
                  <button
                    type="button"
                    onClick={() => setRows((prev) => [...prev, emptyRow()])}
                    className="btn-secondary text-xs px-2.5 py-1"
                  >
                    <Plus className="w-3.5 h-3.5 inline me-1" />
                    إضافة بند
                  </button>
                </div>
                <div className="space-y-2">
                  {rows.map((row, i) => {
                    const rowTotal = Math.max(0, (row.quantity || 0) * (row.unitPrice || 0) - (row.discount || 0));
                    return (
                      <div key={i} className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/50 p-2.5">
                        <div className="flex-1 min-w-[200px]">
                          <input
                            value={row.description}
                            onChange={(e) => updateRow(i, { description: e.target.value })}
                            placeholder="وصف البند (مثال: جلسة تصوير / تأجير كاميرا...)"
                            className="input text-sm w-full bg-white"
                            required
                          />
                        </div>
                        <div className="w-20">
                          <input
                            type="number"
                            min="1"
                            value={row.quantity}
                            onChange={(e) => updateRow(i, { quantity: Number(e.target.value) })}
                            className="input text-sm text-center bg-white"
                            placeholder="الكمية"
                            title="الكمية"
                          />
                        </div>
                        <div className="w-28">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={row.unitPrice}
                            onChange={(e) => updateRow(i, { unitPrice: Number(e.target.value) })}
                            className="input text-sm bg-white"
                            placeholder="السعر"
                            title="سعر الوحدة"
                          />
                        </div>
                        <div className="w-24">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={row.discount}
                            onChange={(e) => updateRow(i, { discount: Number(e.target.value) })}
                            className="input text-sm bg-white"
                            placeholder="خصم"
                            title="الخصم على البند"
                          />
                        </div>
                        <div className="w-24 text-end font-bold text-sm text-slate-800 px-1 whitespace-nowrap">
                          {formatCurrency(rowTotal)}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (rows.length > 1) {
                              setRows((prev) => prev.filter((_, idx) => idx !== i));
                            } else {
                              setRows([emptyRow()]);
                            }
                          }}
                          className="text-slate-400 hover:text-red-600 p-1.5 rounded-lg transition"
                          title="حذف البند"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Discount + Tax */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="label">خصم الفاتورة</label>
                  <input type="number" min="0" step="0.01" value={invoiceDiscount} onChange={(e) => setInvoiceDiscount(Number(e.target.value))} className="input" />
                </div>
                <div>
                  <label className="label">نسبة الضريبة (%)</label>
                  <input type="number" min="0" max="100" step="0.5" value={taxRate} onChange={(e) => setTaxRate(Number(e.target.value))} className="input" />
                </div>
                <div>
                  <label className="label">ملاحظات</label>
                  <input value={notes} onChange={(e) => setNotes(e.target.value)} className="input" placeholder="اختياري" />
                </div>
              </div>

              {/* Summary */}
              <div className="rounded-xl bg-primary-50/50 p-4 space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">المجموع الفرعي</span><span className="font-semibold">{formatCurrency(Math.round(subtotal * 100) / 100)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">الخصم</span><span className="font-semibold text-emerald-600">- {formatCurrency(disc)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">الضريبة ({taxRate}%)</span><span className="font-semibold">{formatCurrency(taxAmount)}</span></div>
                <div className="flex justify-between border-t border-slate-200 pt-1.5 text-base"><span className="font-bold text-slate-900">الإجمالي</span><span className="font-bold text-primary-700">{formatCurrency(grandTotal)}</span></div>
              </div>

              {errorMsg && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">{errorMsg}</div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">{t('common.cancel')}</button>
                <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">
                  {saving ? 'جاري الإنشاء...' : t('common.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
