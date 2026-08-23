'use client';

import { useEffect, useState, useCallback } from 'react';
import { UtensilsCrossed, Plus, Pencil, Trash2, X, Tag, DollarSign, Clock, ChefHat, Flame } from 'lucide-react';
import TableSkeleton from '@/components/shared/TableSkeleton';
import EmptyState from '@/components/shared/EmptyState';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { cn, formatSAR } from '@/lib/utils';
import SARSymbol from '@/components/shared/SARSymbol';

interface Category {
  id: string;
  name: string;
  nameAr: string;
  sortOrder: number;
  _count: { menuItems: number };
}

interface KitchenStation {
  id: string;
  name: string;
  nameAr: string;
  color: string;
  sortOrder: number;
  _count: { menuItems: number };
}

interface RecipeLine {
  ingredientId: string;
  nameAr: string;
  unit: string;
  quantity: number;
  costPerUnit: number;
  lineCost: number;
}

interface MenuItem {
  id: string;
  name: string;
  nameAr: string;
  description?: string;
  descriptionAr?: string;
  price: number;
  cost: number | null;
  preparationTime: number | null;
  isActive: boolean;
  category: { id: string; nameAr: string };
  station?: { id: string; nameAr: string; color: string } | null;
  // Recipe-derived costing computed by the API.
  recipe?: RecipeLine[];
  recipeCost?: number | null;
  effectiveCost?: number | null;
  margin?: number | null;
  foodCostPct?: number | null;
}

const emptyForm = {
  name: '', nameAr: '', description: '', descriptionAr: '',
  price: '', cost: '', preparationTime: '', categoryId: '', stationId: '',
};

const STATION_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4',
  '#3b82f6', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6',
];

