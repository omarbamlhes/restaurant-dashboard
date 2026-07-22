'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowRight, CreditCard, Shield, Loader2, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import Script from 'next/script';

interface CheckoutData {
  invoiceId: string;
  invoiceNumber: string;
  plan: string;
  planNameAr: string;
  billingCycle: string;
  amount: number;
  tax: number;
  totalAmount: number;
  amountInHalalas: number;
  description: string;
  metadata: Record<string, string>;
}

interface CheckoutConfig {
  publishableKey: string;
  callbackUrl: string;
}

// Dev mode payment form (used when Moyasar keys are not configured)
function DevPaymentForm({ checkoutData, onPay }: { checkoutData: CheckoutData; onPay: () => void }) {
  const [cardNumber, setCardNumber] = useState('4111 1111 1111 1111');
  const [cardName, setCardName] = useState('محمد العلي');
  const [expiry, setExpiry] = useState('12/28');
  const [cvc, setCvc] = useState('123');
  const [paying, setPaying] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardNumber || !cardName || !expiry || !cvc) {
      toast.error('يرجى تعبئة جميع الحقول');
      return;
    }
    setPaying(true);
    // Simulate payment processing delay
    await new Promise(r => setTimeout(r, 2000));
    onPay();
  };

  const formatCardNumber = (v: string) => {
    const digits = v.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(.{4})/g, '$1 ').trim();
  };

  const formatExpiry = (v: string) => {
    const digits = v.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return digits;
  };

  return (
    <div>
      <div className="mb-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
        <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 text-xs">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>وضع التطوير — فورم محاكاة. لتفعيل الدفع الحقيقي، أضف مفاتيح ميسر في ملف .env</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Card type selector */}
        <div className="flex gap-2 mb-2">
          {['mada', 'visa', 'mastercard'].map((type) => (
            <div key={type} className="flex-1 text-center py-2 px-3 rounded-lg border-2 border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-xs font-medium text-primary-700 dark:text-primary-300 uppercase">
              {type === 'mada' ? 'مدى' : type}
            </div>
          ))}
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">رقم البطاقة</label>
          <input
            type="text"
            value={cardNumber}
            onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
            placeholder="0000 0000 0000 0000"
            className="input-field text-sm font-mono tracking-wider"
            dir="ltr"
            maxLength={19}
          />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">اسم حامل البطاقة</label>
          <input
            type="text"
            value={cardName}
            onChange={(e) => setCardName(e.target.value)}
            placeholder="الاسم على البطاقة"
            className="input-field text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">تاريخ الانتهاء</label>
            <input
              type="text"
              value={expiry}
              onChange={(e) => setExpiry(formatExpiry(e.target.value))}
              placeholder="MM/YY"
              className="input-field text-sm font-mono text-center"
              dir="ltr"
              maxLength={5}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">CVC</label>
            <input
              type="text"
              value={cvc}
              onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="123"
              className="input-field text-sm font-mono text-center"
              dir="ltr"
              maxLength={4}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={paying}
          className="btn-primary w-full !py-3 text-base flex items-center justify-center gap-2"
        >
          {paying ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              جاري المعالجة...
            </>
          ) : (
            <>
              <Shield className="w-5 h-5" />
              ادفع {Number(checkoutData.totalAmount).toLocaleString('ar-SA')} ر.س
            </>
          )}
        </button>
      </form>
    </div>
  );
}

