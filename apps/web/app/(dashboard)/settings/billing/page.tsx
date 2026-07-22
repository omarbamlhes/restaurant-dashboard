'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  CreditCard, Receipt, Crown, Star, Zap, ArrowUpCircle,
  AlertCircle, Check, X, Calendar, TrendingUp, Users, Store, ShoppingBag,
  Eye, Download,
} from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardSkeleton from '@/components/shared/DashboardSkeleton';
import api from '@/lib/api';

interface PlanConfig {
  name: string;
  nameAr: string;
  price: number;
  yearlyPrice: number;
  maxBranches: number;
  maxUsers: number;
  maxOrdersPerMonth: number;
  features: string[];
  featuresAr: string[];
}

interface Usage {
  ordersThisMonth: number;
  totalBranches: number;
  totalUsers: number;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  amount: number;
  tax: number;
  totalAmount: number;
  status: string;
  paidAt: string | null;
  periodStart: string;
  periodEnd: string;
  createdAt: string;
}

interface PaymentMethod {
  id: string;
  type: string;
  last4: string;
  expiry: string | null;
  isDefault: boolean;
}

interface Subscription {
  id: string;
  plan: string;
  status: string;
  billingCycle: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialEndsAt: string | null;
  canceledAt: string | null;
  usage: Usage;
  planConfig: PlanConfig;
  invoices: Invoice[];
  paymentMethods?: PaymentMethod[];
}

