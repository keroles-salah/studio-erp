import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Package, AlertCircle, Wrench, CalendarDays, Plus, X } from 'lucide-react';
import api from '../lib/api';
import { formatCurrency, formatDate, getEquipmentStatusColor, getEquipmentStatusLabel, getEventTypeLabel, todayLocalDate } from '../lib/utils';
import { LARGE_PAGE_SIZE } from '../lib/constants';

interface Equipment {
  id: string;
  equipmentCode: string;
  name: string;
  quantity: number;
  category: string;
  brand: string;
  status: string;
  ownershipType: string;
  location: string;
  rentalPrice: string | number | null;
  bookings?: {
    booking: {
      id: string;
      bookingNumber: string;
      status: string;
      event: { eventType: string; eventDate: string } | null;
    };
  }[];
}

interface EquipmentStats {
  total: number;
  totalUnits?: number;
  byStatus: { status: string; count: number }[];
}

const CATEGORIES = ['كاميرات', 'عدسات', 'إضاءة', 'درونات', 'سماعات', 'حوامل ثلاثية', 'ميكروفونات', 'خلاطات صوت', 'مثبتات'];
const STATUSES = ['AVAILABLE', 'RESERVED', 'IN_USE', 'MAINTENANCE', 'LOST', 'DAMAGED', 'UNAVAILABLE'];

