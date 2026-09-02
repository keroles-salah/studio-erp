import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

let activeCurrency = 'SAR';

export function setActiveCurrency(currency: string): void {
  if (currency && typeof currency === 'string') {
    activeCurrency = currency;
  }
}

export function getActiveCurrency(): string {
  return activeCurrency;
}

export function formatCurrency(
  amount: number | string,
  currency?: string,
  lang: 'ar' | 'en' = 'ar',
): string {
  const cur = currency || activeCurrency;
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  const n = typeof num === 'number' && !Number.isNaN(num) ? num : 0;
  if (lang === 'ar') {
    const arSymbols: Record<string, string> = {
      SAR: 'ر.س',
      EGP: 'ج.م',
      USD: 'دولار',
      EUR: 'يورو',
      AED: 'د.إ',
      KWD: 'د.ك',
      QAR: 'ر.ق',
      BHD: 'د.ب',
      OMR: 'ر.ع',
    };
    const formattedNum = n.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    // Non-breaking space \u00A0 ensures "ر.س" NEVER wraps to a second line
    return `${formattedNum}\u00A0${arSymbols[cur] || cur}`;
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: cur,
    minimumFractionDigits: 2,
  }).format(n);
}

export function toLocalDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayLocalDate(): string {
  return toLocalDateString(new Date());
}

export function formatDate(date: Date | string, locale = 'ar'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-SA' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(d);
}

export function formatDateTime(date: Date | string, locale = 'ar'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-SA' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function getInitials(name?: string | null): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function getBookingStatusColor(status: string): string {
  const colors: Record<string, string> = {
    DRAFT: 'badge-neutral',
    PENDING: 'badge-warning',
    CONFIRMED: 'badge-info',
    IN_PROGRESS: 'badge-info',
    COMPLETED: 'badge-success',
    CANCELLED: 'badge-danger',
  };
  return colors[status] || 'badge-neutral';
}

export function getInvoiceStatusColor(status: string): string {
  const colors: Record<string, string> = {
    DRAFT: 'badge-neutral',
    SENT: 'badge-info',
    PARTIALLY_PAID: 'badge-warning',
    PAID: 'badge-success',
    OVERDUE: 'badge-danger',
    CANCELLED: 'badge-neutral',
  };
  return colors[status] || 'badge-neutral';
}

export function getEquipmentStatusColor(status: string): string {
  const colors: Record<string, string> = {
    AVAILABLE: 'badge-success',
    RESERVED: 'badge-warning',
    IN_USE: 'bg-primary-100 text-primary-800 border border-primary-300',
    MAINTENANCE: 'bg-slate-100 text-slate-700 border border-slate-200',
    LOST: 'badge-danger',
    DAMAGED: 'badge-danger',
    UNAVAILABLE: 'badge-neutral',
  };
  return colors[status] || 'badge-neutral';
}

export function getInvoiceStatusLabel(status: string, lang: 'ar' | 'en' = 'ar'): string {
  const labels: Record<string, Record<'ar' | 'en', string>> = {
    DRAFT: { ar: 'مسودة', en: 'Draft' },
    SENT: { ar: 'مرسلة', en: 'Sent' },
    PARTIALLY_PAID: { ar: 'مدفوعة جزئياً', en: 'Partially Paid' },
    PAID: { ar: 'مدفوعة', en: 'Paid' },
    OVERDUE: { ar: 'متأخرة', en: 'Overdue' },
    CANCELLED: { ar: 'ملغاة', en: 'Cancelled' },
  };
  return labels[status]?.[lang] ?? status;
}

export function getSimpleStatusLabel(s: string, lang: 'ar' | 'en' = 'ar'): string {
  const m: Record<string, Record<'ar' | 'en', string>> = {
    ACTIVE: { ar: 'نشط', en: 'Active' },
    INACTIVE: { ar: 'غير نشط', en: 'Inactive' },
  };
  return m[s]?.[lang] ?? s;
}

