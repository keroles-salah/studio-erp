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
  ShieldCheck,
  FileCheck,
  CalendarDays,
  Clock,
  Download,
  MessageCircle,
  FileText,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import api from '../lib/api';
import {
  formatCurrency,
  formatDate,
  getInvoiceStatusColor,
  getInvoiceStatusLabel,
  getPaymentMethodLabel,
  getEventTypeLabel,
  amountToArabicWords,
} from '../lib/utils';
import {
  TOAST_DURATION_MS,
  COPY_FEEDBACK_DURATION_MS,
} from '../lib/constants';
import {
  BRAND_NAME,
  BRAND_PHONE,
  BRAND_EMAIL,
  BRAND_WEBSITE,
  BRAND_CR_NUMBER,
  BRAND_BANK_NAME,
  BRAND_IBAN,
  BRAND_LOCATION,
} from '../lib/brand';

export interface InvoiceData {
  id: string;
  invoiceNumber: string;
  date: string;
  dueDate: string;
  status: string;
  subtotal: number;
  discount: number;
  total: number;
  paid: number;
  remaining: number;
  notes: string | null;
  bookingId?: string | null;
  booking?: {
    number: string;
    eventType: string;
    eventDate: string;
    startTime?: string | null;
    endTime?: string | null;
    venueName?: string | null;
    venueAddress?: string | null;
    city?: string | null;
  } | null;
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
    crNumber: string;
    currency: string;
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

