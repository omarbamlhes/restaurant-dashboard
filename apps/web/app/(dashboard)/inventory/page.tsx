'use client';

import { useEffect, useState } from 'react';
import { Package, Plus, Pencil, X, ArrowDownCircle, ArrowUpCircle, AlertTriangle, History } from 'lucide-react';
import toast from 'react-hot-toast';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import EmptyState from '@/components/shared/EmptyState';
import api from '@/lib/api';
import { cn, formatSAR, formatNumber } from '@/lib/utils';

interface Ingredient {
  id: string;
  name: string;
  nameAr: string;
  unit: string;
  costPerUnit: number;
  currentStock: number;
  minStock: number;
}

interface Branch {
  id: string;
  nameAr: string;
}

interface InventoryLog {
  id: string;
  type: string;
  quantity: number;
  note: string | null;
  branch: { nameAr: string };
  createdAt: string;
}

const ACTION_TYPES = [
  { value: 'PURCHASE', label: 'شراء', color: 'text-emerald-600 dark:text-emerald-400' },
  { value: 'CONSUMED', label: 'استهلاك', color: 'text-blue-600 dark:text-blue-400' },
  { value: 'WASTED', label: 'هدر', color: 'text-red-600 dark:text-red-400' },
  { value: 'ADJUSTMENT', label: 'تعديل', color: 'text-amber-600 dark:text-amber-400' },
];

const emptyForm = { name: '', nameAr: '', unit: 'كجم', costPerUnit: '', currentStock: '', minStock: '' };
const emptyLogForm = { type: 'PURCHASE', quantity: '', branchId: '', note: '' };

