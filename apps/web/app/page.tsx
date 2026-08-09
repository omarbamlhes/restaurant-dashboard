'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import RustaqIcon from '@/components/brand/RustaqIcon';
import Reveal from '@/components/shared/Reveal';
import SARSymbol from '@/components/shared/SARSymbol';
import {
  BarChart3, Users, Package, Bell, FileText, Settings, Shield,
  ChevronLeft, Star, Zap, Globe, ArrowLeft, Menu, X, ChefHat, Store,
  Clock, Smartphone, PieChart, BrainCircuit, Check, Crown, Plus, Minus,
} from 'lucide-react';

const FEATURES = [
  {
    icon: BarChart3,
    title: 'تحليلات ذكية',
    description: 'تحليل شامل للمبيعات والأرباح مع رسوم بيانية تفاعلية وتقارير يومية وأسبوعية وشهرية',
    color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
  },
  {
    icon: Package,
    title: 'إدارة المخزون',
    description: 'تتبع المكونات والمواد مع تنبيهات تلقائية عند انخفاض المخزون وسجل كامل للحركات',
    color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
  },
  {
    icon: ChefHat,
    title: 'إدارة القائمة',
    description: 'تنظيم الأصناف حسب الفئات مع حساب هوامش الربح وتكلفة كل صنف تلقائياً',
    color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
  },
  {
    icon: Users,
    title: 'إدارة الموظفين',
    description: 'متابعة فريق العمل، الأدوار، الرواتب، وتوزيع الموظفين على الفروع',
    color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
  },
  {
    icon: Store,
    title: 'إدارة الفروع',
    description: 'إدارة جميع فروع المطعم من لوحة واحدة مع إحصائيات مستقلة لكل فرع',
    color: 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400',
  },
  {
    icon: BrainCircuit,
    title: 'توصيات ذكية',
    description: 'تنبؤات بالمبيعات وتوصيات لتحسين القائمة وتقليل الهدر باستخدام الذكاء الاصطناعي',
    color: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400',
  },
];

const STATS = [
  { value: '١٢٠٠+', label: 'مطعم يستخدم رستق' },
  { value: '٥٠٠ ألف+', label: 'طلب يُعالج يومياً' },
  { value: '٣٠%', label: 'متوسط التوفير الشهري' },
  { value: '٢٤/٧', label: 'دعم فني متواصل' },
];

const PLANS = [
  {
    id: 'BASIC',
    name: 'الأساسية',
    description: 'للمطاعم الصغيرة والمقاهي',
    price: 299,
    icon: Zap,
    popular: false,
    accent: 'text-emerald-600 dark:text-emerald-400',
    highlights: ['فرع واحد', '٣ مستخدمين', 'نقطة بيع + شاشة مطبخ', 'تقارير أساسية'],
  },
  {
    id: 'PRO',
    name: 'الاحترافية',
    description: 'للمطاعم المتنامية',
    price: 699,
    icon: Star,
    popular: true,
    accent: 'text-blue-600 dark:text-blue-400',
    highlights: ['٣ فروع', '١٠ مستخدمين', 'مخزون + عملاء + موظفين', 'تقارير متقدمة + تصدير PDF'],
  },
  {
    id: 'ENTERPRISE',
    name: 'المؤسسية',
    description: 'لسلاسل المطاعم',
    price: 1499,
    icon: Crown,
    popular: false,
    accent: 'text-purple-600 dark:text-purple-400',
    highlights: ['فروع غير محدودة', 'مستخدمين غير محدودين', 'تحليلات ذكاء اصطناعي', 'وايت ليبل + مدير حساب'],
  },
];

const FAQS = [
  {
    q: 'هل أحتاج بطاقة ائتمانية لبدء التجربة؟',
    a: 'لا. تبدأ تجربتك المجانية لمدة ١٤ يوم بكامل مميزات الباقة الاحترافية بدون أي بطاقة، وتقرر بعدها إذا حبيت تكمل.',
  },
  {
    q: 'هل أقدر أغيّر الباقة أو ألغي في أي وقت؟',
    a: 'نعم، تقدر ترقّي أو تنزّل باقتك أو تلغي الاشتراك في أي وقت من لوحة التحكم بدون أي رسوم إلغاء.',
  },
  {
    q: 'هل رستق يدعم عدة فروع؟',
    a: 'أكيد. تدير كل فروعك من لوحة واحدة مع إحصائيات مستقلة لكل فرع ومقارنة أدائها. الباقة المؤسسية تدعم فروع غير محدودة.',
  },
  {
    q: 'هل بياناتي آمنة؟',
    a: 'بياناتك مشفّرة بالكامل مع نسخ احتياطي تلقائي يومي، وتُستضاف على بنية تحتية موثوقة. أنت المالك الوحيد لبياناتك.',
  },
  {
    q: 'هل الفواتير متوافقة مع هيئة الزكاة والضريبة (ZATCA)؟',
    a: 'نعم، الفواتير تدعم متطلبات الفوترة الإلكترونية السعودية بما فيها رمز QR الضريبي ورقم الضريبة.',
  },
  {
    q: 'كيف أحصل على الدعم الفني؟',
    a: 'الدعم متواصل ٢٤/٧ عبر البريد والواتساب. الباقات الأعلى تحصل على أولوية في الرد ومدير حساب مخصص.',
  },
];

