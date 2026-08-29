import { useTranslation } from 'react-i18next';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  ArrowRight,
  Printer,
  AlertCircle,
  CheckCircle2,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Building2,
  User,
  Copy,
  Check,
  QrCode,
  ShieldCheck,
  FileCheck,
} from 'lucide-react';
import api from '../lib/api';
import {
  formatCurrency,
  formatDate,
  getInvoiceStatusColor,
  getInvoiceStatusLabel,
  getPaymentMethodLabel,
} from '../lib/utils';
import {
  TOAST_DURATION_MS,
  COPY_FEEDBACK_DURATION_MS,
  DEFAULT_TAX_RATE_PERCENT,
} from '../lib/constants';

export interface InvoiceData {
  id: string;
  invoiceNumber: string;
  date: string;
  dueDate: string;
  status: string;
  subtotal: number;
  discount: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  paid: number;
  remaining: number;
  notes: string | null;
  bookingId?: string | null;
  customer: {
    id: string;
    name: string;
    phone: string;
    email: string;
    address: string;
  };
  studio: {
    name: string;
    logo: string;
    phone: string;
    whatsapp: string;
    email: string;
    address: string;
    website: string;
    vatNumber: string;
    crNumber: string;
    bankName: string;
    accountName: string;
    iban: string;
  };
  items: {
    id: string;
    description: string;
    itemType?: string;
    quantity: number;
    unitPrice: number;
    discount?: number;
    total: number;
  }[];
  payments: {
    id: string;
    amount: number;
    date: string;
    method: string;
    reference: string;
  }[];
}

function mapInvoice(raw: any, settings: any): InvoiceData {
  const sub = Number(raw.subtotal ?? 0);
  const disc = Number(raw.discount ?? 0);
  const tax = Number(raw.tax ?? 0);
  const base = Math.max(0, sub - disc);
  const taxRate = base > 0 ? Math.round((tax / base) * 1000) / 10 : DEFAULT_TAX_RATE_PERCENT;

  return {
    id: raw.id,
    invoiceNumber: raw.invoiceNumber,
    date: raw.invoiceDate,
    dueDate: raw.dueDate,
    status: raw.status,
    subtotal: sub,
    discount: disc,
    taxRate,
    taxAmount: tax,
    total: Number(raw.total ?? 0),
    paid: Number(raw.paidAmount ?? 0),
    remaining: Number(raw.remainingAmount ?? 0),
    notes: raw.notes ?? settings?.['studio.invoice_notes'] ?? null,
    bookingId: raw.bookingId ?? null,
    customer: {
      id: raw.customer?.id ?? '',
      name: raw.customer?.fullName ?? 'عميل مميز',
      phone: raw.customer?.phone ?? '',
      email: raw.customer?.email ?? '',
      address: raw.customer?.address ?? '',
    },
    studio: {
      name: settings?.['studio.name'] || 'REAL HOME LENS',
      logo: settings?.['studio.logo'] || `${import.meta.env.BASE_URL}logo.png`,
      phone: settings?.['studio.phone'] || '+966 50 000 0000',
      whatsapp: settings?.['studio.whatsapp'] || '+966 50 000 0000',
      email: settings?.['studio.email'] || 'info@realhomelens.com',
      address: settings?.['studio.address'] || 'المملكة العربية السعودية - الرياض',
      website: settings?.['studio.website'] || 'www.realhomelens.com',
      vatNumber: settings?.['studio.vat_number'] || '300984729100003',
      crNumber: settings?.['studio.cr_number'] || '1010894721',
      bankName: settings?.['studio.bank_name'] || 'مصرف الراجحي / Al Rajhi Bank',
      accountName: settings?.['studio.account_name'] || settings?.['studio.name'] || 'REAL HOME LENS',
      iban: settings?.['studio.iban'] || 'SA4480000456608010123456',
    },
    items: (raw.items ?? []).map((it: any) => ({
      id: it.id,
      description: it.description,
      itemType: it.itemType || 'SERVICE',
      quantity: it.quantity,
      unitPrice: Number(it.unitPrice ?? 0),
      discount: Number(it.discount ?? 0),
      total: Number(it.total ?? 0),
    })),
    payments: (raw.payments ?? []).map((p: any) => ({
      id: p.id,
      amount: Number(p.amount ?? 0),
      date: p.paymentDate,
      method: p.paymentMethod,
      reference: p.referenceNumber || '-',
    })),
  };
}