export function getBookingStatusLabel(s: string, lang: 'ar' | 'en' = 'ar'): string {
  const m: Record<string, Record<'ar' | 'en', string>> = {
    DRAFT: { ar: 'مسودة', en: 'Draft' },
    PENDING: { ar: 'قيد الانتظار', en: 'Pending' },
    CONFIRMED: { ar: 'مؤكد', en: 'Confirmed' },
    IN_PROGRESS: { ar: 'جاري التنفيذ', en: 'In Progress' },
    COMPLETED: { ar: 'مكتمل', en: 'Completed' },
    CANCELLED: { ar: 'ملغي', en: 'Cancelled' },
  };
  return m[s]?.[lang] ?? s;
}

export function getEventTypeLabel(s: string, lang: 'ar' | 'en' = 'ar'): string {
  const m: Record<string, Record<'ar' | 'en', string>> = {
    WEDDING: { ar: 'زفاف', en: 'Wedding' },
    ENGAGEMENT: { ar: 'خطوبة', en: 'Engagement' },
    PARTY: { ar: 'حفلة', en: 'Party' },
    CORPORATE_EVENT: { ar: 'فعالية شركات', en: 'Corporate Event' },
    STUDIO_SESSION: { ar: 'جلسة استوديو', en: 'Studio Session' },
    OTHER: { ar: 'أخرى', en: 'Other' },
  };
  return m[s]?.[lang] ?? s;
}

export function getLeadStatusLabel(s: string, lang: 'ar' | 'en' = 'ar'): string {
  const m: Record<string, Record<'ar' | 'en', string>> = {
    NEW: { ar: 'جديد', en: 'New' },
    CONTACTED: { ar: 'تم التواصل', en: 'Contacted' },
    QUALIFIED: { ar: 'مؤهل', en: 'Qualified' },
    PROPOSAL_SENT: { ar: 'أُرسل عرض', en: 'Proposal Sent' },
    CONVERTED: { ar: 'تحول لعميل', en: 'Converted' },
    LOST: { ar: 'خسر', en: 'Lost' },
  };
  return m[s]?.[lang] ?? s;
}

export function getLeadSourceLabel(s: string, lang: 'ar' | 'en' = 'ar'): string {
  const m: Record<string, Record<'ar' | 'en', string>> = {
    WEBSITE: { ar: 'موقع الويب', en: 'Website' },
    TIKTOK: { ar: 'تيك توك', en: 'TikTok' },
    SNAPCHAT: { ar: 'سناب شات', en: 'Snapchat' },
    INSTAGRAM: { ar: 'إنستغرام', en: 'Instagram' },
    FACEBOOK: { ar: 'فيسبوك', en: 'Facebook' },
    WHATSAPP: { ar: 'واتساب', en: 'WhatsApp' },
    REFERRAL: { ar: 'إحالة', en: 'Referral' },
    WALK_IN: { ar: 'زيارة مباشرة', en: 'Walk-in' },
    PHONE: { ar: 'هاتف', en: 'Phone' },
    OTHER: { ar: 'أخرى', en: 'Other' },
  };
  return m[s]?.[lang] ?? s;
}

export function getCustomerStatusLabel(s: string, lang: 'ar' | 'en' = 'ar'): string {
  const m: Record<string, Record<'ar' | 'en', string>> = {
    LEAD: { ar: 'عميل محتمل', en: 'Lead' },
    ACTIVE: { ar: 'نشط', en: 'Active' },
    PREVIOUS_CUSTOMER: { ar: 'عميل سابق', en: 'Previous Customer' },
    VIP: { ar: 'VIP', en: 'VIP' },
    INACTIVE: { ar: 'غير نشط', en: 'Inactive' },
    BLACKLISTED: { ar: 'محظور', en: 'Blacklisted' },
  };
  return m[s]?.[lang] ?? s;
}

