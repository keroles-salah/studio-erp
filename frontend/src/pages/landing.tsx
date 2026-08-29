import { useState, useEffect, useRef, FormEvent } from 'react';
import {
  Camera,
  Video,
  Mic,
  Lightbulb,
  Package,
  Users,
  Award,
  Headphones,
  Star,
  ChevronDown,
  ChevronLeft,
  Phone,
  Mail,
  MapPin,
  MessageCircle,
  Calendar,
  User,
  Send,
  CheckCircle2,
  Menu,
  X,
  Facebook,
  Instagram,
  Twitter,
  Sparkles,
  Heart,
  Briefcase,
  Clock,
  Zap,
  ShieldCheck,
  Settings,
} from 'lucide-react';
import api from '../lib/api';
import { Link } from 'react-router-dom';
import { LANDING_COUNTER_DURATION_MS } from '../lib/constants';
import {
  BRAND_NAME,
  BRAND_PHONE,
  BRAND_WHATSAPP,
  BRAND_EMAIL,
  BRAND_LOCATION,
} from '../lib/brand';

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const WHATSAPP_NUMBER = BRAND_WHATSAPP;
const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_NUMBER}`;

const services = [
  {
    icon: Camera,
    title: 'تصوير الأفراح',
    desc: 'نلتقط أجمل لحظات فرحكم بكاميرات احترافية وجودة عالية تدوم مدى الحياة.',
  },
  {
    icon: Video,
    title: 'فيديو الأفراح',
    desc: 'تصوير فيديو سينمائي بأحدث التقنيات لتغطية كاملة ليوم زفافكم.',
  },
  {
    icon: Sparkles,
    title: 'تصوير استوديو',
    desc: 'جلسات تصوير احترافية في استوديو مجهز بأحدث الإضاءة والخلفيات.',
  },
  {
    icon: Users,
    title: 'تصوير الفعاليات',
    desc: 'تغطية كاملة للفعاليات والمؤتمرات والحفلات بجودة واحترافية عالية.',
  },
  {
    icon: Video,
    title: 'فيديو الفعاليات',
    desc: 'إنتاج فيديوهات احترافية للفعاليات والمؤتمرات والتغطيات الإعلامية.',
  },
  {
    icon: Mic,
    title: 'الصوت والإضاءة',
    desc: 'تجهيز أنظمة صوتية وإضاءة احترافية تناسب جميع المناسبات.',
  },
  {
    icon: Lightbulb,
    title: 'إعداد الإضاءة',
    desc: 'تصميم وتركيب أنظمة إضاءة مسرحية واحترافية لإضفاء أجواء ساحرة.',
  },
  {
    icon: Package,
    title: 'تأجير المعدات',
    desc: 'تأجير كاميرات وأجهزة صوت وإضاءة بأسعار تنافسية وضمان الجودة.',
  },
];

const portfolioGradients = [
  'from-rose-500 via-pink-500 to-purple-600',
  'from-amber-500 via-yellow-400 to-orange-300',
  'from-amber-500 via-orange-500 to-red-500',
  'from-emerald-500 via-green-500 to-lime-400',
  'from-amber-600 via-yellow-500 to-amber-400',
  'from-orange-500 via-amber-400 to-yellow-500',
];

const features = [
  {
    icon: Users,
    title: 'فريق محترف',
    desc: 'نخبة من المصورين والفنيين ذوي الخبرة الطويلة في مجال التصوير والإنتاج المرئي.',
  },
  {
    icon: Camera,
    title: 'معدات احترافية',
    desc: 'أحدث الكاميرات والأجهزة الصوتية وأنظمة الإضاءة العالمية لضمان أعلى جودة.',
  },
  {
    icon: Award,
    title: 'خبرة +5 سنوات',
    desc: 'سنوات من النجاحات المتواصلة في تغطية أكبر الفعاليات والأفراح في المملكة.',
  },
  {
    icon: Headphones,
    title: 'دعم 24/7',
    desc: 'فريق دعم متواصل على مدار الساعة للإجابة على استفساراتكم ومتابعة طلباتكم.',
  },
];

const packages = [
  {
    name: 'الباقة الأساسية',
    price: '2,500',
    features: [
      'تصوير فوتوغرافي للعرس (4 ساعات)',
      '100 صورة مصقولة',
      'فيديو قصير (2 دقيقة)',
      'ألبوم رقمي',
    ],
    highlighted: false,
  },
  {
    name: 'الباقة المميزة',
    price: '5,000',
    features: [
      'تصوير فوتوغرافي كامل (8 ساعات)',
      '250 صورة مصقولة',
      'فيديو سينمائي (5 دقائق)',
      'ألبوم فاخر مطبوع',
      'تغطية كاملة بالكاميرا الجوية',
    ],
    highlighted: true,
  },
  {
    name: 'الباقة الشاملة',
    price: '8,000',
    features: [
      'تصوير فوتوغرافي + فيديو طوال اليوم',
      'صور غير محدودة',
      'فيديو سينمائي + فيديو قصير',
      'ألبوم فاخر + طباعة فورية',
      'تغطية بالدرون + بث مباشر',
      'فريق مكون من 3 مصورين',
    ],
    highlighted: false,
  },
];

const testimonials = [
  {
    name: 'أحمد العتيبي',
    initials: 'أع',
    color: 'bg-rose-500',
    text: 'خدمة احترافية من البداية للنهاية. الصور جاءت رائعة جداً وفاقت توقعاتنا. أنصح بهم بشدة لكل من يبحث عن الجودة.',
  },
  {
    name: 'سارة المطيري',
    initials: 'سم',
    color: 'bg-amber-500',
    text: 'فريق متعاون ومحترف، التزموا بالموعد وسلّمونا العمل قبل الوقت المحدد. الفيديو السينمائي كان تحفة فنية حقيقية.',
  },
  {
    name: 'خالد القحطاني',
    initials: 'خق',
    color: 'bg-emerald-500',
    text: 'تعاملت معهم لتغطية مؤتمر شركتنا وكانت النتيجة ممتازة. تنظيم دقيق وجودة عالية في التصوير والصوت. شكراً لكم.',
  },
];

const stats = [
  { value: 500, label: 'فعالية تمت تغطيتها', suffix: '+' },
  { value: 300, label: 'عميل سعيد', suffix: '+' },
  { value: 50, label: 'عميل شركات', suffix: '+' },
  { value: 5, label: 'سنوات خبرة', suffix: '+' },
];

const faqs = [
  {
    q: 'كيف يمكنني الحجز؟',
    a: 'يمكنك الحجز عن طريق ملء نموذج التواصل في هذه الصفحة، أو التواصل معنا مباشرة عبر الواتساب أو الهاتف. سيقوم فريقنا بالرد عليك وتأكيد الموعد خلال 24 ساعة.',
  },
  {
    q: 'هل يتطلب الحجز دفعة مقدمة؟',
    a: 'نعم، نطلب دفعة مقدمة بنسبة 30% من قيمة الباقة لتأكيد الحجز. يمكن دفع الباقي قبل أو يوم الفعالية. الدفعة المقدمة غير قابلة للاسترداد.',
  },
  {
    q: 'ما هي سياسة الإلغاء؟',
    a: 'يمكن إلغاء الحجز قبل 14 يوماً من الموعد بنسبة استرداد 50% من الدفعة المقدمة. الإلغاء خلال 14 يوماً من الموعد ينتج عنه فقدان كامل الدفعة المقدمة.',
  },
  {
    q: 'هل توفرون المعدات الكاملة؟',
    a: 'نعم، نوفر جميع المعدات اللازمة من كاميرات وأجهزة صوت وإضوية وفريق تقني كامل. لا داعي للقلق بشأن أي جانب تقني.',
  },
  {
    q: 'ما هي مناطق التغطية؟',
    a: 'نغطي جميع مناطق المملكة العربية السعودية. قد تتطلب بعض المناطق رسوم انتقال إضافية حسب المسافة من مقرنا الرئيسي.',
  },
  {
    q: 'ما هي طرق الدفع المتاحة؟',
    a: 'نقبل الدفع النقدي، التحويل البنكي، مدى، فيزا، ماستركارد، وكذلك الدفع عبر Apple Pay و STC Pay.',
  },
];

const eventTypes = [
  'عرس',
  'خطوبة',
  'فعالية شركات',
  'مؤتمر',
  'حفل تخرج',
  'جلسة استوديو',
  'أخرى',
];

const serviceTypes = [
  'تصوير فوتوغرافي',
  'فيديو',
  'صوت وإضاءة',
  'تأجير معدات',
  'باقة متكاملة',
];

const socialLinks = [
  { icon: Instagram, label: 'Instagram', href: '#' },
  { icon: Twitter, label: 'Twitter', href: '#' },
  { icon: Facebook, label: 'Facebook', href: '#' },
];

const navLinks = [
  { href: '#solutions', label: 'حلولنا' },
  { href: '#portfolio', label: 'أعمالنا' },
  { href: '#why-us', label: 'لماذا نحن' },
  { href: '#packages', label: 'الباقات' },
  { href: '#faq', label: 'أسئلة شائعة' },
  { href: '#contact', label: 'تواصل معنا' },
];

/* ------------------------------------------------------------------ */
/*  Helper: Animated Counter                                           */
/* ------------------------------------------------------------------ */

function AnimatedCounter({ target, suffix }: { target: number; suffix: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !started.current) {
          started.current = true;
          const duration = LANDING_COUNTER_DURATION_MS;
          const startTime = performance.now();
          const step = (now: number) => {
            const progress = Math.min((now - startTime) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(eased * target));
            if (progress < 1) requestAnimationFrame(step);
            else setCount(target);
          };
          requestAnimationFrame(step);
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);

  return (
    <div ref={ref} className="text-4xl font-bold text-white sm:text-5xl">
      {count}
      {suffix}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function Landing() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Pull studio identity (name, phone, whatsapp, email, address) from the
  // public-facing settings endpoint so the landing page reflects the
  // actual configured studio rather than hardcoded fallback values.
  // Failures are non-fatal — we render with the brand fallbacks.
  const [studio, setStudio] = useState<{
    name: string;
    phone: string;
    whatsapp: string;
    email: string;
    address: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get('/settings/studio')
      .then((res) => {
        if (cancelled) return;
        const s = res.data?.data?.studio || {};
        setStudio({
          name: s['studio.name'] || BRAND_NAME,
          phone: s['studio.phone'] || BRAND_PHONE,
          whatsapp: s['studio.whatsapp'] || BRAND_WHATSAPP,
          email: s['studio.email'] || BRAND_EMAIL,
          address: s['studio.address'] || BRAND_LOCATION,
        });
      })
      .catch(() => {
        /* keep null — fallbacks will be used */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const studioName = studio?.name ?? BRAND_NAME;
  const studioPhone = studio?.phone ?? BRAND_PHONE;
  const studioEmail = studio?.email ?? BRAND_EMAIL;
  const studioAddress = studio?.address ?? BRAND_LOCATION;

  // Smooth scroll
  useEffect(() => {
    const handleClick = (e: Event) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a[href^="#"]');
      if (anchor) {
        const href = anchor.getAttribute('href');
        if (href && href.length > 1) {
          e.preventDefault();
          const el = document.querySelector(href);
          if (el) el.scrollIntoView({ behavior: 'smooth' });
          setMobileMenuOpen(false);
        }
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  // Capture UTM params on mount
  const utmRef = useRef({
    utm_source: '',
    utm_medium: '',
    utm_campaign: '',
    utm_content: '',
    utm_term: '',
  });
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    utmRef.current = {
      utm_source: params.get('utm_source') || '',
      utm_medium: params.get('utm_medium') || '',
      utm_campaign: params.get('utm_campaign') || '',
      utm_content: params.get('utm_content') || '',
      utm_term: params.get('utm_term') || '',
    };
  }, []);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError('');
    const form = e.currentTarget;
    const formData = new FormData(form);
    const payload: Record<string, unknown> = {
      name: formData.get('name'),
      phone: formData.get('phone'),
      whatsapp: formData.get('whatsapp') || formData.get('phone'),
      email: formData.get('email'),
      eventType: formData.get('event_type'),
      eventDate: formData.get('event_date'),
      location: formData.get('location'),
      requestedService: formData.get('requested_service'),
      message: formData.get('message'),
      utmSource: utmRef.current.utm_source,
      utmMedium: utmRef.current.utm_medium,
      utmCampaign: utmRef.current.utm_campaign,
      utmContent: utmRef.current.utm_content,
    };
    try {
      await api.post('/public/lead', payload);
      setSubmitSuccess(true);
      form.reset();
    } catch {
      setSubmitError('حدث خطأ أثناء إرسال الطلب. يرجى المحاولة مرة أخرى أو التواصل عبر واتساب.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div dir="rtl" lang="ar" className="min-h-screen bg-white font-arabic">
      {/* ===================== Navbar ===================== */}
      <header className="fixed top-0 inset-x-0 z-50 bg-white/90 backdrop-blur-md shadow-sm">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <a href="#hero" className="flex items-center gap-2 text-xl font-bold text-primary-700">
            <img src={`${import.meta.env.BASE_URL}logo.png`} alt={studioName} className="h-9 w-9 object-contain" />
            <span>{studioName}</span>
          </a>

          <div className="hidden items-center gap-6 lg:flex">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-slate-700 transition-colors hover:text-primary-600"
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="hidden items-center gap-3 lg:flex">
            <Link to="/login" className="text-sm font-semibold text-slate-600 transition-colors hover:text-primary-600">
              دخول الموظفين
            </Link>
            <a href="#contact" className="btn-primary text-sm">
              احجز الآن
            </a>
          </div>

          <button
            className="lg:hidden"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label="القائمة"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </nav>

        {mobileMenuOpen && (
          <div className="border-t border-slate-200 bg-white px-4 py-4 lg:hidden">
            <div className="flex flex-col gap-3">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  {link.label}
                </a>
              ))}
              <Link to="/login" className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">
                دخول الموظفين
              </Link>
              <a href="#contact" className="btn-primary text-sm">
                احجز الآن
              </a>
            </div>
          </div>
        )}
      </header>

      {/* ===================== 1. Hero ===================== */}
      <section
        id="hero"
        className="relative flex min-h-screen items-center justify-center overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-primary-900 to-primary-700" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30" />
        {/* Decorative circles */}
        <div className="absolute -top-24 -end-24 h-96 w-96 rounded-full bg-primary-500/20 blur-3xl" />
        <div className="absolute -bottom-32 -start-24 h-96 w-96 rounded-full bg-accent-500/10 blur-3xl" />

        <div className="relative z-10 mx-auto max-w-4xl px-4 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm text-primary-100 backdrop-blur-sm ring-1 ring-white/20">
            <Sparkles className="h-4 w-4" />
            <span>استوديو التصوير والفيديو الأول في المملكة</span>
          </div>

          <h1 className="mb-4 text-4xl font-bold leading-tight text-white sm:text-5xl md:text-6xl lg:text-7xl">
            {studioName}
          </h1>
          <p className="mb-2 text-2xl font-medium text-primary-100 sm:text-3xl">
            نحوّل لحظاتكم إلى ذكريات خالدة
          </p>
          <p className="mb-8 text-base text-slate-300 sm:text-lg md:text-xl">
            تصوير احترافي للأفراح والفعاليات | فيديو سينمائي | استوديو متكامل
          </p>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a href="#contact" className="btn-primary w-full px-8 py-3 text-base sm:w-auto">
              <Calendar className="h-5 w-5" />
              احجز الآن
            </a>
            <a
              href={WHATSAPP_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-green-500 px-8 py-3 text-base font-medium text-white transition-colors hover:bg-green-600 sm:w-auto"
            >
              <MessageCircle className="h-5 w-5" />
              تواصل معنا عبر WhatsApp
            </a>
          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-8 start-1/2 -translate-x-1/2 rtl:translate-x-1/2">
            <ChevronDown className="h-6 w-6 animate-bounce text-white/60" />
          </div>
        </div>
      </section>

      {/* ===================== 2. Solutions ===================== */}
      <section id="solutions" className="py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <span className="mb-2 block text-sm font-semibold uppercase tracking-wider text-primary-600">
              حلولنا
            </span>
            <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">
              حلول إنتاج وتصوير متكاملة
            </h2>
            <p className="mt-4 text-slate-600">
              نقدم باقة شاملة لتغطية جميع احتياجاتكم في التصوير والفيديو والصوت والإضاءة
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {services.map((service) => (
              <div
                key={service.title}
                className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-primary-200 hover:shadow-lg"
              >
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50 text-primary-600 transition-colors group-hover:bg-primary-600 group-hover:text-white">
                  <service.icon className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-lg font-bold text-slate-900">{service.title}</h3>
                <p className="mb-4 text-sm leading-relaxed text-slate-600">{service.desc}</p>
                <a
                  href="#contact"
                  className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700"
                >
                  اعرف المزيد
                  <ChevronLeft className="h-4 w-4" />
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== 3. Portfolio ===================== */}
      <section id="portfolio" className="bg-slate-50 py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <span className="mb-2 block text-sm font-semibold uppercase tracking-wider text-primary-600">
              أعمالنا
            </span>
            <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">
              من إنجازاتنا الأخيرة
            </h2>
            <p className="mt-4 text-slate-600">
              مجموعة مختارة من أعمالنا في تصوير الأفراح والفعاليات والمشاريع
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {portfolioGradients.map((gradient, i) => (
              <div
                key={i}
                className={`group relative h-64 overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} sm:h-72`}
              >
                <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
                  <div className="bg-black/40 px-6 py-3 backdrop-blur-sm rounded-full text-white text-sm font-medium">
                    عرض المشروع
                  </div>
                </div>
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/50 to-transparent p-4">
                  <p className="text-sm font-medium text-white">
                    {['عرس أحمد وسارة', 'مؤتمر الرياض', 'حفل التخرج', 'جلسة استوديو', 'فعالية شركات', 'حفل زفاف'][i]}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 text-center">
            <a href="#contact" className="btn-secondary px-8 py-3 text-base">
              عرض المزيد
              <ChevronLeft className="h-5 w-5" />
            </a>
          </div>
        </div>
      </section>

      {/* ===================== 4. Why Choose Us ===================== */}
      <section id="why-us" className="py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <span className="mb-2 block text-sm font-semibold uppercase tracking-wider text-primary-600">
              لماذا نحن
            </span>
            <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">
              لماذا تختار {studioName}؟
            </h2>
            <p className="mt-4 text-slate-600">
              نتميز بمجموعة من المميزات التي تجعلنا الخيار الأول لعملائنا
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm transition-all hover:shadow-md"
              >
                <div className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
                  <feature.icon className="h-8 w-8" />
                </div>
                <h3 className="mb-2 text-lg font-bold text-slate-900">{feature.title}</h3>
                <p className="text-sm leading-relaxed text-slate-600">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== 5. Packages ===================== */}
      <section id="packages" className="bg-slate-50 py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <span className="mb-2 block text-sm font-semibold uppercase tracking-wider text-primary-600">
              الباقات
            </span>
            <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">
              باقات تناسب جميع الاحتياجات
            </h2>
            <p className="mt-4 text-slate-600">
              اختر الباقة المناسبة لمناسببتكم واترك الباقي علينا
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {packages.map((pkg) => (
              <div
                key={pkg.name}
                className={`relative rounded-2xl border-2 bg-white p-8 shadow-sm transition-all hover:shadow-lg ${
                  pkg.highlighted
                    ? 'border-primary-600 shadow-md lg:-translate-y-4'
                    : 'border-slate-200'
                }`}
              >
                {pkg.highlighted && (
                  <div className="absolute -top-4 start-1/2 -translate-x-1/2 rtl:translate-x-1/2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary-600 px-4 py-1 text-xs font-bold text-white">
                      <Star className="h-3.5 w-3.5 fill-current" />
                      الأكثر طلباً
                    </span>
                  </div>
                )}

                <h3 className="mb-2 text-xl font-bold text-slate-900">{pkg.name}</h3>
                <div className="mb-6 flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-primary-600">{pkg.price}</span>
                  <span className="text-lg font-medium text-slate-500">ريال</span>
                </div>

                <ul className="mb-8 space-y-3">
                  {pkg.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-slate-600">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary-500" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <a
                  href="#contact"
                  className={`block w-full rounded-lg px-6 py-3 text-center text-sm font-medium transition-colors ${
                    pkg.highlighted
                      ? 'bg-primary-600 text-white hover:bg-primary-700'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  اختر الباقة
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== 6. Testimonials ===================== */}
      <section className="py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <span className="mb-2 block text-sm font-semibold uppercase tracking-wider text-primary-600">
              آراء عملائنا
            </span>
            <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">
              ماذا قال عملاؤنا عنا
            </h2>
            <p className="mt-4 text-slate-600">
              رضا عملائنا هو أكبر إنجازاتنا
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {testimonials.map((t) => (
              <div
                key={t.name}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="mb-4 flex gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="mb-6 leading-relaxed text-slate-600">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-full ${t.color} text-sm font-bold text-white`}
                  >
                    {t.initials}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">{t.name}</p>
                    <p className="text-sm text-slate-500">عميل موثّق</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== 7. Stats ===================== */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-900 via-primary-800 to-slate-900 py-20 lg:py-28">
        <div className="absolute -top-24 -start-24 h-96 w-96 rounded-full bg-primary-500/10 blur-3xl" />
        <div className="absolute -bottom-24 -end-24 h-96 w-96 rounded-full bg-accent-500/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-white sm:text-4xl">إنجازاتنا بالأرقام</h2>
            <p className="mt-4 text-primary-100">
              أرقام تعكس ثقة عملائنا وجودة خدماتنا
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <AnimatedCounter target={stat.value} suffix={stat.suffix} />
                <p className="mt-2 text-sm text-primary-200 sm:text-base">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== 8. FAQ ===================== */}
      <section id="faq" className="py-20 lg:py-28">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <span className="mb-2 block text-sm font-semibold uppercase tracking-wider text-primary-600">
              أسئلة شائعة
            </span>
            <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">
              الأسئلة المتكررة
            </h2>
            <p className="mt-4 text-slate-600">
              إجابات على أكثر الأسئلة شيوعاً حول خدماتنا
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className="overflow-hidden rounded-xl border border-slate-200 bg-white"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-end"
                >
                  <span className="font-medium text-slate-900">{faq.q}</span>
                  <ChevronDown
                    className={`h-5 w-5 shrink-0 text-slate-400 transition-transform ${
                      openFaq === i ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {openFaq === i && (
                  <div className="border-t border-slate-100 px-5 py-4 text-sm leading-relaxed text-slate-600">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== 9. Contact / Lead Form ===================== */}
      <section id="contact" className="bg-slate-50 py-20 lg:py-28">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <span className="mb-2 block text-sm font-semibold uppercase tracking-wider text-primary-600">
              تواصل معنا
            </span>
            <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">
              احجز موعدك الآن
            </h2>
            <p className="mt-4 text-slate-600">
              املأ النموذج وسيتواصل معك فريقنا خلال 24 ساعة
            </p>
          </div>

          {submitSuccess ? (
            <div className="rounded-2xl border border-green-200 bg-green-50 p-8 text-center">
              <CheckCircle2 className="mx-auto mb-4 h-16 w-16 text-green-500" />
              <h3 className="mb-2 text-xl font-bold text-green-800">تم إرسال طلبك بنجاح!</h3>
              <p className="text-green-700">
                شكراً لتواصلك معنا. سيقوم فريقنا بالرد عليك في أقرب وقت ممكن.
              </p>
              <button
                onClick={() => setSubmitSuccess(false)}
                className="mt-6 btn-secondary"
              >
                إرسال طلب آخر
              </button>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
            >
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                {/* Name */}
                <div>
                  <label htmlFor="name" className="label">
                    الاسم الكامل <span className="text-accent-600">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute end-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      id="name"
                      name="name"
                      type="text"
                      required
                      className="input pe-10"
                      placeholder="أدخل اسمك"
                    />
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label htmlFor="phone" className="label">
                    رقم الهاتف <span className="text-accent-600">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute end-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      required
                      className="input pe-10"
                      placeholder="05xxxxxxxx"
                    />
                  </div>
                </div>

                {/* WhatsApp */}
                <div>
                  <label htmlFor="whatsapp" className="label">
                    رقم الواتساب
                  </label>
                  <div className="relative">
                    <MessageCircle className="absolute end-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      id="whatsapp"
                      name="whatsapp"
                      type="tel"
                      className="input pe-10"
                      placeholder="9665xxxxxxxx"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="email" className="label">
                    البريد الإلكتروني
                  </label>
                  <div className="relative">
                    <Mail className="absolute end-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      id="email"
                      name="email"
                      type="email"
                      className="input pe-10"
                      placeholder="example@email.com"
                    />
                  </div>
                </div>

                {/* Event Type */}
                <div>
                  <label htmlFor="event_type" className="label">
                    نوع الفعالية <span className="text-accent-600">*</span>
                  </label>
                  <select id="event_type" name="event_type" required className="input">
                    <option value="">اختر نوع الفعالية</option>
                    {eventTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Event Date */}
                <div>
                  <label htmlFor="event_date" className="label">
                    تاريخ الفعالية <span className="text-accent-600">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="absolute end-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      id="event_date"
                      name="event_date"
                      type="date"
                      required
                      className="input pe-10"
                    />
                  </div>
                </div>

                {/* Location */}
                <div>
                  <label htmlFor="location" className="label">
                    الموقع <span className="text-accent-600">*</span>
                  </label>
                  <div className="relative">
                    <MapPin className="absolute end-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      id="location"
                      name="location"
                      type="text"
                      required
                      className="input pe-10"
                      placeholder="المدينة / المنطقة"
                    />
                  </div>
                </div>

                {/* Requested Service */}
                <div>
                  <label htmlFor="requested_service" className="label">
                    الخدمة المطلوبة <span className="text-accent-600">*</span>
                  </label>
                  <select id="requested_service" name="requested_service" required className="input">
                    <option value="">اختر الخدمة</option>
                    {serviceTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Message */}
              <div className="mt-5">
                <label htmlFor="message" className="label">
                  رسالتك
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows={4}
                  className="input resize-none"
                  placeholder="أخبرنا عن تفاصيل فعاليتك واحتياجاتك..."
                />
              </div>

              {/* Hidden UTM fields */}
              <input type="hidden" name="utm_source" value={utmRef.current.utm_source} />
              <input type="hidden" name="utm_medium" value={utmRef.current.utm_medium} />
              <input type="hidden" name="utm_campaign" value={utmRef.current.utm_campaign} />
              <input type="hidden" name="utm_content" value={utmRef.current.utm_content} />
              <input type="hidden" name="utm_term" value={utmRef.current.utm_term} />

              {submitError && (
                <div className="mt-4 rounded-lg bg-red-50 p-4 text-sm text-red-700">
                  {submitError}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-6 py-3 text-base font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    جاري الإرسال...
                  </>
                ) : (
                  <>
                    <Send className="h-5 w-5" />
                    إرسال الطلب
                  </>
                )}
              </button>

              <p className="mt-4 text-center text-xs text-slate-500">
                بالضغط على "إرسال الطلب" فإنك توافق على سياسة الخصوصية الخاصة بنا.
              </p>
            </form>
          )}
        </div>
      </section>

      {/* ===================== 10. Footer ===================== */}
      <footer className="bg-slate-900 text-slate-400">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
            {/* Brand */}
            <div className="md:col-span-1">
              <div className="flex items-center gap-2 text-xl font-bold text-white">
                <img src={`${import.meta.env.BASE_URL}logo.png`} alt={studioName} className="h-8 w-8 object-contain" />
                <span>{studioName}</span>
              </div>
              <p className="mt-4 text-sm leading-relaxed">
                استوديو احترافي متخصص في تصوير الأفراح والفعاليات وإنتاج الفيديو بأعلى معايير الجودة.
              </p>
              <div className="mt-5 flex gap-3">
                {socialLinks.map((social) => (
                  <a
                    key={social.label}
                    href={social.href}
                    aria-label={social.label}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-slate-800 text-slate-400 transition-colors hover:bg-primary-600 hover:text-white"
                  >
                    <social.icon className="h-5 w-5" />
                  </a>
                ))}
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-white">
                روابط سريعة
              </h3>
              <ul className="space-y-2 text-sm">
                {navLinks.map((link) => (
                  <li key={link.href}>
                    <a href={link.href} className="transition-colors hover:text-primary-400">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Services */}
            <div>
              <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-white">
                خدماتنا
              </h3>
              <ul className="space-y-2 text-sm">
                {services.slice(0, 6).map((service) => (
                  <li key={service.title}>
                    <a href="#services" className="transition-colors hover:text-primary-400">
                      {service.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact Info */}
            <div>
              <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-white">
                معلومات التواصل
              </h3>
              <ul className="space-y-3 text-sm">
                <li className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-primary-400" />
                  <span dir="ltr">{studioPhone}</span>
                </li>
                <li className="flex items-center gap-3">
                  <MessageCircle className="h-4 w-4 text-green-400" />
                  <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer" className="hover:text-primary-400">
                    واتساب
                  </a>
                </li>
                <li className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-primary-400" />
                  <span>{studioEmail}</span>
                </li>
                <li className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-primary-400" />
                  <span>{studioAddress}</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 border-t border-slate-800 pt-6 text-center text-sm">
            <p>
              © {new Date().getFullYear()} {studioName}. جميع الحقوق محفوظة.
            </p>
          </div>
        </div>
      </footer>

      {/* Floating WhatsApp button */}
      <a
        href={WHATSAPP_LINK}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="تواصل عبر واتساب"
        className="fixed bottom-6 start-6 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full bg-green-500 text-white shadow-lg transition-all hover:bg-green-600 hover:scale-110"
      >
        <MessageCircle className="h-7 w-7" />
        <span className="absolute -top-1 -end-1 flex h-4 w-4">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex h-4 w-4 rounded-full bg-green-500" />
        </span>
      </a>
    </div>
  );
}
