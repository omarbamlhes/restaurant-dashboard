'use client';

import { useEffect, useRef, useState } from 'react';
import { Armchair, Plus, Pencil, Trash2, X, Users, Hash, Building2, QrCode, Printer, Download } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import DashboardSkeleton from '@/components/shared/DashboardSkeleton';
import EmptyState from '@/components/shared/EmptyState';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { useSocket } from '@/hooks/useSocket';

interface Table {
  id: string;
  number: number;
  name: string | null;
  nameAr: string | null;
  capacity: number;
  status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED';
  branchId: string;
  branch?: { id: string; nameAr: string };
}

interface Branch {
  id: string;
  name: string;
  nameAr: string;
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  AVAILABLE: { label: 'متاحة', color: 'text-green-700 dark:text-green-300', bg: 'bg-green-100 dark:bg-green-900/30' },
  OCCUPIED: { label: 'مشغولة', color: 'text-red-700 dark:text-red-300', bg: 'bg-red-100 dark:bg-red-900/30' },
  RESERVED: { label: 'محجوزة', color: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-100 dark:bg-amber-900/30' },
};

const emptyForm = { number: '', name: '', nameAr: '', capacity: '4', branchId: '' };

export default function TablesPage() {
  const [tables, setTables] = useState<Table[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterBranch, setFilterBranch] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [qrTable, setQrTable] = useState<Table | null>(null);

  async function fetchData() {
    setLoading(true);
    try {
      const [tablesRes, branchesRes] = await Promise.all([
        api.get('/tables'),
        api.get('/branches'),
      ]);
      setTables(tablesRes.data);
      setBranches(branchesRes.data);
    } catch {
      toast.error('فشل تحميل بيانات الطاولات');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  // Real-time WebSocket updates
  const { socket } = useSocket();
  const fetchDataRef = useRef(fetchData);
  fetchDataRef.current = fetchData;

  useEffect(() => {
    if (!socket) return;

    function onTableStatusChanged(table: any) {
      setTables(prev => prev.map(t => t.id === table.id ? { ...t, status: table.status } : t));
    }

    function onNewOrder() {
      fetchDataRef.current();
    }

    function onNewReservation() {
      fetchDataRef.current();
    }

    socket.on('tableStatusChanged', onTableStatusChanged);
    socket.on('newOrder', onNewOrder);
    socket.on('newReservation', onNewReservation);

    return () => {
      socket.off('tableStatusChanged', onTableStatusChanged);
      socket.off('newOrder', onNewOrder);
      socket.off('newReservation', onNewReservation);
    };
  }, [socket]);

  function openCreate() {
    setEditingId(null);
    setForm({ ...emptyForm, branchId: branches[0]?.id || '' });
    setShowModal(true);
  }

  function openEdit(table: Table) {
    setEditingId(table.id);
    setForm({
      number: String(table.number),
      name: table.name || '',
      nameAr: table.nameAr || '',
      capacity: String(table.capacity),
      branchId: table.branchId,
    });
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.number || !form.branchId) return;
    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/tables/${editingId}`, {
          number: parseInt(form.number),
          name: form.name || undefined,
          nameAr: form.nameAr || undefined,
          capacity: parseInt(form.capacity) || 4,
        });
        toast.success('تم تعديل الطاولة');
      } else {
        await api.post('/tables', {
          number: parseInt(form.number),
          name: form.name || undefined,
          nameAr: form.nameAr || undefined,
          capacity: parseInt(form.capacity) || 4,
          branchId: form.branchId,
        });
        toast.success('تم إضافة الطاولة');
      }
      setShowModal(false);
      fetchData();
    } catch {
      toast.error('فشل حفظ الطاولة');
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(table: Table, newStatus: string) {
    try {
      await api.put(`/tables/${table.id}/status`, { status: newStatus });
      setTables(prev => prev.map(t => t.id === table.id ? { ...t, status: newStatus as Table['status'] } : t));
      toast.success('تم تحديث حالة الطاولة');
    } catch {
      toast.error('فشل تحديث الحالة');
    }
  }

  const filtered = tables.filter(t => {
    if (filterBranch !== 'all' && t.branchId !== filterBranch) return false;
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    return true;
  });

  const stats = {
    total: tables.length,
    available: tables.filter(t => t.status === 'AVAILABLE').length,
    occupied: tables.filter(t => t.status === 'OCCUPIED').length,
    reserved: tables.filter(t => t.status === 'RESERVED').length,
  };

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">الطاولات</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">إدارة طاولات المطعم وحالتها</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" />
          طاولة جديدة
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Armchair className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">إجمالي</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <Armchair className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.available}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">متاحة</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <Armchair className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.occupied}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">مشغولة</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Armchair className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.reserved}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">محجوزة</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={filterBranch}
          onChange={e => setFilterBranch(e.target.value)}
          className="input-field text-sm w-auto min-w-[140px]"
        >
          <option value="all">كل الفروع</option>
          {branches.map(b => (
            <option key={b.id} value={b.id}>{b.nameAr}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="input-field text-sm w-auto min-w-[120px]"
        >
          <option value="all">كل الحالات</option>
          <option value="AVAILABLE">متاحة</option>
          <option value="OCCUPIED">مشغولة</option>
          <option value="RESERVED">محجوزة</option>
        </select>
      </div>

      {/* Tables Grid */}
      {filtered.length === 0 ? (
        <div className="glass-card p-6">
          <EmptyState
            icon={Armchair}
            title="لا توجد طاولات"
            description={tables.length === 0 ? 'أضف طاولتك الأولى' : 'لا توجد طاولات تطابق الفلتر'}
            action={tables.length === 0 ? (
              <button onClick={openCreate} className="btn-primary text-sm flex items-center gap-2">
                <Plus className="w-4 h-4" />
                إضافة طاولة
              </button>
            ) : undefined}
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filtered
            .sort((a, b) => a.number - b.number)
            .map((table) => {
              const st = STATUS_MAP[table.status];
              return (
                <div
                  key={table.id}
                  className={cn(
                    'glass-card p-4 animate-fade-in-up hover:shadow-lg transition-all duration-300 relative group',
                    table.status === 'OCCUPIED' && 'ring-2 ring-red-200 dark:ring-red-800/50',
                    table.status === 'RESERVED' && 'ring-2 ring-amber-200 dark:ring-amber-800/50',
                  )}
                >
                  {/* Actions */}
                  <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <button
                      onClick={() => setQrTable(table)}
                      className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-dark-hover transition-colors"
                      title="رمز QR للطلب"
                    >
                      <QrCode className="w-3.5 h-3.5 text-gray-400 hover:text-primary-600" />
                    </button>
                    <button
                      onClick={() => openEdit(table)}
                      className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-dark-hover transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5 text-gray-400 hover:text-primary-600" />
                    </button>
                  </div>

                  {/* Table Icon & Number */}
                  <div className="text-center mb-3">
                    <div className={cn(
                      'w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-2',
                      st.bg,
                    )}>
                      <span className={cn('text-xl font-bold', st.color)}>{table.number}</span>
                    </div>
                    {table.nameAr && (
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{table.nameAr}</p>
                    )}
                    {!table.nameAr && table.name && (
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{table.name}</p>
                    )}
                  </div>

                  {/* Info */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-xs text-gray-500 dark:text-gray-400">{table.capacity} أشخاص</span>
                    </div>

                    {/* Status Badge */}
                    <div className={cn('text-center text-xs font-medium px-2 py-1 rounded-lg', st.bg, st.color)}>
                      {st.label}
                    </div>

                    {/* Status Toggle */}
                    <div className="flex gap-1 pt-1">
                      {(['AVAILABLE', 'OCCUPIED', 'RESERVED'] as const).map(s => (
                        <button
                          key={s}
                          onClick={() => handleStatusChange(table, s)}
                          disabled={table.status === s}
                          className={cn(
                            'flex-1 text-[10px] py-1 rounded-md transition-colors',
                            table.status === s
                              ? 'bg-gray-200 dark:bg-dark-border text-gray-400 cursor-default'
                              : 'hover:bg-gray-100 dark:hover:bg-dark-hover text-gray-500 dark:text-gray-400',
                          )}
                          title={STATUS_MAP[s].label}
                        >
                          {s === 'AVAILABLE' ? 'متاحة' : s === 'OCCUPIED' ? 'مشغولة' : 'محجوزة'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Branch label */}
                  {table.branch && branches.length > 1 && (
                    <div className="mt-2 pt-2 border-t border-gray-100 dark:border-dark-border/50">
                      <p className="text-[10px] text-gray-400 text-center truncate">{table.branch.nameAr}</p>
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      )}

      {/* QR Code Modal */}
      {qrTable && (
        <QrModal
          table={qrTable}
          branchName={qrTable.branch?.nameAr || branches.find(b => b.id === qrTable.branchId)?.nameAr}
          onClose={() => setQrTable(null)}
        />
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowModal(false)}>
          <div className="glass-card w-full max-w-md mx-4 p-6 animate-fade-in-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {editingId ? 'تعديل الطاولة' : 'طاولة جديدة'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-card">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">رقم الطاولة *</label>
                  <input
                    type="number"
                    min="1"
                    value={form.number}
                    onChange={e => setForm(f => ({ ...f, number: e.target.value }))}
                    className="input-field text-sm"
                    placeholder="1"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">السعة *</label>
                  <input
                    type="number"
                    min="1"
                    value={form.capacity}
                    onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))}
                    className="input-field text-sm"
                    placeholder="4"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">الاسم بالعربي</label>
                  <input
                    value={form.nameAr}
                    onChange={e => setForm(f => ({ ...f, nameAr: e.target.value }))}
                    className="input-field text-sm"
                    placeholder="طاولة VIP"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Name (EN)</label>
                  <input
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="input-field text-sm"
                    placeholder="VIP Table"
                    dir="ltr"
                  />
                </div>
              </div>

              {!editingId && (
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">الفرع *</label>
                  <select
                    value={form.branchId}
                    onChange={e => setForm(f => ({ ...f, branchId: e.target.value }))}
                    className="input-field text-sm"
                  >
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.nameAr}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSave}
                  disabled={saving || !form.number || (!editingId && !form.branchId)}
                  className="btn-primary flex-1 disabled:opacity-50"
                >
                  {saving ? 'جاري الحفظ...' : editingId ? 'حفظ التعديلات' : 'إضافة الطاولة'}
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

function QrModal({
  table,
  branchName,
  onClose,
}: {
  table: Table;
  branchName?: string;
  onClose: () => void;
}) {
  const url = typeof window !== 'undefined'
    ? `${window.location.origin}/m/${table.branchId}/${table.id}`
    : '';
  const label = table.nameAr || table.name || `طاولة ${table.number}`;

  function handlePrint() {
    const svg = document.getElementById('qr-print-svg')?.outerHTML;
    if (!svg) return;
    const w = window.open('', '_blank', 'width=420,height=640');
    if (!w) return;
    w.document.write(`
      <!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8">
      <title>QR - ${label}</title>
      <style>
        @page { size: A6; margin: 0; }
        body { font-family: 'IBM Plex Sans Arabic', system-ui, sans-serif; margin: 0; padding: 24px; text-align: center; }
        .card { border: 2px solid #1e293b; border-radius: 18px; padding: 24px 18px; }
        h1 { font-size: 22px; margin: 0 0 6px; }
        h2 { font-size: 18px; margin: 0 0 18px; color: #475569; font-weight: 500; }
        .num { font-size: 42px; font-weight: 800; margin: 0 0 16px; color: #0ea5e9; }
        svg { width: 220px; height: 220px; }
        p { font-size: 13px; color: #64748b; margin: 14px 0 0; }
        .cta { font-size: 14px; color: #0f172a; margin: 6px 0 0; font-weight: 600; }
      </style></head><body>
      <div class="card">
        <h1>${branchName || ''}</h1>
        <h2>${label}</h2>
        <div class="num">#${table.number}</div>
        ${svg}
        <p class="cta">امسح الرمز بكاميرتك لعرض المنيو وإرسال طلبك</p>
      </div>
      <script>window.onload = () => { window.print(); setTimeout(() => window.close(), 500); };</script>
      </body></html>
    `);
    w.document.close();
  }

  function handleCopyLink() {
    navigator.clipboard.writeText(url).then(() => toast.success('تم نسخ الرابط'));
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="glass-card w-full max-w-md mx-4 p-6 animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            رمز QR — {label}
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-card">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="bg-white p-6 rounded-2xl flex items-center justify-center mb-4">
          <QRCodeSVG
            id="qr-print-svg"
            value={url}
            size={240}
            level="M"
            includeMargin={false}
          />
        </div>

        <div className="bg-gray-50 dark:bg-dark-bg rounded-xl p-3 mb-4 overflow-hidden">
          <p className="text-[11px] text-gray-500 mb-1">الرابط</p>
          <p
            className="text-xs font-mono text-gray-700 dark:text-gray-300 break-all whitespace-normal leading-relaxed"
            dir="ltr"
            style={{ wordBreak: 'break-all', overflowWrap: 'anywhere' }}
          >
            {url}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button onClick={handlePrint} className="btn-primary flex items-center justify-center gap-2">
            <Printer className="w-4 h-4" />
            طباعة
          </button>
          <button onClick={handleCopyLink} className="btn-secondary flex items-center justify-center gap-2">
            <Download className="w-4 h-4" />
            نسخ الرابط
          </button>
        </div>
      </div>
    </div>
  );
}
