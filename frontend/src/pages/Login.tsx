import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
  BarChart3,
  ArrowUpRight,
  Globe,
} from 'lucide-react';
import api from '../lib/api';
import { BRAND_NAME } from '../lib/brand';

interface LoginProps {
  onLogin: () => void;
}

export default function Login({ onLogin }: LoginProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      const { accessToken, refreshToken, user } = res.data.data;
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      if (user) localStorage.setItem('user', JSON.stringify(user));
      onLogin();
      navigate('/dashboard');
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || err?.response?.data?.message || t('auth.loginError'));
    } finally {
      setLoading(false);
    }
  };

  const toggleLanguage = () => i18n.changeLanguage(i18n.language === 'ar' ? 'en' : 'ar');

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950">
      <div className="pointer-events-none absolute -start-40 -top-40 h-[32rem] w-[32rem] rounded-full bg-primary-600/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-48 -end-32 h-[34rem] w-[34rem] rounded-full bg-primary-500/15 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:56px_56px]" />

      <div className="relative z-10 grid min-h-screen w-full lg:grid-cols-2">
          <section className="relative hidden overflow-hidden p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-16">
            <div className="absolute -bottom-20 -end-20 h-72 w-72 rounded-full border border-primary-300/20" />
            <div className="absolute -bottom-10 -end-10 h-52 w-52 rounded-full border border-primary-300/10" />
            <div>
              <div className="mb-16 flex items-center gap-3">
                <img src={`${import.meta.env.BASE_URL}logo.png`} alt={BRAND_NAME} className="h-11 w-11 object-contain drop-shadow-[0_6px_18px_rgba(0,0,0,0.45)]" />
                <div>
                  <p className="font-bold tracking-tight">{BRAND_NAME}</p>
                  <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-slate-400">نظام الإدارة</p>
                </div>
              </div>
              <p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-primary-300">شغّل استوديو الخاص بك بذكاء</p>
              <h1 className="max-w-lg text-4xl font-bold leading-[1.2] tracking-tight xl:text-5xl">
                كل تفاصيل الاستوديو،<br />
                <span className="text-primary-300">في مكان واحد.</span>
              </h1>
              <p className="mt-6 max-w-md text-sm leading-7 text-slate-300">
                منصة تشغيل متكاملة تساعدك على إدارة العملاء والحجوزات والفريق والماليات بسهولة ووضوح.
              </p>
            </div>

            <div>
              <div className="mb-8 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                  <BarChart3 className="mb-6 h-5 w-5 text-primary-300" />
                  <p className="text-2xl font-bold">متكامل</p>
                  <p className="mt-1 text-xs text-slate-400">كل الأدوات في منصة واحدة</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                  <ShieldCheck className="mb-6 h-5 w-5 text-emerald-300" />
                  <p className="text-2xl font-bold">24/7</p>
                  <p className="mt-1 text-xs text-slate-400">بيانات آمنة وموثوقة</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_0_4px_rgba(52,211,153,0.12)]" />
                منصة تشغيل متكاملة للاستوديو
              </div>
            </div>
          </section>

          <section className="relative flex items-center justify-center bg-white p-7 sm:p-10 lg:p-14">
            <div className="w-full max-w-md">
            <button type="button" onClick={toggleLanguage} className="absolute end-6 top-6 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-slate-500 transition hover:bg-slate-100 hover:text-slate-800">
              <Globe className="h-4 w-4" />
              {i18n.language === 'ar' ? 'الإنجليزية' : 'العربية'}
            </button>

            <div className="mb-10 lg:mt-8">
              <img src={`${import.meta.env.BASE_URL}logo.png`} alt={BRAND_NAME} className="mb-5 h-12 w-12 object-contain lg:hidden" />
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-primary-600">مرحباً بعودتك</p>
              <h2 className="text-3xl font-bold tracking-tight text-slate-950">{t('auth.login')}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">سجّل دخولك للوصول إلى مساحة العمل الخاصة بك.</p>
            </div>

            {error && (
              <div className="mb-5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700" role="alert">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="label" htmlFor="email">{t('auth.email')}</label>
                <div className="relative">
                  <Mail className="absolute start-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
                  <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input h-12 ps-11" placeholder="admin@studio.com" dir="ltr" />
                </div>
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="label mb-0" htmlFor="password">{t('auth.password')}</label>
                  <button type="button" className="text-xs font-bold text-primary-600 hover:text-primary-700">نسيت كلمة المرور؟</button>
                </div>
                <div className="relative">
                  <Lock className="absolute start-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
                  <input id="password" type={showPassword ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)} className="input h-12 ps-11 pe-11" placeholder="••••••••" dir="ltr" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute end-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700" aria-label={showPassword ? 'Hide password' : 'Show password'}>
                    {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn-primary mt-2 h-12 w-full">
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><span>{t('auth.login')}</span><ArrowUpRight className="h-4 w-4" /></>}
              </button>
            </form>

            <div className="mt-8 flex items-center gap-3 rounded-2xl bg-slate-50 p-3.5">
              <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-500" />
              <p className="text-xs leading-5 text-slate-500">بياناتك محمية بتشفير آمن ولا يمكن الوصول إليها إلا من حسابك.</p>
            </div>
              <p className="mt-8 text-center text-xs text-slate-400">© {new Date().getFullYear()} {BRAND_NAME}. All rights reserved.</p>
            </div>
          </section>
        </div>
    </div>
  );
}
