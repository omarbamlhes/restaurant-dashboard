'use client';

import { useState } from 'react';
import { ShoppingBag, Filter, ChevronLeft, ChevronRight, Eye, X, Clock, CheckCircle, Printer, FileSpreadsheet } from 'lucide-react';
import TableSkeleton from '@/components/shared/TableSkeleton';
import EmptyState from '@/components/shared/EmptyState';
import Receipt from '@/components/shared/Receipt';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useApi } from '@/hooks/useApi';
import { cn, formatSAR } from '@/lib/utils';
import { downloadCSV, fileDateStamp } from '@/lib/export';
import SARSymbol from '@/components/shared/SARSymbol';
import DeliverySourceBadge from '@/components/shared/DeliverySourceBadge';

const statusMap: Record<string, { label: string; class: string }> = {
  PENDING: { label: 'جديد', class: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' },
  PREPARING: { label: 'تحضير', class: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' },
  READY: { label: 'جاهز', class: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' },
  COMPLETED: { label: 'مكتمل', class: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' },
  CANCELLED: { label: 'ملغي', class: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300' },
};

const typeMap: Record<string, string> = {
  DINE_IN: 'محلي',
  TAKEAWAY: 'سفري',
  DELIVERY: 'توصيل',
};

const statusFlow = ['PENDING', 'PREPARING', 'READY', 'COMPLETED'];

interface Branch {
  id: string;
  nameAr: string;
}

interface OrderItem {
  id: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  menuItem: { nameAr: string };
}

interface Order {
  id: string;
  orderNumber: string;
  type: string;
  deliverySource?: string | null;
  status: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  createdAt: string;
  branch?: { nameAr: string };
  items: OrderItem[];
}

export default function OrdersPage() {
  const [page, setPage] = useState(1);
  const limit = 15;

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');

  // Detail modal
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Receipt
  const [receiptOrder, setReceiptOrder] = useState<any>(null);

  // CSV export (fetches ALL orders matching the current filters, not just the
  // 15 rows on screen)
  const [exporting, setExporting] = useState(false);

  // SWR-cached orders list. The key carries page + filters, so paging and
  // filtering serve cache instantly and revalidate on window focus.
  const ordersParams = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (statusFilter) ordersParams.set('status', statusFilter);
  if (typeFilter) ordersParams.set('type', typeFilter);
  if (branchFilter) ordersParams.set('branchId', branchFilter);
  const { data: ordersResp, loading, mutate } = useApi<{ data: Order[]; total: number }>(
    `/orders?${ordersParams}`,
    { revalidateOnFocus: true },
  );
  const orders = ordersResp?.data ?? [];
  const total = ordersResp?.total ?? 0;

  const { data: branches = [] } = useApi<Branch[]>('/branches');

  async function openReceipt(orderId: string) {
    try {
      const { data } = await api.get(`/orders/${orderId}/receipt`);
      setReceiptOrder(data);
    } catch {
      toast.error('فشل تحميل الفاتورة');
    }
  }

  async function updateStatus(orderId: string, newStatus: string) {
    try {
      await api.put(`/orders/${orderId}/status`, { status: newStatus });
      mutate();
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(prev => prev ? { ...prev, status: newStatus } : null);
      }
    } catch {
      toast.error('فشل تحديث حالة الطلب');
    }
  }

  async function exportOrdersCSV() {
    setExporting(true);
    try {
      // Re-query with the active filters but pull the full set for export.
      const params = new URLSearchParams({ page: '1', limit: '10000' });
      if (statusFilter) params.set('status', statusFilter);
      if (typeFilter) params.set('type', typeFilter);
      if (branchFilter) params.set('branchId', branchFilter);
      const { data } = await api.get<{ data: Order[]; total: number }>(`/orders?${params}`);
      const allOrders = data?.data ?? [];

      const headers = ['رقم الطلب', 'التاريخ', 'الفرع', 'النوع', 'الحالة', 'المجموع الفرعي', 'الضريبة', 'الخصم', 'الإجمالي'];
      const rows = allOrders.map((o) => [
        o.orderNumber,
        new Date(o.createdAt).toLocaleString('ar-SA'),
        o.branch?.nameAr ?? '',
        typeMap[o.type] ?? o.type,
        statusMap[o.status]?.label ?? o.status,
        o.subtotal,
        o.tax,
        o.discount,
        o.total,
      ]);

      const ok = downloadCSV(`الطلبات-${fileDateStamp()}`, headers, rows);
      if (ok) toast.success('تم تصدير ملف Excel');
      else toast.error('لا توجد بيانات للتصدير');
    } catch {
      toast.error('فشل تصدير الطلبات');
    } finally {
      setExporting(false);
    }
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">الطلبات</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">إدارة ومتابعة جميع الطلبات</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500 dark:text-gray-400">{total} طلب</span>
          <button
            onClick={exportOrdersCSV}
            disabled={exporting || total === 0}
            className="btn-secondary flex items-center gap-2 text-sm disabled:opacity-50"
          >
            <FileSpreadsheet className="w-4 h-4" />
            {exporting ? 'جاري التصدير...' : 'تصدير Excel'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 animate-fade-in-up">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">تصفية</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="input-field text-sm"
          >
            <option value="">كل الحالات</option>
            {Object.entries(statusMap).map(([key, val]) => (
              <option key={key} value={key}>{val.label}</option>
            ))}
          </select>
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
            className="input-field text-sm"
          >
            <option value="">كل الأنواع</option>
            {Object.entries(typeMap).map(([key, val]) => (
              <option key={key} value={key}>{val}</option>
            ))}
          </select>
          <select
            value={branchFilter}
            onChange={(e) => { setBranchFilter(e.target.value); setPage(1); }}
            className="input-field text-sm"
          >
            <option value="">كل الفروع</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.nameAr}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Orders Table */}
      {loading ? (
        <TableSkeleton columns={7} />
      ) : orders.length === 0 ? (
        <div className="glass-card p-6">
          <EmptyState icon={ShoppingBag} title="لا توجد طلبات" description="لم يتم العثور على طلبات بهذه الفلاتر" />
        </div>
      ) : (
        <div className="glass-card overflow-hidden animate-fade-in-up">
          {/* Desktop table */}
          <div className="overflow-x-auto hidden md:block">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-dark-border">
                  <th className="text-right text-xs font-semibold text-gray-500 dark:text-gray-400 p-4">رقم الطلب</th>
                  <th className="text-right text-xs font-semibold text-gray-500 dark:text-gray-400 p-4">النوع</th>
                  <th className="text-right text-xs font-semibold text-gray-500 dark:text-gray-400 p-4">الفرع</th>
                  <th className="text-right text-xs font-semibold text-gray-500 dark:text-gray-400 p-4">المجموع</th>
                  <th className="text-right text-xs font-semibold text-gray-500 dark:text-gray-400 p-4">الحالة</th>
                  <th className="text-right text-xs font-semibold text-gray-500 dark:text-gray-400 p-4">التاريخ</th>
                  <th className="text-right text-xs font-semibold text-gray-500 dark:text-gray-400 p-4">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const status = statusMap[order.status] || statusMap.PENDING;
                  return (
                    <tr key={order.id} className="border-b border-gray-100 dark:border-dark-border/50 hover:bg-gray-50 dark:hover:bg-dark-hover transition-colors">
                      <td className="p-4">
                        <span className="text-sm font-mono font-medium text-gray-900 dark:text-gray-100">
                          #{order.orderNumber.slice(-6)}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-700 dark:text-gray-300">{typeMap[order.type] || order.type}</span>
                          {order.type === 'DELIVERY' && order.deliverySource && (
                            <DeliverySourceBadge source={order.deliverySource} />
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-gray-700 dark:text-gray-300">{order.branch?.nameAr || '—'}</span>
                      </td>
                      <td className="p-4">
                        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{formatSAR(order.total)} <SARSymbol /></span>
                      </td>
                      <td className="p-4">
                        <span className={cn('text-xs px-2.5 py-1 rounded-lg font-medium', status.class)}>
                          {status.label}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {new Date(order.createdAt).toLocaleDateString('ar-SA', { day: 'numeric', month: 'short' })}
                          {' '}
                          {new Date(order.createdAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSelectedOrder(order)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-card transition-colors"
                            title="عرض التفاصيل"
                          >
                            <Eye className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                          </button>
                          <button
                            onClick={() => openReceipt(order.id)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-card transition-colors"
                            title="طباعة الفاتورة"
                          >
                            <Printer className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                          </button>
                          {order.status !== 'COMPLETED' && order.status !== 'CANCELLED' && (
                            <button
                              onClick={() => {
                                const idx = statusFlow.indexOf(order.status);
                                if (idx < statusFlow.length - 1) updateStatus(order.id, statusFlow[idx + 1]);
                              }}
                              className="p-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors"
                              title="تقديم الحالة"
                            >
                              <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-gray-100 dark:divide-dark-border/50">
            {orders.map((order) => {
              const status = statusMap[order.status] || statusMap.PENDING;
              const idx = statusFlow.indexOf(order.status);
              const canAdvance = order.status !== 'COMPLETED' && order.status !== 'CANCELLED' && idx < statusFlow.length - 1;
              return (
                <div key={order.id} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-mono font-medium text-gray-900 dark:text-gray-100">#{order.orderNumber.slice(-6)}</span>
                    <span className={cn('text-xs px-2.5 py-1 rounded-lg font-medium', status.class)}>{status.label}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                      <span>{typeMap[order.type] || order.type}</span>
                      {order.type === 'DELIVERY' && order.deliverySource && (
                        <DeliverySourceBadge source={order.deliverySource} />
                      )}
                      {order.branch?.nameAr && <span> · {order.branch.nameAr}</span>}
                    </div>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">{formatSAR(order.total)} <SARSymbol /></span>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs text-gray-400">
                      {new Date(order.createdAt).toLocaleDateString('ar-SA', { day: 'numeric', month: 'short' })}
                      {' '}
                      {new Date(order.createdAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setSelectedOrder(order)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-card transition-colors" aria-label="عرض التفاصيل">
                        <Eye className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      </button>
                      <button onClick={() => openReceipt(order.id)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-card transition-colors" aria-label="طباعة الفاتورة">
                        <Printer className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      </button>
                      {canAdvance && (
                        <button onClick={() => updateStatus(order.id, statusFlow[idx + 1])} className="p-2 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors" aria-label="تقديم الحالة">
                          <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-dark-border">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                صفحة {page} من {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-card disabled:opacity-30 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-card disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Receipt Modal */}
      {receiptOrder && (
        <Receipt order={receiptOrder} onClose={() => setReceiptOrder(null)} />
      )}

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setSelectedOrder(null)}>
          <div className="glass-card w-full max-w-lg mx-4 p-6 animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                تفاصيل الطلب #{selectedOrder.orderNumber.slice(-6)}
              </h3>
              <button onClick={() => setSelectedOrder(null)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-card">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Order Info */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">النوع</p>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{typeMap[selectedOrder.type]}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">الحالة</p>
                <span className={cn('text-xs px-2.5 py-1 rounded-lg font-medium', statusMap[selectedOrder.status]?.class)}>
                  {statusMap[selectedOrder.status]?.label}
                </span>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">الفرع</p>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{selectedOrder.branch?.nameAr || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">التاريخ</p>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {new Date(selectedOrder.createdAt).toLocaleString('ar-SA')}
                </p>
              </div>
            </div>

            {/* Items */}
            <div className="mb-6">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">الأصناف</p>
              <div className="space-y-2">
                {selectedOrder.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-dark-border/50 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-md bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 text-xs flex items-center justify-center font-bold">
                        {item.quantity}
                      </span>
                      <span className="text-sm text-gray-900 dark:text-gray-100">{item.menuItem.nameAr}</span>
                    </div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{formatSAR(item.totalPrice)} <SARSymbol /></span>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="space-y-2 pt-4 border-t border-gray-200 dark:border-dark-border">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">المجموع الفرعي</span>
                <span className="text-gray-900 dark:text-gray-100">{formatSAR(selectedOrder.subtotal)} <SARSymbol /></span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">ضريبة (15%)</span>
                <span className="text-gray-900 dark:text-gray-100">{formatSAR(selectedOrder.tax)} <SARSymbol /></span>
              </div>
              {selectedOrder.discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">خصم</span>
                  <span className="text-rose-600 dark:text-rose-400">-{formatSAR(selectedOrder.discount)} <SARSymbol /></span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold pt-2 border-t border-gray-200 dark:border-dark-border">
                <span className="text-gray-900 dark:text-white">الإجمالي</span>
                <span className="text-primary-600 dark:text-primary-400">{formatSAR(selectedOrder.total)} <SARSymbol /></span>
              </div>
            </div>

            {/* Print Receipt */}
            <div className="mt-4">
              <button
                onClick={() => openReceipt(selectedOrder.id)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 dark:border-dark-border text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-hover transition-colors text-sm font-medium"
              >
                <Printer className="w-4 h-4" />
                طباعة الفاتورة
              </button>
            </div>

            {/* Status Actions */}
            {selectedOrder.status !== 'COMPLETED' && selectedOrder.status !== 'CANCELLED' && (
              <div className="flex gap-2 mt-6">
                {(() => {
                  const idx = statusFlow.indexOf(selectedOrder.status);
                  if (idx < statusFlow.length - 1) {
                    const next = statusFlow[idx + 1];
                    return (
                      <button
                        onClick={() => updateStatus(selectedOrder.id, next)}
                        className="btn-primary flex-1 flex items-center justify-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4" />
                        {statusMap[next]?.label}
                      </button>
                    );
                  }
                  return null;
                })()}
                <button
                  onClick={() => updateStatus(selectedOrder.id, 'CANCELLED')}
                  className="flex-1 px-5 py-2.5 rounded-xl font-medium border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                >
                  إلغاء الطلب
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