export function getRoleLabel(s: string, lang: 'ar' | 'en' = 'ar'): string {
  if (s === 'ADMIN' || s === 'SUPER_ADMIN') {
    return lang === 'ar' ? 'مدير النظام' : 'Admin';
  }
  return lang === 'ar' ? 'موظف' : 'Employee';
}

export function getCampaignStatusLabel(s: string, lang: 'ar' | 'en' = 'ar'): string {
  const m: Record<string, Record<'ar' | 'en', string>> = {
    DRAFT: { ar: 'مسودة', en: 'Draft' },
    SCHEDULED: { ar: 'مجدولة', en: 'Scheduled' },
    SENDING: { ar: 'جارٍ الإرسال', en: 'Sending' },
    IN_PROGRESS: { ar: 'جارية', en: 'In Progress' },
    SENT: { ar: 'مرسلة', en: 'Sent' },
    COMPLETED: { ar: 'مكتملة', en: 'Completed' },
    CANCELLED: { ar: 'ملغاة', en: 'Cancelled' },
  };
  return m[s]?.[lang] ?? s;
}

export function getExpenseCategoryLabel(s: string, lang: 'ar' | 'en' = 'ar'): string {
  const m: Record<string, Record<'ar' | 'en', string>> = {
    EQUIPMENT_RENTAL: { ar: 'إيجار معدات', en: 'Equipment Rental' },
    MAINTENANCE: { ar: 'صيانة', en: 'Maintenance' },
    MARKETING: { ar: 'تسويق', en: 'Marketing' },
    OTHER: { ar: 'أخرى', en: 'Other' },
    STAFF: { ar: 'رواتب', en: 'Staff' },
    STUDIO_RENT: { ar: 'إيجار الاستوديو', en: 'Studio Rent' },
    TRANSPORTATION: { ar: 'نقل', en: 'Transportation' },
    UTILITIES: { ar: 'مرافق', en: 'Utilities' },
    EQUIPMENT: { ar: 'معدات', en: 'Equipment' },
    SALARY: { ar: 'رواتب', en: 'Salary' },
    RENT: { ar: 'إيجار', en: 'Rent' },
    TRAVEL: { ar: 'سفر', en: 'Travel' },
    SUPPLIES: { ar: 'مستلزمات', en: 'Supplies' },
  };
  return m[s]?.[lang] ?? s;
}

export function getServiceCategoryLabel(s: string | null, lang: 'ar' | 'en' = 'ar'): string {
  if (!s) return lang === 'ar' ? 'بدون' : 'None';
  const m: Record<string, Record<'ar' | 'en', string>> = {
    Audio: { ar: 'صوت', en: 'Audio' },
    Editing: { ar: 'مونتاج', en: 'Editing' },
    Lighting: { ar: 'إضاءة', en: 'Lighting' },
    Photography: { ar: 'تصوير', en: 'Photography' },
    Print: { ar: 'طباعة', en: 'Print' },
    Rental: { ar: 'تأجير', en: 'Rental' },
    Videography: { ar: 'فيديو', en: 'Videography' },
  };
  return m[s]?.[lang] ?? s;
}

export function getInvoiceItemTypeLabel(s: string, lang: 'ar' | 'en' = 'ar'): string {
  const m: Record<string, Record<'ar' | 'en', string>> = {
    SERVICE: { ar: 'خدمة', en: 'Service' },
    EQUIPMENT: { ar: 'معدات', en: 'Equipment' },
    RENTAL: { ar: 'تأجير', en: 'Rental' },
    ADDITIONAL_CHARGE: { ar: 'رسوم إضافية', en: 'Additional Charge' },
    DISCOUNT: { ar: 'خصم', en: 'Discount' },
  };
  return m[s]?.[lang] ?? s;
}

