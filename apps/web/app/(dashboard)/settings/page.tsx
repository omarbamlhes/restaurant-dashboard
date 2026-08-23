'use client';

import { useEffect, useState } from 'react';
import { Settings, User, Building2, Lock, Save, Users, Plus, X, Shield, Pencil, Trash2, CreditCard, CheckCircle2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardSkeleton from '@/components/shared/DashboardSkeleton';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { ALL_PERMISSIONS } from '@/lib/permissions';
import { isValidSaudiTaxNumber } from '@/lib/zatca';

type Tab = 'profile' | 'restaurant' | 'security' | 'accounts';

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
  taxNumber: string | null;
  currency: string;
  timezone: string;
}

interface StaffAccount {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions: string[];
  createdAt: string;
}

const ROLE_LABELS: Record<string, string> = {
  OWNER: 'مالك',
  MANAGER: 'مدير',
  STAFF: 'موظف',
  ADMIN: 'مسؤول',
};

const emptyStaffForm = { name: '', email: '', password: '', phone: '', role: 'STAFF' as string, permissions: [] as string[] };

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('profile');
  const [loading, setLoading] = useState(true);
  const { user: currentUser } = useAuthStore();
  const isOwner = currentUser?.role === 'OWNER';

  const [user, setUser] = useState<UserData | null>(null);
  const [restaurant, setRestaurant] = useState<RestaurantData | null>(null);

  const [profileForm, setProfileForm] = useState({ name: '', email: '', phone: '' });
  const [restaurantForm, setRestaurantForm] = useState({ name: '', nameAr: '', phone: '', email: '', taxNumber: '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  // Staff accounts state
  const [staffAccounts, setStaffAccounts] = useState<StaffAccount[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [staffForm, setStaffForm] = useState(emptyStaffForm);
  const [savingStaff, setSavingStaff] = useState(false);

  // Permission edit modal
  const [editingStaff, setEditingStaff] = useState<StaffAccount | null>(null);
  const [editPermissions, setEditPermissions] = useState<string[]>([]);
  const [savingPerms, setSavingPerms] = useState(false);

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
            taxNumber: data.restaurant.taxNumber || '',
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

  // Fetch staff accounts when tab switches to accounts
  useEffect(() => {
    if (tab === 'accounts' && isOwner) {
      fetchStaffAccounts();
    }
  }, [tab, isOwner]);

  async function fetchStaffAccounts() {
    setLoadingStaff(true);
    try {
      const { data } = await api.get('/auth/staff');
      setStaffAccounts(data);
    } catch {
      toast.error('فشل تحميل حسابات النظام');
    } finally {
      setLoadingStaff(false);
    }
  }

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
    const taxNum = restaurantForm.taxNumber.trim();
    if (taxNum && !isValidSaudiTaxNumber(taxNum)) {
      toast.error('الرقم الضريبي غير صحيح — 15 رقمًا يبدأ وينتهي بالرقم 3');
      return;
    }
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

  async function handleCreateStaff() {
    setSavingStaff(true);
    try {
      await api.post('/auth/create-staff', {
        ...staffForm,
        permissions: staffForm.permissions.length > 0 ? staffForm.permissions : undefined,
      });
      toast.success('تم إنشاء الحساب بنجاح');
      setShowStaffModal(false);
      setStaffForm(emptyStaffForm);
      fetchStaffAccounts();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'فشل إنشاء الحساب');
    } finally {
      setSavingStaff(false);
    }
  }

  function openEditPermissions(staff: StaffAccount) {
    setEditingStaff(staff);
    setEditPermissions([...staff.permissions]);
  }

  async function savePermissions() {
    if (!editingStaff) return;
    setSavingPerms(true);
    try {
      await api.put(`/auth/staff/${editingStaff.id}/permissions`, { permissions: editPermissions });
      toast.success('تم تحديث الصلاحيات');
      setEditingStaff(null);
      fetchStaffAccounts();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'فشل تحديث الصلاحيات');
    } finally {
      setSavingPerms(false);
    }
  }

  function togglePermission(perms: string[], key: string): string[] {
    return perms.includes(key) ? perms.filter((p) => p !== key) : [...perms, key];
  }

  if (loading) return <DashboardSkeleton />;

  const TABS: { key: Tab; label: string; icon: typeof User; ownerOnly?: boolean }[] = [
    { key: 'profile', label: 'الملف الشخصي', icon: User },
    { key: 'restaurant', label: 'بيانات المطعم', icon: Building2, ownerOnly: true },
    { key: 'accounts', label: 'حسابات النظام', icon: Users, ownerOnly: true },
    { key: 'security', label: 'الأمان', icon: Lock },
  ];

  const visibleTabs = TABS.filter((t) => !t.ownerOnly || isOwner);

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
            {visibleTabs.map((t) => (
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
            {isOwner && (
              <a
                href="/settings/billing"
                className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium transition-colors text-right text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-hover"
              >
                <CreditCard className="w-5 h-5" />
                الاشتراك والفوترة
              </a>
            )}
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
                  <input value={profileForm.name} onChange={(e) => setProfileForm((f) => ({ ...f, name: e.target.value }))} className="input-field text-sm" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">البريد الإلكتروني</label>
                  <input type="email" value={profileForm.email} onChange={(e) => setProfileForm((f) => ({ ...f, email: e.target.value }))} className="input-field text-sm" dir="ltr" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">رقم الجوال</label>
                  <input value={profileForm.phone} onChange={(e) => setProfileForm((f) => ({ ...f, phone: e.target.value }))} className="input-field text-sm" placeholder="05xxxxxxxx" dir="ltr" />
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 pt-2">
                  <span>الدور:</span>
                  <span className="px-2 py-0.5 rounded-lg bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-xs font-medium">
                    {ROLE_LABELS[user?.role || ''] || user?.role}
                  </span>
                </div>
                <button onClick={saveProfile} disabled={saving || !profileForm.name || !profileForm.email} className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50">
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
                    <input value={restaurantForm.nameAr} onChange={(e) => setRestaurantForm((f) => ({ ...f, nameAr: e.target.value }))} className="input-field text-sm" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Restaurant Name (EN)</label>
                    <input value={restaurantForm.name} onChange={(e) => setRestaurantForm((f) => ({ ...f, name: e.target.value }))} className="input-field text-sm" dir="ltr" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">هاتف المطعم</label>
                  <input value={restaurantForm.phone} onChange={(e) => setRestaurantForm((f) => ({ ...f, phone: e.target.value }))} className="input-field text-sm" dir="ltr" placeholder="0112345678" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">بريد المطعم</label>
                  <input type="email" value={restaurantForm.email} onChange={(e) => setRestaurantForm((f) => ({ ...f, email: e.target.value }))} className="input-field text-sm" dir="ltr" placeholder="info@restaurant.com" />
                </div>
                {(() => {
                  const taxNum = restaurantForm.taxNumber.trim();
                  const taxValid = isValidSaudiTaxNumber(taxNum);
                  const taxInvalid = taxNum.length > 0 && !taxValid;
                  return (
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">الرقم الضريبي (VAT)</label>
                      <div className="relative">
                        <input
                          value={restaurantForm.taxNumber}
                          onChange={(e) => setRestaurantForm((f) => ({ ...f, taxNumber: e.target.value.replace(/\s/g, '') }))}
                          inputMode="numeric"
                          maxLength={15}
                          className={cn(
                            'input-field text-sm pl-9',
                            taxInvalid && 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20',
                            taxValid && 'border-emerald-400 focus:border-emerald-500 focus:ring-emerald-500/20',
                          )}
                          dir="ltr"
                          placeholder="300000000000003"
                          aria-invalid={taxInvalid}
                        />
                        {taxValid && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        )}
                        {taxInvalid && (
                          <AlertCircle className="w-4 h-4 text-rose-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        )}
                      </div>
                      {taxInvalid ? (
                        <p className="text-xs text-rose-500 mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          يجب أن يكون 15 رقمًا يبدأ وينتهي بالرقم 3 ({taxNum.length}/15)
                        </p>
                      ) : taxValid ? (
                        <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-1 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          رقم ضريبي صالح — سيظهر في رمز QR للفاتورة
                        </p>
                      ) : (
                        <p className="text-xs text-gray-400 mt-1">يظهر في الفواتير ورمز QR حسب متطلبات ZATCA</p>
                      )}
                    </div>
                  );
                })()}
                {restaurant && (
                  <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 pt-2">
                    <span>العملة: <span className="font-medium text-gray-700 dark:text-gray-300">{restaurant.currency}</span></span>
                    <span>المنطقة الزمنية: <span className="font-medium text-gray-700 dark:text-gray-300">{restaurant.timezone}</span></span>
                  </div>
                )}
                <button onClick={saveRestaurant} disabled={saving || !restaurantForm.nameAr || !restaurantForm.name || (restaurantForm.taxNumber.trim().length > 0 && !isValidSaudiTaxNumber(restaurantForm.taxNumber.trim()))} className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50">
                  <Save className="w-4 h-4" />
                  {saving ? 'جاري الحفظ...' : 'حفظ التعديلات'}
                </button>
              </div>
            </div>
          )}

          {/* Staff Accounts Tab */}
          {tab === 'accounts' && isOwner && (
            <div className="space-y-4 animate-fade-in-up">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">حسابات النظام</h3>
                <button onClick={() => { setStaffForm(emptyStaffForm); setShowStaffModal(true); }} className="btn-primary flex items-center gap-2 text-sm">
                  <Plus className="w-4 h-4" />
                  حساب جديد
                </button>
              </div>

              <p className="text-sm text-gray-500 dark:text-gray-400">
                أنشئ حسابات لفريقك وتحكم بالصفحات اللي يقدرون يشوفونها
              </p>

              {loadingStaff ? (
                <div className="glass-card p-8 text-center text-gray-400">جاري التحميل...</div>
              ) : staffAccounts.length === 0 ? (
                <div className="glass-card p-8 text-center">
                  <Users className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">لا يوجد حسابات نظام بعد</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">أنشئ حساب جديد لموظفيك</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {staffAccounts.map((staff) => (
                    <div key={staff.id} className="glass-card p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center">
                            <span className="text-sm font-bold text-primary-600 dark:text-primary-400">{staff.name.charAt(0)}</span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{staff.name}</p>
                            <p className="text-xs text-gray-400" dir="ltr">{staff.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={cn(
                            'text-xs px-2 py-1 rounded-lg font-medium',
                            staff.role === 'MANAGER'
                              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
                          )}>
                            {ROLE_LABELS[staff.role] || staff.role}
                          </span>
                          <button
                            onClick={() => openEditPermissions(staff)}
                            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-hover transition-colors"
                            title="تعديل الصلاحيات"
                          >
                            <Shield className="w-4 h-4 text-gray-400 hover:text-primary-600" />
                          </button>
                        </div>
                      </div>

                      {/* Permissions pills */}
                      {staff.permissions.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-gray-100 dark:border-dark-border/50">
                          {staff.permissions.map((p) => {
                            const perm = ALL_PERMISSIONS.find((ap) => ap.key === p);
                            return (
                              <span key={p} className="text-[11px] px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                                {perm?.label || p}
                              </span>
                            );
                          })}
                        </div>
                      )}
                      {staff.permissions.length === 0 && (
                        <p className="text-xs text-gray-400 mt-3 pt-3 border-t border-gray-100 dark:border-dark-border/50">
                          يستخدم صلاحيات الدور الافتراضية ({ROLE_LABELS[staff.role]})
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Security Tab */}
          {tab === 'security' && (
            <div className="glass-card p-6 animate-fade-in-up">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">تغيير كلمة المرور</h3>
              <div className="space-y-4 max-w-lg">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">كلمة المرور الحالية</label>
                  <input type="password" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm((f) => ({ ...f, currentPassword: e.target.value }))} className="input-field text-sm" dir="ltr" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">كلمة المرور الجديدة</label>
                  <input type="password" value={passwordForm.newPassword} onChange={(e) => setPasswordForm((f) => ({ ...f, newPassword: e.target.value }))} className="input-field text-sm" dir="ltr" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">تأكيد كلمة المرور الجديدة</label>
                  <input type="password" value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm((f) => ({ ...f, confirmPassword: e.target.value }))} className="input-field text-sm" dir="ltr" />
                </div>
                <button onClick={changePassword} disabled={saving || !passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword} className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50">
                  <Lock className="w-4 h-4" />
                  {saving ? 'جاري التغيير...' : 'تغيير كلمة المرور'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Staff Modal */}
      {showStaffModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowStaffModal(false)}>
          <div className="glass-card w-full max-w-lg mx-4 p-6 animate-fade-in-up max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">حساب نظام جديد</h3>
              <button onClick={() => setShowStaffModal(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-card">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">الاسم *</label>
                <input value={staffForm.name} onChange={(e) => setStaffForm((f) => ({ ...f, name: e.target.value }))} className="input-field text-sm" placeholder="اسم الموظف" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">البريد الإلكتروني *</label>
                <input type="email" value={staffForm.email} onChange={(e) => setStaffForm((f) => ({ ...f, email: e.target.value }))} className="input-field text-sm" dir="ltr" placeholder="employee@example.com" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">كلمة المرور *</label>
                <input type="password" value={staffForm.password} onChange={(e) => setStaffForm((f) => ({ ...f, password: e.target.value }))} className="input-field text-sm" dir="ltr" placeholder="6 أحرف على الأقل" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">الدور *</label>
                <select value={staffForm.role} onChange={(e) => setStaffForm((f) => ({ ...f, role: e.target.value }))} className="input-field text-sm">
                  <option value="MANAGER">مدير</option>
                  <option value="STAFF">موظف</option>
                </select>
              </div>

              {/* Permissions checkboxes */}
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  الصلاحيات
                  <span className="text-xs text-gray-400 font-normal mr-2">(اتركها فاضية لاستخدام صلاحيات الدور الافتراضية)</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {ALL_PERMISSIONS.map((perm) => (
                    <label key={perm.key} className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-hover cursor-pointer">
                      <input
                        type="checkbox"
                        checked={staffForm.permissions.includes(perm.key)}
                        onChange={() => setStaffForm((f) => ({ ...f, permissions: togglePermission(f.permissions, perm.key) }))}
                        className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{perm.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleCreateStaff}
                  disabled={savingStaff || !staffForm.name || !staffForm.email || !staffForm.password}
                  className="btn-primary flex-1 disabled:opacity-50"
                >
                  {savingStaff ? 'جاري الإنشاء...' : 'إنشاء الحساب'}
                </button>
                <button onClick={() => setShowStaffModal(false)} className="btn-secondary">إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Permissions Modal */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setEditingStaff(null)}>
          <div className="glass-card w-full max-w-md mx-4 p-6 animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">صلاحيات {editingStaff.name}</h3>
                <p className="text-xs text-gray-400 mt-1">حدد الصفحات اللي يقدر يوصلها</p>
              </div>
              <button onClick={() => setEditingStaff(null)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-card">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-1 mb-6">
              {ALL_PERMISSIONS.map((perm) => (
                <label key={perm.key} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-hover cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editPermissions.includes(perm.key)}
                    onChange={() => setEditPermissions((prev) => togglePermission(prev, perm.key))}
                    className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{perm.label}</span>
                </label>
              ))}
            </div>

            <div className="flex gap-3">
              <button onClick={savePermissions} disabled={savingPerms} className="btn-primary flex-1 disabled:opacity-50">
                {savingPerms ? 'جاري الحفظ...' : 'حفظ الصلاحيات'}
              </button>
              <button onClick={() => setEditingStaff(null)} className="btn-secondary">إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