const TESTIMONIALS = [
  {
    name: 'عبدالله المالكي',
    role: 'مالك مطعم بيتزا الشام',
    text: 'رستق غيّر طريقة إدارتي للمطعم بالكامل. التحليلات ساعدتني أعرف أكثر الأصناف ربحاً وأركّز عليها.',
  },
  {
    name: 'نورة العتيبي',
    role: 'مديرة كافيه بلوم',
    text: 'تنبيهات المخزون وفّرت علينا هدر كبير. صرنا نطلب الكميات الصح في الوقت الصح.',
  },
  {
    name: 'فهد الدوسري',
    role: 'مالك سلسلة مطاعم',
    text: 'أدير ٥ فروع من لوحة واحدة وأقدر أقارن أداء كل فرع بسهولة. خدمة ممتازة.',
  },
];

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-dark-bg">
      {/* Navbar */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/80 dark:bg-dark-card/80 backdrop-blur-xl shadow-sm' : ''}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <RustaqIcon size={40} />
              <span className="text-xl font-bold" style={{
                background: 'linear-gradient(135deg, #3cb878 0%, #2d8a5e 50%, #e8c352 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>رستق</span>
            </div>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">المميزات</a>
              <a href="#pricing" className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">الأسعار</a>
              <a href="#testimonials" className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">آراء العملاء</a>
              <a href="#faq" className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">الأسئلة</a>
            </div>

            <div className="hidden md:flex items-center gap-3">
              <Link href="/login" className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors px-4 py-2">
                تسجيل الدخول
              </Link>
              <Link href="/register" className="btn-primary text-sm !px-6">
                ابدأ مجاناً
              </Link>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-hover"
              aria-label={mobileMenuOpen ? 'إغلاق القائمة' : 'فتح القائمة'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-5 h-5 text-gray-700 dark:text-gray-300" /> : <Menu className="w-5 h-5 text-gray-700 dark:text-gray-300" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white dark:bg-dark-card border-t border-gray-200 dark:border-dark-border">
            <div className="px-4 py-4 space-y-3">
              <a href="#features" onClick={() => setMobileMenuOpen(false)} className="block text-sm text-gray-600 dark:text-gray-400 py-2">المميزات</a>
              <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="block text-sm text-gray-600 dark:text-gray-400 py-2">الأسعار</a>
              <a href="#testimonials" onClick={() => setMobileMenuOpen(false)} className="block text-sm text-gray-600 dark:text-gray-400 py-2">آراء العملاء</a>
              <a href="#faq" onClick={() => setMobileMenuOpen(false)} className="block text-sm text-gray-600 dark:text-gray-400 py-2">الأسئلة</a>
              <div className="pt-3 border-t border-gray-100 dark:border-dark-border flex gap-3">
                <Link href="/login" className="btn-secondary flex-1 text-center text-sm">تسجيل الدخول</Link>
                <Link href="/register" className="btn-primary flex-1 text-center text-sm">ابدأ مجاناً</Link>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-32 overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary-400/10 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-sm font-medium mb-8">
              <Zap className="w-4 h-4" />
              منصة إدارة المطاعم الأذكى في السعودية
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white leading-tight mb-6">
              أدِر مطعمك بذكاء
              <span className="block text-primary-600 mt-2">وحقق أرباح أكثر</span>
            </h1>

            <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
              لوحة تحكم شاملة تجمع المبيعات، المخزون، الموظفين، والتحليلات في مكان واحد.
              قرارات أفضل مبنية على بيانات حقيقية.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/register" className="btn-primary text-base !px-8 !py-3 flex items-center gap-2 w-full sm:w-auto justify-center">
                ابدأ تجربتك المجانية
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <Link href="/login" className="btn-secondary text-base !px-8 !py-3 w-full sm:w-auto text-center">
                عندك حساب؟ سجّل دخول
              </Link>
            </div>

            <p className="text-xs text-gray-400 dark:text-gray-500 mt-4">
              لا يحتاج بطاقة ائتمانية — تجربة مجانية ١٤ يوم
            </p>
          </div>

          {/* Dashboard Preview */}
          <div className="mt-16 max-w-5xl mx-auto">
            <div className="glass-card p-2 sm:p-4 shadow-2xl shadow-primary-500/10">
              <div className="bg-dark-bg rounded-xl p-4 sm:p-8">
                {/* Mock dashboard header */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <div className="h-5 w-32 bg-gray-700 rounded-lg mb-2" />
                    <div className="h-3 w-48 bg-gray-800 rounded-lg" />
                  </div>
                  <div className="flex gap-2">
                    <div className="h-8 w-20 bg-primary-600/30 rounded-lg" />
                    <div className="h-8 w-20 bg-gray-700 rounded-lg" />
                  </div>
                </div>
                {/* Mock stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                  {[
                    { label: 'إيرادات اليوم', value: '١٢,٤٥٠ ريال', color: 'text-emerald-400' },
                    { label: 'الطلبات', value: '٨٤', color: 'text-blue-400' },
                    { label: 'الأرباح', value: '٤,٢٠٠ ريال', color: 'text-purple-400' },
                    { label: 'متوسط الطلب', value: '١٤٨ ريال', color: 'text-amber-400' },
                  ].map((s, i) => (
                    <div key={i} className="bg-dark-card rounded-xl p-4">
                      <p className="text-xs text-gray-500 mb-1">{s.label}</p>
                      <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                    </div>
                  ))}
                </div>
                {/* Mock chart */}
                <div className="bg-dark-card rounded-xl p-4 h-40 flex items-end gap-1">
                  {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 88].map((h, i) => (
                    <div key={i} className="flex-1 bg-primary-600/40 rounded-t-md transition-all hover:bg-primary-500/60" style={{ height: `${h}%` }} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              كل اللي تحتاجه لإدارة مطعمك
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              أدوات متكاملة صُمّمت خصيصاً لأصحاب المطاعم والمقاهي في السعودية
            </p>
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature, i) => (
              <Reveal key={i} delay={(i % 3) * 100}>
                <div className="glass-card p-6 h-full hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${feature.color}`}>
                    <feature.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{feature.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{feature.description}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section id="stats" className="py-20 bg-gradient-to-br from-primary-600 via-primary-700 to-emerald-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">أرقام تتكلم</h2>
            <p className="text-lg text-white/70">مطاعم كثيرة وثقت فينا وحققت نتائج ملموسة</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {STATS.map((stat, i) => (
              <div key={i} className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 text-center">
                <p className="text-3xl sm:text-4xl font-bold text-white mb-2">{stat.value}</p>
                <p className="text-sm text-white/70">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Extra features row */}
      <section className="py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              ليش رستق؟
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Smartphone, title: 'يعمل من أي جهاز', desc: 'تصميم متجاوب يعمل على الجوال والتابلت والكمبيوتر' },
              { icon: Shield, title: 'آمن وموثوق', desc: 'تشفير كامل للبيانات مع نسخ احتياطي تلقائي يومي' },
              { icon: Globe, title: 'دعم عربي كامل', desc: 'واجهة عربية بالكامل مع دعم RTL وأرقام عربية' },
              { icon: Clock, title: 'تقارير فورية', desc: 'بيانات محدثة لحظياً مع تنبيهات ذكية تلقائية' },
            ].map((item, i) => (
              <div key={i} className="text-center p-6">
                <div className="w-14 h-14 rounded-2xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mx-auto mb-4">
                  <item.icon className="w-7 h-7 text-primary-600 dark:text-primary-400" />
                </div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">{item.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              باقات تناسب كل مطعم
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              ابدأ بتجربة مجانية ١٤ يوم. بدون بطاقة ائتمانية، وتقدر تغيّر أو تلغي في أي وقت.
            </p>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto items-stretch">
            {PLANS.map((plan, i) => (
              <Reveal key={plan.id} delay={i * 100} className="h-full">
                <div className={`glass-card p-6 h-full flex flex-col relative transition-all duration-300 hover:-translate-y-1 ${plan.popular ? 'ring-2 ring-primary-500 shadow-xl shadow-primary-500/10' : ''}`}>
                  {plan.popular && (
                    <span className="absolute -top-3 right-6 bg-primary-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                      الأكثر شيوعاً
                    </span>
                  )}
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-11 h-11 rounded-xl bg-gray-100 dark:bg-dark-hover flex items-center justify-center ${plan.accent}`}>
                      <plan.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">{plan.name}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{plan.description}</p>
                    </div>
                  </div>

                  <div className="mb-5">
                    <span className="text-4xl font-bold text-gray-900 dark:text-white">{plan.price}</span>
                    <SARSymbol className="inline-block mx-1 text-gray-500" />
                    <span className="text-sm text-gray-500 dark:text-gray-400">/ شهرياً</span>
                  </div>

                  <ul className="space-y-3 mb-6 flex-1">
                    {plan.highlights.map((h) => (
                      <li key={h} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                        <Check className={`w-4 h-4 flex-shrink-0 ${plan.accent}`} />
                        {h}
                      </li>
                    ))}
                  </ul>

                  <Link
                    href="/register"
                    className={`text-center text-sm font-medium py-2.5 rounded-xl transition-colors ${plan.popular ? 'btn-primary' : 'btn-secondary'}`}
                  >
                    ابدأ التجربة المجانية
                  </Link>
                </div>
              </Reveal>
            ))}
          </div>

          <div className="text-center mt-8">
            <Link href="/pricing" className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 dark:text-primary-400 hover:gap-2 transition-all">
              مقارنة الباقات بالتفصيل
              <ChevronLeft className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-20 bg-gray-100/50 dark:bg-dark-card/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              ماذا يقول عملاؤنا
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">تجارب حقيقية من أصحاب مطاعم يستخدمون رستق</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="glass-card p-6">
                <div className="flex gap-1 mb-4">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className="w-4 h-4 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                  &ldquo;{t.text}&rdquo;
                </p>
                <div className="flex items-center gap-3 pt-4 border-t border-gray-100 dark:border-dark-border/50">
                  <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center">
                    <span className="text-sm font-bold text-primary-600 dark:text-primary-400">
                      {t.name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{t.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 lg:py-32">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              أسئلة شائعة
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              كل اللي تبي تعرفه قبل ما تبدأ
            </p>
          </Reveal>

          <div className="space-y-3">
            {FAQS.map((item, i) => {
              const open = openFaq === i;
              return (
                <Reveal key={i} delay={i * 60}>
                  <div className="glass-card overflow-hidden">
                    <button
                      onClick={() => setOpenFaq(open ? null : i)}
                      className="w-full flex items-center justify-between gap-4 p-5 text-right"
                      aria-expanded={open}
                    >
                      <span className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">{item.q}</span>
                      <span className="w-7 h-7 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
                        {open
                          ? <Minus className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                          : <Plus className="w-4 h-4 text-primary-600 dark:text-primary-400" />}
                      </span>
                    </button>
                    <div
                      className="grid transition-all duration-300 ease-out"
                      style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
                    >
                      <div className="overflow-hidden">
                        <p className="px-5 pb-5 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                          {item.a}
                        </p>
                      </div>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 lg:py-32">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            جاهز تنقل مطعمك للمستوى الجاي؟
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-xl mx-auto">
            ابدأ تجربتك المجانية الآن وشوف الفرق بنفسك. بدون بطاقة ائتمانية.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register" className="btn-primary text-base !px-10 !py-3.5 flex items-center gap-2 w-full sm:w-auto justify-center">
              ابدأ الآن مجاناً
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 dark:bg-dark-card py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <RustaqIcon size={40} />
                <span className="text-xl font-bold" style={{
                  background: 'linear-gradient(135deg, #3cb878 0%, #2d8a5e 50%, #e8c352 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}>رستق</span>
              </div>
              <p className="text-sm text-gray-400 leading-relaxed max-w-md">
                منصة إدارة المطاعم الذكية. نساعد أصحاب المطاعم والمقاهي في السعودية
                على اتخاذ قرارات أفضل مبنية على بيانات حقيقية.
              </p>
            </div>

            <div>
              <h4 className="text-sm font-bold text-white mb-4">المنتج</h4>
              <ul className="space-y-2">
                <li><a href="#features" className="text-sm text-gray-400 hover:text-primary-400 transition-colors">المميزات</a></li>
                <li><Link href="/pricing" className="text-sm text-gray-400 hover:text-primary-400 transition-colors">الأسعار</Link></li>
                <li><a href="#stats" className="text-sm text-gray-400 hover:text-primary-400 transition-colors">الأرقام</a></li>
                <li><a href="#testimonials" className="text-sm text-gray-400 hover:text-primary-400 transition-colors">آراء العملاء</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-bold text-white mb-4">الحساب</h4>
              <ul className="space-y-2">
                <li><Link href="/login" className="text-sm text-gray-400 hover:text-primary-400 transition-colors">تسجيل الدخول</Link></li>
                <li><Link href="/register" className="text-sm text-gray-400 hover:text-primary-400 transition-colors">إنشاء حساب</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-gray-500">جميع الحقوق محفوظة &copy; {new Date().getFullYear()} رستق</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