export default function InventoryPage() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [showLogModal, setShowLogModal] = useState(false);
  const [logIngredientId, setLogIngredientId] = useState<string | null>(null);
  const [logForm, setLogForm] = useState(emptyLogForm);
  const [savingLog, setSavingLog] = useState(false);

  const [showLogsModal, setShowLogsModal] = useState(false);
  const [logs, setLogs] = useState<InventoryLog[]>([]);
  const [logsIngredientName, setLogsIngredientName] = useState('');

  async function fetchData() {
    setLoading(true);
    try {
      const [invRes, branchRes] = await Promise.all([
        api.get('/inventory'),
        api.get('/branches'),
      ]);
      setIngredients(invRes.data);
      setBranches(branchRes.data);
    } catch {
      toast.error('فشل تحميل بيانات المخزون');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setShowModal(true);
  }

  function openEdit(ing: Ingredient) {
    setEditingId(ing.id);
    setForm({
      name: ing.name,
      nameAr: ing.nameAr,
      unit: ing.unit,
      costPerUnit: ing.costPerUnit.toString(),
      currentStock: ing.currentStock.toString(),
      minStock: ing.minStock.toString(),
    });
    setShowModal(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload: any = {
        name: form.name,
        nameAr: form.nameAr,
        unit: form.unit,
        costPerUnit: parseFloat(form.costPerUnit),
      };
      if (!editingId) {
        payload.currentStock = parseFloat(form.currentStock) || 0;
        payload.minStock = parseFloat(form.minStock) || 0;
      } else {
        payload.minStock = parseFloat(form.minStock) || 0;
      }

      if (editingId) {
        await api.put(`/inventory/${editingId}`, payload);
        toast.success('تم تعديل المكوّن بنجاح');
      } else {
        await api.post('/inventory', payload);
        toast.success('تم إضافة المكوّن بنجاح');
      }
      setShowModal(false);
      fetchData();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'فشل حفظ بيانات المكوّن');
    } finally {
      setSaving(false);
    }
  }

  function openLogModal(id: string) {
    setLogIngredientId(id);
    setLogForm({ ...emptyLogForm, branchId: branches[0]?.id || '' });
    setShowLogModal(true);
  }

  async function handleLogSave() {
    if (!logIngredientId) return;
    setSavingLog(true);
    try {
      const payload: any = {
        type: logForm.type,
        quantity: parseFloat(logForm.quantity),
        branchId: logForm.branchId,
      };
      if (logForm.note) payload.note = logForm.note;

      await api.post(`/inventory/${logIngredientId}/log`, payload);
      toast.success('تم تسجيل الحركة بنجاح');
      setShowLogModal(false);
      fetchData();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'فشل تسجيل الحركة');
    } finally {
      setSavingLog(false);
    }
  }

  async function openLogs(ing: Ingredient) {
    setLogsIngredientName(ing.nameAr);
    setShowLogsModal(true);
    try {
      const { data } = await api.get(`/inventory/${ing.id}/logs`);
      setLogs(data);
    } catch {
      toast.error('فشل تحميل سجل الحركات');
    }
  }

  const lowStockCount = ingredients.filter((i) => Number(i.currentStock) <= Number(i.minStock) && Number(i.minStock) > 0).length;

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">المخزون</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">إدارة المكونات والمخزون</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" />
          مكوّن جديد
        </button>
      </div>

      {/* Low Stock Alert */}
      {lowStockCount > 0 && (
        <div className="glass-card p-4 border-r-4 border-amber-500 animate-fade-in-up">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <p className="text-sm text-amber-700 dark:text-amber-300">
              يوجد <span className="font-bold">{lowStockCount}</span> مكوّن أقل من الحد الأدنى للمخزون
            </p>
          </div>
        </div>
      )}

      {/* Inventory Table */}
      {ingredients.length === 0 ? (
        <div className="glass-card p-6">
          <EmptyState
            icon={Package}
            title="لا توجد مكونات"
            description="أضف أول مكوّن للمخزون"
            action={
              <button onClick={openCreate} className="btn-primary text-sm flex items-center gap-2">
                <Plus className="w-4 h-4" />
                إضافة مكوّن
              </button>
            }
          />
        </div>
      ) : (
        <div className="glass-card overflow-hidden animate-fade-in-up">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-dark-border">
                  <th className="text-right text-xs font-semibold text-gray-500 dark:text-gray-400 p-4">المكوّن</th>
                  <th className="text-right text-xs font-semibold text-gray-500 dark:text-gray-400 p-4">الوحدة</th>
                  <th className="text-right text-xs font-semibold text-gray-500 dark:text-gray-400 p-4">التكلفة/وحدة</th>
                  <th className="text-right text-xs font-semibold text-gray-500 dark:text-gray-400 p-4">المخزون الحالي</th>
                  <th className="text-right text-xs font-semibold text-gray-500 dark:text-gray-400 p-4">الحد الأدنى</th>
                  <th className="text-right text-xs font-semibold text-gray-500 dark:text-gray-400 p-4">الحالة</th>
                  <th className="text-right text-xs font-semibold text-gray-500 dark:text-gray-400 p-4">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {ingredients.map((ing) => {
                  const isLow = Number(ing.currentStock) <= Number(ing.minStock) && Number(ing.minStock) > 0;
                  return (
                    <tr key={ing.id} className="border-b border-gray-100 dark:border-dark-border/50 hover:bg-gray-50 dark:hover:bg-dark-hover transition-colors">
                      <td className="p-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{ing.nameAr}</p>
                          <p className="text-xs text-gray-400">{ing.name}</p>
                        </div>
                      </td>
                      <td className="p-4 text-sm text-gray-700 dark:text-gray-300">{ing.unit}</td>
                      <td className="p-4 text-sm text-gray-700 dark:text-gray-300">{formatSAR(Number(ing.costPerUnit))}</td>
                      <td className="p-4">
                        <span className={cn('text-sm font-medium', isLow ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100')}>
                          {formatNumber(Number(ing.currentStock))}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-gray-500 dark:text-gray-400">{formatNumber(Number(ing.minStock))}</td>
                      <td className="p-4">
                        {isLow ? (
                          <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
                            <AlertTriangle className="w-3 h-3" />
                            منخفض
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                            متوفر
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <button onClick={() => openLogModal(ing.id)} className="p-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors" title="تسجيل حركة">
                            <ArrowDownCircle className="w-4 h-4 text-emerald-500" />
                          </button>
                          <button onClick={() => openLogs(ing)} className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors" title="سجل الحركات">
                            <History className="w-4 h-4 text-blue-500" />
                          </button>
                          <button onClick={() => openEdit(ing)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-hover transition-colors" title="تعديل">
                            <Pencil className="w-4 h-4 text-gray-400 hover:text-primary-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Ingredient Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowModal(false)}>
          <div className="glass-card w-full max-w-md mx-4 p-6 animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {editingId ? 'تعديل مكوّن' : 'مكوّن جديد'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-card">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">الاسم بالعربي *</label>
                  <input value={form.nameAr} onChange={(e) => setForm((f) => ({ ...f, nameAr: e.target.value }))} className="input-field text-sm" placeholder="دقيق" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Name (EN) *</label>
                  <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="input-field text-sm" placeholder="Flour" dir="ltr" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">الوحدة *</label>
                  <select value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} className="input-field text-sm">
                    <option value="كجم">كجم</option>
                    <option value="جرام">جرام</option>
                    <option value="لتر">لتر</option>
                    <option value="مل">مل</option>
                    <option value="حبة">حبة</option>
                    <option value="علبة">علبة</option>
                    <option value="كيس">كيس</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">التكلفة/وحدة *</label>
                  <input
                    type="number"
                    value={form.costPerUnit}
                    onChange={(e) => setForm((f) => ({ ...f, costPerUnit: e.target.value }))}
                    className="input-field text-sm"
                    placeholder="5.00"
                    dir="ltr"
                    step="0.01"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {!editingId && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">المخزون الحالي</label>
                    <input
                      type="number"
                      value={form.currentStock}
                      onChange={(e) => setForm((f) => ({ ...f, currentStock: e.target.value }))}
                      className="input-field text-sm"
                      placeholder="100"
                      dir="ltr"
                    />
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">الحد الأدنى</label>
                  <input
                    type="number"
                    value={form.minStock}
                    onChange={(e) => setForm((f) => ({ ...f, minStock: e.target.value }))}
                    className="input-field text-sm"
                    placeholder="10"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSave}
                  disabled={saving || !form.nameAr || !form.name || !form.costPerUnit}
                  className="btn-primary flex-1 disabled:opacity-50"
                >
                  {saving ? 'جاري الحفظ...' : editingId ? 'حفظ التعديلات' : 'إضافة المكوّن'}
                </button>
                <button onClick={() => setShowModal(false)} className="btn-secondary">إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Inventory Log Modal */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowLogModal(false)}>
          <div className="glass-card w-full max-w-md mx-4 p-6 animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">تسجيل حركة مخزون</h3>
              <button onClick={() => setShowLogModal(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-card">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">نوع الحركة *</label>
                <select value={logForm.type} onChange={(e) => setLogForm((f) => ({ ...f, type: e.target.value }))} className="input-field text-sm">
                  {ACTION_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">الكمية *</label>
                <input
                  type="number"
                  value={logForm.quantity}
                  onChange={(e) => setLogForm((f) => ({ ...f, quantity: e.target.value }))}
                  className="input-field text-sm"
                  placeholder="50"
                  dir="ltr"
                  step="0.01"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">الفرع *</label>
                <select value={logForm.branchId} onChange={(e) => setLogForm((f) => ({ ...f, branchId: e.target.value }))} className="input-field text-sm">
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>{b.nameAr}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">ملاحظة</label>
                <input
                  value={logForm.note}
                  onChange={(e) => setLogForm((f) => ({ ...f, note: e.target.value }))}
                  className="input-field text-sm"
                  placeholder="ملاحظة اختيارية..."
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleLogSave}
                  disabled={savingLog || !logForm.quantity || !logForm.branchId}
                  className="btn-primary flex-1 disabled:opacity-50"
                >
                  {savingLog ? 'جاري الحفظ...' : 'تسجيل الحركة'}
                </button>
                <button onClick={() => setShowLogModal(false)} className="btn-secondary">إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Logs History Modal */}
      {showLogsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowLogsModal(false)}>
          <div className="glass-card w-full max-w-lg mx-4 p-6 animate-fade-in-up max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">سجل حركات: {logsIngredientName}</h3>
              <button onClick={() => setShowLogsModal(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-card">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {logs.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">لا توجد حركات مسجلة</p>
            ) : (
              <div className="space-y-3">
                {logs.map((log) => {
                  const actionType = ACTION_TYPES.find((t) => t.value === log.type);
                  return (
                    <div key={log.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-dark-hover">
                      <div className="flex items-center gap-3">
                        {log.type === 'PURCHASE' ? (
                          <ArrowDownCircle className="w-5 h-5 text-emerald-500" />
                        ) : (
                          <ArrowUpCircle className="w-5 h-5 text-red-500" />
                        )}
                        <div>
                          <p className={cn('text-sm font-medium', actionType?.color)}>
                            {actionType?.label} — {formatNumber(Number(log.quantity))}
                          </p>
                          <p className="text-xs text-gray-400">
                            {log.branch.nameAr} {log.note ? `• ${log.note}` : ''}
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-gray-400">{new Date(log.createdAt).toLocaleDateString('ar-SA')}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