export default function CheckoutPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const plan = searchParams.get('plan') || 'PRO';
  const cycle = searchParams.get('cycle') || 'MONTHLY';

  const [loading, setLoading] = useState(true);
  const [checkoutData, setCheckoutData] = useState<CheckoutData | null>(null);
  const [config, setConfig] = useState<CheckoutConfig | null>(null);
  const [moyasarReady, setMoyasarReady] = useState(false);
  const [useDevForm, setUseDevForm] = useState(false);
  const formInitialized = useRef(false);

  const isRealKeyConfigured = config?.publishableKey && !config.publishableKey.includes('YOUR_KEY');

  const initializeForm = useCallback(() => {
    if (!checkoutData || !config || formInitialized.current) return;
    if (!(window as any).Moyasar) return;

    formInitialized.current = true;

    const callbackUrl = `${config.callbackUrl}?invoiceId=${checkoutData.invoiceId}`;

    try {
      (window as any).Moyasar.init({
        element: '.moyasar-form',
        amount: checkoutData.amountInHalalas,
        currency: 'SAR',
        description: checkoutData.description,
        publishable_api_key: config.publishableKey,
        callback_url: callbackUrl,
        metadata: checkoutData.metadata,
        methods: ['creditcard', 'applepay', 'stcpay'],
        language: 'ar',
        fixed_width: false,
      });
    } catch {
      setUseDevForm(true);
    }
  }, [checkoutData, config]);

  useEffect(() => {
    async function fetchData() {
      try {
        const [checkoutRes, configRes] = await Promise.all([
          api.post('/subscriptions/initiate-checkout', { plan, billingCycle: cycle }),
          api.get('/subscriptions/checkout-config'),
        ]);
        setCheckoutData(checkoutRes.data);
        setConfig(configRes.data);

        // If no real key, use dev form immediately
        const key = configRes.data?.publishableKey || '';
        if (!key || key.includes('YOUR_KEY')) {
          setUseDevForm(true);
        }
      } catch {
        toast.error('فشل تحميل بيانات الدفع');
        router.push('/settings/billing');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [plan, cycle, router]);

  useEffect(() => {
    if (moyasarReady && checkoutData && config && isRealKeyConfigured) {
      initializeForm();
    }
  }, [moyasarReady, checkoutData, config, isRealKeyConfigured, initializeForm]);

  // Dev mode: simulate successful payment
  const handleDevPay = async () => {
    if (!checkoutData) return;
    // Simulate by calling verify-payment with a dev payment ID
    try {
      await api.post('/subscriptions/verify-payment', {
        paymentId: `dev_${Date.now()}`,
        invoiceId: checkoutData.invoiceId,
      });
      router.push(`/settings/billing/callback?id=dev_${Date.now()}&status=paid&invoiceId=${checkoutData.invoiceId}&dev=true`);
    } catch {
      // In dev mode, directly activate via subscribe endpoint as fallback
      try {
        await api.post('/subscriptions/subscribe', { plan, billingCycle: cycle });
        router.push(`/settings/billing/callback?status=paid&dev=true&invoiceId=${checkoutData.invoiceId}`);
      } catch {
        toast.error('فشل في محاكاة الدفع');
      }
    }
  };

  const formatCurrency = (n: number) => `${Number(n).toLocaleString('ar-SA')} ر.س`;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-primary-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">جاري تحميل صفحة الدفع...</p>
        </div>
      </div>
    );
  }

  if (!checkoutData || !config) {
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Moyasar CSS & JS (only load if real key) */}
      {isRealKeyConfigured && (
        <>
          <link rel="stylesheet" href="https://cdn.moyasar.com/mpf/1.14.0/moyasar.css" />
          <Script
            src="https://cdn.moyasar.com/mpf/1.14.0/moyasar.js"
            strategy="afterInteractive"
            onLoad={() => setMoyasarReady(true)}
          />
        </>
      )}

      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/settings/billing')}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-hover transition-colors"
        >
          <ArrowRight className="w-5 h-5 text-gray-500" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">إتمام الدفع</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">اشتراك باقة {checkoutData.planNameAr}</p>
        </div>
      </div>

      {/* Order Summary */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-primary-500" />
          ملخص الطلب
        </h3>

        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">الباقة</span>
            <span className="font-medium text-gray-900 dark:text-white">{checkoutData.planNameAr}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">نوع الاشتراك</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {checkoutData.billingCycle === 'YEARLY' ? 'سنوي' : 'شهري'}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">رقم الفاتورة</span>
            <span className="font-mono text-xs text-gray-500">{checkoutData.invoiceNumber}</span>
          </div>

          <div className="border-t border-gray-200 dark:border-dark-border pt-3 mt-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">المبلغ قبل الضريبة</span>
              <span className="text-gray-900 dark:text-white">{formatCurrency(checkoutData.amount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">ضريبة القيمة المضافة (15%)</span>
              <span className="text-gray-900 dark:text-white">{formatCurrency(checkoutData.tax)}</span>
            </div>
            <div className="flex justify-between text-base font-bold border-t border-gray-200 dark:border-dark-border pt-2">
              <span className="text-gray-900 dark:text-white">الإجمالي</span>
              <span className="text-primary-600 dark:text-primary-400">{formatCurrency(checkoutData.totalAmount)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Form */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary-500" />
          بيانات الدفع
        </h3>

        {useDevForm ? (
          <DevPaymentForm checkoutData={checkoutData} onPay={handleDevPay} />
        ) : (
          <>
            <div className="moyasar-form" />
            {!moyasarReady && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-primary-500 animate-spin ml-2" />
                <span className="text-sm text-gray-500">جاري تحميل نموذج الدفع...</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Security Note */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <Shield className="w-4 h-4" />
          <span>الدفع آمن ومشفر عبر بوابة ميسر المرخصة من البنك المركزي السعودي</span>
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          ندعم: مدى، فيزا، ماستركارد، Apple Pay، STC Pay
        </p>
      </div>
    </div>
  );
}