export default function Equipment() {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [view, setView] = useState<'grid' | 'table'>('grid');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    equipmentCode: '', name: '', category: 'كاميرات', brand: '', model: '',
    serialNumber: '', ownershipType: 'OWNED', purchasePrice: '', rentalPrice: '',
    status: 'AVAILABLE', location: '', notes: '', quantity: '1',
  });
  const [submitError, setSubmitError] = useState('');
  const queryClient = useQueryClient();

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const createMutation = useMutation({
    mutationFn: async () => {
      // الكمية تُسجَّل كحقل واحد على الصنف — بدون توليد سجلات مكررة بأكواد متسلسلة
      const qty = Math.min(999, Math.max(1, parseInt(form.quantity, 10) || 1));
      const payload: Record<string, unknown> = {
        equipmentCode: form.equipmentCode.trim(),
        name: form.name.trim(),
        category: form.category,
        brand: form.brand.trim() || null,
        model: form.model.trim() || null,
        serialNumber: form.serialNumber.trim() || null,
        quantity: qty,
        ownershipType: form.ownershipType,
        purchasePrice: form.purchasePrice === '' ? null : parseFloat(form.purchasePrice),
        rentalPrice: form.rentalPrice === '' ? null : parseFloat(form.rentalPrice),
        status: form.status,
        location: form.location.trim() || null,
        notes: form.notes.trim() || null,
      };
      try {
        const res = await api.post('/equipment', payload);
        return res.data;
      } catch (err: any) {
        const msg = err?.response?.data?.message || err?.response?.data?.error || 'خطأ غير معروف';
        throw new Error(msg, { cause: err });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      queryClient.invalidateQueries({ queryKey: ['equipment-stats'] });
      setShowModal(false);
      setSubmitError('');
      setForm({
        equipmentCode: '', name: '', category: 'كاميرات', brand: '', model: '',
        serialNumber: '', ownershipType: 'OWNED', purchasePrice: '', rentalPrice: '',
        status: 'AVAILABLE', location: '', notes: '', quantity: '1',
      });
    },
    onError: (err: any) => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      queryClient.invalidateQueries({ queryKey: ['equipment-stats'] });
      setSubmitError(err?.message || err?.response?.data?.message || err?.response?.data?.error || 'حدث خطأ أثناء الحفظ');
    },
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.equipmentCode.trim() || !form.name.trim()) {
      setSubmitError('كود المعدة والاسم مطلوبان');
      return;
    }
    setSubmitError('');
    createMutation.mutate();
  };

  const { data: equipment, isLoading } = useQuery<Equipment[]>({
    queryKey: ['equipment', { search, category, status }],
    queryFn: async () => {
      const params: Record<string, string> = { limit: String(LARGE_PAGE_SIZE) };
      if (search.trim()) params.search = search.trim();
      if (category) params.category = category;
      if (status) params.status = status;
      const res = await api.get('/equipment', { params });
      return res.data.data.items || [];
    },
  });

  const { data: stats } = useQuery<EquipmentStats>({
    queryKey: ['equipment-stats'],
    queryFn: async () => {
      const res = await api.get('/equipment/stats');
      return res.data.data;
    },
  });

  const currentBooking = (e: Equipment) => e.bookings?.[0]?.booking ?? null;

  const ownershipLabel = (o: string) => (o === 'RENTED' ? 'مستأجرة' : 'مملوكة');
  const today = todayLocalDate();
  const isBookingToday = (e: Equipment) => e.bookings?.some(b => b.booking.event?.eventDate?.slice(0, 10) === today) ?? false;


  const statOf = (s: string) => stats?.byStatus.find((x) => x.status === s)?.count ?? 0;

  const sumUnits = (list: Equipment[] | undefined) =>
    (list ?? []).reduce((sum, e) => sum + Math.max(0, Number(e.quantity) || 0), 0);

  const summary = [
    { label: 'إجمالي القطع', value: stats?.totalUnits ?? sumUnits(equipment), cls: 'text-slate-900' },
    { label: 'القطع المملوكة', value: sumUnits((equipment ?? []).filter(e => e.ownershipType === 'OWNED')), cls: 'text-primary-700' },
    { label: 'القطع المستأجرة', value: sumUnits((equipment ?? []).filter(e => e.ownershipType === 'RENTED')), cls: 'text-amber-600' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900">{t('nav.equipment')}</h1>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-slate-200 overflow-hidden">
            <button onClick={() => setView('grid')} className={`px-3 py-2 text-sm font-medium ${view === 'grid' ? 'bg-primary-50 text-primary-700' : 'text-slate-500'}`}>بطاقات</button>
            <button onClick={() => setView('table')} className={`px-3 py-2 text-sm font-medium ${view === 'table' ? 'bg-primary-50 text-primary-700' : 'text-slate-500'}`}>جدول</button>
          </div>
          <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> إضافة معدة
          </button>
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {summary.map((s) => (
          <div key={s.label} className="card p-4">
            <p className={`text-2xl font-bold ${s.cls}`}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="card p-4">
        <div className="relative">
          <Search className="absolute top-1/2 -translate-y-1/2 start-3 w-5 h-5 text-slate-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} className="input ps-10" placeholder="بحث باسم المعدة أو الكود أو الموقع..." />
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="card h-40 animate-pulse" />)}
        </div>
      ) : !equipment?.length ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <AlertCircle className="w-12 h-12 mb-3 opacity-50" />
          <p>{t('common.noData')}</p>
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {equipment.map((e) => {
            const units = e.quantity ?? 1;
            return (
              <div key={e.id} className="card hover:shadow-md transition-shadow flex flex-col">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                    <Package className="w-5 h-5 text-slate-500" />
                  </div>
                  <span className="rounded-full bg-primary-50 px-2 py-0.5 text-[10px] font-bold text-primary-700">
                    عدد {units}
                  </span>
                </div>
                <h3 className="font-semibold text-slate-900 mb-1">{e.name}</h3>
                <p className="text-xs text-slate-400 mb-3 font-mono">{e.equipmentCode}</p>
                <div className="space-y-1 text-sm text-slate-500 flex-1">
                  <div className="flex justify-between"><span>سعر الإيجار:</span><span className="font-medium text-primary-700">{e.rentalPrice != null ? formatCurrency(Number(e.rentalPrice)) : '—'}</span></div>
                  <div className="flex justify-between"><span>الملكية:</span><span className="text-slate-700">{ownershipLabel(e.ownershipType)}</span></div>
                  <div className="flex justify-between"><span>الموقع:</span><span className="text-slate-700">{e.location || '—'}</span></div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-start font-medium">الكود</th>
                  <th className="px-4 py-3 text-start font-medium">الاسم</th>
                  <th className="px-4 py-3 text-center font-medium">العدد</th>
                  <th className="px-4 py-3 text-start font-medium">سعر الإيجار</th>
                  <th className="px-4 py-3 text-start font-medium">الملكية</th>
                  <th className="px-4 py-3 text-start font-medium">الموقع</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {equipment.map((e) => (
                    <tr key={e.id} className="table-row-hover">
                      <td className="px-4 py-3 font-mono text-slate-500">{e.equipmentCode}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">{e.name}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="rounded-full bg-primary-50 px-2.5 py-1 text-xs font-bold text-primary-700">
                          {e.quantity ?? 1}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-primary-700">{e.rentalPrice != null ? formatCurrency(Number(e.rentalPrice)) : '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{ownershipLabel(e.ownershipType)}</td>
                      <td className="px-4 py-3 text-slate-600">{e.location || '—'}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowModal(false)}>
          <div className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">إضافة معدة جديدة</h2>
              <button type="button" onClick={() => setShowModal(false)} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {submitError && (
              <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">{submitError}</div>
            )}

            <form onSubmit={submit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">كود المعدة *</label>
                  <input value={form.equipmentCode} onChange={(e) => set('equipmentCode', e.target.value)} className="input" placeholder="مثال: CAM-005" required />
                </div>
                <div>
                  <label className="label">الكمية المتوفرة</label>
                  <input type="number" min="1" max="999" value={form.quantity} onChange={(e) => set('quantity', e.target.value)} className="input" />
                  <p className="text-xs text-slate-400 mt-1">تُسجَّل كصنف واحد بهذه الكمية — بدون تكرار أو أكواد متسلسلة</p>
                </div>
                <div>
                  <label className="label">الاسم *</label>
                  <input value={form.name} onChange={(e) => set('name', e.target.value)} className="input" placeholder="مثال: كاميرا Sony A7 IV" required />
                </div>
                <div>
                  <label className="label">نوع الملكية</label>
                  <select value={form.ownershipType} onChange={(e) => set('ownershipType', e.target.value)} className="input">
                    <option value="OWNED">مملوكة</option>
                    <option value="RENTED">مستأجرة</option>
                  </select>
                </div>
                <div>
                  <label className="label">سعر الإيجار (ر.س)</label>
                  <input type="number" min="0" step="0.01" value={form.rentalPrice} onChange={(e) => set('rentalPrice', e.target.value)} className="input" placeholder="0.00" />
                </div>
                <div>
                  <label className="label">سعر الشراء (ر.س)</label>
                  <input type="number" min="0" step="0.01" value={form.purchasePrice} onChange={(e) => set('purchasePrice', e.target.value)} className="input" placeholder="0.00" />
                </div>
                <div>
                  <label className="label">الرقم التسلسلي (اختياري)</label>
                  <input value={form.serialNumber} onChange={(e) => set('serialNumber', e.target.value)} className="input" placeholder="S/N..." />
                </div>
                <div>
                  <label className="label">الموقع</label>
                  <input value={form.location} onChange={(e) => set('location', e.target.value)} className="input" placeholder="مثال: غرفة التخزين" />
                </div>
                <div className="sm:col-span-2">
                  <label className="label">الملاحظات</label>
                  <input value={form.notes} onChange={(e) => set('notes', e.target.value)} className="input" placeholder="أي تفاصيل إضافية..." />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">إلغاء</button>
                <button type="submit" disabled={createMutation.isPending} className="btn-primary">
                  {createMutation.isPending ? 'جارٍ الحفظ...' : 'حفظ المعدة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
