'use client';

import { useEffect, useState, useCallback } from 'react';
import { UserCircle, Plus, Pencil, Trash2, X, Search, Phone, Mail, ShoppingBag, Crown, Clock, Users } from 'lucide-react';
import DashboardSkeleton from '@/components/shared/DashboardSkeleton';
import EmptyState from '@/components/shared/EmptyState';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { cn, formatSAR, formatNumber } from '@/lib/utils';
import SARSymbol from '@/components/shared/SARSymbol';

interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  notes: string | null;
  totalOrders: number;
  totalSpent: number;
  lastOrderAt: string | null;
  createdAt: string;
  orders: {
    id: string;
    orderNumber: string;
    total: number;
    status: string;
    type: string;
    createdAt: string;
  }[];
  _count: { orders: number };
}

interface Stats {
  totalCustomers: number;
  activeCustomers: number;
  totalSpent: number;
  avgSpent: number;
}

const emptyForm = { name: '', phone: '', email: '', notes: '' };

const statusMap: Record<string, { label: string; class: string }> = {
  PENDING: { label: 'جديد', class: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' },
  PREPARING: { label: 'تحضير', class: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' },
  READY: { label: 'جاهز', class: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' },
  COMPLETED: { label: 'مكتمل', class: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' },
  CANCELLED: { label: 'ملغي', class: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300' },
};

const typeMap: Record<string, string> = { DINE_IN: 'محلي', TAKEAWAY: 'سفري', DELIVERY: 'توصيل' };

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'اليوم';
  if (days === 1) return 'أمس';
  if (days < 7) return `قبل ${days} أيام`;
  if (days < 30) return `قبل ${Math.floor(days / 7)} أسابيع`;
  return `قبل ${Math.floor(days / 30)} شهر`;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const PAGE_SIZE = 50;

  // Fetch a page of customers. reset=true replaces the list (new search / first
  // load); otherwise the page is appended for "load more". The list stays sorted
  // by total spend across pages, so the top customers panel stays correct.
  const fetchCustomers = useCallback(async (targetPage: number, searchTerm: string, reset: boolean) => {
    if (reset) setLoading(true); else setLoadingMore(true);
    try {
      const params = new URLSearchParams({ page: String(targetPage), limit: String(PAGE_SIZE) });
      if (searchTerm) params.set('search', searchTerm);
      const { data } = await api.get(`/customers?${params}`);
      setCustomers(prev => (reset ? data.data : [...prev, ...data.data]));
      setPage(data.page);
      setTotalPages(data.totalPages);
      setTotal(data.total);
    } catch {
      toast.error('فشل تحميل بيانات العملاء');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  async function fetchStats() {
    try {
      const { data } = await api.get('/customers/stats');
      setStats(data);
    } catch { /* stats are non-critical */ }
  }

  function refresh() {
    fetchCustomers(1, search, true);
    fetchStats();
  }

  // Debounce search → refetch page 1 from the server.
  useEffect(() => {
    const t = setTimeout(() => fetchCustomers(1, search, true), 300);
    return () => clearTimeout(t);
  }, [search, fetchCustomers]);

  useEffect(() => { fetchStats(); }, []);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setShowModal(true);
  }

  function openEdit(c: Customer) {
    setEditingId(c.id);
    setForm({ name: c.name, phone: c.phone, email: c.email || '', notes: c.notes || '' });
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.name || !form.phone) return;
    setSaving(true);
    try {
      const payload: any = { name: form.name, phone: form.phone };
      if (form.email) payload.email = form.email;
      if (form.notes) payload.notes = form.notes;

      if (editingId) {
        await api.put(`/customers/${editingId}`, payload);
        toast.success('تم تعديل بيانات العميل');
      } else {
        await api.post('/customers', payload);
        toast.success('تم إضافة العميل');
      }
      setShowModal(false);
      refresh();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'فشل حفظ بيانات العميل');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('هل أنت متأكد من حذف هذا العميل؟')) return;
    try {
      await api.delete(`/customers/${id}`);
      toast.success('تم حذف العميل');
      if (selectedCustomer?.id === id) setSelectedCustomer(null);
      refresh();
    } catch {
      toast.error('فشل حذف العميل');
    }
  }

  // Top customers by spending
  const topCustomers = [...customers].sort((a, b) => Number(b.totalSpent) - Number(a.totalSpent)).slice(0, 3);

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">العملاء</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">إدارة قاعدة عملاء المطعم</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" />
          عميل جديد
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatNumber(stats.totalCustomers)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">إجمالي العملاء</p>
              </div>
            </div>
          </div>
          <div className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <UserCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatNumber(stats.activeCustomers)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">نشط (٣٠ يوم)</p>
              </div>
            </div>
          </div>
          <div className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <ShoppingBag className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatSAR(stats.totalSpent)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">إجمالي المصروف</p>
              </div>
            </div>
          </div>
          <div className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Crown className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatSAR(stats.avgSpent)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">متوسط الإنفاق</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Customer List */}
        <div className="lg:col-span-2 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input-field text-sm pr-10"
              placeholder="بحث بالاسم أو رقم الجوال..."
            />
          </div>

          {customers.length === 0 ? (
            <div className="glass-card p-6">
              <EmptyState
                icon={UserCircle}
                title="لا يوجد عملاء"
                description={search ? 'لا توجد نتائج للبحث' : 'أضف عميلك الأول'}
                action={!search ? (
                  <button onClick={openCreate} className="btn-primary text-sm flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    إضافة عميل
                  </button>
                ) : undefined}
              />
            </div>
          ) : (
            <div className="space-y-2">
              {customers.map(customer => (
                <div
                  key={customer.id}
                  onClick={() => setSelectedCustomer(customer)}
                  className={cn(
                    'glass-card p-4 cursor-pointer hover:shadow-md transition-all duration-200 animate-fade-in-up',
                    selectedCustomer?.id === customer.id && 'ring-2 ring-primary-500',
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                        <span className="text-sm font-bold text-primary-700 dark:text-primary-400">
                          {customer.name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white">{customer.name}</h3>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Phone className="w-3 h-3" />{customer.phone}
                          </span>
                          {customer.email && (
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              <Mail className="w-3 h-3" />{customer.email}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-left flex items-center gap-4">
                      <div>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{formatSAR(customer.totalSpent)} <SARSymbol /></p>
                        <p className="text-xs text-gray-400">{formatNumber(customer.totalOrders)} طلب</p>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={e => { e.stopPropagation(); openEdit(customer); }} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-hover transition-colors">
                          <Pencil className="w-3.5 h-3.5 text-gray-400 hover:text-primary-600" />
                        </button>
                        <button onClick={e => { e.stopPropagation(); handleDelete(customer.id); }} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-hover transition-colors">
                          <Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-rose-600" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {page < totalPages && (
                <button
                  onClick={() => fetchCustomers(page + 1, search, false)}
                  disabled={loadingMore}
                  className="w-full py-3 rounded-xl bg-gray-100 dark:bg-dark-hover hover:bg-gray-200 dark:hover:bg-dark-card text-sm text-gray-600 dark:text-gray-300 transition-colors disabled:opacity-50"
                >
                  {loadingMore ? 'جاري التحميل...' : `عرض المزيد (${formatNumber(customers.length)} من ${formatNumber(total)})`}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right Panel: Selected Customer or Top Customers */}
        <div className="space-y-4">
          {selectedCustomer ? (
            <div className="glass-card p-6 animate-fade-in-up">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">تفاصيل العميل</h3>
                <button onClick={() => setSelectedCustomer(null)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-hover">
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>

              <div className="text-center mb-5">
                <div className="w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl font-bold text-primary-700 dark:text-primary-400">
                    {selectedCustomer.name.charAt(0)}
                  </span>
                </div>
                <h4 className="text-base font-bold text-gray-900 dark:text-white">{selectedCustomer.name}</h4>
                <p className="text-xs text-gray-400 mt-1">{selectedCustomer.phone}</p>
                {selectedCustomer.email && <p className="text-xs text-gray-400">{selectedCustomer.email}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="bg-gray-50 dark:bg-dark-hover rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{formatNumber(selectedCustomer.totalOrders)}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">طلب</p>
                </div>
                <div className="bg-gray-50 dark:bg-dark-hover rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{formatSAR(selectedCustomer.totalSpent)}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">إجمالي</p>
                </div>
              </div>

              {selectedCustomer.lastOrderAt && (
                <div className="flex items-center gap-2 mb-4 text-xs text-gray-400">
                  <Clock className="w-3.5 h-3.5" />
                  آخر طلب: {timeAgo(selectedCustomer.lastOrderAt)}
                </div>
              )}

              {selectedCustomer.notes && (
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 mb-4">
                  <p className="text-xs text-amber-800 dark:text-amber-300">{selectedCustomer.notes}</p>
                </div>
              )}

              {/* Recent Orders */}
              <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3">آخر الطلبات</h4>
              {selectedCustomer.orders.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">لا توجد طلبات</p>
              ) : (
                <div className="space-y-2">
                  {selectedCustomer.orders.map(order => {
                    const st = statusMap[order.status] || statusMap.PENDING;
                    return (
                      <div key={order.id} className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 dark:bg-dark-hover">
                        <div>
                          <p className="text-xs font-medium text-gray-900 dark:text-white">#{order.orderNumber.slice(-4)}</p>
                          <p className="text-[10px] text-gray-400">
                            {typeMap[order.type]} · {new Date(order.createdAt).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' })}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={cn('text-[10px] px-2 py-0.5 rounded-md font-medium', st.class)}>{st.label}</span>
                          <span className="text-xs font-bold text-gray-900 dark:text-white">{formatSAR(order.total)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Top Customers */}
              <div className="glass-card p-6 animate-fade-in-up">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Crown className="w-5 h-5 text-amber-500" />
                  أفضل العملاء
                </h3>
                {topCustomers.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">لا يوجد عملاء بعد</p>
                ) : (
                  <div className="space-y-3">
                    {topCustomers.map((c, i) => (
                      <div
                        key={c.id}
                        onClick={() => setSelectedCustomer(c)}
                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-dark-hover cursor-pointer transition-colors"
                      >
                        <div className={cn(
                          'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold',
                          i === 0 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' :
                          i === 1 ? 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300' :
                          'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
                        )}>
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{c.name}</p>
                          <p className="text-xs text-gray-400">{formatNumber(c.totalOrders)} طلب</p>
                        </div>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{formatSAR(c.totalSpent)} <SARSymbol /></p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="glass-card p-5 animate-fade-in-up">
                <p className="text-xs text-gray-400 text-center">اضغط على عميل لعرض تفاصيله وسجل طلباته</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowModal(false)}>
          <div className="glass-card w-full max-w-md mx-4 p-6 animate-fade-in-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {editingId ? 'تعديل العميل' : 'عميل جديد'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-card">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">الاسم *</label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="input-field text-sm"
                  placeholder="أحمد محمد"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">رقم الجوال *</label>
                <input
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  className="input-field text-sm"
                  placeholder="0551234567"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">البريد الإلكتروني</label>
                <input
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="input-field text-sm"
                  placeholder="ahmed@email.com"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">ملاحظات</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  className="input-field text-sm"
                  rows={2}
                  placeholder="حساسية معينة، تفضيلات..."
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSave}
                  disabled={saving || !form.name || !form.phone}
                  className="btn-primary flex-1 disabled:opacity-50"
                >
                  {saving ? 'جاري الحفظ...' : editingId ? 'حفظ التعديلات' : 'إضافة العميل'}
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