const PLAN_ICONS: Record<string, typeof Zap> = {
  BASIC: Zap,
  PRO: Star,
  ENTERPRISE: Crown,
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: 'فعال', color: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300' },
  TRIALING: { label: 'تجربة مجانية', color: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' },
  PAST_DUE: { label: 'متأخر', color: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300' },
  CANCELED: { label: 'ملغي', color: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300' },
};

const INVOICE_STATUS: Record<string, { label: string; color: string }> = {
  PAID: { label: 'مدفوعة', color: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300' },
  UNPAID: { label: 'غير مدفوعة', color: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300' },
  DRAFT: { label: 'مسودة', color: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400' },
  OVERDUE: { label: 'متأخرة', color: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300' },
  REFUNDED: { label: 'مستردة', color: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300' },
};

const ALL_PLANS = [
  { id: 'BASIC', nameAr: 'الأساسية', price: 299, icon: Zap, color: 'emerald' },
  { id: 'PRO', nameAr: 'الاحترافية', price: 699, icon: Star, color: 'blue' },
  { id: 'ENTERPRISE', nameAr: 'المؤسسية', price: 1499, icon: Crown, color: 'purple' },
];

export default function BillingPage() {
  const router = useRouter();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const { data } = await api.get('/subscriptions/current');
      setSubscription(data);
    } catch {
      toast.error('حدث خطأ في تحميل بيانات الاشتراك');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleUpgrade = (plan: string) => {
    if (!subscription || plan === subscription.plan) return;
    const cycle = subscription.billingCycle || 'MONTHLY';
    router.push(`/settings/billing/checkout?plan=${plan}&cycle=${cycle}`);
  };

  const handleCancel = async () => {
    setCanceling(true);
    try {
      const { data } = await api.post('/subscriptions/cancel');
      toast.success(data.message || 'تم إلغاء الاشتراك');
      setShowCancelConfirm(false);
      fetchData();
    } catch {
      toast.error('حدث خطأ في إلغاء الاشتراك');
    } finally {
      setCanceling(false);
    }
  };

  const handleSubscribe = (plan: string) => {
    router.push(`/settings/billing/checkout?plan=${plan}&cycle=MONTHLY`);
  };

  if (loading) return <DashboardSkeleton />;

  const formatDate = (d: string) => new Date(d).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
  const formatCurrency = (n: number) => `${Number(n).toLocaleString('ar-SA')} ر.س`;

  // No subscription yet
  if (!subscription) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">الاشتراك والفوترة</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">اختر الباقة المناسبة لمطعمك</p>
        </div>

        <div className="glass-card p-8 text-center">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">لا يوجد اشتراك فعال</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">اختر باقة للبدء في استخدام جميع المميزات</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {ALL_PLANS.map((plan) => (
            <div key={plan.id} className="glass-card p-6 text-center">
              <plan.icon className={`w-10 h-10 mx-auto mb-3 text-${plan.color}-500`} />
              <h3 className="font-bold text-gray-900 dark:text-white mb-1">{plan.nameAr}</h3>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{plan.price} <span className="text-sm text-gray-500">ر.س/شهر</span></p>
              <button
                onClick={() => handleSubscribe(plan.id)}
                disabled={upgrading}
                className="btn-primary w-full mt-4 text-sm"
              >
                {upgrading ? 'جاري الاشتراك...' : 'اشترك الآن'}
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const PlanIcon = PLAN_ICONS[subscription.plan] || Zap;
  const statusInfo = STATUS_LABELS[subscription.status] || STATUS_LABELS.ACTIVE;
  const { usage, planConfig } = subscription;

  const getUsagePercent = (current: number, limit: number) => {
    if (limit === -1) return 5;
    return Math.min(Math.round((current / limit) * 100), 100);
  };

  const getBarColor = (percent: number) => {
    if (percent >= 90) return 'bg-red-500';
    if (percent >= 70) return 'bg-amber-500';
    return 'bg-primary-500';
  };

  const planOrder: Record<string, number> = { BASIC: 0, PRO: 1, ENTERPRISE: 2 };
  const currentPlanOrder = planOrder[subscription.plan] ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">الاشتراك والفوترة</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">إدارة باقتك وطرق الدفع</p>
        </div>
      </div>

      {/* Current Plan */}
      <div className="glass-card p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
              <PlanIcon className="w-7 h-7 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  باقة {planConfig.nameAr}
                </h2>
                <span className={`text-xs font-medium px-3 py-1 rounded-full ${statusInfo.color}`}>
                  {statusInfo.label}
                </span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {formatCurrency(planConfig.price)} / شهر
                {subscription.billingCycle === 'YEARLY' && ' (اشتراك سنوي)'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {subscription.status !== 'CANCELED' && (
              <button
                onClick={() => setShowCancelConfirm(true)}
                className="btn-secondary text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                إلغاء الاشتراك
              </button>
            )}
          </div>
        </div>

        {/* Period info */}
        <div className="mt-4 flex flex-wrap gap-6 text-sm text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span>الفترة الحالية: {formatDate(subscription.currentPeriodStart)} - {formatDate(subscription.currentPeriodEnd)}</span>
          </div>
          {subscription.trialEndsAt && subscription.status === 'TRIALING' && (
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
              <AlertCircle className="w-4 h-4" />
              <span>التجربة تنتهي: {formatDate(subscription.trialEndsAt)}</span>
            </div>
          )}
          {subscription.canceledAt && (
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertCircle className="w-4 h-4" />
              <span>ملغي بتاريخ: {formatDate(subscription.canceledAt)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Usage Stats */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary-500" />
          استخدامك الحالي
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              label: 'الطلبات هذا الشهر',
              icon: ShoppingBag,
              current: usage.ordersThisMonth,
              limit: planConfig.maxOrdersPerMonth,
            },
            {
              label: 'الفروع',
              icon: Store,
              current: usage.totalBranches,
              limit: planConfig.maxBranches,
            },
            {
              label: 'المستخدمين',
              icon: Users,
              current: usage.totalUsers,
              limit: planConfig.maxUsers,
            },
          ].map((item, i) => {
            const percent = getUsagePercent(item.current, item.limit);
            const barColor = getBarColor(percent);
            const limitText = item.limit === -1 ? 'غير محدود' : item.limit.toLocaleString('ar-SA');

            return (
              <div key={i} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <item.icon className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{item.label}</span>
                  </div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {item.current.toLocaleString('ar-SA')} / {limitText}
                  </span>
                </div>
                <div className="w-full h-2.5 bg-gray-100 dark:bg-dark-hover rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
                {percent >= 80 && item.limit !== -1 && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    اقتربت من الحد الأقصى
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Plan Comparison */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
          <ArrowUpCircle className="w-5 h-5 text-primary-500" />
          مقارنة الباقات
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {ALL_PLANS.map((plan) => {
            const isCurrent = plan.id === subscription.plan;
            const isLower = planOrder[plan.id] < currentPlanOrder;

            return (
              <div
                key={plan.id}
                className={`relative rounded-xl border-2 p-5 transition-all ${
                  isCurrent
                    ? 'border-primary-500 bg-primary-50/50 dark:bg-primary-900/10'
                    : 'border-gray-200 dark:border-dark-border hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                {isCurrent && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                    <span className="bg-primary-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                      باقتك الحالية
                    </span>
                  </div>
                )}
                <div className="text-center">
                  <plan.icon className={`w-8 h-8 mx-auto mb-2 ${isCurrent ? 'text-primary-600' : 'text-gray-400'}`} />
                  <h4 className="font-bold text-gray-900 dark:text-white">{plan.nameAr}</h4>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                    {plan.price} <span className="text-sm text-gray-500">ر.س/شهر</span>
                  </p>
                  {!isCurrent && !isLower && (
                    <button
                      onClick={() => handleUpgrade(plan.id)}
                      disabled={upgrading}
                      className="btn-primary w-full mt-4 text-sm"
                    >
                      {upgrading ? 'جاري الترقية...' : 'ترقية'}
                    </button>
                  )}
                  {isCurrent && (
                    <p className="text-xs text-primary-600 dark:text-primary-400 mt-4 font-medium">
                      الباقة الحالية
                    </p>
                  )}
                  {isLower && (
                    <p className="text-xs text-gray-400 mt-4">
                      أقل من باقتك الحالية
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Payment Methods */}
      {subscription.paymentMethods && subscription.paymentMethods.length > 0 && (
        <div className="glass-card p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary-500" />
            طرق الدفع
          </h3>
          <div className="space-y-3">
            {subscription.paymentMethods.map((pm) => (
              <div key={pm.id} className="flex items-center justify-between p-3 rounded-xl border border-gray-200 dark:border-dark-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-dark-hover flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {pm.type} **** {pm.last4}
                    </p>
                    {pm.expiry && (
                      <p className="text-xs text-gray-500">{pm.expiry}</p>
                    )}
                  </div>
                </div>
                {pm.isDefault && (
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300">
                    افتراضية
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invoices */}
      {subscription.invoices.length > 0 && (
        <div className="glass-card p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-primary-500" />
            سجل الفواتير
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-dark-border">
                  <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">رقم الفاتورة</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">التاريخ</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">الإجمالي</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">الحالة</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {subscription.invoices.map((inv) => {
                  const invStatus = INVOICE_STATUS[inv.status] || INVOICE_STATUS.DRAFT;
                  return (
                    <tr key={inv.id} className="border-b border-gray-100 dark:border-dark-border/50 hover:bg-gray-50 dark:hover:bg-dark-hover/50">
                      <td className="py-3 px-4 font-mono text-xs">{inv.invoiceNumber}</td>
                      <td className="py-3 px-4">{formatDate(inv.createdAt)}</td>
                      <td className="py-3 px-4 font-medium">{formatCurrency(inv.totalAmount)}</td>
                      <td className="py-3 px-4">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${invStatus.color}`}>
                          {invStatus.label}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => router.push(`/settings/billing/invoice/${inv.id}`)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-hover text-gray-500 hover:text-primary-600 transition-colors"
                          title="عرض الفاتورة"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card p-6 max-w-md w-full">
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-7 h-7 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                إلغاء الاشتراك
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                هل أنت متأكد من إلغاء اشتراكك؟ ستبقى الخدمة فعالة حتى نهاية الفترة الحالية
                ({formatDate(subscription.currentPeriodEnd)}).
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCancelConfirm(false)}
                  className="btn-secondary flex-1"
                >
                  تراجع
                </button>
                <button
                  onClick={handleCancel}
                  disabled={canceling}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-medium text-sm transition-colors disabled:opacity-50"
                >
                  {canceling ? 'جاري الإلغاء...' : 'تأكيد الإلغاء'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
