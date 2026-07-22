'use client';

import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import {
  CalendarClock, Plus, X, Clock, Users, MapPin, Phone, User,
  CheckCircle2, XCircle, Armchair, Eye, ChevronRight, ChevronLeft,
  Building2, CalendarDays, Filter, Link2, Copy,
} from 'lucide-react';
import DashboardSkeleton from '@/components/shared/DashboardSkeleton';
import EmptyState from '@/components/shared/EmptyState';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { cn, formatNumber } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { useSocket } from '@/hooks/useSocket';

interface Branch {
  id: string;
  nameAr: string;
}

interface Table {
  id: string;
  number: number;
  nameAr: string | null;
  capacity: number;
  available?: boolean;
}

interface Reservation {
  id: string;
  customerName: string;
  customerPhone: string;
  partySize: number;
  date: string;
  time: string;
  endTime: string;
  status: string;
  notes: string | null;
  table: { number: number; nameAr: string | null; capacity: number };
  branch: { nameAr: string };
  customer: { id: string; name: string; totalOrders: number } | null;
}

interface Stats {
  todayReservations: number;
  upcoming: number;
  totalThisMonth: number;
  statusCounts: { status: string; _count: number }[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  PENDING: { label: 'بانتظار التأكيد', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30' },
  CONFIRMED: { label: 'مؤكد', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  SEATED: { label: 'جالس', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
  COMPLETED: { label: 'مكتمل', color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-100 dark:bg-gray-800' },
  CANCELLED: { label: 'ملغي', color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-100 dark:bg-rose-900/30' },
  NO_SHOW: { label: 'لم يحضر', color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-100 dark:bg-orange-900/30' },
};

function getToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('ar-SA', { weekday: 'long', month: 'long', day: 'numeric' });
}

function formatTime12(time: string) {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'م' : 'ص';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

const emptyForm = {
  branchId: '', tableId: '', customerName: '', customerPhone: '',
  partySize: 2, date: getToday(), time: '12:00', notes: '',
};

export default function ReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);

  const [filterBranch, setFilterBranch] = useState('');
  const [filterDate, setFilterDate] = useState(getToday());
  const [filterStatus, setFilterStatus] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [loadingTables, setLoadingTables] = useState(false);

  const [selectedRes, setSelectedRes] = useState<Reservation | null>(null);
  const { restaurant } = useAuthStore();

  async function fetchData() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterBranch) params.set('branchId', filterBranch);
      if (filterDate) params.set('date', filterDate);
      if (filterStatus) params.set('status', filterStatus);

      const [resRes, statsRes, branchRes] = await Promise.all([
        api.get(`/reservations?${params}`),
        api.get(`/reservations/stats${filterBranch ? `?branchId=${filterBranch}` : ''}`),
        api.get('/branches'),
      ]);
      setReservations(resRes.data);
      setStats(statsRes.data);
      setBranches(branchRes.data);
    } catch {
      toast.error('فشل تحميل الحجوزات');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchData(); }, [filterBranch, filterDate, filterStatus]);

  // Real-time WebSocket updates
  const { socket } = useSocket();
  const fetchDataRef = useRef(fetchData);
  fetchDataRef.current = fetchData;

  useEffect(() => {
    if (!socket) return;

    function onNewReservation(reservation: any) {
      toast.success(`حجز جديد من ${reservation.customerName}`, { icon: '📅' });
      fetchDataRef.current();
    }

    function onReservationUpdated() {
      fetchDataRef.current();
    }

    socket.on('newReservation', onNewReservation);
    socket.on('reservationUpdated', onReservationUpdated);

    return () => {
      socket.off('newReservation', onNewReservation);
      socket.off('reservationUpdated', onReservationUpdated);
    };
  }, [socket]);

  async function loadAvailableTables() {
    if (!form.branchId || !form.date || !form.time) return;
    setLoadingTables(true);
    try {
      const { data } = await api.get(`/reservations/available-tables?branchId=${form.branchId}&date=${form.date}&time=${form.time}&partySize=${form.partySize}`);
      setTables(data);
    } catch {
      setTables([]);
    } finally {
      setLoadingTables(false);
    }
  }

  useEffect(() => {
    if (showModal && form.branchId && form.date && form.time) {
      loadAvailableTables();
    }
  }, [form.branchId, form.date, form.time, form.partySize, showModal]);

  function openCreate() {
    setForm({ ...emptyForm, branchId: filterBranch || (branches[0]?.id || '') });
    setTables([]);
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.tableId || !form.customerName || !form.customerPhone) {
      toast.error('يرجى تعبئة جميع الحقول المطلوبة');
      return;
    }
    setSaving(true);
    try {
      await api.post('/reservations', {
        ...form,
        partySize: Number(form.partySize),
      });
      setShowModal(false);
      toast.success('تم إنشاء الحجز بنجاح');
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'فشل إنشاء الحجز');
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(id: string, status: string) {
    try {
      await api.put(`/reservations/${id}/status`, { status });
      toast.success(
        status === 'SEATED' ? 'تم تسجيل الجلوس' :
        status === 'COMPLETED' ? 'تم إنهاء الحجز' :
        status === 'CANCELLED' ? 'تم إلغاء الحجز' :
        status === 'NO_SHOW' ? 'تم تسجيل عدم الحضور' : 'تم التحديث'
      );
      fetchData();
      if (selectedRes?.id === id) setSelectedRes(null);
    } catch {
      toast.error('فشل تحديث الحجز');
    }
  }

  function navigateDate(dir: number) {
    const d = new Date(filterDate);
    d.setDate(d.getDate() + dir);
    setFilterDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  }

  // Group reservations by time slots
  const timeSlots = useMemo(() => {
    const slots: Record<string, Reservation[]> = {};
    reservations.forEach(r => {
      const hour = r.time.split(':')[0] + ':00';
      if (!slots[hour]) slots[hour] = [];
      slots[hour].push(r);
    });
    return Object.entries(slots).sort(([a], [b]) => a.localeCompare(b));
  }, [reservations]);

  const activeCount = reservations.filter(r => ['PENDING', 'CONFIRMED', 'SEATED'].includes(r.status)).length;

  if (loading && !reservations.length) return <DashboardSkeleton />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">الحجوزات</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">إدارة حجوزات الطاولات</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const link = `${window.location.origin}/book/${restaurant?.id}`;
              navigator.clipboard.writeText(link);
              toast.success('تم نسخ رابط الحجز');
            }}
            className="flex items-center gap-2 text-sm px-3 py-2 rounded-xl bg-gray-100 dark:bg-dark-hover hover:bg-gray-200 dark:hover:bg-dark-card text-gray-600 dark:text-gray-300 transition-colors"
            title="نسخ رابط الحجز للعملاء"
          >
            <Link2 className="w-4 h-4" />
            رابط الحجز
          </button>
          <button onClick={openCreate} className="btn-primary flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" />
            حجز جديد
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <CalendarClock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.todayReservations || 0}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">حجوزات اليوم</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{activeCount}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">حجز نشط</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.upcoming || 0}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">حجز قادم</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <CalendarDays className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.totalThisMonth || 0}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">هذا الشهر</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Branch Filter */}
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-gray-400" />
            <select
              value={filterBranch}
              onChange={e => setFilterBranch(e.target.value)}
              className="input-field text-sm py-1.5 min-w-[140px]"
            >
              <option value="">كل الفروع</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.nameAr}</option>)}
            </select>
          </div>

          {/* Date Navigation */}
          <div className="flex items-center gap-1">
            <button onClick={() => navigateDate(1)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-hover">
              <ChevronRight className="w-4 h-4 text-gray-500" />
            </button>
            <input
              type="date"
              value={filterDate}
              onChange={e => setFilterDate(e.target.value)}
              className="input-field text-sm py-1.5"
              dir="ltr"
            />
            <button onClick={() => navigateDate(-1)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-hover">
              <ChevronLeft className="w-4 h-4 text-gray-500" />
            </button>
            <button
              onClick={() => setFilterDate(getToday())}
              className={cn(
                'text-xs px-2.5 py-1.5 rounded-lg transition-colors',
                filterDate === getToday()
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                  : 'bg-gray-100 dark:bg-dark-hover text-gray-500 hover:text-gray-700'
              )}
            >
              اليوم
            </button>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="input-field text-sm py-1.5 min-w-[130px]"
            >
              <option value="">كل الحالات</option>
              {Object.entries(STATUS_CONFIG).map(([key, val]) => (
                <option key={key} value={key}>{val.label}</option>
              ))}
            </select>
          </div>

          {/* Date Label */}
          <div className="mr-auto text-sm font-medium text-gray-600 dark:text-gray-300">
            {formatDate(filterDate)}
          </div>
        </div>
      </div>

      {/* Reservations Timeline */}
      {reservations.length === 0 ? (
        <div className="glass-card p-6">
          <EmptyState
            icon={CalendarClock}
            title="لا توجد حجوزات"
            description={`لا توجد حجوزات في ${formatDate(filterDate)}`}
            action={
              <button onClick={openCreate} className="btn-primary text-sm flex items-center gap-2">
                <Plus className="w-4 h-4" />
                حجز جديد
              </button>
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Timeline */}
          <div className="lg:col-span-2 space-y-4">
            {timeSlots.map(([hour, items]) => (
              <div key={hour} className="animate-fade-in-up">
                <div className="flex items-center gap-3 mb-2">
                  <div className="text-sm font-bold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 px-3 py-1 rounded-lg">
                    {formatTime12(hour)}
                  </div>
                  <div className="flex-1 h-px bg-gray-200 dark:bg-dark-border" />
                  <span className="text-xs text-gray-400">{items.length} حجز</span>
                </div>
                <div className="space-y-2 mr-4">
                  {items.map(res => {
                    const sc = STATUS_CONFIG[res.status];
                    return (
                      <button
                        key={res.id}
                        onClick={() => setSelectedRes(res)}
                        className={cn(
                          'w-full glass-card p-4 text-right transition-all hover:shadow-md',
                          selectedRes?.id === res.id && 'ring-2 ring-primary-500'
                        )}
                      >
                        <div className="flex items-start justify-between">
                          <span className={cn('text-xs px-2 py-0.5 rounded-md font-medium', sc.bg, sc.color)}>
                            {sc.label}
                          </span>
                          <div className="flex items-center gap-3">
                            <div>
                              <p className="text-sm font-bold text-gray-900 dark:text-white">{res.customerName}</p>
                              <p className="text-xs text-gray-400">{formatTime12(res.time)} - {formatTime12(res.endTime)}</p>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                              <span className="text-sm font-bold text-primary-600 dark:text-primary-400">{res.table.number}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                          <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {res.partySize} أشخاص</span>
                          <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {res.customerPhone}</span>
                          {branches.length > 1 && (
                            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {res.branch.nameAr}</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Detail Panel */}
          <div className="space-y-4">
            {selectedRes ? (
              <div className="glass-card p-5 animate-fade-in-up sticky top-20">
                <div className="flex items-center justify-between mb-4">
                  <button onClick={() => setSelectedRes(null)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-hover">
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                  <h3 className="font-bold text-gray-900 dark:text-white">تفاصيل الحجز</h3>
                </div>

                <div className="space-y-4">
                  {/* Customer */}
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-dark-hover rounded-xl">
                    <div className="w-11 h-11 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                      <User className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{selectedRes.customerName}</p>
                      <p className="text-xs text-gray-400">{selectedRes.customerPhone}</p>
                    </div>
                    {selectedRes.customer && (
                      <span className="text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-md">
                        {selectedRes.customer.totalOrders} طلب سابق
                      </span>
                    )}
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-gray-50 dark:bg-dark-hover rounded-xl text-center">
                      <Armchair className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                      <p className="text-lg font-bold text-gray-900 dark:text-white">طاولة {selectedRes.table.number}</p>
                      <p className="text-[10px] text-gray-400">سعة {selectedRes.table.capacity}</p>
                    </div>
                    <div className="p-3 bg-gray-50 dark:bg-dark-hover rounded-xl text-center">
                      <Users className="w-5 h-5 text-purple-500 mx-auto mb-1" />
                      <p className="text-lg font-bold text-gray-900 dark:text-white">{selectedRes.partySize}</p>
                      <p className="text-[10px] text-gray-400">أشخاص</p>
                    </div>
                    <div className="p-3 bg-gray-50 dark:bg-dark-hover rounded-xl text-center">
                      <Clock className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{formatTime12(selectedRes.time)}</p>
                      <p className="text-[10px] text-gray-400">بداية</p>
                    </div>
                    <div className="p-3 bg-gray-50 dark:bg-dark-hover rounded-xl text-center">
                      <Clock className="w-5 h-5 text-amber-500 mx-auto mb-1" />
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{formatTime12(selectedRes.endTime)}</p>
                      <p className="text-[10px] text-gray-400">نهاية</p>
                    </div>
                  </div>

                  {/* Notes */}
                  {selectedRes.notes && (
                    <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
                      <p className="text-xs font-medium text-amber-700 dark:text-amber-300 mb-1">ملاحظات</p>
                      <p className="text-sm text-amber-600 dark:text-amber-400">{selectedRes.notes}</p>
                    </div>
                  )}

                  {/* Status */}
                  <div className="text-center">
                    <span className={cn('inline-block text-sm px-4 py-1.5 rounded-xl font-bold', STATUS_CONFIG[selectedRes.status].bg, STATUS_CONFIG[selectedRes.status].color)}>
                      {STATUS_CONFIG[selectedRes.status].label}
                    </span>
                  </div>

                  {/* Actions */}
                  {['PENDING', 'CONFIRMED'].includes(selectedRes.status) && (
                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <button
                        onClick={() => updateStatus(selectedRes.id, 'SEATED')}
                        className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        تسجيل جلوس
                      </button>
                      <button
                        onClick={() => updateStatus(selectedRes.id, 'CANCELLED')}
                        className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-rose-100 dark:bg-rose-900/30 hover:bg-rose-200 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 text-sm font-medium transition-colors"
                      >
                        <XCircle className="w-4 h-4" />
                        إلغاء
                      </button>
                      <button
                        onClick={() => updateStatus(selectedRes.id, 'NO_SHOW')}
                        className="col-span-2 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-gray-100 dark:bg-dark-hover hover:bg-gray-200 dark:hover:bg-dark-card text-gray-500 text-sm transition-colors"
                      >
                        لم يحضر
                      </button>
                    </div>
                  )}
                  {selectedRes.status === 'SEATED' && (
                    <button
                      onClick={() => updateStatus(selectedRes.id, 'COMPLETED')}
                      className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition-colors"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      إنهاء الحجز
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="glass-card p-6 text-center">
                <Eye className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                <p className="text-sm text-gray-400">اختر حجز لعرض التفاصيل</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowModal(false)}>
          <div className="glass-card w-full max-w-lg mx-4 p-6 animate-fade-in-up max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-card">
                <X className="w-5 h-5 text-gray-500" />
              </button>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">حجز جديد</h3>
            </div>

            <div className="space-y-4">
              {/* Branch */}
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">الفرع *</label>
                <select value={form.branchId} onChange={e => setForm(f => ({ ...f, branchId: e.target.value, tableId: '' }))} className="input-field text-sm">
                  <option value="">اختر الفرع</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.nameAr}</option>)}
                </select>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">التاريخ *</label>
                  <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="input-field text-sm" dir="ltr" min={getToday()} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">الوقت *</label>
                  <input type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} className="input-field text-sm" dir="ltr" />
                </div>
              </div>

              {/* Party Size */}
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">عدد الأشخاص *</label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5, 6, 8, 10].map(n => (
                    <button
                      key={n}
                      onClick={() => setForm(f => ({ ...f, partySize: n, tableId: '' }))}
                      className={cn(
                        'w-9 h-9 rounded-lg text-sm font-medium transition-all',
                        form.partySize === n
                          ? 'bg-primary-600 text-white shadow-md'
                          : 'bg-gray-100 dark:bg-dark-hover text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                      )}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Table Selection */}
              {form.branchId && (
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">الطاولة *</label>
                  {loadingTables ? (
                    <div className="text-center py-4 text-sm text-gray-400">جاري البحث عن الطاولات المتاحة...</div>
                  ) : tables.length === 0 ? (
                    <div className="text-center py-4 text-sm text-gray-400">اختر الفرع والتاريخ والوقت أولاً</div>
                  ) : (
                    <div className="grid grid-cols-4 gap-2">
                      {tables.map(t => (
                        <button
                          key={t.id}
                          onClick={() => t.available && setForm(f => ({ ...f, tableId: t.id }))}
                          disabled={!t.available}
                          className={cn(
                            'p-3 rounded-xl text-center transition-all border-2',
                            !t.available && 'opacity-40 cursor-not-allowed border-transparent bg-gray-100 dark:bg-dark-hover',
                            t.available && form.tableId !== t.id && 'border-transparent bg-gray-50 dark:bg-dark-hover hover:border-primary-300 cursor-pointer',
                            form.tableId === t.id && 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                          )}
                        >
                          <Armchair className={cn('w-5 h-5 mx-auto mb-1', t.available ? 'text-emerald-500' : 'text-gray-300')} />
                          <p className="text-sm font-bold text-gray-900 dark:text-white">{t.number}</p>
                          <p className="text-[10px] text-gray-400">{t.capacity} أشخاص</p>
                          {!t.available && <p className="text-[9px] text-rose-400 mt-0.5">محجوزة</p>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Customer Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">اسم العميل *</label>
                  <input value={form.customerName} onChange={e => setForm(f => ({ ...f, customerName: e.target.value }))} className="input-field text-sm" placeholder="محمد أحمد" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">رقم الجوال *</label>
                  <input value={form.customerPhone} onChange={e => setForm(f => ({ ...f, customerPhone: e.target.value }))} className="input-field text-sm" placeholder="05xxxxxxxx" dir="ltr" />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">ملاحظات</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="input-field text-sm" rows={2} placeholder="مناسبة خاصة، كرسي أطفال..." />
              </div>

              {/* Save */}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowModal(false)} className="btn-secondary">إلغاء</button>
                <button
                  onClick={handleSave}
                  disabled={saving || !form.tableId || !form.customerName || !form.customerPhone}
                  className="btn-primary flex-1 disabled:opacity-50"
                >
                  {saving ? 'جاري الحفظ...' : 'تأكيد الحجز'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
