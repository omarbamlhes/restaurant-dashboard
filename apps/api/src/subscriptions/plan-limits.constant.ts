import { PlanType } from '@prisma/client';

export interface PlanConfig {
  name: string;
  nameAr: string;
  price: number;
  yearlyPrice: number;
  maxBranches: number;
  maxUsers: number;
  maxOrdersPerMonth: number;
  trialDays: number;
  features: string[];
  featuresAr: string[];
}

export const PLAN_LIMITS: Record<PlanType, PlanConfig> = {
  BASIC: {
    name: 'Basic',
    nameAr: 'الأساسية',
    price: 299,
    yearlyPrice: 2990,
    maxBranches: 1,
    maxUsers: 3,
    maxOrdersPerMonth: 500,
    trialDays: 14,
    features: [
      'pos',
      'kitchen',
      'menu',
      'tables',
      'reports_basic',
    ],
    featuresAr: [
      'نقطة البيع (POS)',
      'شاشة المطبخ (KDS)',
      'إدارة القائمة',
      'إدارة الطاولات',
      'تقارير أساسية',
    ],
  },
  PRO: {
    name: 'Professional',
    nameAr: 'الاحترافية',
    price: 699,
    yearlyPrice: 6990,
    maxBranches: 3,
    maxUsers: 10,
    maxOrdersPerMonth: 5000,
    trialDays: 14,
    features: [
      'pos',
      'kitchen',
      'menu',
      'tables',
      'reports_basic',
      'reports_advanced',
      'pdf_export',
      'inventory',
      'customers',
      'employees',
      'delivery',
      'notifications',
    ],
    featuresAr: [
      'كل مميزات الأساسية',
      'تقارير متقدمة مع تصدير PDF',
      'إدارة المخزون',
      'إدارة العملاء',
      'إدارة الموظفين المتقدمة',
      'تتبع التوصيل',
      'إشعارات ذكية',
    ],
  },
  ENTERPRISE: {
    name: 'Enterprise',
    nameAr: 'المؤسسية',
    price: 1499,
    yearlyPrice: 14990,
    maxBranches: -1,
    maxUsers: -1,
    maxOrdersPerMonth: -1,
    trialDays: 30,
    features: ['*'],
    featuresAr: [
      'كل مميزات الاحترافية',
      'فروع غير محدودة',
      'مستخدمين غير محدودين',
      'طلبات غير محدودة',
      'نظام ولاء العملاء',
      'تحليلات ذكية بالذكاء الاصطناعي',
      'وايت ليبل (شعارك الخاص)',
      'مدير حساب مخصص',
    ],
  },
};

export const VAT_RATE = 0.15;