export function getAuditActionLabel(s: string, lang: 'ar' | 'en' = 'ar'): string {
  const m: Record<string, Record<'ar' | 'en', string>> = {
    CREATE: { ar: 'إنشاء', en: 'Create' },
    UPDATE: { ar: 'تعديل', en: 'Update' },
    DELETE: { ar: 'حذف', en: 'Delete' },
    LOGIN: { ar: 'تسجيل دخول', en: 'Login' },
    LOGOUT: { ar: 'تسجيل خروج', en: 'Logout' },
    EXPORT: { ar: 'تصدير', en: 'Export' },
  };
  return m[s]?.[lang] ?? s;
}

export function getAuditEntityLabel(s: string, lang: 'ar' | 'en' = 'ar'): string {
  const m: Record<string, Record<'ar' | 'en', string>> = {
    Customer: { ar: 'عميل', en: 'Customer' },
    Booking: { ar: 'حجز', en: 'Booking' },
    Invoice: { ar: 'فاتورة', en: 'Invoice' },
    Payment: { ar: 'دفعة', en: 'Payment' },
    Expense: { ar: 'مصروف', en: 'Expense' },
    Equipment: { ar: 'معدة', en: 'Equipment' },
    Supplier: { ar: 'مورد', en: 'Supplier' },
    Service: { ar: 'خدمة', en: 'Service' },
    User: { ar: 'مستخدم', en: 'User' },
    Campaign: { ar: 'حملة', en: 'Campaign' },
    Lead: { ar: 'عميل محتمل', en: 'Lead' },
    Settings: { ar: 'الإعدادات', en: 'Settings' },
  };
  return m[s]?.[lang] ?? s;
}

export function getPaymentMethodLabel(method: string, lang: 'ar' | 'en' = 'ar'): string {
  const labels: Record<string, Record<'ar' | 'en', string>> = {
    CASH: { ar: 'نقدي', en: 'Cash' },
    BANK_TRANSFER: { ar: 'تحويل بنكي', en: 'Bank Transfer' },
    CARD: { ar: 'بطاقة', en: 'Card' },
    ONLINE_PAYMENT: { ar: 'دفع إلكتروني', en: 'Online Payment' },
    MADA: { ar: 'مدى', en: 'Mada' },
    MADA_PAY: { ar: 'مدى باي', en: 'Mada Pay' },
    STC_PAY: { ar: 'STC Pay', en: 'STC Pay' },
    APPLE_PAY: { ar: 'Apple Pay', en: 'Apple Pay' },
    GOOGLE_PAY: { ar: 'Google Pay', en: 'Google Pay' },
    TAMARA: { ar: 'تمارا', en: 'Tamara' },
    TABBY: { ar: 'تابي', en: 'Tabby' },
    SADAD: { ar: 'سداد', en: 'SADAD' },
    URPY: { ar: 'أورباي', en: 'Urpay' },
    CREDIT_CARD: { ar: 'بطاقة ائتمان', en: 'Credit Card' },
    DEBIT_CARD: { ar: 'بطاقة خصم', en: 'Debit Card' },
    CHEQUE: { ar: 'شيك', en: 'Cheque' },
    ONLINE: { ar: 'إلكتروني', en: 'Online' },
    OTHER: { ar: 'أخرى', en: 'Other' },
  };
  return labels[method]?.[lang] ?? method;
}

export function getEquipmentStatusLabel(status: string, lang: 'ar' | 'en' = 'ar'): string {
  const labels: Record<string, Record<'ar' | 'en', string>> = {
    AVAILABLE: { ar: 'متاح', en: 'Available' },
    RESERVED: { ar: 'محجوز', en: 'Reserved' },
    IN_USE: { ar: 'قيد الاستخدام', en: 'In Use' },
    MAINTENANCE: { ar: 'في الصيانة', en: 'Maintenance' },
    LOST: { ar: 'مفقود', en: 'Lost' },
    DAMAGED: { ar: 'تالف', en: 'Damaged' },
    UNAVAILABLE: { ar: 'غير متاح', en: 'Unavailable' },
  };
  return labels[status]?.[lang] ?? status;
}

