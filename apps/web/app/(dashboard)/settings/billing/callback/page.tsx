'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle2, XCircle, Loader2, ArrowRight } from 'lucide-react';
import api from '@/lib/api';

type Status = 'verifying' | 'success' | 'failed';

export default function PaymentCallbackPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<Status>('verifying');
  const [errorMessage, setErrorMessage] = useState('');

  const paymentId = searchParams.get('id');
  const paymentStatus = searchParams.get('status');
  const invoiceId = searchParams.get('invoiceId');
  const message = searchParams.get('message');

  const isDev = searchParams.get('dev') === 'true';

  useEffect(() => {
    async function verifyPayment() {
      // Dev mode: skip Moyasar verification, directly show success
      if (isDev && paymentStatus === 'paid') {
        setStatus('success');
        setTimeout(() => router.push('/settings/billing'), 3000);
        return;
      }

      if (!paymentId || !invoiceId) {
        setStatus('failed');
        setErrorMessage('بيانات الدفع غير مكتملة');
        return;
      }

      if (paymentStatus === 'failed') {
        setStatus('failed');
        setErrorMessage(message || 'فشلت عملية الدفع');
        return;
      }

      try {
        await api.post('/subscriptions/verify-payment', { paymentId, invoiceId });
        setStatus('success');
        setTimeout(() => router.push('/settings/billing'), 3000);
      } catch (error: any) {
        setStatus('failed');
        setErrorMessage(error.response?.data?.message || 'فشل التحقق من عملية الدفع');
      }
    }

    verifyPayment();
  }, [paymentId, invoiceId, paymentStatus, message, router, isDev]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="glass-card p-8 max-w-md w-full text-center">
        {status === 'verifying' && (
          <>
            <Loader2 className="w-16 h-16 text-primary-500 animate-spin mx-auto mb-6" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              جاري التحقق من الدفع...
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              يرجى الانتظار بينما نتحقق من عملية الدفع
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-6 animate-scale-in">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              تم الدفع بنجاح!
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              تم تفعيل اشتراكك بنجاح. سيتم توجيهك لصفحة الفوترة...
            </p>
            <button
              onClick={() => router.push('/settings/billing')}
              className="btn-primary text-sm"
            >
              الذهاب لصفحة الفوترة
            </button>
          </>
        )}

        {status === 'failed' && (
          <>
            <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-10 h-10 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              فشلت عملية الدفع
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              {errorMessage}
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => router.push('/settings/billing')}
                className="btn-secondary text-sm flex items-center gap-2"
              >
                <ArrowRight className="w-4 h-4" />
                العودة للفوترة
              </button>
              <button
                onClick={() => router.back()}
                className="btn-primary text-sm"
              >
                حاول مرة أخرى
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
