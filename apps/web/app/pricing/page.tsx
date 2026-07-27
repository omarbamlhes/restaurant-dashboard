'use client';

import { useState } from 'react';
import Link from 'next/link';
import RustaqIcon from '@/components/brand/RustaqIcon';
import {
  Check, X, ArrowLeft, Crown, Star, Zap, Menu as MenuIcon,
  X as XIcon,
} from 'lucide-react';

const PLANS = [
  {
    id: 'BASIC',
    name: 'الأساسية',
    description: 'للمطاعم الصغيرة والمقاهي',
    monthlyPrice: 299,
    yearlyPrice: 2990,
    icon: Zap,
    color: 'emerald',
    popular: false,
    limits: {
      branches: '1 فرع',
      users: '3 مستخدمين',
      orders: '500 طلب/شهر',
    },
    features: [
      { name: 'نقطة البيع (POS)', included: true },
      { name: 'شاشة المطبخ (KDS)', included: true },
      { name: 'إدارة القائمة', included: true },
      { name: 'إدارة الطاولات', included: true },
      { name: 'تقارير أساسية', included: true },
      { name: 'تقارير متقدمة', included: false },
      { name: 'إدارة المخزون', included: false },
      { name: 'إدارة العملاء', included: false },
      { name: 'إدارة الموظفين المتقدمة', included: false },
      { name: 'إشعارات ذكية', included: false },
      { name: 'تحليلات ذكاء اصطناعي', included: false },
      { name: 'وايت ليبل', included: false },
    ],
    support: 'بريد إلكتروني (رد خلال 24 ساعة)',
    trial: 14,
  },
  {
    id: 'PRO',
    name: 'الاحترافية',
    description: 'للمطاعم المتنامية',
    monthlyPrice: 699,
    yearlyPrice: 6990,
    icon: Star,
    color: 'blue',
    popular: true,
    limits: {
      branches: '3 فروع',
      users: '10 مستخدمين',
      orders: '5,000 طلب/شهر',
    },
    features: [
      { name: 'نقطة البيع (POS)', included: true },
      { name: 'شاشة المطبخ (KDS)', included: true },
      { name: 'إدارة القائمة', included: true },
      { name: 'إدارة الطاولات', included: true },
      { name: 'تقارير أساسية', included: true },
      { name: 'تقارير متقدمة + تصدير PDF', included: true },
      { name: 'إدارة المخزون', included: true },
      { name: 'إدارة العملاء', included: true },
      { name: 'إدارة الموظفين المتقدمة', included: true },
      { name: 'إشعارات ذكية', included: true },
      { name: 'تحليلات ذكاء اصطناعي', included: false },
      { name: 'وايت ليبل', included: false },
    ],
    support: 'أولوية (رد خلال 4 ساعات) + واتساب',
    trial: 14,
  },
  {
    id: 'ENTERPRISE',
    name: 'المؤسسية',
    description: 'لسلاسل المطاعم',
    monthlyPrice: 1499,
    yearlyPrice: 14990,
    icon: Crown,
    color: 'purple',
    popular: false,
    limits: {
      branches: 'فروع غير محدودة',
      users: 'مستخدمين غير محدودين',
      orders: 'طلبات غير محدودة',
    },
    features: [
      { name: 'نقطة البيع (POS)', included: true },
      { name: 'شاشة المطبخ (KDS)', included: true },
      { name: 'إدارة القائمة', included: true },
      { name: 'إدارة الطاولات', included: true },
      { name: 'تقارير أساسية', included: true },
      { name: 'تقارير متقدمة + تصدير PDF', included: true },
      { name: 'إدارة المخزون', included: true },
      { name: 'إدارة العملاء', included: true },
      { name: 'إدارة الموظفين المتقدمة', included: true },
      { name: 'إشعارات ذكية', included: true },
      { name: 'تحليلات ذكاء اصطناعي', included: true },
      { name: 'وايت ليبل (شعارك الخاص)', included: true },
    ],
    support: 'مدير حساب مخصص + أولوية قصوى',
    trial: 30,
  },
];