/* ----------------------------------------------------------------------------
 * Arabic amount-to-words (invoice "amount in words")
 * ------------------------------------------------------------------------- */

const AR_ONES = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'];
const AR_TEENS = ['عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
const AR_TENS = ['', 'عشرة', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
const AR_HUNDREDS = ['', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];

function threeDigitsToArabic(n: number): string {
  if (n <= 0) return '';
  const h = Math.floor(n / 100);
  const rest = n % 100;
  let parts: string[] = [];
  if (h > 0) parts.push(AR_HUNDREDS[h]);
  if (rest > 0) {
    let rem = '';
    if (rest < 10) rem = AR_ONES[rest];
    else if (rest < 20) rem = AR_TEENS[rest - 10];
    else {
      const tens = Math.floor(rest / 10);
      const ones = rest % 10;
      rem = ones > 0 ? `${AR_ONES[ones]} و${AR_TENS[tens]}` : AR_TENS[tens];
    }
    parts.push(rem);
  }
  return parts.join(' و');
}

const GROUP_LABELS: { plural: string; dual: string; singular: string }[] = [
  { plural: '', dual: '', singular: '' },
  { plural: 'آلاف', dual: 'ألفان', singular: 'ألف' },
  { plural: 'ملايين', dual: 'مليونان', singular: 'مليون' },
  { plural: 'مليارات', dual: 'ملياران', singular: 'مليار' },
];

/** Convert a non-negative integer to Arabic words (up to billions). */
export function numberToArabicWords(value: number): string {
  const num = Math.floor(Math.abs(value));
  if (num === 0) return 'صفر';

  const groups: number[] = [];
  let n = num;
  while (n > 0) {
    groups.push(n % 1000);
    n = Math.floor(n / 1000);
  }

  const parts: string[] = [];
  for (let i = groups.length - 1; i >= 0; i--) {
    const g = groups[i];
    if (g === 0) continue;
    const gWords = threeDigitsToArabic(g);
    if (i === 0) {
      parts.push(gWords);
    } else {
      const label =
        g === 1
          ? GROUP_LABELS[i].singular
          : g === 2
            ? GROUP_LABELS[i].dual
            : g >= 3 && g <= 10
              ? `${gWords} ${GROUP_LABELS[i].plural}`
              : `${gWords} ${GROUP_LABELS[i].singular}`;
      parts.push(label);
    }
  }
  return parts.join(' و');
}

const CURRENCY_ARABIC: Record<string, string> = {
  SAR: 'ريال سعودي',
  EGP: 'جنيه مصري',
  AED: 'درهم إماراتي',
  KWD: 'دينار كويتي',
  QAR: 'ريال قطري',
  BHD: 'دينار بحريني',
  OMR: 'ريال عماني',
  USD: 'دولار أمريكي',
  EUR: 'يورو',
};

const CURRENCY_FRACTION: Record<string, string> = {
  SAR: 'هللة',
  EGP: 'قرش',
  KWD: 'فلس',
  BHD: 'فلس',
  QAR: 'درهم',
  BHD2: 'فلس',
  USD: 'سنت',
  EUR: 'سنت',
};

/** Convert a monetary amount to Arabic words, e.g. "فقط ألفان وخمسمائة ريال سعودي لا غير". */
export function amountToArabicWords(amount: number, currency: string = 'SAR'): string {
  const abs = Math.abs(Number(amount) || 0);
  const major = Math.floor(abs);
  const minor = Math.round((abs - major) * 100);
  const currencyLabel = CURRENCY_ARABIC[currency] ?? currency;

  let result = `فقط ${numberToArabicWords(major)} ${currencyLabel}`;
  if (minor > 0) {
    const fractionLabel = CURRENCY_FRACTION[currency] ?? 'هللة';
    result += ` و${numberToArabicWords(minor)} ${fractionLabel}`;
  }
  return `${result} لا غير`;
}
