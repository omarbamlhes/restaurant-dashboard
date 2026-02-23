'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    restaurantName: '',
    restaurantNameAr: '',
  });
  const [loading, setLoading] = useState(false);
  const { register } = useAuthStore();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(form);
      toast.success('تم إنشاء الحساب بنجاح!');
      router.push('/');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'حدث خطأ في التسجيل');
    } finally {
      setLoading(false);
    }
  };

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  return (
    <div className="animate-fade-in-up">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">إنشاء حساب جديد</h2>
        <p className="text-gray-500 dark:text-gray-400 mt-2">ابدأ رحلتك مع رستق</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">الاسم</label>
            <input value={form.name} onChange={update('name')} className="input-field" placeholder="محمد أحمد" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">الجوال</label>
            <input value={form.phone} onChange={update('phone')} className="input-field" dir="ltr" placeholder="05xxxxxxxx" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">البريد الإلكتروني</label>
          <input type="email" value={form.email} onChange={update('email')} className="input-field" dir="ltr" placeholder="example@restaurant.com" required />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">كلمة المرور</label>
          <input type="password" value={form.password} onChange={update('password')} className="input-field" dir="ltr" placeholder="٦ أحرف على الأقل" required minLength={6} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">اسم المطعم (English)</label>
            <input value={form.restaurantName} onChange={update('restaurantName')} className="input-field" dir="ltr" placeholder="Al Baik" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">اسم المطعم (عربي)</label>
            <input value={form.restaurantNameAr} onChange={update('restaurantNameAr')} className="input-field" placeholder="البيك" required />
          </div>
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-50">
          {loading ? 'جاري التسجيل...' : 'إنشاء حساب'}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
        لديك حساب؟{' '}
        <Link href="/login" className="text-primary-600 dark:text-primary-400 font-medium hover:underline">
          سجل دخول
        </Link>
      </p>
    </div>
  );
}