  return {
    id: raw.id,
    invoiceNumber: raw.invoiceNumber,
    date: raw.invoiceDate,
    dueDate: raw.dueDate,
    status: raw.status,
    subtotal: sub,
    discount: disc,
    total: Number(raw.total ?? 0),
    paid: Number(raw.paidAmount ?? 0),
    remaining: Number(raw.remainingAmount ?? 0),
    notes: raw.notes ?? settings?.['studio.invoice_notes'] ?? null,
    bookingId: raw.bookingId ?? null,
    booking: raw.booking
      ? {
          number: raw.booking.bookingNumber,
          eventType: raw.booking.event?.eventType ?? 'OTHER',
          eventDate: raw.booking.event?.eventDate,
          startTime: raw.booking.event?.startTime ?? null,
          endTime: raw.booking.event?.endTime ?? null,
          venueName: raw.booking.event?.venueName ?? null,
          venueAddress: raw.booking.event?.venueAddress ?? null,
          city: raw.booking.event?.city ?? null,
        }
      : null,
    customer: {
      id: raw.customer?.id ?? '',
      name: raw.customer?.fullName ?? 'عميل مميز',
      phone: raw.customer?.phone ?? '',
      email: raw.customer?.email ?? '',
      address: raw.customer?.address ?? '',
    },
    studio: {
      name: settings?.['studio.name'] || BRAND_NAME,
      logo: settings?.['studio.logo'] || `${import.meta.env.BASE_URL}logo.png`,
      phone: settings?.['studio.phone'] || BRAND_PHONE,
      whatsapp: settings?.['studio.whatsapp'] || BRAND_PHONE,
      email: settings?.['studio.email'] || BRAND_EMAIL,
      address: settings?.['studio.address'] || BRAND_LOCATION,
      website: settings?.['studio.website'] || BRAND_WEBSITE,
      crNumber: settings?.['studio.cr_number'] || BRAND_CR_NUMBER,
      currency: settings?.['studio.currency'] || 'SAR',
      bankName: settings?.['studio.bank_name'] || BRAND_BANK_NAME,
      accountName: settings?.['studio.account_name'] || settings?.['studio.name'] || BRAND_NAME,
      iban: settings?.['studio.iban'] || BRAND_IBAN,
    },
    items: (raw.items ?? []).reduce((acc: any[], it: any) => {
      const desc = (it.description || '').replace(/^Equipment:\s*/i, '').trim();
      const unitPrice = Number(it.unitPrice ?? 0);
      const discount = Number(it.discount ?? 0);
      const qty = Number(it.quantity ?? 1);
      const total = Number(it.total ?? (qty * unitPrice - discount));

      const existing = acc.find(
        (x) => x.description === desc && x.unitPrice === unitPrice && x.discount === discount && x.itemType === (it.itemType || 'SERVICE')
      );

      if (existing) {
        existing.quantity += qty;
        existing.total += total;
      } else {
        acc.push({
          id: it.id,
          description: desc,
          itemType: it.itemType || 'SERVICE',
          quantity: qty,
          unitPrice,
          discount,
          total,
        });
      }
      return acc;
    }, []),
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
  const [isSimplified, setIsSimplified] = useState(false);
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

  const handleCopyIban = () => {
    if (data?.studio?.iban) {
      navigator.clipboard.writeText(data.studio.iban);
      setCopied(true);
      setTimeout(() => setCopied(false), COPY_FEEDBACK_DURATION_MS);
      showToast('تم نسخ رقم الآيبان إلى الحافظة');
    }
  };

  const handlePrint = () => window.print();

  const [pdfBusy, setPdfBusy] = useState(false);
  const handleDownloadPdf = async () => {
    // Capture the visible invoice document. Capturing the print-only element
    // while it was hidden/off-screen caused blank PDFs in some browsers.
    const el = document.getElementById('invoice-print') as HTMLElement | null;
    if (!el || pdfBusy || !data) return;

    setPdfBusy(true);
    const paymentHistory = document.getElementById('invoice-payment-history') as HTMLElement | null;
    const previousPaymentDisplay = paymentHistory?.style.display ?? '';
    try {
      // Keep payment history in the web view, but omit it from the client-facing PDF.
      if (paymentHistory) paymentHistory.style.display = 'none';
      // Let the branded web font finish loading before html2canvas captures it.
      await document.fonts?.ready;
      const html2pdf = (await import('html2pdf.js')).default;
      await html2pdf()
        .set({
          margin: [8, 8, 8, 8],
          filename: `${data.invoiceNumber || 'invoice'}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff',
            scrollX: 0,
            scrollY: -window.scrollY,
          },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        })
        .from(el)
        .save();
      showToast('تم تحميل ملف PDF بنجاح');
    } catch {
      showToast('تعذر إنشاء ملف PDF، حاول مرة أخرى');
    } finally {
      if (paymentHistory) paymentHistory.style.display = previousPaymentDisplay;
      setPdfBusy(false);
    }
  };

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
    <div className="invoice-root relative min-w-0 space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 end-5 z-50 flex max-w-[calc(100vw-2rem)] items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800 shadow-xl animate-in slide-in-from-top-4 print:hidden">
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

          {/* Simplified Mode Switcher */}
          <div className="flex items-center rounded-xl border border-slate-200 bg-slate-100 p-1 w-full md:w-auto shadow-sm">
            <button
              type="button"
              onClick={() => setIsSimplified(false)}
              className={`flex-1 md:flex-none px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                !isSimplified ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              📄 فاتورة تفصيلية
            </button>
            <button
              type="button"
              onClick={() => setIsSimplified(true)}
              className={`flex-1 md:flex-none px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                isSimplified ? 'bg-primary-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              📋 فاتورة العميل المبسطة
            </button>
          </div>

          {/* Share to WhatsApp Button */}
          {data.customer.phone && (
            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="inline-flex w-full md:w-auto items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-700 transition hover:bg-emerald-100"
              title="إرسال الفاتورة عبر واتساب"
            >
              <MessageCircle className="h-4 w-4 text-emerald-600" />
              <span>مشاركة عبر واتساب</span>
            </button>
          )}

          {/* Download PDF Button */}
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={pdfBusy}
            className="inline-flex w-full md:w-auto items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <Download className="h-4 w-4 text-slate-600" />
            <span>{pdfBusy ? 'جارٍ التحميل...' : 'تحميل PDF'}</span>
          </button>

          {/* Print Button */}
          <button
            type="button"
            onClick={handlePrint}
            className="btn-primary inline-flex w-full md:w-auto items-center justify-center gap-2 px-5 py-2.5 shadow-md shadow-primary-600/20"
          >
            <Printer className="h-4 w-4" />
            <span>طباعة الفاتورة</span>
          </button>
        </div>
      </div>

      {/* Main Official Invoice Document (Unified for Screen & Print) */}
      <div
        id="invoice-print"
        className="invoice-doc mx-auto w-full max-w-4xl rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50 print:border-none print:shadow-none print:rounded-none print:m-0 print:w-full print:max-w-none"
        dir="rtl"
      >
        {/* Top Gradient Status Bar */}
        <div
          className={`h-2 w-full rounded-t-2xl print:rounded-none bg-gradient-to-r ${
            {
              PAID: 'from-emerald-500 via-teal-600 to-emerald-700',
              PARTIALLY_PAID: 'from-amber-400 via-amber-500 to-orange-500',
              UNPAID: 'from-red-500 via-rose-600 to-red-700',
              OVERDUE: 'from-rose-600 via-red-700 to-red-900',
              DRAFT: 'from-slate-400 via-slate-500 to-slate-600',
              CANCELLED: 'from-slate-300 via-slate-400 to-slate-500',
            }[data.status] || 'from-slate-900 via-primary-700 to-amber-500'
          }`}
        />

        <div className="p-5 sm:p-7 print:p-2 space-y-4 print:space-y-2">
          {/* 1. Official Centered Logo & Studio Identity (اللوجو في منتصف الفاتورة) */}
          <div className="text-center border-b border-slate-200 pb-4 print:pb-2">
            <div className="mx-auto mb-2 grid h-16 w-16 place-items-center rounded-2xl border border-slate-200 bg-white p-2 shadow-sm print:h-12 print:w-12 print:border-slate-300">
              <img
                src={data.studio.logo || `${import.meta.env.BASE_URL}logo.png`}
                alt="Studio Logo"
                className="h-12 w-12 object-contain print:h-9 print:w-9"
              />
            </div>
            <h1 className="text-xl font-black tracking-tight text-slate-900 leading-tight print:text-lg">
              {data.studio.name}
            </h1>
            <p className="font-mono text-xs font-bold uppercase tracking-widest text-primary-700 mt-0.5">
              {data.studio.name} · STUDIO
            </p>
            {data.studio.crNumber && (
              <div className="flex items-center justify-center gap-1.5 text-xs text-slate-600 mt-1">
                <span className="font-bold text-slate-700">السجل التجاري (CR):</span>
                <bdi className="font-mono font-bold text-slate-900" dir="ltr">{data.studio.crNumber}</bdi>
              </div>
            )}
            {/* Studio Contact Info Row */}
            <div className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[10px] text-slate-500 print:text-[8.5px]">
              {data.studio.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-2.5 w-2.5 text-slate-400" />
                  <bdi dir="ltr">{data.studio.phone}</bdi>
                </span>
              )}
              {data.studio.email && (
                <>
                  <span className="text-slate-300 select-none">·</span>
                  <span className="flex items-center gap-1">
                    <Mail className="h-2.5 w-2.5 text-slate-400" />
                    <bdi dir="ltr">{data.studio.email}</bdi>
                  </span>
                </>
              )}
              {data.studio.website && (
                <>
                  <span className="text-slate-300 select-none">·</span>
                  <bdi dir="ltr" className="text-primary-600 font-medium">{data.studio.website}</bdi>
                </>
              )}
              {data.studio.address && (
                <>
                  <span className="text-slate-300 select-none">·</span>
                  <span className="flex items-center gap-1">
                    <MapPin className="h-2.5 w-2.5 text-slate-400" />
                    <span>{data.studio.address}</span>
                  </span>
                </>
              )}
            </div>
          </div>

          {/* 2. Sub-Header: Right = Invoice Details, Left = Contacts & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-1 border-b border-slate-100">
            {/* Document Details (Right) */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/90 p-3 text-start print:bg-white print:border-slate-300 print:p-2">
              <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-1.5 mb-1.5">
                <div>
                  <h2 className="text-xs font-black uppercase tracking-wider text-slate-900">
                    {isSimplified ? 'فاتورة العميل الرسمية' : 'فاتورة رسمية'}
                  </h2>
                  <span className="text-[9px] font-bold text-slate-400" dir="ltr">
                    {isSimplified ? 'CLIENT INVOICE' : 'OFFICIAL INVOICE'}
                  </span>
                </div>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black ${getInvoiceStatusColor(
                    data.status
                  )}`}
                >
                  {isPaid && <CheckCircle2 className="h-3 w-3" />}
                  {getInvoiceStatusLabel(data.status)}
                </span>
              </div>

              <div className="space-y-1 text-[11px] print:text-[9.5px]">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500">رقم الفاتورة:</span>
                  <bdi className="font-mono font-black text-slate-950" dir="ltr">{data.invoiceNumber}</bdi>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500">تاريخ الإصدار:</span>
                  <span className="font-semibold text-slate-800">{formatDate(data.date)}</span>
                </div>
              </div>
            </div>

            {/* Financial Summary Card (Left) */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/90 p-3 text-start print:bg-white print:border-slate-300 print:p-2">
              <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-1.5 mb-1.5">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">ملخص الحساب</h3>
                {isPaid
                  ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-black text-emerald-700"><CheckCircle2 className="h-2.5 w-2.5" />مسددة بالكامل</span>
                  : <span className="text-[10px] text-slate-500 font-mono">SAR</span>
                }
              </div>
              <div className="space-y-1 text-[11px] print:text-[9.5px]">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-bold text-slate-700">المبلغ الإجمالي:</span>
                  <span className="font-mono text-sm font-black text-primary-700 print:text-xs whitespace-nowrap">{formatCurrency(data.total)}</span>
                </div>
                {data.paid > 0 && (
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-bold text-emerald-700">المسدد:</span>
                    <span className="font-mono font-bold text-emerald-700 whitespace-nowrap">{formatCurrency(data.paid)}</span>
                  </div>
                )}
                {data.remaining > 0 && (
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-bold text-red-600">المتبقي:</span>
                    <span className="font-mono font-bold text-red-600 whitespace-nowrap">{formatCurrency(data.remaining)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 2 Information Cards: Billed To | Booking Info */}
          <div className={`grid gap-3 grid-cols-1 ${data.booking ? 'sm:grid-cols-2' : 'sm:grid-cols-1'}`}>
            {/* Card 1: Customer Info */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 print:bg-white print:border-slate-300 print:p-2">
              <div className="flex items-center gap-1.5 mb-1.5 border-b border-slate-200 pb-1">
                <User className="h-3.5 w-3.5 text-primary-600" />
                <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-700">فاتورة إلى · Billed To</h3>
              </div>
              <div className="space-y-0.5 text-[11px] print:text-[9.5px]">
                <p className="font-bold text-slate-950 text-xs">{data.customer.name}</p>
                {data.customer.phone && (
                  <p className="flex items-center gap-1 text-slate-600">
                    <Phone className="h-3 w-3 text-slate-400" />
                    <bdi dir="ltr">{data.customer.phone}</bdi>
                  </p>
                )}
                {data.customer.email && (
                  <p className="flex items-center gap-1 text-slate-600">
                    <Mail className="h-3 w-3 text-slate-400" />
                    <bdi dir="ltr" className="truncate">{data.customer.email}</bdi>
                  </p>
                )}
                {data.customer.address && (
                  <p className="flex items-center gap-1 text-slate-600">
                    <MapPin className="h-3 w-3 text-slate-400" />
                    <span>{data.customer.address}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Card 2: Booking Info (if attached) */}
            {data.booking && (
              <div className="rounded-xl border border-primary-200 bg-primary-50/40 p-3 print:bg-white print:border-slate-300 print:p-2">
                <div className="flex items-center gap-1.5 mb-1.5 border-b border-primary-100 pb-1">
                  <CalendarDays className="h-3.5 w-3.5 text-primary-600" />
                  <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-700">تفاصيل الحجز · Booking</h3>
                </div>
                <div className="space-y-0.5 text-[11px] print:text-[9.5px] text-slate-600">
                  <p className="flex items-center justify-between">
                    <span>رقم الحجز:</span>
                    <bdi className="font-mono text-primary-700 font-bold" dir="ltr">{data.booking.number}</bdi>
                  </p>
                  <p className="flex items-center justify-between">
                    <span>نوع الفعالية:</span>
                    <strong className="text-slate-900">{getEventTypeLabel(data.booking.eventType)}</strong>
                  </p>
                  {data.booking.eventDate && (
                    <p className="flex items-center justify-between">
                      <span>التاريخ:</span>
                      <strong className="text-slate-800">{formatDate(data.booking.eventDate)}</strong>
                    </p>
                  )}
                  {(data.booking.venueName || data.booking.city) && (
                    <p className="flex items-start justify-between">
                      <span>المكان:</span>
                      <strong className="text-end text-slate-800 max-w-[65%] truncate">
                        {[data.booking.venueName, data.booking.city].filter(Boolean).join(' - ')}
                      </strong>
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Itemized Table (Detailed vs Simplified Client Mode) */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm print:shadow-none print:border-slate-300">
            <table className="w-full text-start text-[11px] print:text-[9.5px]">
              <thead>
                <tr className="bg-slate-950 text-white print:bg-slate-900">
                  <th className="w-8 px-3 py-2 text-start font-bold uppercase whitespace-nowrap">#</th>
                  <th className="px-3 py-2 text-start font-bold uppercase">الخدمة / المعدات / البند (Description)</th>
                  <th className="w-24 px-3 py-2 text-center font-bold uppercase whitespace-nowrap">العدد / الكمية</th>
                  {!isSimplified && <th className="w-28 px-3 py-2 text-end font-bold uppercase whitespace-nowrap">سعر الوحدة</th>}
                  {!isSimplified && data.discount > 0 && <th className="w-24 px-3 py-2 text-end font-bold uppercase whitespace-nowrap">الخصم</th>}
                  {!isSimplified && <th className="w-28 px-3 py-2 text-end font-bold uppercase whitespace-nowrap">المجموع</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {data.items?.length > 0 ? (
                  data.items.map((item, idx) => {
                    const cleanDescription = item.description?.replace(/^Equipment:\s*/i, '').trim() || item.description;
                    return (
                      <tr key={item.id || idx} className={idx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}>
                        <td className="px-3 py-2 font-mono text-slate-400 whitespace-nowrap">{idx + 1}</td>
                        <td className="px-3 py-2 font-semibold text-slate-900" dir="auto">{cleanDescription}</td>
                        <td className="px-3 py-2 text-center font-mono font-bold text-primary-700 whitespace-nowrap">{item.quantity}</td>
                        {!isSimplified && <td className="px-3 py-2 text-end font-mono text-slate-600 whitespace-nowrap">{formatCurrency(item.unitPrice)}</td>}
                        {!isSimplified && data.discount > 0 && (
                          <td className="px-3 py-2 text-end font-mono text-emerald-600 whitespace-nowrap">
                            {item.discount ? `- ${formatCurrency(item.discount)}` : '—'}
                          </td>
                        )}
                        {!isSimplified && <td className="px-3 py-2 text-end font-mono font-bold text-slate-950 whitespace-nowrap">{formatCurrency(item.total)}</td>}
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={isSimplified ? 3 : (data.discount > 0 ? 6 : 5)} className="py-4 text-center text-slate-400">
                      لا توجد بنود مسجلة
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot className="border-t-2 border-slate-200 bg-slate-50/90 font-semibold print:bg-white">
                {!isSimplified && (
                  <tr>
                    <td colSpan={data.discount > 0 ? 5 : 4} className="px-3 py-1.5 text-end text-slate-600 whitespace-nowrap">
                      المجموع الفرعي:
                    </td>
                    <td className="px-3 py-1.5 text-end font-mono font-bold text-slate-900 whitespace-nowrap">
                      {formatCurrency(data.subtotal)}
                    </td>
                  </tr>
                )}
                {!isSimplified && data.discount > 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-1.5 text-end text-emerald-700 whitespace-nowrap">
                      الخصم المطبق:
                    </td>
                    <td className="px-3 py-1.5 text-end font-mono font-bold text-emerald-700 whitespace-nowrap">
                      - {formatCurrency(data.discount)}
                    </td>
                  </tr>
                )}
                <tr className="bg-slate-950 text-white print:bg-slate-900">
                  <td colSpan={isSimplified ? 2 : (data.discount > 0 ? 5 : 4)} className="px-3 py-2 text-end font-black text-amber-400 text-xs whitespace-nowrap">
                    المبلغ الإجمالي المستحق:
                  </td>
                  <td className="px-3 py-2 text-end font-mono text-base font-black text-white print:text-xs whitespace-nowrap">
                    {formatCurrency(data.total)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Simplified Mode: Big Total Highlight Card */}
          {isSimplified && (
            <div className="rounded-2xl border-2 border-primary-200 bg-primary-50/60 px-5 py-4 text-center print:border-slate-300 print:bg-white print:py-3">
              <p className="text-[11px] font-bold uppercase tracking-widest text-primary-600 print:text-[9px]">
                إجمالي المبلغ المستحق
              </p>
              <p className="mt-1 font-mono text-3xl font-black text-slate-950 print:text-2xl">
                {formatCurrency(data.total)}
              </p>
              <p className="mt-1 text-[10px] text-slate-500 print:text-[8.5px]">
                {amountToArabicWords(data.total, data.studio.currency)}
              </p>
              {data.remaining > 0 && (
                <p className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-0.5 text-[10px] font-bold text-red-700">
                  المتبقي للسداد: {formatCurrency(data.remaining)}
                </p>
              )}
              {isPaid && (
                <p className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-0.5 text-[10px] font-bold text-emerald-700">
                  <CheckCircle2 className="h-3 w-3" /> مسددة بالكامل ✓
                </p>
              )}
            </div>
          )}

          {data.payments?.length > 0 && (
            <div id="invoice-payment-history" className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 print:hidden">
              <div className="flex items-center gap-1.5 mb-2">
                <CreditCard className="h-4 w-4 text-emerald-600" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">سجل الدفعات المسددة</h4>
              </div>
              <div className="space-y-1.5">
                {data.payments.map((p) => (
                  <div
                    key={p.id}
                    className="flex flex-wrap items-center justify-between gap-y-1 rounded-lg border border-emerald-100 bg-emerald-50/80 px-3 py-1.5 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      <span className="font-semibold text-slate-800">{getPaymentMethodLabel(p.method)}</span>
                      {p.reference !== '-' && <bdi dir="ltr" className="font-mono text-slate-500">({p.reference})</bdi>}
                      <span className="text-slate-400">| {formatDate(p.date)}</span>
                    </div>
                    <span className="font-mono font-bold text-emerald-700">{formatCurrency(p.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Payment Progress & Settle Strip (Web Only) */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 print:hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-700">نسبة السداد:</span>
                <span className={`font-mono font-bold ${paidPercent >= 100 ? 'text-emerald-700' : 'text-primary-700'}`}>
                  {paidPercent}% {paidPercent >= 100 ? '(مسددة بالكامل)' : ''}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-emerald-700 font-bold">المسدد: <strong className="font-mono">{formatCurrency(data.paid)}</strong></span>
                <span className="text-slate-300">|</span>
                <span className="text-red-600 font-bold">المتبقي: <strong className="font-mono">{formatCurrency(data.remaining)}</strong></span>
              </div>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  paidPercent >= 100 ? 'bg-emerald-500' : 'bg-primary-600'
                }`}
                style={{ width: `${paidPercent}%` }}
              />
            </div>
          </div>

          {/* Settle Summary for Print (Clean Summary Row) */}
          <div className="hidden print:flex items-center justify-between rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-[10px]">
            <div className="flex items-center gap-3">
              <span className="font-bold text-emerald-800">المبلغ المسدد: {formatCurrency(data.paid)}</span>
              <span className="text-slate-400">|</span>
              <span className="font-bold text-red-700">المبلغ المتبقي: {formatCurrency(data.remaining)}</span>
            </div>
            <span className="font-bold text-slate-600">
              {paidPercent >= 100 ? '✓ مسددة بالكامل' : `متبقي ${100 - paidPercent}% للسداد`}
            </span>
          </div>

          {/* Bottom Section: Tafqeet & Notes */}
          <div className="space-y-2 pt-1">
            {/* Amount In Words (Tafqeet) */}
            <div className="invoice-amount-words">
              <span className="font-bold text-slate-700">المبلغ كتابةً:</span>{' '}
              <strong className="text-slate-950">{amountToArabicWords(data.total, data.studio.currency)}</strong>
            </div>

            {/* Terms / Notes if available */}
            {data.notes && (
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-[11px] print:text-[9.5px]">
                <h4 className="font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-primary-600" />
                  <span>الشروط والأحكام / ملاحظات:</span>
                </h4>
                <p className="text-slate-600 leading-relaxed" dir="auto">{data.notes}</p>
              </div>
            )}
          </div>

          {/* Minimalist Inline Bank Line (سطر تذييل محاسبي فائق النقاء والتناغم) */}
          {data.studio.iban && (
            <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1.5 rounded-xl border border-slate-200/80 bg-slate-50/60 px-3.5 py-2 text-[11px] print:text-[9.5px] print:border-slate-300 print:bg-white text-slate-700">
              <Building2 className="h-3.5 w-3.5 text-primary-600 shrink-0" />
              <span className="font-bold text-slate-900">للتحويل البنكي:</span>
              <span className="font-semibold text-slate-800">{data.studio.bankName || 'مصرف الراجحي'}</span>
              <span className="text-slate-300 select-none px-0.5">|</span>
              <span className="text-slate-500">الحساب:</span>
              <span className="font-semibold text-slate-800">{data.studio.accountName || BRAND_NAME}</span>
              <span className="text-slate-300 select-none px-0.5">|</span>
              <span className="text-slate-500">الآيبان:</span>
              <bdi dir="ltr" className="font-mono font-bold text-slate-950 tracking-wider select-all">
                {data.studio.iban.replace(/(.{4})/g, '$1 ').trim()}
              </bdi>
              <button
                type="button"
                onClick={handleCopyIban}
                className="print:hidden inline-flex items-center gap-1 rounded bg-slate-200/70 px-2 py-0.5 text-[10px] font-bold text-slate-700 hover:bg-slate-300 transition"
                title="نسخ رقم الآيبان"
              >
                {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3 text-slate-500" />}
                <span>{copied ? 'تم النسخ' : 'نسخ'}</span>
              </button>
            </div>
          )}


          {/* Official Footer */}
          <div className="border-t border-slate-200 pt-2.5 space-y-1 print:pt-1">
            <p className="text-center text-[11px] font-bold text-primary-700 print:text-[8.5px]">
              شكراً لثقتكم بنا — نتطلع دائماً لخدمتكم بأعلى معايير الجودة
            </p>
            <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-400 print:text-[8px]">
              <p>© {new Date().getFullYear()} {data.studio.name}. جميع الحقوق محفوظة.</p>
              <p className="flex items-center gap-1 font-mono">
                <FileCheck className="h-3 w-3 shrink-0 text-slate-400" />
                <bdi dir="ltr">Doc Ref: {data.id}</bdi>
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* Record Quick Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-in fade-in print:hidden">
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
