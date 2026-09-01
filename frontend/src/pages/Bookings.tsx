import { useState, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, Plus, Eye, ChevronLeft, ChevronRight, AlertCircle, X, MinusCircle,
  Calendar, CheckCircle2, PlayCircle, XCircle, AlertTriangle, Filter,
} from 'lucide-react';
import api from '../lib/api';
import {
  formatCurrency,
  formatDate,
  getBookingStatusColor,
  getBookingStatusLabel,
  getEventTypeLabel,
  getPaymentMethodLabel,
  getEquipmentStatusLabel,
  todayLocalDate,
} from '../lib/utils';
import {
  TOAST_DURATION_MS,
  DEFAULT_PAGE_SIZE,
  DROPDOWN_PAGE_SIZE,
  ONE_WEEK_MS,
} from '../lib/constants';

interface Booking {
  id: string;
  bookingNumber: string;
  customerName: string;
  eventDate: string;
  status: string;
  total: number;
  paid: number;
}

interface EquipmentItem { equipmentId: string; quantity: number; unitPrice: number; rentalCost: number; notes: string; }

const EVENT_TYPES = ['WEDDING', 'ENGAGEMENT', 'PARTY', 'CORPORATE_EVENT', 'STUDIO_SESSION', 'OTHER'];

export default function Bookings() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [activePill, setActivePill] = useState<'ALL' | 'TODAY' | 'THIS_WEEK' | 'UNPAID' | 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED'>('ALL');
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [formError, setFormError] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [equipmentList, setEquipmentList] = useState<any[]>([]);

  const [customerId, setCustomerId] = useState('');
  const [eventType, setEventType] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [venueName, setVenueName] = useState('');
  const [depositPaid, setDepositPaid] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [notes, setNotes] = useState('');
  const [equipment, setEquipment] = useState<EquipmentItem[]>([]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), TOAST_DURATION_MS);
  };

  // Payment methods come from settings (enabled only), with a safe fallback
  const { data: paymentMethodsData } = useQuery({
    queryKey: ['payment-methods'],
    queryFn: async () => {
      const res = await api.get('/settings/payment-methods');
      return (res.data?.data || []).filter((m: any) => m.enabled);
    },
  });
  const PAYMENT_METHODS: string[] =
    (paymentMethodsData || []).length > 0
      ? (paymentMethodsData as any[]).map((m: any) => m.value)
      : ['CASH', 'BANK_TRANSFER', 'MADA', 'STC_PAY', 'APPLE_PAY', 'ONLINE_PAYMENT', 'OTHER'];

  const totals = useMemo(() => {
    const subtotal = equipment.reduce((sum, e) => sum + Math.max(0, (Number(e.quantity) || 0) * (Number(e.unitPrice) || 0)), 0);
    const r2 = (n: number) => Math.round(n * 100) / 100;
    return { subtotal: r2(subtotal), discount: 0, tax: 0, total: r2(subtotal) };
  }, [equipment]);

  // Check if a piece of equipment is booked on a specific calendar date (YYYY-MM-DD)
  const getGearDateStatus = (gear: any, targetDate: string) => {
    if (!gear) return { status: 'UNKNOWN', label: '', isBlocked: false };
    
    // 1. If equipment is broken or under maintenance
    if (['MAINTENANCE', 'DAMAGED', 'LOST', 'UNAVAILABLE'].includes(gear.status)) {
      return {
        status: gear.status,
        label: `❌ في الصيانة (${getEquipmentStatusLabel(gear.status)})`,
        isBlocked: true,
      };
    }

    // 2. If targetDate is specified, check against its active bookings
    if (targetDate && Array.isArray(gear.bookings) && gear.bookings.length > 0) {
      const conflictingBooking = gear.bookings.find((b: any) => {
        const bEvent = b.booking?.event;
        if (!bEvent?.eventDate) return false;
        const bDateStr = new Date(bEvent.eventDate).toISOString().split('T')[0];
        return bDateStr === targetDate && b.booking?.status !== 'CANCELLED';
      });

      if (conflictingBooking) {
        return {
          status: 'BOOKED_ON_DATE',
          label: `⚠️ محجوزة في هذا اليوم (${conflictingBooking.booking?.bookingNumber})`,
          bookingNumber: conflictingBooking.booking?.bookingNumber,
          isBlocked: true,
        };
      }

      return {
        status: 'AVAILABLE_ON_DATE',
        label: `✔️ متاحة في هذا التاريخ`,
        isBlocked: false,
      };
    }

    return {
      status: 'AVAILABLE',
      label: '✔️ جاهزة للحجز',
      isBlocked: false,
    };
  };

  // Live Equipment Conflicts for the selected eventDate
  const equipmentConflicts = useMemo(() => {
    const conflicts: string[] = [];
    equipment.forEach(eq => {
      if (!eq.equipmentId) return;
      const found = equipmentList.find(x => x.id === eq.equipmentId);
      if (!found) return;
      const dateStatus = getGearDateStatus(found, eventDate);
      if (dateStatus.isBlocked) {
        conflicts.push(`المعدة "${found.name} (${found.equipmentCode})": ${dateStatus.label}`);
      }
    });
    return conflicts;
  }, [equipment, equipmentList, eventDate]);

  const { data, isLoading } = useQuery({
    queryKey: ['bookings', { page, search, status, fromDate, toDate }],
    queryFn: async () => {
      const res = await api.get('/bookings', { params: { page, search, status, eventDateFrom: fromDate || undefined, eventDateTo: toDate || undefined } });
      const { items, pagination } = res.data.data;
      const mapped = (items as any[]).map((b) => ({ ...b, total: Number(b.total ?? 0), paid: Number(b.paidAmount ?? 0), customerName: b.customer?.fullName || "-", eventDate: b.event?.eventDate || null, eventType: b.event?.eventType || null }));
      const total = pagination?.total ?? 0;
      const cp = pagination?.page ?? 1;
      const limit = pagination?.limit ?? DEFAULT_PAGE_SIZE;
      return { data: mapped, total, page: cp, totalPages: Math.ceil(total / limit) };
    },
  });

  const modalOpenRef = useRef(false);
  useEffect(() => { modalOpenRef.current = showModal; }, [showModal]);
  useEffect(() => {
    if (!showModal) return;
    const load = async () => { 
      try { const r = await api.get('/customers', { params: { limit: DROPDOWN_PAGE_SIZE } }); setCustomers(r.data.data.items || []); } catch {}
      try { const r = await api.get('/equipment', { params: { limit: DROPDOWN_PAGE_SIZE } }); if (modalOpenRef.current) setEquipmentList(r.data.data.items || []); } catch {}
    };
    load();
  }, [showModal]);

  const createMutation = useMutation({
    mutationFn: async () => {
      return api.post('/bookings', {
        customerId,
        event: {
          eventType,
          eventDate,
          venueName: venueName.trim() || null,
          startTime: null,
          endTime: null,
          venueAddress: null,
          city: null,
        },
        services: [],
        equipment: equipment.filter(e => e.equipmentId),
        depositRequired: totals.total,
        depositPaid: Number(depositPaid) || 0,
        discount: 0,
        notes: notes.trim() || null,
        ...(paymentMethod ? { depositPaymentMethod: paymentMethod } : {}),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bookings'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      setShowModal(false);
      resetForm();
      setFormError('');
      showToast('تم إنشاء الحجز بنجاح');
    },
    onError: (err: any) => {
      const data = err?.response?.data;
      let msg = data?.error?.message || err?.message || 'حدث خطأ';
      const details = data?.error?.details;
      if (Array.isArray(details) && details.length > 0) {
        msg = details.join(' | ');
      }
      setFormError(msg);
    },
  });

  // Quick Status Update Mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, newStatus }: { id: string; newStatus: string }) => {
      if (newStatus === 'CANCELLED') {
        return api.post(`/bookings/${id}/cancel`, { cancellationReason: 'تم الإلغاء عبر الإجراءات السريعة' });
      }
      return api.patch(`/bookings/${id}`, { status: newStatus });
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['bookings'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      showToast(`تم تغيير حالة الحجز إلى: ${getBookingStatusLabel(vars.newStatus)}`);
    },
    onError: (err: any) => {
      showToast(err?.response?.data?.error?.message || 'تعذر تحديث حالة الحجز');
    },
  });

  const bookings = data?.data || [];
  const totalPages = data?.totalPages || 1;

  function resetForm() { setCustomerId(''); setEventType(''); setEventDate(''); setVenueName(''); setDepositPaid('0'); setPaymentMethod(''); setNotes(''); setEquipment([]); }
  function openModal() { resetForm(); setFormError(''); setShowModal(true); }
  function handleSubmit() {
    if (!customerId) { setFormError('يجب اختيار العميل'); return; }
    if (!eventType) { setFormError('يجب اختيار نوع الفعالية'); return; }
    if (!eventDate) { setFormError('يجب تحديد تاريخ الفعالية'); return; }
    if (eventDate < todayLocalDate()) { setFormError('تاريخ الفعالية لا يمكن أن يكون في الماضي'); return; }
    if (Number(depositPaid) > totals.total) { setFormError('العربون المدفوع لا يمكن أن يتجاوز الإجمالي'); return; }
    setIsSubmitting(true);
    createMutation.mutate(undefined, { onSettled: () => setIsSubmitting(false) });
  }

  // Quick Filter Pill Click
  const handlePillClick = (pill: 'ALL' | 'TODAY' | 'THIS_WEEK' | 'UNPAID' | 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED') => {
    setActivePill(pill);
    setPage(1);
    const today = new Date().toISOString().split('T')[0];

    if (pill === 'ALL') {
      setStatus('');
      setFromDate('');
      setToDate('');
    } else if (pill === 'TODAY') {
      setStatus('');
      setFromDate(today);
      setToDate(today);
    } else if (pill === 'THIS_WEEK') {
      const now = new Date();
      const nextWeek = new Date(now.getTime() + ONE_WEEK_MS).toISOString().split('T')[0];
      setStatus('');
      setFromDate(today);
      setToDate(nextWeek);
    } else if (pill === 'UNPAID') {
      setStatus('');
      setFromDate('');
      setToDate('');
    } else {
      setStatus(pill);
      setFromDate('');
      setToDate('');
    }
  };

  return (
    <div className="space-y-6 relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 end-5 z-50 flex items-center gap-2 rounded-xl border border-primary-200 bg-primary-50 px-4 py-3 text-sm font-bold text-primary-900 shadow-xl animate-in slide-in-from-top-4">
          <CheckCircle2 className="h-4 w-4 text-primary-600" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('nav.bookings')}</h1>
          <p className="text-xs text-slate-500 mt-1">إدارة مواعيد التصوير والفعاليات والتحكم بحالات الحجز</p>
        </div>
        <button onClick={openModal} className="btn-primary"><Plus className="w-5 h-5" />{t('booking.create')}</button>
      </div>

      {/* Quick Filter Pills */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1 text-xs font-bold text-slate-400 me-1">
          <Filter className="h-3.5 w-3.5" />
          <span>تصفية سريعة:</span>
        </span>
        {[
          { key: 'ALL', label: 'الكل' },
          { key: 'TODAY', label: 'حجوزات اليوم' },
          { key: 'THIS_WEEK', label: 'هذا الأسبوع' },
        ].map((pill) => (
          <button
            key={pill.key}
            type="button"
            onClick={() => handlePillClick(pill.key as any)}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
              activePill === pill.key
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {pill.label}
          </button>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto m-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">{t('booking.create')}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              {formError && <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">{formError}</div>}
              
              {/* Equipment Conflict Warnings Banner */}
              {equipmentConflicts.length > 0 && (
                <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 space-y-1 text-xs text-amber-900">
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <span>تنبيه توفر المعدات:</span>
                  </div>
                  <ul className="list-disc list-inside ps-2 space-y-0.5">
                    {equipmentConflicts.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-slate-700 mb-1">{t('booking.selectCustomer')} *</label>
                  <select value={customerId} onChange={e => setCustomerId(e.target.value)} className="input">
                    <option value="">{t('booking.selectCustomer')}</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.fullName}</option>)}
                  </select>
                </div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">{t('booking.eventType')} *</label>
                  <select value={eventType} onChange={e => setEventType(e.target.value)} className="input">
                    <option value="">--</option>
                    {EVENT_TYPES.map(et => <option key={et} value={et}>{getEventTypeLabel(et)}</option>)}
                  </select>
                </div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">{t('booking.eventDate')} *</label>
                  <input type="date" value={eventDate} min={todayLocalDate()} onChange={e => setEventDate(e.target.value)} className="input" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">مكان الفعالية / القاعة</label>
                  <input type="text" value={venueName} onChange={e => setVenueName(e.target.value)} className="input" placeholder="مثال: فندق الفورسيزونز - قاعة اللؤلؤة" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">{t('booking.paymentMethod')}</label>
                  <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="input">
                    <option value="">--</option>
                    {PAYMENT_METHODS.map(pm => <option key={pm} value={pm}>{getPaymentMethodLabel(pm)}</option>)}
                  </select>
                </div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">العربون (المدفوع)</label>
                  <input type="number" value={depositPaid} onChange={e => setDepositPaid(e.target.value)} className="input font-mono font-bold" min="0" placeholder="0.00" /></div>
              </div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">{t('booking.notes')}</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} className="input" rows={2} placeholder="ملاحظات إضافية على الحجز..." /></div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-slate-700">{t('booking.equipment')}</label>
                  <button type="button" onClick={() => setEquipment([...equipment, { equipmentId: '', quantity: 1, unitPrice: 0, rentalCost: 0, notes: '' }])} className="btn-secondary text-xs px-2 py-1"><Plus className="w-3.5 h-3.5 inline" /> {t('booking.addEquipment')}</button>
                </div>
                {equipment.map((eq, i) => {
                  const selectedGear = equipmentList.find(x => x.id === eq.equipmentId);
                  const dateStatus = selectedGear ? getGearDateStatus(selectedGear, eventDate) : null;
                  const isConflict = dateStatus?.isBlocked;
                  const otherSelectedIds = new Set(equipment.filter((_, idx) => idx !== i).map(x => x.equipmentId).filter(Boolean));
                  return (
                    <div key={i} className={`flex flex-wrap gap-2 items-end mb-2 p-3 rounded-lg border ${isConflict ? 'bg-amber-50/50 border-amber-200' : 'bg-slate-50 border-transparent'}`}>
                      <div className="flex-1 min-w-[140px]">
                        <select
                          value={eq.equipmentId}
                          onChange={e => {
                            const chosenId = e.target.value;
                            if (chosenId && otherSelectedIds.has(chosenId)) {
                              setFormError('تم اختيار هذه المعدة بالفعل في قائمة الحجز');
                              return;
                            }
                            setFormError('');
                            const ne = [...equipment];
                            ne[i].equipmentId = chosenId;
                            const item = equipmentList.find(x => x.id === chosenId);
                            if (item) {
                              ne[i].rentalCost = Number(item.rentalPrice ?? 0);
                              ne[i].unitPrice = Number(item.rentalPrice ?? 0);
                            }
                            setEquipment(ne);
                          }}
                          className="input text-sm"
                        >
                          <option value="">{t('booking.selectEquipment')}</option>
                          {equipmentList.map(item => {
                            const isAlreadyChosen = otherSelectedIds.has(item.id);
                            const itemDateStatus = getGearDateStatus(item, eventDate);
                            return (
                              <option key={item.id} value={item.id} disabled={isAlreadyChosen}>
                                {item.name} — {item.equipmentCode} [{itemDateStatus.label}]{isAlreadyChosen ? ' [محددة مسبقاً]' : ''}
                              </option>
                            );
                          })}
                        </select>
                        {dateStatus && (
                          <span className={`text-[11px] font-bold mt-1.5 flex items-center gap-1 ${dateStatus.isBlocked ? 'text-amber-700' : 'text-emerald-700'}`}>
                            {dateStatus.label}
                          </span>
                        )}
                      </div>
                      <div className="w-20"><input type="number" value={1} readOnly className="input text-sm bg-slate-100 text-slate-500" title="Quantity is fixed at 1 (each equipment is a single unit)" /></div>
                      <div className="w-28"><input type="number" value={eq.unitPrice} readOnly className="input text-sm bg-slate-100 text-slate-500" title="سعر المعدة ثابت من كتالوج المعدات" /></div>
                      <button type="button" onClick={() => setEquipment(equipment.filter((_,idx) => idx!==i))} className="text-red-500 hover:text-red-700 p-1"><MinusCircle className="w-4 h-4" /></button>
                    </div>
                  );
                })}
              </div>
              <div className="bg-slate-50 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex items-center justify-between"><span className="font-semibold text-slate-900">{t('booking.total')}</span><span className="text-lg font-bold text-primary-700">{formatCurrency(totals.total)}</span></div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-5 border-t border-slate-100">
              <button onClick={() => setShowModal(false)} className="btn-secondary">{t('common.cancel')}</button>
              <button onClick={handleSubmit} disabled={isSubmitting} className="btn-primary">{isSubmitting ? t('common.loading') : t('common.save')}</button>
            </div>
          </div>
        </div>
      )}

      <div className="card p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative"><Search className="absolute top-1/2 -translate-y-1/2 start-3 w-5 h-5 text-slate-400" /><input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="input ps-10" placeholder={t('common.search')} /></div>
          <input type="date" value={fromDate} onChange={e => { setFromDate(e.target.value); setPage(1); }} className="input" placeholder="من تاريخ" />
          <input type="date" value={toDate} onChange={e => { setToDate(e.target.value); setPage(1); }} className="input" placeholder="إلى تاريخ" />
          <div className="flex items-center text-sm text-slate-500">
            {t('common.total')}: <span className="font-semibold text-slate-700 ms-1">{data?.total || 0}</span>
          </div>
        </div>
        {isLoading ? (<div className="text-center py-12 text-slate-400">{t('common.loading')}</div>) : bookings.length === 0 ? (
          <div className="text-center py-12 text-slate-400"><AlertCircle className="w-10 h-10 mx-auto mb-2 opacity-50" /><p>{t('common.noData')}</p></div>
        ) : (
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-slate-100 text-slate-500">
                <th className="px-4 py-3 text-start font-medium">{t('booking.number')}</th>
                <th className="px-4 py-3 text-start font-medium">{t('common.customer')}</th>
                <th className="px-4 py-3 text-start font-medium">{t('booking.eventDate')}</th>
                <th className="px-4 py-3 text-end font-medium">{t('common.total')}</th>
                <th className="px-4 py-3 text-end font-medium">{t('common.paid')}</th>
                <th className="px-4 py-3 text-end font-medium">{t('common.remaining')}</th>
                <th className="px-4 py-3 text-center font-medium">عرض</th>
              </tr></thead>
              <tbody>{bookings.map(b => (
                <tr key={b.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3"><Link to={`/bookings/${b.id}`} className="font-medium text-primary-600 hover:underline">{b.bookingNumber}</Link></td>
                  <td className="px-4 py-3 text-slate-700">{b.customerName}</td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(b.eventDate)}</td>
                  <td className="px-4 py-3 text-end font-medium">{formatCurrency(b.total)}</td>
                  <td className="px-4 py-3 text-end text-emerald-600">{formatCurrency(b.paid)}</td>
                  <td className="px-4 py-3 text-end text-red-600">{formatCurrency(b.total - b.paid)}</td>
                  <td className="px-4 py-3 text-center">
                    <Link to={`/bookings/${b.id}`} className="btn-ghost p-1.5 inline-flex" title="عرض التفاصيل">
                      <Eye className="w-4 h-4" />
                    </Link>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <p className="text-sm text-slate-500">{t('common.total')}: {data?.total || 0}</p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="btn-secondary p-1.5"><ChevronRight className="w-4 h-4 rtl:rotate-180" /></button>
              <span className="text-sm text-slate-600 px-2">{page} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="btn-secondary p-1.5"><ChevronLeft className="w-4 h-4 rtl:rotate-180" /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
