import { WifiOff } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'غير متصل | رستق',
};

export default function OfflinePage() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center gap-5 p-6 text-center bg-slate-50 dark:bg-dark-bg">
      <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
        <WifiOff className="w-8 h-8 text-amber-600 dark:text-amber-400" aria-hidden />
      </div>
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">لا يوجد اتصال بالإنترنت</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2 max-w-sm">
          تعذّر تحميل هذه الصفحة. تحقق من اتصالك ثم حاول مرة أخرى. الصفحات التي زرتها سابقًا تبقى متاحة.
        </p>
      </div>
      <Link href="/pos" className="btn-primary">
        العودة لنقطة البيع
      </Link>
    </div>
  );
}
