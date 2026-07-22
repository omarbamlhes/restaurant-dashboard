'use client';

import { useEffect, useState, useMemo } from 'react';
import { Building2, Plus, Pencil, X, MapPin, Star, Package, Users, DollarSign, ShoppingBag, Armchair, Map, LayoutGrid, Navigation } from 'lucide-react';
import DashboardSkeleton from '@/components/shared/DashboardSkeleton';
import EmptyState from '@/components/shared/EmptyState';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { cn, formatNumber, formatSAR } from '@/lib/utils';
import SARSymbol from '@/components/shared/SARSymbol';
import dynamic from 'next/dynamic';

const BranchMap = dynamic(() => import('@/components/branches/BranchMap'), { ssr: false });

interface Branch {
  id: string;
  name: string;
  nameAr: string;
  address: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  isMain: boolean;
  totalRevenue: number;
  todayOrders: number;
  availableTables: number;
  _count: { orders: number; employees: number; tables: number };
}

const emptyForm = { name: '', nameAr: '', address: '', city: '', latitude: '', longitude: '', isMain: false };

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'map' | 'grid'>('map');
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const stats = useMemo(() => {
    if (!branches.length) return { total: 0, totalOrders: 0, totalRevenue: 0, totalEmployees: 0 };
    return {
      total: branches.length,
      totalOrders: branches.reduce((s, b) => s + b._count.orders, 0),
      totalRevenue: branches.reduce((s, b) => s + Number(b.totalRevenue), 0),
      totalEmployees: branches.reduce((s, b) => s + b._count.employees, 0),
    };
  }, [branches]);

  async function fetchBranches() {
    setLoading(true);
    try {
      const { data } = await api.get('/branches');
      setBranches(data);
      if (data.length > 0 && !selectedBranch) setSelectedBranch(data[0]);
    } catch {
      toast.error('فشل تحميل بيانات الفروع');
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
      latitude: branch.latitude?.toString() || '',
      longitude: branch.longitude?.toString() || '',
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
      if (form.latitude) payload.latitude = parseFloat(form.latitude);
      if (form.longitude) payload.longitude = parseFloat(form.longitude);
      if (form.isMain) payload.isMain = true;

      if (editingId) {
        await api.put(`/branches/${editingId}`, payload);
      } else {
        await api.post('/branches', payload);
      }
      setShowModal(false);
      toast.success(editingId ? 'تم تعديل الفرع' : 'تم إضافة الفرع');
      fetchBranches();
    } catch {
      toast.error('فشل حفظ بيانات الفرع');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">خريطة الفروع</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">عرض ومتابعة جميع فروع المطعم</p>
        </div>
        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex bg-gray-100 dark:bg-dark-hover rounded-lg p-1">
            <button
              onClick={() => setView('map')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
                view === 'map' ? 'bg-white dark:bg-dark-card shadow-sm text-primary-600 dark:text-primary-400' : 'text-gray-500 hover:text-gray-700'
              )}
            >
              <Map className="w-4 h-4" />
              خريطة
            </button>
            <button
              onClick={() => setView('grid')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
                view === 'grid' ? 'bg-white dark:bg-dark-card shadow-sm text-primary-600 dark:text-primary-400' : 'text-gray-500 hover:text-gray-700'
              )}
            >
              <LayoutGrid className="w-4 h-4" />
              شبكة
            </button>
          </div>
          <button onClick={openCreate} className="btn-primary flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" />
            فرع جديد
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">فرع</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatNumber(stats.totalOrders)}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">إجمالي الطلبات</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatSAR(stats.totalRevenue)}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">إجمالي الإيرادات</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatNumber(stats.totalEmployees)}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">إجمالي الموظفين</p>
            </div>
          </div>
        </div>
      </div>

      {branches.length === 0 ? (
        <div className="glass-card p-6">
          <EmptyState
            icon={Building2}
            title="لا توجد فروع"
            description="أضف فرعك الأول لعرضه على الخريطة"
            action={
              <button onClick={openCreate} className="btn-primary text-sm flex items-center gap-2">
                <Plus className="w-4 h-4" />
                إضافة فرع
              </button>
            }
          />
        </div>
      ) : view === 'map' ? (
        /* Map View */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map */}
          <div className="lg:col-span-2 glass-card p-0 overflow-hidden rounded-2xl" style={{ height: 500 }}>
            <BranchMap
              branches={branches}
              selectedBranch={selectedBranch}
              onSelectBranch={setSelectedBranch}
            />
          </div>

          {/* Branch List Sidebar */}
          <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar">
            {branches.map((branch) => (
              <button
                key={branch.id}
                onClick={() => setSelectedBranch(branch)}
                className={cn(
                  'w-full glass-card p-4 text-right transition-all duration-200 hover:shadow-md',
                  selectedBranch?.id === branch.id && 'ring-2 ring-primary-500 dark:ring-primary-400'
                )}
              >
                <div className="flex items-start justify-between mb-3">
                  <button
                    onClick={(e) => { e.stopPropagation(); openEdit(branch); }}
                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-hover transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5 text-gray-400" />
                  </button>
                  <div className="flex items-center gap-2">
                    <div>
                      <div className="flex items-center gap-2 justify-end">
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white">{branch.nameAr}</h3>
                        {branch.isMain && (
                          <span className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                            <Star className="w-2.5 h-2.5" />
                            رئيسي
                          </span>
                        )}
                      </div>
                      {branch.city && (
                        <p className="text-xs text-gray-400 flex items-center gap-1 justify-end mt-0.5">
                          <span>{branch.city}</span>
                          <MapPin className="w-3 h-3" />
                        </p>
                      )}
                    </div>
                    <div className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                      branch.isMain ? 'bg-primary-100 dark:bg-primary-900/50' : 'bg-gray-100 dark:bg-dark-hover'
                    )}>
                      <Building2 className={cn(
                        'w-5 h-5',
                        branch.isMain ? 'text-primary-600 dark:text-primary-400' : 'text-gray-500'
                      )} />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-gray-50 dark:bg-dark-hover rounded-lg py-2 px-1">
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{branch.todayOrders}</p>
                    <p className="text-[10px] text-gray-400">طلبات اليوم</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-dark-hover rounded-lg py-2 px-1">
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{branch._count.employees}</p>
                    <p className="text-[10px] text-gray-400">موظف</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-dark-hover rounded-lg py-2 px-1">
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{branch.availableTables}/{branch._count.tables}</p>
                    <p className="text-[10px] text-gray-400">طاولة متاحة</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        /* Grid View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {branches.map((branch) => (
            <div key={branch.id} className="glass-card p-6 animate-fade-in-up hover:shadow-lg transition-all duration-300">
              <div className="flex items-start justify-between mb-4">
                <button onClick={() => openEdit(branch)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-hover transition-colors">
                  <Pencil className="w-4 h-4 text-gray-400 hover:text-primary-600" />
                </button>
                <div className="flex items-center gap-3">
                  <div>
                    <div className="flex items-center gap-2 justify-end">
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
                  <div className={cn(
                    'w-12 h-12 rounded-xl flex items-center justify-center',
                    branch.isMain ? 'bg-primary-100 dark:bg-primary-900/50' : 'bg-gray-100 dark:bg-dark-hover',
                  )}>
                    <Building2 className={cn(
                      'w-6 h-6',
                      branch.isMain ? 'text-primary-600 dark:text-primary-400' : 'text-gray-500 dark:text-gray-400',
                    )} />
                  </div>
                </div>
              </div>

              {branch.address && (
                <div className="flex items-start gap-2 mb-4 justify-end">
                  <div className="text-right">
                    <p className="text-sm text-gray-600 dark:text-gray-300">{branch.address}</p>
                    {branch.city && <p className="text-xs text-gray-400">{branch.city}</p>}
                  </div>
                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                </div>
              )}

              {/* Revenue */}
              <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                <div className="flex items-center justify-between">
                  <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">{formatSAR(Number(branch.totalRevenue))} <SARSymbol className="text-emerald-500" /></p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">إجمالي الإيرادات</p>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3 pt-4 border-t border-gray-100 dark:border-dark-border/50">
                <div className="text-center">
                  <div className="flex items-center justify-center mb-1">
                    <ShoppingBag className="w-4 h-4 text-blue-500" />
                  </div>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{formatNumber(branch._count.orders)}</p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">طلب</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center mb-1">
                    <Users className="w-4 h-4 text-purple-500" />
                  </div>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{formatNumber(branch._count.employees)}</p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">موظف</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center mb-1">
                    <Armchair className="w-4 h-4 text-amber-500" />
                  </div>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{formatNumber(branch._count.tables)}</p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">طاولة</p>
                </div>
              </div>

              {/* Today's orders */}
              <div className="mt-3 pt-3 border-t border-gray-100 dark:border-dark-border/50 flex items-center justify-between">
                <span className="text-sm font-bold text-primary-600 dark:text-primary-400">{branch.todayOrders}</span>
                <span className="text-xs text-gray-400">طلبات اليوم</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowModal(false)}>
          <div className="glass-card w-full max-w-lg mx-4 p-6 animate-fade-in-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-card">
                <X className="w-5 h-5 text-gray-500" />
              </button>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {editingId ? 'تعديل الفرع' : 'فرع جديد'}
              </h3>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Name (EN) *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input-field text-sm" placeholder="Main Branch" dir="ltr" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">الاسم بالعربي *</label>
                  <input value={form.nameAr} onChange={e => setForm(f => ({ ...f, nameAr: e.target.value }))} className="input-field text-sm" placeholder="الفرع الرئيسي" />
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">خط الطول</label>
                  <input value={form.longitude} onChange={e => setForm(f => ({ ...f, longitude: e.target.value }))} className="input-field text-sm" placeholder="46.6753" dir="ltr" type="number" step="any" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">خط العرض</label>
                  <input value={form.latitude} onChange={e => setForm(f => ({ ...f, latitude: e.target.value }))} className="input-field text-sm" placeholder="24.7136" dir="ltr" type="number" step="any" />
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer justify-end">
                <span className="text-sm text-gray-700 dark:text-gray-300">فرع رئيسي</span>
                <input
                  type="checkbox"
                  checked={form.isMain}
                  onChange={e => setForm(f => ({ ...f, isMain: e.target.checked }))}
                  className="w-4 h-4 rounded border-gray-300 dark:border-dark-border text-primary-600 focus:ring-primary-500"
                />
              </label>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowModal(false)} className="btn-secondary">إلغاء</button>
                <button onClick={handleSave} disabled={saving || !form.nameAr || !form.name} className="btn-primary flex-1 disabled:opacity-50">
                  {saving ? 'جاري الحفظ...' : editingId ? 'حفظ التعديلات' : 'إضافة الفرع'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