const colorMap: Record<string, { bg: string; text: string; border: string; badge: string }> = {
  emerald: {
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    text: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-200 dark:border-emerald-800',
    badge: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300',
  },
  blue: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-200 dark:border-blue-800',
    badge: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
  },
  purple: {
    bg: 'bg-purple-50 dark:bg-purple-900/20',
    text: 'text-purple-600 dark:text-purple-400',
    border: 'border-purple-200 dark:border-purple-800',
    badge: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300',
  },
};

export default function PricingPage() {
  const [isYearly, setIsYearly] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-dark-bg">
      {/* Navbar */}
      <nav className="bg-white/80 dark:bg-dark-card/80 backdrop-blur-xl border-b border-gray-200 dark:border-dark-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-3">
              <RustaqIcon size={40} />
              <span className="text-xl font-bold" style={{
                background: 'linear-gradient(135deg, #3cb878 0%, #2d8a5e 50%, #e8c352 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>رستق</span>
            </Link>

            <div className="hidden md:flex items-center gap-8">
              <Link href="/#features" className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600 transition-colors">المميزات</Link>
              <Link href="/pricing" className="text-sm text-primary-600 dark:text-primary-400 font-medium">الأسعار</Link>
            </div>

            <div className="hidden md:flex items-center gap-3">
              <Link href="/login" className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-primary-600 transition-colors px-4 py-2">
                تسجيل الدخول
              </Link>
              <Link href="/register" className="btn-primary text-sm !px-6">
                ابدأ مجاناً
              </Link>
            </div>

            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-hover">
              {mobileMenuOpen ? <XIcon className="w-5 h-5 text-gray-700 dark:text-gray-300" /> : <MenuIcon className="w-5 h-5 text-gray-700 dark:text-gray-300" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden bg-white dark:bg-dark-card border-t border-gray-200 dark:border-dark-border">
            <div className="px-4 py-4 space-y-3">
              <Link href="/#features" className="block text-sm text-gray-600 dark:text-gray-400 py-2">المميزات</Link>
              <Link href="/pricing" className="block text-sm text-primary-600 font-medium py-2">الأسعار</Link>
              <div className="pt-3 border-t border-gray-100 dark:border-dark-border flex gap-3">
                <Link href="/login" className="btn-secondary flex-1 text-center text-sm">تسجيل الدخول</Link>
                <Link href="/register" className="btn-primary flex-1 text-center text-sm">ابدأ مجاناً</Link>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Header */}
      <section className="pt-16 pb-12 text-center">
        <div className="max-w-4xl mx-auto px-4">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            اختر الباقة المناسبة لمطعمك
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-10">
            جميع الباقات تشمل فترة تجريبية مجانية. بدون بطاقة ائتمانية.
          </p>

          {/* Billing toggle */}
          <div className="inline-flex items-center gap-4 bg-white dark:bg-dark-card rounded-full p-1.5 shadow-sm border border-gray-200 dark:border-dark-border">
            <button
              onClick={() => setIsYearly(false)}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                !isYearly
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
              }`}
            >
              شهري
            </button>
            <button
              onClick={() => setIsYearly(true)}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                isYearly
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
              }`}
            >
              سنوي
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                isYearly ? 'bg-white/20' : 'bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400'
              }`}>
                وفّر شهرين
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* Plans */}
      <section className="pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {PLANS.map((plan) => {
              const colors = colorMap[plan.color];
              const price = isYearly ? Math.round(plan.yearlyPrice / 12) : plan.monthlyPrice;
              const totalYearly = plan.yearlyPrice;

              return (
                <div
                  key={plan.id}
                  className={`relative glass-card p-6 lg:p-8 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
                    plan.popular ? 'ring-2 ring-primary-500 dark:ring-primary-400' : ''
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-primary-600 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg">
                        الأكثر طلباً
                      </span>
                    </div>
                  )}

                  {/* Plan header */}
                  <div className="text-center mb-6">
                    <div className={`w-14 h-14 rounded-2xl ${colors.bg} flex items-center justify-center mx-auto mb-4`}>
                      <plan.icon className={`w-7 h-7 ${colors.text}`} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">{plan.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{plan.description}</p>
                  </div>

                  {/* Price */}
                  <div className="text-center mb-6">
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-4xl font-bold text-gray-900 dark:text-white">{price}</span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">ر.س/شهر</span>
                    </div>
                    {isYearly && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {totalYearly.toLocaleString()} ر.س/سنة (بدلاً من {(plan.monthlyPrice * 12).toLocaleString()} ر.س)
                      </p>
                    )}
                    <p className="text-xs text-primary-600 dark:text-primary-400 mt-2">
                      تجربة مجانية {plan.trial} يوم
                    </p>
                  </div>

                  {/* Limits */}
                  <div className={`rounded-xl p-4 mb-6 ${colors.bg}`}>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className={`text-sm font-bold ${colors.text}`}>{plan.limits.branches}</p>
                      </div>
                      <div>
                        <p className={`text-sm font-bold ${colors.text}`}>{plan.limits.users}</p>
                      </div>
                      <div>
                        <p className={`text-sm font-bold ${colors.text}`}>{plan.limits.orders}</p>
                      </div>
                    </div>
                  </div>

                  {/* CTA */}
                  <Link
                    href="/register"
                    className={`block text-center py-3 rounded-xl font-medium text-sm transition-all mb-6 ${
                      plan.popular
                        ? 'btn-primary w-full'
                        : 'btn-secondary w-full'
                    }`}
                  >
                    ابدأ التجربة المجانية
                  </Link>

                  {/* Features */}
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">المميزات</p>
                    {plan.features.map((feature, i) => (
                      <div key={i} className="flex items-center gap-3">
                        {feature.included ? (
                          <Check className="w-4 h-4 text-primary-500 flex-shrink-0" />
                        ) : (
                          <X className="w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0" />
                        )}
                        <span className={`text-sm ${
                          feature.included
                            ? 'text-gray-700 dark:text-gray-300'
                            : 'text-gray-400 dark:text-gray-600'
                        }`}>
                          {feature.name}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Support */}
                  <div className="mt-6 pt-4 border-t border-gray-100 dark:border-dark-border/50">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      <span className="font-medium">الدعم:</span> {plan.support}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* VAT note */}
      <section className="pb-12">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            جميع الأسعار لا تشمل ضريبة القيمة المضافة (15%). يتم إضافة الضريبة عند الدفع.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="pb-20">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-10">
            أسئلة شائعة
          </h2>
          <div className="space-y-4">
            {[
              {
                q: 'هل الفترة التجريبية مجانية فعلاً؟',
                a: 'نعم، الفترة التجريبية مجانية بالكامل ولا تحتاج بطاقة ائتمانية. تحصل على جميع مميزات الباقة الاحترافية خلال فترة التجربة.',
              },
              {
                q: 'هل أقدر أغيّر الباقة بعد الاشتراك؟',
                a: 'بالتأكيد! تقدر تترقى لباقة أعلى في أي وقت والفرق يُحسب بالتناسب. التخفيض يطبق في نهاية الدورة الحالية.',
              },
              {
                q: 'ما هي طرق الدفع المتاحة؟',
                a: 'ندعم الدفع عبر مدى، فيزا، ماستركارد، وApple Pay من خلال بوابة ميسر المرخصة من البنك المركزي السعودي.',
              },
              {
                q: 'هل الفواتير متوافقة مع هيئة الزكاة (ZATCA)؟',
                a: 'نعم، جميع الفواتير الإلكترونية متوافقة مع متطلبات الفوترة الإلكترونية لهيئة الزكاة والضريبة والجمارك.',
              },
              {
                q: 'ماذا يحصل لو تجاوزت حد الطلبات؟',
                a: 'نرسل لك تنبيه عند وصولك 80% من الحد. عند الوصول للحد الأقصى، نقترح عليك الترقية لباقة أعلى.',
              },
            ].map((faq, i) => (
              <div key={i} className="glass-card p-5">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-2">{faq.q}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-gradient-to-br from-primary-600 via-primary-700 to-emerald-900">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">جاهز تبدأ؟</h2>
          <p className="text-lg text-white/70 mb-8">ابدأ تجربتك المجانية الآن بدون بطاقة ائتمانية</p>
          <Link href="/register" className="inline-flex items-center gap-2 bg-white text-primary-700 font-medium px-8 py-3 rounded-xl hover:bg-gray-50 transition-colors">
            ابدأ الآن مجاناً
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 dark:bg-dark-card py-8">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-xs text-gray-500">جميع الحقوق محفوظة &copy; {new Date().getFullYear()} رستق</p>
        </div>
      </footer>
    </div>
  );
}
