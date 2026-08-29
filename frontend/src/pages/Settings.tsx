import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  DollarSign,
  Globe,
  Palette,
  Save,
  Loader2,
  Landmark,
  CheckCircle2,
} from 'lucide-react';
import api from '../lib/api';
import { SAVE_SUCCESS_DURATION_MS } from '../lib/constants';

const TABS = [
  { key: 'studio', label: 'بيانات الاستوديو والفوترة', icon: Building2, desc: 'الاسم، الشعار، الرقم الضريبي، وبيانات التواصل' },
  { key: 'bank', label: 'الحسابات البنكية والسداد', icon: Landmark, desc: 'بيانات الحساب والآيبان المعروضة على الفواتير' },
  { key: 'finance', label: 'المالية والضرائب', icon: DollarSign, desc: 'العملات، نسب الضرائب، والبادئات' },
  { key: 'language', label: 'اللغة والنظام', icon: Globe, desc: 'اللغة الافتراضية واتجاه الواجهة' },
  { key: 'appearance', label: 'المظهر', icon: Palette, desc: 'ألوان المنظومة ونمط القوائم' },
] as const;

const FIELD_TO_SETTING: Record<string, { key: string; category: string }> = {
  // Studio & Identity
  studioName: { key: 'studio.name', category: 'studio' },
  logo: { key: 'studio.logo', category: 'studio' },
  phone: { key: 'studio.phone', category: 'studio' },
  whatsapp: { key: 'studio.whatsapp', category: 'studio' },
  email: { key: 'studio.email', category: 'studio' },
  address: { key: 'studio.address', category: 'studio' },
  website: { key: 'studio.website', category: 'studio' },

  // Tax & Legal
  vatNumber: { key: 'studio.vat_number', category: 'studio' },
  crNumber: { key: 'studio.cr_number', category: 'studio' },

  // Bank & Payment
  bankName: { key: 'studio.bank_name', category: 'studio' },
  accountName: { key: 'studio.account_name', category: 'studio' },
  iban: { key: 'studio.iban', category: 'studio' },
  accountNumber: { key: 'studio.account_number', category: 'studio' },

  // Invoice Custom Text
  invoiceNotes: { key: 'studio.invoice_notes', category: 'studio' },
  invoiceFooter: { key: 'studio.invoice_footer', category: 'studio' },

  // Finance
  currency: { key: 'studio.currency', category: 'finance' },
  currencySymbol: { key: 'studio.currency_symbol', category: 'finance' },
  taxRate: { key: 'studio.tax_rate', category: 'finance' },
  invoicePrefix: { key: 'studio.invoice_prefix', category: 'finance' },
  bookingPrefix: { key: 'studio.booking_prefix', category: 'finance' },
  taxEnabled: { key: 'studio.tax_enabled', category: 'finance' },

  // App & Localization
  defaultLanguage: { key: 'app.default_language', category: 'app' },
  direction: { key: 'app.default_direction', category: 'app' },
  themeColor: { key: 'app.theme_color', category: 'app' },
  sidebarStyle: { key: 'app.sidebar_style', category: 'app' },
};

