'use client';

import { useEffect, useState } from 'react';
import { Settings, User, Building2, Lock, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardSkeleton from '@/components/shared/DashboardSkeleton';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

type Tab = 'profile' | 'restaurant' | 'security';

interface UserData {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
}

interface RestaurantData {
  id: string;
  name: string;
  nameAr: string;
  phone: string | null;
  email: string | null;
  currency: string;
  timezone: string;
}

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('profile');
  const [loading, setLoading] = useState(true);

  const [user, setUser] = useState<UserData | null>(null);
  const [restaurant, setRestaurant] = useState<RestaurantData | null>(null);

  const [profileForm, setProfileForm] = useState({ name: '', email: '', phone: '' });
  const [restaurantForm, setRestaurantForm] = useState({ name: '', nameAr: '', phone: '', email: '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const { data } = await api.get('/auth/me');
        setUser(data.user);
        setRestaurant(data.restaurant);
        setProfileForm({
          name: data.user.name,
          email: data.user.email,
          phone: data.user.phone || '',
        });
        if (data.restaurant) {
          setRestaurantForm({
            name: data.restaurant.name,
            nameAr: data.restaurant.nameAr,
            phone: data.restaurant.phone || '',
            email: data.restaurant.email || '',
          });
        }
      } catch {
        toast.error('فشل تحميل البيانات');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  async function saveProfile() {
    setSaving(true);
    try {
      const { data } = await api.put('/auth/profile', profileForm);
      setUser(data.user);
      toast.success('تم حفظ الملف الشخصي');
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'حدث خطأ في حفظ الملف الشخصي');
    } finally {
      setSaving(false);
    }
  }

  async function saveRestaurant() {
    setSaving(true);
    try {
      const { data } = await api.put('/auth/restaurant', restaurantForm);
      setRestaurant(data);
      toast.success('تم حفظ بيانات المطعم');
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'حدث خطأ في حفظ بيانات المطعم');
    } finally {
      setSaving(false);
    }
  }

  async function changePassword() {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('كلمة المرور الجديدة غير متطابقة');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      toast.error('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }
    setSaving(true);
    try {
      await api.put('/auth/password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success('تم تغيير كلمة المرور');
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'كلمة المرور الحالية غير صحيحة');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <DashboardSkeleton />;

  const TABS: { key: Tab; label: string; icon: typeof User }[] = [
    { key: 'profile', label: 'الملف الشخصي', icon: User },
    { key: 'restaurant', label: 'بيانات المطعم', icon: Building2 },
    { key: 'security', label: 'الأمان', icon: Lock },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">الإعدادات</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">إدارة الحساب وإعدادات المطعم</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Tabs Sidebar */}
        <div className="lg:w-64 flex-shrink-0">
          <div className="glass-card p-2 flex lg:flex-col gap-1">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  'flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium transition-colors text-right',
                  tab === t.key
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-hover',
                )}
              >
                <t.icon className="w-5 h-5" />
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          {/* Profile Tab */}
          {tab === 'profile' && (
            <div className="glass-card p-6 animate-fade-in-up">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">الملف الشخصي</h3>
              <div className="space-y-4 max-w-lg">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">الاسم</label>
                  <input
                    value={profileForm.name}
                    onChange={(e) => setProfileForm((f) => ({ ...f, name: e.target.value }))}
                    className="input-field text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">البريد الإلكتروني</label>
                  <input
                    type="email"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm((f) => ({ ...f, email: e.target.value }))}
                    className="input-field text-sm"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">رقم الجوال</label>
                  <input
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm((f) => ({ ...f, phone: e.target.value }))}
                    className="input-field text-sm"
                    placeholder="05xxxxxxxx"
                    dir="ltr"
                  />
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 pt-2">
                  <span>الدور:</span>
                  <span className="px-2 py-0.5 rounded-lg bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-xs font-medium">
                    {user?.role === 'OWNER' ? 'مالك' : user?.role === 'MANAGER' ? 'مدير' : user?.role === 'STAFF' ? 'موظف' : 'مسؤول'}
                  </span>
                </div>

                <button
                  onClick={saveProfile}
                  disabled={saving || !profileForm.name || !profileForm.email}
                  className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'جاري الحفظ...' : 'حفظ التعديلات'}
                </button>
              </div>
            </div>
          )}

          {/* Restaurant Tab */}
          {tab === 'restaurant' && (
            <div className="glass-card p-6 animate-fade-in-up">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">بيانات المطعم</h3>
              <div className="space-y-4 max-w-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">اسم المطعم (عربي)</label>
                    <input
                      value={restaurantForm.nameAr}
                      onChange={(e) => setRestaurantForm((f) => ({ ...f, nameAr: e.target.value }))}
                      className="input-field text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Restaurant Name (EN)</label>
                    <input
                      value={restaurantForm.name}
                      onChange={(e) => setRestaurantForm((f) => ({ ...f, name: e.target.value }))}
                      className="input-field text-sm"
                      dir="ltr"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">هاتف المطعم</label>
                  <input
                    value={restaurantForm.phone}
                    onChange={(e) => setRestaurantForm((f) => ({ ...f, phone: e.target.value }))}
                    className="input-field text-sm"
                    dir="ltr"
                    placeholder="0112345678"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">بريد المطعم</label>
                  <input
                    type="email"
                    value={restaurantForm.email}
                    onChange={(e) => setRestaurantForm((f) => ({ ...f, email: e.target.value }))}
                    className="input-field text-sm"
                    dir="ltr"
                    placeholder="info@restaurant.com"
                  />
                </div>

                {restaurant && (
                  <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 pt-2">
                    <span>العملة: <span className="font-medium text-gray-700 dark:text-gray-300">{restaurant.currency}</span></span>
                    <span>المنطقة الزمنية: <span className="font-medium text-gray-700 dark:text-gray-300">{restaurant.timezone}</span></span>
                  </div>
                )}

                <button
                  onClick={saveRestaurant}
                  disabled={saving || !restaurantForm.nameAr || !restaurantForm.name}
                  className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'جاري الحفظ...' : 'حفظ التعديلات'}
                </button>
              </div>
            </div>
          )}

          {/* Security Tab */}
          {tab === 'security' && (
            <div className="glass-card p-6 animate-fade-in-up">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">تغيير كلمة المرور</h3>
              <div className="space-y-4 max-w-lg">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">كلمة المرور الحالية</label>
                  <input
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm((f) => ({ ...f, currentPassword: e.target.value }))}
                    className="input-field text-sm"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">كلمة المرور الجديدة</label>
                  <input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm((f) => ({ ...f, newPassword: e.target.value }))}
                    className="input-field text-sm"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">تأكيد كلمة المرور الجديدة</label>
                  <input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm((f) => ({ ...f, confirmPassword: e.target.value }))}
                    className="input-field text-sm"
                    dir="ltr"
                  />
                </div>

                <button
                  onClick={changePassword}
                  disabled={saving || !passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}
                  className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50"
                >
                  <Lock className="w-4 h-4" />
                  {saving ? 'جاري التغيير...' : 'تغيير كلمة المرور'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