export default function InvoiceDetail() {
  const { t } = useTranslation();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Quick Payment Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [payAmount, setPayAmount] = useState<string>('');
  const [payMethod, setPayMethod] = useState('BANK_TRANSFER');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payRef, setPayRef] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState('');

  const { data, isLoading } = useQuery<InvoiceData>({
    queryKey: ['invoice', id],
    queryFn: async () => {
      const [invRes, setRes] = await Promise.all([
        api.get(`/invoices/${id}`),
        api.get('/settings/studio'),
      ]);
      const settings = setRes.data.data?.studio ?? {};
      return mapInvoice(invRes.data.data, settings);
    },
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), TOAST_DURATION_MS);
  };

  const handlePrint = () => window.print();

  const handleCopyInvoiceNumber = () => {
    if (!data?.invoiceNumber) return;
    navigator.clipboard.writeText(data.invoiceNumber);
    setCopied(true);
    showToast('تم نسخ رقم الفاتورة بنجاح');
    setTimeout(() => setCopied(false), COPY_FEEDBACK_DURATION_MS);
  };

  const handleShareWhatsApp = () => {
    if (!data) return;
    const phone = data.customer.phone.replace(/[^0-9+]/g, '');
    const cleanPhone = phone.startsWith('0') ? '966' + phone.substring(1) : phone.replace('+', '');
    const invoiceUrl = window.location.href;

    const message = `مرحباً ${data.customer.name} 👋\nإليك تفاصيل الفاتورة الضريبية رقم: ${data.invoiceNumber}\n• الإجمالي: ${formatCurrency(data.total)}\n• المسدد: ${formatCurrency(data.paid)}\n• المتبقي: ${formatCurrency(data.remaining)}\n\nرابط الفاتورة:\n${invoiceUrl}\n\nشكراً لتعاملكم معنا ✨\n${data.studio.name}`;

    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    showToast('جاري فتح محادثة الواتساب...');
  };

  const openPaymentModal = () => {
    if (!data) return;
    setPayAmount(String(data.remaining > 0 ? data.remaining : data.total));
    setPayDate(new Date().toISOString().split('T')[0]);
    setPayRef('');
    setPayNotes('');
    setPaymentError('');
    setShowPaymentModal(true);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data) return;
    const amountNum = Number(payAmount);
    if (!amountNum || amountNum <= 0) {
      setPaymentError('يرجى إدخال مبلغ صحيح');
      return;
    }

    setIsSubmittingPayment(true);
    setPaymentError('');
    try {
      await api.post('/payments', {
        invoiceId: data.id,
        bookingId: data.bookingId || undefined,
        customerId: data.customer.id || undefined,
        amount: amountNum,
        paymentMethod: payMethod,
        paymentDate: payDate,
        referenceNumber: payRef || undefined,
        notes: payNotes || undefined,
      });

      await queryClient.invalidateQueries({ queryKey: ['invoice', id] });
      await queryClient.invalidateQueries({ queryKey: ['payments'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setShowPaymentModal(false);
      showToast(`تم تسجيل دفعة بقيمة ${formatCurrency(amountNum)} بنجاح`);
    } catch (err: any) {
      setPaymentError(err.response?.data?.error?.message || 'تعذر تسجيل الدفعة');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 rounded bg-slate-100 animate-pulse" />
        <div className="card h-[600px] animate-pulse" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <AlertCircle className="mb-3 h-12 w-12 opacity-50" />
        <p>{t('common.noData')}</p>
      </div>
    );
  }

  const isPaid = data.status === 'PAID' || data.remaining <= 0;
  const paidPercent = data.total > 0 ? Math.min(100, Math.round((data.paid / data.total) * 100)) : 100;

  return (
    <div className="relative min-w-0 space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 end-5 z-50 flex max-w-[calc(100vw-2rem)] items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800 shadow-xl animate-in slide-in-from-top-4">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Toolbar (Hidden when printing) */}
      <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm">
          <Link
            to="/invoices"
            className="flex items-center gap-1.5 font-medium text-slate-500 transition hover:text-primary-600"
          >
            <ArrowRight className="h-4 w-4 rtl:rotate-180" />
            {t('nav.invoices')}
          </Link>
          <span className="text-slate-300">/</span>
          <span className="min-w-0 break-all font-mono font-bold text-slate-800">{data.invoiceNumber}</span>
          <button
            type="button"
            onClick={handleCopyInvoiceNumber}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 shadow-sm transition hover:bg-slate-50"
            title="نسخ رقم الفاتورة"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 text-slate-400" />}
            <span>{copied ? 'تم النسخ' : 'نسخ'}</span>
          </button>
        </div>

        <div className="flex w-full flex-wrap items-center gap-2.5 md:w-auto">
          {/* Quick Payment Button */}
          {!isPaid && (
            <button
              type="button"
              onClick={openPaymentModal}
              className="inline-flex w-full md:w-auto items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-700"
            >
              <CreditCard className="h-4 w-4" />
              <span>تسجيل دفعة سريعة</span>
            </button>
          )}

          {/* Share to WhatsApp Button */}
          {data.customer.phone && (
            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="inline-flex w-full md:w-auto items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-700 transition hover:bg-emerald-100"
              title="إرسال الفاتورة عبر واتساب"
            >
              <Phone className="h-4 w-4 text-emerald-600" />
              <span>مشاركة عبر واتساب</span>
            </button>
          )}

          {/* Print Button */}
          <button
            type="button"
            onClick={handlePrint}
            className="btn-primary inline-flex w-full md:w-auto items-center justify-center gap-2 px-5 py-2.5 shadow-md shadow-primary-600/20"
          >
            <Printer className="h-4 w-4" />
            <span>طباعة الفاتورة الرسمية</span>
          </button>
        </div>
      </div>

      {/* Main Official Invoice Container */}
      <div
        id="invoice-print"
        className="mx-auto w-full min-w-0 max-w-4xl rounded-2xl border border-slate-200/90 bg-white shadow-xl shadow-slate-200/50 print:border-none print:shadow-none print:m-0 print:max-w-none print:w-full print:rounded-none"
      >
        {/* Luxury Top Header Border */}
        <div className="h-2 w-full bg-gradient-to-r from-slate-950 via-primary-600 to-amber-500 rounded-t-2xl print:rounded-none" />

        <div className="min-w-0 p-4 md:p-6 print:p-2 space-y-4 print:space-y-2.5">
          {/* Header Section: Tax Invoice on Right, Studio Brand on Left */}
          <div className="flex flex-col md:flex-row items-start justify-between gap-4 border-b border-slate-200 pb-4 print:pb-2">
            {/* 1. Document Details & Official Tax Invoice Badge (Right in RTL) */}
            <div className="w-full md:min-w-[220px] rounded-xl border border-slate-200 bg-slate-50/80 p-3 text-start shadow-sm print:bg-white print:border-slate-300 print:p-2">
              <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-1.5 mb-1.5">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-wider text-slate-800">فاتورة ضريبية رسمية</p>
                  <p className="text-[9px] font-bold text-primary-700" dir="ltr">TAX INVOICE</p>
                </div>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${getInvoiceStatusColor(
                    data.status
                  )}`}
                >
                  {isPaid && <CheckCircle2 className="h-3 w-3" />}
                  {getInvoiceStatusLabel(data.status)}
                </span>
              </div>

              <div className="space-y-1 text-[11px]">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500">رقم الفاتورة:</span>
                  <span className="font-mono font-bold text-slate-950" dir="ltr">{data.invoiceNumber}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500">تاريخ الإصدار:</span>
                  <span className="font-medium text-slate-800">{formatDate(data.date)}</span>
                </div>
                {data.dueDate && (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500">تاريخ الاستحقاق:</span>
                    <span className="font-medium text-slate-800">{formatDate(data.dueDate)}</span>
                  </div>
                )}
                {data.bookingId && (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500">الحجز المرتبط:</span>
                    <span className="font-mono font-medium text-primary-700" dir="ltr">#{data.bookingId.slice(0, 8)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* 2. Studio Identity & English Brand (Left in RTL) */}
            <div className="flex min-w-0 items-start gap-3 text-start" dir="ltr">
              <div className="relative grid h-14 w-14 shrink-0 place-items-center rounded-xl border border-slate-100 bg-white p-1.5 shadow-sm">
                <img src={data.studio.logo || `${import.meta.env.BASE_URL}logo.png`} alt="Logo" className="h-11 w-11 object-contain" />
              </div>
              <div className="min-w-0 space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-[10px] font-extrabold uppercase tracking-widest text-primary-600">
                    REAL HOME LENS
                  </span>
                  <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[9px] font-bold text-slate-600">
                    STUDIO
                  </span>
                </div>
                <h1 className="break-words text-xl font-black tracking-tight text-slate-900 leading-tight">
                  {data.studio.name}
                </h1>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-500">
                  {data.studio.vatNumber && (
                    <span className="inline-flex items-center gap-1">
                      <strong className="text-slate-700">VAT:</strong>
                      <span className="font-mono">{data.studio.vatNumber}</span>
                    </span>
                  )}
                  {data.studio.crNumber && (
                    <span className="inline-flex items-center gap-1">
                      <strong className="text-slate-700">CR:</strong>
                      <span className="font-mono">{data.studio.crNumber}</span>
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-slate-400">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-2.5 w-2.5 text-slate-400" />
                    <span className="break-words">{data.studio.address}</span>
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Phone className="h-2.5 w-2.5 text-slate-400" />
                    <span className="break-all">{data.studio.phone}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Customer & Billing Parties Section */}
          <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
            {/* Customer Box */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 print:bg-white print:border-slate-300 print:p-2">
              <div className="flex items-center gap-1.5 mb-1.5 border-b border-slate-200/80 pb-1">
                <User className="h-3.5 w-3.5 text-primary-600" />
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-700">فاتورة إلى / Billed To</h3>
              </div>
              <div className="space-y-1 text-[11px]">
                <p className="font-bold text-slate-900">{data.customer.name}</p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-slate-600">
                  {data.customer.phone && (
                    <span className="flex items-center gap-1" dir="ltr">
                      <Phone className="h-3 w-3 text-slate-400" />
                      <span>{data.customer.phone}</span>
                    </span>
                  )}
                  {data.customer.email && (
                    <span className="flex items-center gap-1" dir="ltr">
                      <Mail className="h-3 w-3 text-slate-400" />
                      <span>{data.customer.email}</span>
                    </span>
                  )}
                  {data.customer.address && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-slate-400" />
                      <span>{data.customer.address}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Studio Payment & Bank Details */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 print:bg-white print:border-slate-300 print:p-2">
              <div className="flex items-center gap-1.5 mb-1.5 border-b border-slate-200/80 pb-1">
                <Building2 className="h-3.5 w-3.5 text-primary-600" />
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-700">بيانات التحويل البنكي / Bank Details</h3>
              </div>
              <div className="space-y-0.5 text-[11px] text-slate-600">
                <p className="flex items-center justify-between">
                  <span className="text-slate-500">البنك:</span>
                  <strong className="text-slate-800">{data.studio.bankName}</strong>
                </p>
                <p className="flex items-center justify-between">
                  <span className="text-slate-500">الآيبان IBAN:</span>
                  <strong className="max-w-[65%] break-all text-end font-mono text-slate-900" dir="ltr">{data.studio.iban}</strong>
                </p>
              </div>
            </div>
          </div>

          {/* Itemized Table */}
          <div className="hidden overflow-x-auto rounded-xl border border-slate-200 shadow-sm print:block print:border-slate-300 print:overflow-hidden md:block">
            <table className="w-full min-w-[540px] text-start text-[11px] md:min-w-0">
              <thead>
                <tr className="bg-slate-950 text-white print:bg-slate-900">
                  <th className="w-8 px-3 py-2 text-start font-bold uppercase">#</th>
                  <th className="px-3 py-2 text-start font-bold uppercase">الخدمة / البند (Description)</th>
                  <th className="w-16 px-3 py-2 text-center font-bold uppercase">الكمية</th>
                  <th className="w-28 px-3 py-2 text-end font-bold uppercase">سعر الوحدة</th>
                  {data.discount > 0 && <th className="w-20 px-3 py-2 text-end font-bold uppercase">الخصم</th>}
                  <th className="w-28 px-3 py-2 text-end font-bold uppercase">المجموع</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {data.items?.length > 0 ? (
                  data.items.map((item, idx) => (
                    <tr key={item.id || idx} className={idx % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'}>
                      <td className="px-3 py-2 font-mono text-slate-400">{idx + 1}</td>
                      <td className="px-3 py-2 font-semibold text-slate-800" dir="auto">{item.description}</td>
                      <td className="px-3 py-2 text-center font-mono font-medium text-slate-700">{item.quantity}</td>
                      <td className="px-3 py-2 text-end font-mono text-slate-600">{formatCurrency(item.unitPrice)}</td>
                      {data.discount > 0 && (
                        <td className="px-3 py-2 text-end font-mono text-emerald-600">
                          {item.discount ? `- ${formatCurrency(item.discount)}` : '—'}
                        </td>
                      )}
                      <td className="px-3 py-2 text-end font-mono font-bold text-slate-900">{formatCurrency(item.total)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-4 text-center text-slate-400">لا توجد بنود مسجلة</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="space-y-2 md:hidden">
            {data.items?.length > 0 ? (
              data.items.map((item, idx) => (
                <div key={item.id || idx} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">البند {idx + 1}</p>
                      <p className="break-words text-[12px] font-semibold leading-5 text-slate-800" dir="auto">{item.description}</p>
                    </div>
                    <span className="shrink-0 text-end font-mono text-[12px] font-bold text-slate-900">{formatCurrency(item.total)}</span>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 border-t border-slate-100 pt-2 text-[10px]">
                    <span className="text-slate-500">الكمية</span>
                    <span className="text-end font-mono font-medium text-slate-700">{item.quantity}</span>
                    <span className="text-slate-500">سعر الوحدة</span>
                    <span className="text-end font-mono text-slate-600">{formatCurrency(item.unitPrice)}</span>
                    {data.discount > 0 && (
                      <>
                        <span className="text-slate-500">الخصم</span>
                        <span className="text-end font-mono text-emerald-600">{item.discount ? `- ${formatCurrency(item.discount)}` : '—'}</span>
                      </>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-slate-200 py-4 text-center text-[11px] text-slate-400">لا توجد بنود مسجلة</div>
            )}
          </div>

          {/* Totals & Payments Section with Visual Progress Bar */}
          <div className="grid gap-3 grid-cols-1 md:grid-cols-12 items-start">
            {/* Left side: Payments + QR Badge */}
            <div className="md:col-span-7 space-y-2.5">
              {data.payments?.length > 0 && (
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 print:bg-white print:border-slate-300">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <CreditCard className="h-3.5 w-3.5 text-emerald-600" />
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-700">سجل الدفعات المسددة</h4>
                  </div>
                  <div className="space-y-1">
                    {data.payments.map((p) => (
                      <div
                        key={p.id}
                        className="flex flex-wrap items-center justify-between gap-y-1 rounded-lg border border-emerald-100 bg-emerald-50/70 px-2.5 py-1 text-[11px]"
                      >
                        <div className="flex min-w-0 flex-1 items-start gap-1.5">
                          <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" />
                          <div className="min-w-0">
                            <span className="break-words font-semibold text-slate-800">
                              {getPaymentMethodLabel(p.method)}
                              {p.reference !== '-' && <span className="font-mono text-slate-500"> ({p.reference})</span>}
                            </span>
                            <span className="text-[10px] text-slate-400 me-2 ms-2">| {formatDate(p.date)}</span>
                          </div>
                        </div>
                        <span className="shrink-0 font-mono font-bold text-emerald-700">{formatCurrency(p.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Electronic Verification Badge / QR Representation */}
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 p-2.5 bg-white print:border-slate-300">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-slate-900 text-white p-1">
                  <QrCode className="h-9 w-9" />
                </div>
                <div className="space-y-0.5 text-[10px] text-slate-500">
                  <p className="font-bold text-slate-800 flex items-center gap-1 text-[11px]">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                    فاتورة إلكترونية معتمدة
                  </p>
                  <p className="leading-tight text-slate-500">
                    تم إنشاء وتوثيق هذه الفاتورة إلكترونياً وتخضع للوائح والأنظمة الضريبية المعمول بها.
                  </p>
                </div>
              </div>
            </div>

            {/* Right side: Financial Breakdown Card + Payment Progress Bar */}
            <div className="min-w-0 md:col-span-5 rounded-xl border border-slate-200 bg-slate-50/80 p-3 space-y-2 print:bg-white print:border-slate-300">
              <div className="flex items-center justify-between text-[11px] text-slate-600">
                <span>المجموع الفرعي:</span>
                <span className="font-mono font-medium text-slate-800">{formatCurrency(data.subtotal)}</span>
              </div>

              {data.discount > 0 && (
                <div className="flex items-center justify-between text-[11px] text-slate-600">
                  <span>الخصم المطبق:</span>
                  <span className="font-mono font-semibold text-emerald-600">- {formatCurrency(data.discount)}</span>
                </div>
              )}

              <div className="flex items-center justify-between text-[11px] text-slate-600">
                <span>الوعاء الضريبي:</span>
                <span className="font-mono font-medium text-slate-800">
                  {formatCurrency(Math.max(0, data.subtotal - data.discount))}
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-600">
                <span>ضريبة القيمة المضافة ({data.taxRate}%):</span>
                <span className="font-mono font-medium text-slate-800">{formatCurrency(data.taxAmount)}</span>
              </div>

              <div className="border-t border-slate-200 pt-1.5">
                <div className="flex items-center justify-between rounded-lg bg-slate-900 px-3 py-2 text-white">
                  <div>
                    <span className="block text-[11px] font-bold uppercase tracking-wider text-amber-400">
                      الإجمالي شامل الضريبة
                    </span>
                  </div>
                  <span className="font-mono text-base font-black text-white">{formatCurrency(data.total)}</span>
                </div>
              </div>

              {/* Visual Payment Progress Bar */}
              <div className="rounded-lg bg-white p-2 border border-slate-200/80 space-y-1.5 print:hidden">
                <div className="flex items-center justify-between text-[10px] font-bold">
                  <span className="text-slate-600">نسبة السداد المسجلة</span>
                  <span className={paidPercent >= 100 ? 'text-emerald-600' : 'text-primary-700'}>
                    {paidPercent}% {paidPercent >= 100 ? '(مسددة بالكامل)' : ''}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full transition-all duration-500 rounded-full ${
                      paidPercent >= 100 ? 'bg-emerald-500' : paidPercent > 0 ? 'bg-primary-500' : 'bg-slate-300'
                    }`}
                    style={{ width: `${paidPercent}%` }}
                  />
                </div>
              </div>

              <div className="space-y-1 pt-0.5 text-[11px]">
                <div className="flex items-center justify-between text-emerald-700">
                  <span className="font-medium">المسدد:</span>
                  <span className="font-mono font-bold">{formatCurrency(data.paid)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-700">المتبقي:</span>
                  <span
                    className={`font-mono font-bold ${
                      data.remaining > 0 ? 'text-red-600' : 'text-emerald-600'
                    }`}
                  >
                    {formatCurrency(data.remaining)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes Section if any */}
          {data.notes && (
            <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-2.5 text-[11px]">
              <h4 className="font-bold text-slate-700 mb-0.5">ملاحظات:</h4>
              <p className="text-slate-600" dir="auto">{data.notes}</p>
            </div>
          )}

          {/* Official Footer, Terms & Signatures */}
          <div className="border-t border-slate-200 pt-3 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-[11px]">
              <div className="space-y-6">
                <p className="font-bold text-slate-700">توقيع العميل / المستلم:</p>
                <div className="w-40 border-b border-dashed border-slate-300" />
              </div>
              <div className="space-y-4 text-end">
                <p className="font-bold text-slate-700">الختم والتوقيع المعتمد:</p>
                <div className="flex items-center justify-end">
                  <div className="relative grid h-14 w-14 place-items-center rounded-full border border-primary-500/40 bg-primary-50/30 text-[9px] font-bold text-primary-700">
                    <span className="text-center font-bold leading-tight">REAL HOME<br />ختم معتمد</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2 text-[10px] text-slate-400">
              <p className="min-w-0 break-words">© {new Date().getFullYear()} {data.studio.name}. جميع الحقوق محفوظة.</p>
              <p className="flex min-w-0 max-w-full items-center gap-1 break-all font-mono">
                <FileCheck className="h-3 w-3 shrink-0 text-slate-400" />
                <span>Doc Ref: {data.id}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Record Quick Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">تسجيل دفعة سريعة للفاتورة</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            {paymentError && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
                {paymentError}
              </div>
            )}

            <form onSubmit={handleRecordPayment} className="space-y-4 text-xs">
              <div>
                <label className="label">المبلغ المدفوع (ر.س)</label>
                <input
                  type="number"
                  step="0.01"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="input font-mono text-base font-bold text-emerald-700"
                  required
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  المبلغ المتبقي على الفاتورة: {formatCurrency(data.remaining)}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="label">طريقة الدفع</label>
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value)}
                    className="input font-semibold"
                  >
                    <option value="BANK_TRANSFER">تحويل بنكي</option>
                    <option value="CARD">شبكة / بطاقة</option>
                    <option value="CASH">نقدي</option>
                  </select>
                </div>

                <div>
                  <label className="label">تاريخ التحصيل</label>
                  <input
                    type="date"
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    className="input font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="label">رقم المرجع / الإيصال البنكي</label>
                <input
                  type="text"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  placeholder="مثال: REF-99201"
                  className="input font-mono"
                />
              </div>

              <div>
                <label className="label">ملاحظات التحصيل (اختياري)</label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="ملاحظات حول الدفعة..."
                  className="input"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="btn-secondary px-4 py-2"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPayment}
                  className="btn bg-emerald-600 text-white hover:bg-emerald-700 px-5 py-2"
                >
                  {isSubmittingPayment ? 'جاري التسجيل...' : 'تأكيد وحفظ الدفعة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
