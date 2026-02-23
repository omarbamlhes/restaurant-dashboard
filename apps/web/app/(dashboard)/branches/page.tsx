'use client';

import { useEffect, useState } from 'react';
import { Building2, Plus, Pencil, X, MapPin, Star, Package, Users } from 'lucide-react';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import EmptyState from '@/components/shared/EmptyState';
import api from '@/lib/api';
import { cn, formatNumber } from '@/lib/utils';

interface Branch {
  id: string;
  name: string;
  nameAr: string;
  address: string | null;
  city: string | null;
  isMain: boolean;
  _count: { orders: number; employees: number };
}

const emptyForm = { name: '', nameAr: '', address: '', city: '', isMain: false };

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  async function fetchBranches() {
    setLoading(true);
    try {
      const { data } = await api.get('/branches');
      setBranches(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchBranches();
  }, []);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setShowModal(true);
  }

  function openEdit(branch: Branch) {
    setEditingId(branch.id);
    setForm({
      name: branch.name,
      nameAr: branch.nameAr,
      address: branch.address || '',
      city: branch.city || '',
      isMain: branch.isMain,
    });
    setShowModal(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload: any = {
        name: form.name,
        nameAr: form.nameAr,
      };
      if (form.address) payload.address = form.address;
      if (form.city) payload.city = form.city;
      if (form.isMain) payload.isMain = true;

      if (editingId) {
        await api.put(`/branches/${editingId}`, payload);
      } else {
        await api.post('/branches', payload);
      }
      setShowModal(false);
      fetchBranches();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">الفروع</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">إدارة فروع المطعم</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" />
          فرع جديد
        </button>
      </div>

      {/* Branch Cards */}
      {branches.length === 0 ? (
        <div className="glass-card p-6">
          <EmptyState
            icon={Building2}
            title="لا توجد فروع"
            description="أضف فرعك الأول"
            action={
              <button onClick={openCreate} className="btn-primary text-sm flex items-center gap-2">
                <Plus className="w-4 h-4" />
                إضافة فرع
              </button>
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {branches.map((branch) => (
            <div key={branch.id} className="glass-card p-6 animate-fade-in-up hover:shadow-lg transition-all duration-300">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'w-12 h-12 rounded-xl flex items-center justify-center',
                    branch.isMain ? 'bg-primary-100 dark:bg-primary-900/50' : 'bg-gray-100 dark:bg-dark-hover',
                  )}>
                    <Building2 className={cn(
                      'w-6 h-6',
                      branch.isMain ? 'text-primary-600 dark:text-primary-400' : 'text-gray-500 dark:text-gray-400',
                    )} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-gray-900 dark:text-white">{branch.nameAr}</h3>
                      {branch.isMain && (
                        <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                          <Star className="w-3 h-3" />
                          رئيسي
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{branch.name}</p>
                  </div>
                </div>
                <button onClick={() => openEdit(branch)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-hover transition-colors">
                  <Pencil className="w-4 h-4 text-gray-400 hover:text-primary-600" />
                </button>
              </div>

              {/* Address */}
              {branch.address && (
                <div className="flex items-start gap-2 mb-4">
                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{branch.address}</p>
                    {branch.city && <p className="text-xs text-gray-400">{branch.city}</p>}
                  </div>
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-100 dark:border-dark-border/50">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-blue-500" />
                  <div>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{formatNumber(branch._count.orders)}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">طلب</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-purple-500" />
                  <div>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{formatNumber(branch._count.employees)}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">موظف</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowModal(false)}>
          <div className="glass-card w-full max-w-md mx-4 p-6 animate-fade-in-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {editingId ? 'تعديل الفرع' : 'فرع جديد'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-card">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">الاسم بالعربي *</label>
                  <input value={form.nameAr} onChange={e => setForm(f => ({ ...f, nameAr: e.target.value }))} className="input-field text-sm" placeholder="الفرع الرئيسي" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Name (EN) *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input-field text-sm" placeholder="Main Branch" dir="ltr" />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">العنوان</label>
                <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className="input-field text-sm" placeholder="شارع الملك فهد، الرياض" />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">المدينة</label>
                <input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} className="input-field text-sm" placeholder="الرياض" />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isMain}
                  onChange={e => setForm(f => ({ ...f, isMain: e.target.checked }))}
                  className="w-4 h-4 rounded border-gray-300 dark:border-dark-border text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">فرع رئيسي</span>
              </label>

              <div className="flex gap-3 pt-2">
                <button onClick={handleSave} disabled={saving || !form.nameAr || !form.name} className="btn-primary flex-1 disabled:opacity-50">
                  {saving ? 'جاري الحفظ...' : editingId ? 'حفظ التعديلات' : 'إضافة الفرع'}
                </button>
                <button onClick={() => setShowModal(false)} className="btn-secondary">إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
