'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-dark-bg px-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-8 h-8 text-rose-600 dark:text-rose-400" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          حدث خطأ غير متوقع
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8">
          نعتذر عن هذا الخطأ. حاول تحديث الصفحة أو ارجع للوحة التحكم.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="btn-primary text-sm flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            حاول مرة ثانية
          </button>
          <Link
            href="/dashboard"
            className="btn-secondary text-sm flex items-center gap-2"
          >
            <Home className="w-4 h-4" />
            لوحة التحكم
          </Link>
        </div>
      </div>
    </div>
  );
}
