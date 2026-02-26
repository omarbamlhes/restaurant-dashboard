'use client';

import { useEffect, useState } from 'react';
import { Users, Plus, Pencil, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import TableSkeleton from '@/components/shared/TableSkeleton';
import EmptyState from '@/components/shared/EmptyState';
import api from '@/lib/api';
import { cn, formatSAR } from '@/lib/utils';

interface Employee {
  id: string;
  name: string;
  nameAr: string;
  phone: string | null;
  role: string;
  salary: number | null;
  branchId: string;
  isActive: boolean;
  branch: { nameAr: string };
  createdAt: string;
}

interface Branch {
  id: string;
  nameAr: string;
}

const ROLES = [
  { value: 'كاشير', label: 'كاشير' },
  { value: 'طباخ', label: 'طباخ' },
  { value: 'نادل', label: 'نادل' },
  { value: 'مدير فرع', label: 'مدير فرع' },
  { value: 'عامل توصيل', label: 'عامل توصيل' },
  { value: 'محاسب', label: 'محاسب' },
];

const emptyForm = { name: '', nameAr: '', phone: '', role: 'كاشير', salary: '', branchId: '' };

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);

  const [filterBranch, setFilterBranch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterActive, setFilterActive] = useState('true');

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // Fetch branches once on mount (independent of filters)
  useEffect(() => {
    api.get('/branches').then((res) => setBranches(res.data)).catch(console.error);
  }, []);

  async function fetchEmployees() {
    setLoading(true);
    try {
      const params: any = {};
      if (filterBranch) params.branchId = filterBranch;
      if (filterRole) params.role = filterRole;
      if (filterActive) params.isActive = filterActive;

      const { data } = await api.get('/employees', { params });
      setEmployees(data);
    } catch {
      toast.error('فشل تحميل بيانات الموظفين');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchEmployees();
  }, [filterBranch, filterRole, filterActive]);

  function openCreate() {
    setEditingId(null);
    setForm({ ...emptyForm, branchId: branches[0]?.id || '' });
    setShowModal(true);
  }

  function openEdit(emp: Employee) {
    setEditingId(emp.id);
    setForm({
      name: emp.name,
      nameAr: emp.nameAr,
      phone: emp.phone || '',
      role: emp.role,
      salary: emp.salary?.toString() || '',
      branchId: emp.branchId,
    });
    setShowModal(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload: any = {
        name: form.name,
        nameAr: form.nameAr,
        role: form.role,
        branchId: form.branchId,
      };
      if (form.phone) payload.phone = form.phone;
      if (form.salary) payload.salary = parseFloat(form.salary);

      if (editingId) {
        await api.put(`/employees/${editingId}`, payload);
        toast.success('تم تعديل الموظف بنجاح');
      } else {
        await api.post('/employees', payload);
        toast.success('تم إضافة الموظف بنجاح');
      }
      setShowModal(false);
      fetchEmployees();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'فشل حفظ بيانات الموظف');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('هل تريد تعطيل هذا الموظف؟')) return;
    try {
      await api.delete(`/employees/${id}`);
      toast.success('تم تعطيل الموظف');
      fetchEmployees();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'فشل تعطيل الموظف');
    }
  }

  if (loading) return <TableSkeleton columns={7} />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">الموظفين</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">إدارة فريق العمل</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" />
          موظف جديد
        </button>
      </div>

      {/* Filters */}
      <div className="glass-card p-4">
        <div className="flex flex-wrap gap-3">
          <select
            value={filterBranch}
            onChange={(e) => setFilterBranch(e.target.value)}
            className="input-field text-sm w-auto"
          >
            <option value="">كل الفروع</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.nameAr}</option>
            ))}
          </select>

          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="input-field text-sm w-auto"
          >
            <option value="">كل الأدوار</option>
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>

          <select
            value={filterActive}
            onChange={(e) => setFilterActive(e.target.value)}
            className="input-field text-sm w-auto"
          >
            <option value="true">نشط</option>
            <option value="false">معطّل</option>
            <option value="">الكل</option>
          </select>
        </div>
      </div>

      {/* Employees Table */}
      {employees.length === 0 ? (
        <div className="glass-card p-6">
          <EmptyState
            icon={Users}
            title="لا يوجد موظفين"
            description="أضف أول موظف لفريق العمل"
            action={
              <button onClick={openCreate} className="btn-primary text-sm flex items-center gap-2">
                <Plus className="w-4 h-4" />
                إضافة موظف
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
                  <th className="text-right text-xs font-semibold text-gray-500 dark:text-gray-400 p-4">الموظف</th>
                  <th className="text-right text-xs font-semibold text-gray-500 dark:text-gray-400 p-4">الدور</th>
                  <th className="text-right text-xs font-semibold text-gray-500 dark:text-gray-400 p-4">الفرع</th>
                  <th className="text-right text-xs font-semibold text-gray-500 dark:text-gray-400 p-4">الجوال</th>
                  <th className="text-right text-xs font-semibold text-gray-500 dark:text-gray-400 p-4">الراتب</th>
                  <th className="text-right text-xs font-semibold text-gray-500 dark:text-gray-400 p-4">الحالة</th>
                  <th className="text-right text-xs font-semibold text-gray-500 dark:text-gray-400 p-4">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => (
                  <tr key={emp.id} className="border-b border-gray-100 dark:border-dark-border/50 hover:bg-gray-50 dark:hover:bg-dark-hover transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center">
                          <span className="text-sm font-bold text-primary-600 dark:text-primary-400">
                            {emp.nameAr.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{emp.nameAr}</p>
                          <p className="text-xs text-gray-400">{emp.name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-xs px-2 py-1 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                        {emp.role}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-gray-700 dark:text-gray-300">{emp.branch.nameAr}</td>
                    <td className="p-4 text-sm text-gray-700 dark:text-gray-300" dir="ltr">{emp.phone || '—'}</td>
                    <td className="p-4 text-sm text-gray-700 dark:text-gray-300">
                      {emp.salary ? formatSAR(Number(emp.salary)) : '—'}
                    </td>
                    <td className="p-4">
                      <span className={cn(
                        'text-xs px-2 py-1 rounded-lg',
                        emp.isActive
                          ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400',
                      )}>
                        {emp.isActive ? 'نشط' : 'معطّل'}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(emp)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-hover transition-colors">
                          <Pencil className="w-4 h-4 text-gray-400 hover:text-primary-600" />
                        </button>
                        {emp.isActive && (
                          <button onClick={() => handleDelete(emp.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                            <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-600" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowModal(false)}>
          <div className="glass-card w-full max-w-md mx-4 p-6 animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {editingId ? 'تعديل موظف' : 'موظف جديد'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-card">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">الاسم بالعربي *</label>
                  <input value={form.nameAr} onChange={(e) => setForm((f) => ({ ...f, nameAr: e.target.value }))} className="input-field text-sm" placeholder="محمد أحمد" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Name (EN) *</label>
                  <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="input-field text-sm" placeholder="Mohammed Ahmed" dir="ltr" />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">رقم الجوال</label>
                <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className="input-field text-sm" placeholder="05xxxxxxxx" dir="ltr" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">الدور *</label>
                  <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} className="input-field text-sm">
                    {ROLES.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">الراتب</label>
                  <input
                    type="number"
                    value={form.salary}
                    onChange={(e) => setForm((f) => ({ ...f, salary: e.target.value }))}
                    className="input-field text-sm"
                    placeholder="5000"
                    dir="ltr"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">الفرع *</label>
                <select
                  value={form.branchId}
                  onChange={(e) => setForm((f) => ({ ...f, branchId: e.target.value }))}
                  className="input-field text-sm"
                >
                  <option value="">اختر الفرع</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>{b.nameAr}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSave}
                  disabled={saving || !form.nameAr || !form.name || !form.branchId}
                  className="btn-primary flex-1 disabled:opacity-50"
                >
                  {saving ? 'جاري الحفظ...' : editingId ? 'حفظ التعديلات' : 'إضافة الموظف'}
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