export default function MenuPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [stations, setStations] = useState<KitchenStation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // Category modal
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [catForm, setCatForm] = useState({ name: '', nameAr: '', sortOrder: '' });

  // Station modal
  const [showStationModal, setShowStationModal] = useState(false);
  const [editingStationId, setEditingStationId] = useState<string | null>(null);
  const [stationForm, setStationForm] = useState({ name: '', nameAr: '', color: STATION_COLORS[0] });
  const [savingStation, setSavingStation] = useState(false);

  // Delete confirm
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteStationId, setDeleteStationId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [itemsRes, catsRes, stationsRes] = await Promise.all([
        api.get('/menu', { params: activeCategory ? { categoryId: activeCategory } : {} }),
        api.get('/menu/categories'),
        api.get('/kitchen-stations'),
      ]);
      setItems(itemsRes.data);
      setCategories(catsRes.data);
      setStations(stationsRes.data);
    } catch {
      toast.error('فشل تحميل بيانات القائمة');
    } finally {
      setLoading(false);
    }
  }, [activeCategory]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setShowModal(true);
  }

  function openEdit(item: MenuItem) {
    setEditingId(item.id);
    setForm({
      name: item.name,
      nameAr: item.nameAr,
      description: item.description || '',
      descriptionAr: item.descriptionAr || '',
      price: String(item.price),
      cost: item.cost != null ? String(item.cost) : '',
      preparationTime: item.preparationTime != null ? String(item.preparationTime) : '',
      categoryId: item.category.id,
      stationId: item.station?.id || '',
    });
    setShowModal(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload: any = {
        name: form.name,
        nameAr: form.nameAr,
        price: parseFloat(form.price),
        categoryId: form.categoryId,
      };
      if (form.description) payload.description = form.description;
      if (form.descriptionAr) payload.descriptionAr = form.descriptionAr;
      if (form.cost) payload.cost = parseFloat(form.cost);
      if (form.preparationTime) payload.preparationTime = parseInt(form.preparationTime);
      payload.stationId = form.stationId || null;

      if (editingId) {
        await api.put(`/menu/${editingId}`, payload);
      } else {
        await api.post('/menu', payload);
      }
      setShowModal(false);
      toast.success(editingId ? 'تم تعديل الصنف' : 'تم إضافة الصنف');
      fetchData();
    } catch {
      toast.error('فشل حفظ الصنف');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      await api.delete(`/menu/${deleteId}`);
      setDeleteId(null);
      toast.success('تم حذف الصنف');
      fetchData();
    } catch {
      toast.error('فشل حذف الصنف');
    }
  }

  async function handleCreateCategory() {
    try {
      const payload: any = { name: catForm.name, nameAr: catForm.nameAr };
      if (catForm.sortOrder) payload.sortOrder = parseInt(catForm.sortOrder);
      await api.post('/menu/categories', payload);
      setShowCategoryModal(false);
      setCatForm({ name: '', nameAr: '', sortOrder: '' });
      toast.success('تم إضافة الفئة');
      fetchData();
    } catch {
      toast.error('فشل إضافة الفئة');
    }
  }

  // Station CRUD
  function openCreateStation() {
    setEditingStationId(null);
    setStationForm({ name: '', nameAr: '', color: STATION_COLORS[stations.length % STATION_COLORS.length] });
    setShowStationModal(true);
  }

  function openEditStation(station: KitchenStation) {
    setEditingStationId(station.id);
    setStationForm({ name: station.name, nameAr: station.nameAr, color: station.color });
    setShowStationModal(true);
  }

  async function handleSaveStation() {
    setSavingStation(true);
    try {
      if (editingStationId) {
        await api.put(`/kitchen-stations/${editingStationId}`, stationForm);
        toast.success('تم تعديل المحطة');
      } else {
        await api.post('/kitchen-stations', stationForm);
        toast.success('تم إضافة المحطة');
      }
      setShowStationModal(false);
      fetchData();
    } catch {
      toast.error('فشل حفظ المحطة');
    } finally {
      setSavingStation(false);
    }
  }

  async function handleDeleteStation() {
    if (!deleteStationId) return;
    try {
      await api.delete(`/kitchen-stations/${deleteStationId}`);
      setDeleteStationId(null);
      toast.success('تم حذف المحطة');
      fetchData();
    } catch {
      toast.error('فشل حذف المحطة');
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">القائمة</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">إدارة أصناف المطعم والفئات ومحطات المطبخ</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowCategoryModal(true)} className="btn-secondary flex items-center gap-2 text-sm">
            <Tag className="w-4 h-4" />
            فئة جديدة
          </button>
          <button onClick={openCreate} className="btn-primary flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" />
            صنف جديد
          </button>
        </div>
      </div>

      {/* Kitchen Stations Section */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ChefHat className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">محطات المطبخ</h2>
            <span className="text-xs text-gray-400">اربط كل صنف بمحطته عشان الطلب يروح للشاشة الصح</span>
          </div>
          <button onClick={openCreateStation} className="text-xs btn-primary flex items-center gap-1.5 py-1.5 px-3">
            <Plus className="w-3.5 h-3.5" />
            محطة جديدة
          </button>
        </div>

        {stations.length === 0 ? (
          <div className="text-center py-6">
            <Flame className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
            <p className="text-sm text-gray-400">لا توجد محطات بعد</p>
            <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">أنشئ محطات مثل: المشاوي، البرجر، المشروبات، الحلويات</p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {stations.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card group hover:shadow-sm transition-all"
              >
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                <span className="text-sm font-medium text-gray-900 dark:text-white">{s.nameAr}</span>
                <span className="text-xs text-gray-400">({s._count.menuItems})</span>
                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEditStation(s)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-dark-hover">
                    <Pencil className="w-3 h-3 text-gray-400" />
                  </button>
                  <button onClick={() => setDeleteStationId(s.id)} className="p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/30">
                    <Trash2 className="w-3 h-3 text-gray-400 hover:text-rose-500" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setActiveCategory('')}
          className={cn(
            'px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors',
            !activeCategory
              ? 'bg-primary-600 text-white'
              : 'bg-white dark:bg-dark-card text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-hover border border-gray-200 dark:border-dark-border',
          )}
        >
          الكل ({items.length})
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={cn(
              'px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors',
              activeCategory === cat.id
                ? 'bg-primary-600 text-white'
                : 'bg-white dark:bg-dark-card text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-hover border border-gray-200 dark:border-dark-border',
            )}
          >
            {cat.nameAr} ({cat._count.menuItems})
          </button>
        ))}
      </div>

      {/* Items Grid */}
      {loading ? (
        <TableSkeleton columns={4} rows={6} />
      ) : items.length === 0 ? (
        <div className="glass-card p-6">
          <EmptyState
            icon={UtensilsCrossed}
            title="لا توجد أصناف"
            description="ابدأ بإضافة أصناف لقائمة مطعمك"
            action={
              <button onClick={openCreate} className="btn-primary text-sm flex items-center gap-2">
                <Plus className="w-4 h-4" />
                إضافة صنف
              </button>
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {items.map((item) => {
            // Prefer the API's recipe-derived numbers; fall back for older payloads.
            const cost = item.effectiveCost ?? (item.cost != null ? Number(item.cost) : null);
            const margin = item.margin ?? (cost != null && Number(item.price) > 0
              ? ((Number(item.price) - cost) / Number(item.price)) * 100
              : null);
            const foodCostPct = item.foodCostPct ?? (cost != null && Number(item.price) > 0
              ? (cost / Number(item.price)) * 100
              : null);
            const fromRecipe = item.recipeCost != null;
            return (
              <div key={item.id} className="glass-card p-5 animate-fade-in-up hover:shadow-lg transition-all duration-300">
                {/* Category + Station badges */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs px-2 py-1 rounded-lg bg-primary-50 dark:bg-primary-950/30 text-primary-700 dark:text-primary-400 font-medium">
                      {item.category.nameAr}
                    </span>
                    {item.station && (
                      <span
                        className="text-xs px-2 py-1 rounded-lg text-white font-medium"
                        style={{ backgroundColor: item.station.color }}
                      >
                        {item.station.nameAr}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(item)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-hover transition-colors">
                      <Pencil className="w-3.5 h-3.5 text-gray-400 hover:text-primary-600" />
                    </button>
                    <button onClick={() => setDeleteId(item.id)} className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors">
                      <Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-rose-600" />
                    </button>
                  </div>
                </div>

                {/* Name */}
                <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">{item.nameAr}</h3>
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">{item.name}</p>

                {/* Price row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{formatSAR(item.price)} <SARSymbol /></span>
                  </div>
                  {item.preparationTime && (
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <Clock className="w-3.5 h-3.5" />
                      {item.preparationTime} د
                    </div>
                  )}
                </div>

                {/* Cost + margin (recipe-derived when the item has a recipe) */}
                {margin !== null && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                        <span>التكلفة {cost != null ? formatSAR(cost) : '—'}</span>
                        {fromRecipe && (
                          <span
                            title="محسوبة تلقائياً من مكونات الوصفة"
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-400 font-medium"
                          >
                            <ChefHat className="w-3 h-3" />
                            من الوصفة
                          </span>
                        )}
                      </div>
                      {foodCostPct !== null && (
                        <span className="text-gray-500 dark:text-gray-400">
                          تكلفة الطعام <span className={cn('font-medium', foodCostPct <= 35 ? 'text-emerald-600' : foodCostPct <= 45 ? 'text-amber-600' : 'text-rose-600')}>{foodCostPct.toFixed(0)}%</span>
                        </span>
                      )}
                    </div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-500 dark:text-gray-400">هامش الربح</span>
                      <span className={cn('font-medium', margin >= 50 ? 'text-emerald-600' : margin >= 30 ? 'text-amber-600' : 'text-rose-600')}>
                        {margin.toFixed(0)}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-100 dark:bg-dark-hover rounded-full overflow-hidden">
                      <div
                        className={cn('h-full rounded-full transition-all', margin >= 50 ? 'bg-emerald-500' : margin >= 30 ? 'bg-amber-500' : 'bg-rose-500')}
                        style={{ width: `${Math.min(Math.max(margin, 0), 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Item Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowModal(false)}>
          <div className="glass-card w-full max-w-lg mx-4 p-6 animate-fade-in-up max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {editingId ? 'تعديل الصنف' : 'إضافة صنف جديد'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-card">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">الاسم بالعربي *</label>
                  <input value={form.nameAr} onChange={e => setForm(f => ({ ...f, nameAr: e.target.value }))} className="input-field text-sm" placeholder="شاورما دجاج" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Name (EN) *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input-field text-sm" placeholder="Chicken Shawarma" dir="ltr" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">الفئة *</label>
                  <select value={form.categoryId} onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))} className="input-field text-sm">
                    <option value="">اختر الفئة</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.nameAr}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                    محطة المطبخ
                    <ChefHat className="w-3.5 h-3.5 inline mr-1 text-gray-400" />
                  </label>
                  <select value={form.stationId} onChange={e => setForm(f => ({ ...f, stationId: e.target.value }))} className="input-field text-sm">
                    <option value="">بدون محطة</option>
                    {stations.map(s => <option key={s.id} value={s.id}>{s.nameAr}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">السعر (<SARSymbol />) *</label>
                  <input type="number" step="0.01" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} className="input-field text-sm" dir="ltr" placeholder="18.00" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">التكلفة (<SARSymbol />)</label>
                  <input type="number" step="0.01" value={form.cost} onChange={e => setForm(f => ({ ...f, cost: e.target.value }))} className="input-field text-sm" dir="ltr" placeholder="6.00" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">وقت التحضير (د)</label>
                  <input type="number" value={form.preparationTime} onChange={e => setForm(f => ({ ...f, preparationTime: e.target.value }))} className="input-field text-sm" dir="ltr" placeholder="8" />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">الوصف بالعربي</label>
                <textarea value={form.descriptionAr} onChange={e => setForm(f => ({ ...f, descriptionAr: e.target.value }))} className="input-field text-sm" rows={2} placeholder="وصف الصنف..." />
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={handleSave} disabled={saving || !form.nameAr || !form.name || !form.price || !form.categoryId} className="btn-primary flex-1 disabled:opacity-50">
                  {saving ? 'جاري الحفظ...' : editingId ? 'حفظ التعديلات' : 'إضافة الصنف'}
                </button>
                <button onClick={() => setShowModal(false)} className="btn-secondary">إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Item Confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setDeleteId(null)}>
          <div className="glass-card w-full max-w-sm mx-4 p-6 animate-fade-in-up" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">حذف الصنف</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">هل أنت متأكد من حذف هذا الصنف؟ لا يمكن التراجع عن هذا الإجراء.</p>
            <div className="flex gap-3">
              <button onClick={handleDelete} className="flex-1 px-5 py-2.5 rounded-xl font-medium bg-rose-600 hover:bg-rose-700 text-white transition-colors">
                نعم، احذف
              </button>
              <button onClick={() => setDeleteId(null)} className="btn-secondary flex-1">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowCategoryModal(false)}>
          <div className="glass-card w-full max-w-sm mx-4 p-6 animate-fade-in-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">فئة جديدة</h3>
              <button onClick={() => setShowCategoryModal(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-card">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">الاسم بالعربي *</label>
                <input value={catForm.nameAr} onChange={e => setCatForm(f => ({ ...f, nameAr: e.target.value }))} className="input-field text-sm" placeholder="مشويات" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Name (EN) *</label>
                <input value={catForm.name} onChange={e => setCatForm(f => ({ ...f, name: e.target.value }))} className="input-field text-sm" placeholder="Grills" dir="ltr" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">الترتيب</label>
                <input type="number" value={catForm.sortOrder} onChange={e => setCatForm(f => ({ ...f, sortOrder: e.target.value }))} className="input-field text-sm" dir="ltr" placeholder="1" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={handleCreateCategory} disabled={!catForm.name || !catForm.nameAr} className="btn-primary flex-1 disabled:opacity-50">
                  إضافة الفئة
                </button>
                <button onClick={() => setShowCategoryModal(false)} className="btn-secondary">إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Station Modal */}
      {showStationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowStationModal(false)}>
          <div className="glass-card w-full max-w-sm mx-4 p-6 animate-fade-in-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {editingStationId ? 'تعديل المحطة' : 'محطة مطبخ جديدة'}
              </h3>
              <button onClick={() => setShowStationModal(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-card">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">الاسم بالعربي *</label>
                <input value={stationForm.nameAr} onChange={e => setStationForm(f => ({ ...f, nameAr: e.target.value }))} className="input-field text-sm" placeholder="المشاوي" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Name (EN) *</label>
                <input value={stationForm.name} onChange={e => setStationForm(f => ({ ...f, name: e.target.value }))} className="input-field text-sm" placeholder="Grill Station" dir="ltr" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">اللون</label>
                <div className="flex gap-2 flex-wrap">
                  {STATION_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setStationForm(f => ({ ...f, color: c }))}
                      className={cn(
                        'w-8 h-8 rounded-lg transition-all',
                        stationForm.color === c ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-105',
                      )}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSaveStation}
                  disabled={savingStation || !stationForm.name || !stationForm.nameAr}
                  className="btn-primary flex-1 disabled:opacity-50"
                >
                  {savingStation ? 'جاري الحفظ...' : editingStationId ? 'حفظ التعديلات' : 'إضافة المحطة'}
                </button>
                <button onClick={() => setShowStationModal(false)} className="btn-secondary">إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Station Confirm */}
      {deleteStationId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setDeleteStationId(null)}>
          <div className="glass-card w-full max-w-sm mx-4 p-6 animate-fade-in-up" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">حذف المحطة</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">سيتم فك ربط جميع الأصناف من هذه المحطة. هل تريد المتابعة؟</p>
            <div className="flex gap-3">
              <button onClick={handleDeleteStation} className="flex-1 px-5 py-2.5 rounded-xl font-medium bg-rose-600 hover:bg-rose-700 text-white transition-colors">
                نعم، احذف
              </button>
              <button onClick={() => setDeleteStationId(null)} className="btn-secondary flex-1">إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
