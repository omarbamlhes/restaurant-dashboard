import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'الأسعار | رستق',
  description:
    'باقات رستق لإدارة المطاعم: الأساسية، الاحترافية، والمؤسسية. ابدأ بتجربة مجانية ١٤ يوم بدون بطاقة ائتمانية.',
  openGraph: {
    title: 'أسعار رستق | باقات إدارة المطاعم',
    description:
      'اختر الباقة المناسبة لمطعمك — من المقاهي الصغيرة إلى سلاسل المطاعم. تجربة مجانية ١٤ يوم.',
    type: 'website',
    locale: 'ar_SA',
    siteName: 'رستق',
  },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