export default function Settings() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<typeof TABS[number]['key']>('studio');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const { data: settings, isLoading } = useQuery<Record<string, any>>({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await api.get('/settings/studio');
      const grouped = res.data.data || {};
      const flat: Record<string, string> = {};
      for (const cat of Object.values(grouped)) {
        if (cat && typeof cat === 'object') {
          for (const [k, v] of Object.entries(cat as Record<string, string>)) {
            flat[k] = String(v ?? '');
          }
        }
      }
      const normalized: Record<string, any> = {};
      for (const [field, { key }] of Object.entries(FIELD_TO_SETTING)) {
        normalized[field] = flat[key] ?? '';
      }
      normalized.taxEnabled = flat['studio.tax_enabled'] === 'true';
      return normalized;
    },
  });

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);

    const fd = new FormData(e.currentTarget);
    const formValues = Object.fromEntries(fd) as Record<string, string>;

    const settingsPayload = Object.entries(FIELD_TO_SETTING).map(([field, { key, category }]) => {
      let value = formValues[field] ?? '';
      if (field === 'taxEnabled') {
        value = formValues[field] ? 'true' : 'false';
      }
      return { key, value, category };
    });

    try {
      await api.patch('/settings', { settings: settingsPayload });
      await queryClient.invalidateQueries({ queryKey: ['settings'] });
      await queryClient.invalidateQueries({ queryKey: ['invoice'] });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), SAVE_SUCCESS_DURATION_MS);
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-32 bg-slate-100 rounded animate-pulse" />
        <div className="card animate-pulse h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('nav.settings')}</h1>
          <p className="text-sm text-slate-500 mt-1">
            إدارة الهوية المؤسسية، بيانات الفوترة والضرائب، الحسابات البنكية، وتفضيلات النظام
          </p>
        </div>

        {saveSuccess && (
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 border border-emerald-200 animate-in fade-in">
            <CheckCircle2 className="h-4 w-4" />
            <span>تم حفظ التعديلات بنجاح وستظهر مباشرة في الفواتير والنظام</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Tabs Sidebar */}
        <div className="card p-2 space-y-1 h-fit">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`w-full flex items-start gap-3 p-3 rounded-xl text-start transition-all ${
                activeTab === tab.key
                  ? 'bg-primary-50 text-primary-700 shadow-sm shadow-primary-100/50'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <tab.icon className={`w-5 h-5 shrink-0 mt-0.5 ${activeTab === tab.key ? 'text-primary-600' : 'text-slate-400'}`} />
              <div>
                <p className="text-sm font-bold leading-snug">{tab.label}</p>
                <p className="text-[11px] text-slate-400 leading-tight mt-0.5 line-clamp-1">{tab.desc}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Tab Content Form */}
        <div className="lg:col-span-3">
          <form onSubmit={handleSave} className="card space-y-6 p-6 sm:p-8">
            {/* 1. STUDIO & INVOICE TAB */}
            {activeTab === 'studio' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-primary-600" />
                    بيانات الاستوديو وهوية الفواتير
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    هذه البيانات تظهر في أعلى ترويسة الفاتورة الرسمية وبطاقات التواصل
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="label">اسم الاستوديو التجاري (الاسم الظاهر بالفاتورة)</label>
                    <input
                      name="studioName"
                      defaultValue={settings?.studioName}
                      placeholder="مثال: REAL HOME LENS"
                      className="input font-semibold"
                      required
                    />
                  </div>

                  <div>
                    <label className="label">الرقم الضريبي (VAT Number)</label>
                    <input
                      name="vatNumber"
                      defaultValue={settings?.vatNumber}
                      placeholder="300984729100003"
                      className="input font-mono"
                      dir="ltr"
                    />
                  </div>

                  <div>
                    <label className="label">رقم السجل التجاري (CR Number)</label>
                    <input
                      name="crNumber"
                      defaultValue={settings?.crNumber}
                      placeholder="1010894721"
                      className="input font-mono"
                      dir="ltr"
                    />
                  </div>

                  <div>
                    <label className="label">رقم الهاتف الرسمي</label>
                    <input
                      name="phone"
                      defaultValue={settings?.phone}
                      placeholder="+966 50 000 0000"
                      className="input font-mono"
                      dir="ltr"
                    />
                  </div>

                  <div>
                    <label className="label">رقم الواتساب المعتمد</label>
                    <input
                      name="whatsapp"
                      defaultValue={settings?.whatsapp}
                      placeholder="+966 50 000 0000"
                      className="input font-mono"
                      dir="ltr"
                    />
                  </div>

                  <div>
                    <label className="label">البريد الإلكتروني للفوترة</label>
                    <input
                      name="email"
                      type="email"
                      defaultValue={settings?.email}
                      placeholder="info@realhomelens.com"
                      className="input font-mono"
                      dir="ltr"
                    />
                  </div>

                  <div>
                    <label className="label">الموقع الإلكتروني</label>
                    <input
                      name="website"
                      defaultValue={settings?.website}
                      placeholder="www.realhomelens.com"
                      className="input font-mono"
                      dir="ltr"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="label">العنوان والمقر الرئيسي</label>
                    <input
                      name="address"
                      defaultValue={settings?.address}
                      placeholder="المملكة العربية السعودية - الرياض"
                      className="input"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="label">رابط أو مسار الشعار (Logo URL)</label>
                    <input
                      name="logo"
                      defaultValue={settings?.logo}
                      placeholder="/logo.png"
                      className="input font-mono text-xs"
                      dir="ltr"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="label">ملاحظات وشروط الفاتورة الافتراضية</label>
                    <textarea
                      name="invoiceNotes"
                      rows={3}
                      defaultValue={settings?.invoiceNotes}
                      placeholder="أي شروط أو أحكام إضافية ترغب في إظهارها في أسفل كل فاتورة..."
                      className="input py-2"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 2. BANK & PAYMENT TAB */}
            {activeTab === 'bank' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Landmark className="w-5 h-5 text-primary-600" />
                    بيانات السداد والحساب البنكي
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    هذه الحسابات تظهر في بطاقة "بيانات التحويل البنكي" على الفاتورة لتسهيل سداد العملاء
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">اسم البنك</label>
                    <input
                      name="bankName"
                      defaultValue={settings?.bankName}
                      placeholder="مصرف الراجحي / Al Rajhi Bank"
                      className="input font-semibold"
                    />
                  </div>

                  <div>
                    <label className="label">اسم المستفيد / صاحب الحساب</label>
                    <input
                      name="accountName"
                      defaultValue={settings?.accountName}
                      placeholder="شركة ريل هوم لينس للإنتاج"
                      className="input"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="label">رقم الآيبان الدولي (IBAN)</label>
                    <input
                      name="iban"
                      defaultValue={settings?.iban}
                      placeholder="SA4480000456608010123456"
                      className="input font-mono font-bold text-slate-800"
                      dir="ltr"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="label">رقم الحساب المحلي (اختياري)</label>
                    <input
                      name="accountNumber"
                      defaultValue={settings?.accountNumber}
                      placeholder="456608010123456"
                      className="input font-mono"
                      dir="ltr"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 3. FINANCE TAB */}
            {activeTab === 'finance' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-primary-600" />
                    الإعدادات المالية والضرائب
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    ضبط العملة الافتراضية، نسبة الضريبة، وبادئات أرقام الفواتير والحجوزات
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">العملة الافتراضية</label>
                    <select name="currency" defaultValue={settings?.currency || 'SAR'} className="input font-semibold">
                      <option value="SAR">ريال سعودي (SAR)</option>
                      <option value="EGP">جنيه مصري (EGP)</option>
                      <option value="AED">درهم إماراتي (AED)</option>
                      <option value="KWD">دينار كويتي (KWD)</option>
                      <option value="QAR">ريال قطري (QAR)</option>
                      <option value="BHD">دينار بحريني (BHD)</option>
                      <option value="OMR">ريال عماني (OMR)</option>
                      <option value="USD">دولار أمريكي (USD)</option>
                      <option value="EUR">يورو (EUR)</option>
                    </select>
                  </div>

                  <div>
                    <label className="label">رمز العملة المختصر</label>
                    <input
                      name="currencySymbol"
                      defaultValue={settings?.currencySymbol || 'ر.س'}
                      placeholder="ر.س"
                      className="input"
                    />
                  </div>

                  <div>
                    <label className="label">نسبة ضريبة القيمة المضافة (٪)</label>
                    <input
                      name="taxRate"
                      type="number"
                      step="0.1"
                      defaultValue={settings?.taxRate ?? 15}
                      className="input font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="label">بادئة أرقام الفواتير (Prefix)</label>
                    <input
                      name="invoicePrefix"
                      defaultValue={settings?.invoicePrefix || 'INV'}
                      placeholder="INV"
                      className="input font-mono uppercase"
                      dir="ltr"
                    />
                  </div>

                  <div>
                    <label className="label">بادئة أرقام الحجوزات (Prefix)</label>
                    <input
                      name="bookingPrefix"
                      defaultValue={settings?.bookingPrefix || 'BK'}
                      placeholder="BK"
                      className="input font-mono uppercase"
                      dir="ltr"
                    />
                  </div>

                  <div className="flex items-center gap-3 pt-6">
                    <input
                      type="checkbox"
                      name="taxEnabled"
                      defaultChecked={settings?.taxEnabled}
                      id="taxEnabled"
                      className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                    />
                    <label htmlFor="taxEnabled" className="text-sm font-semibold text-slate-800 cursor-pointer">
                      تفعيل احتساب الضريبة على الفواتير
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* 4. LANGUAGE & SYSTEM TAB */}
            {activeTab === 'language' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Globe className="w-5 h-5 text-primary-600" />
                    إعدادات اللغة والمنظومة
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    تحديد اللغة والاتجاه الافتراضي لواجهة الاستخدام
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">اللغة الافتراضية</label>
                    <select
                      name="defaultLanguage"
                      defaultValue={settings?.defaultLanguage || 'ar'}
                      className="input"
                      onChange={(e) => i18n.changeLanguage(e.target.value)}
                    >
                      <option value="ar">العربية (Arabic)</option>
                      <option value="en">الإنجليزية (English)</option>
                    </select>
                  </div>

                  <div>
                    <label className="label">اتجاه النصوص (Direction)</label>
                    <select name="direction" defaultValue={settings?.direction || 'rtl'} className="input">
                      <option value="rtl">من اليمين لليسار (RTL - عربي)</option>
                      <option value="ltr">من اليسار لليمين (LTR - إنجليزي)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* 5. APPEARANCE TAB */}
            {activeTab === 'appearance' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Palette className="w-5 h-5 text-primary-600" />
                    إعدادات المظهر
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    تخصيص ألوان الهوية والشريط الجانبي
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="label">نمط الشريط الجانبي</label>
                    <select name="sidebarStyle" defaultValue={settings?.sidebarStyle || 'dark'} className="input">
                      <option value="dark">داكن (Luxury Dark - افتراضي)</option>
                      <option value="light">فاتح (Clean Light)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Actions Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-slate-100">
              <p className="text-xs text-slate-400">
                سيتم تحديث كافة الفواتير الجديدة والسابقة بالبيانات المحفوظة فورياً
              </p>

              <button
                type="submit"
                disabled={saving}
                className="btn-primary inline-flex items-center gap-2 px-6 py-2.5 shadow-md shadow-primary-600/20"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>{saving ? 'جارٍ الحفظ...' : 'حفظ التغييرات'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
