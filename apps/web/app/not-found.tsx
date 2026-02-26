import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-dark-bg px-4">
      <div className="text-center max-w-md">
        <div className="text-8xl font-bold text-primary-600/20 dark:text-primary-400/20 mb-4">404</div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          الصفحة غير موجودة
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8">
          الصفحة اللي تدور عليها ما هي موجودة أو تم نقلها.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/dashboard"
            className="btn-primary text-sm"
          >
            لوحة التحكم
          </Link>
          <Link
            href="/"
            className="btn-secondary text-sm"
          >
            الصفحة الرئيسية
          </Link>
        </div>
      </div>
    </div>
  );
}
