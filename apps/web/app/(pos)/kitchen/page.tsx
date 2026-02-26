'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  ChefHat,
  Clock,
  Volume2,
  VolumeX,
  ArrowRight,
  Utensils,
  Truck,
  Store,
  AlertCircle,
} from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

// --- Types ---

interface Branch {
  id: string;
  nameAr: string;
}

interface OrderItem {
  id: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes?: string;
  menuItem: { nameAr: string };
}

interface Order {
  id: string;
  orderNumber: string;
  type: string;
  status: string;
  total: number;
  createdAt: string;
  branch?: { nameAr: string };
  items: OrderItem[];
}

// --- Constants ---

const statusFlow = ['PENDING', 'PREPARING', 'READY', 'COMPLETED'];

const typeConfig: Record<string, { label: string; icon: typeof Store; class: string }> = {
  DINE_IN: { label: 'محلي', icon: Store, class: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' },
  TAKEAWAY: { label: 'سفري', icon: Utensils, class: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' },
  DELIVERY: { label: 'توصيل', icon: Truck, class: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' },
};

const columns = [
  { status: 'PENDING', title: 'جديد', colorClass: 'border-blue-500', headerBg: 'bg-blue-500', badgeBg: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300', cardBorder: 'border-blue-200 dark:border-blue-800', btnClass: 'bg-blue-600 hover:bg-blue-700 text-white', btnLabel: 'ابدأ التحضير' },
  { status: 'PREPARING', title: 'تحضير', colorClass: 'border-amber-500', headerBg: 'bg-amber-500', badgeBg: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300', cardBorder: 'border-amber-200 dark:border-amber-800', btnClass: 'bg-amber-600 hover:bg-amber-700 text-white', btnLabel: 'جاهز' },
  { status: 'READY', title: 'جاهز', colorClass: 'border-emerald-500', headerBg: 'bg-emerald-500', badgeBg: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300', cardBorder: 'border-emerald-200 dark:border-emerald-800', btnClass: 'bg-emerald-600 hover:bg-emerald-700 text-white', btnLabel: 'تم التسليم' },
] as const;

// --- Helpers ---

function getElapsed(createdAt: string): string {
  const diff = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
  if (diff < 1) return 'الآن';
  if (diff < 60) return `${diff} د`;
  return `${Math.floor(diff / 60)} س ${diff % 60} د`;
}

function isOverdue(createdAt: string): boolean {
  return Date.now() - new Date(createdAt).getTime() > 15 * 60 * 1000;
}

function playBeep() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 800;
    gain.gain.value = 0.3;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
    setTimeout(() => ctx.close(), 500);
  } catch {
    // Audio not supported
  }
}

// --- Component ---

export default function KitchenPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [now, setNow] = useState(Date.now());
  const prevPendingCount = useRef(0);
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());

  // Live clock + elapsed time refresh every 30s
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  // Fetch branches once
  useEffect(() => {
    api.get('/branches').then((res) => setBranches(res.data)).catch(console.error);
  }, []);

  // Fetch orders
  const fetchOrders = useCallback(async () => {
    try {
      const params: Record<string, string | number> = { limit: 50 };
      if (selectedBranch) params.branchId = selectedBranch;
      const { data } = await api.get('/orders', { params });
      const activeOrders: Order[] = (data.data || data).filter(
        (o: Order) => o.status === 'PENDING' || o.status === 'PREPARING' || o.status === 'READY',
      );

      // Sound alert: new pending orders
      const newPendingCount = activeOrders.filter((o) => o.status === 'PENDING').length;
      if (soundEnabled && newPendingCount > prevPendingCount.current && prevPendingCount.current !== 0) {
        playBeep();
      }
      prevPendingCount.current = newPendingCount;

      setOrders(activeOrders);
    } catch (e) {
      console.error('Failed to fetch orders:', e);
    } finally {
      setLoading(false);
    }
  }, [selectedBranch, soundEnabled]);

  // Initial fetch + polling every 10s
  useEffect(() => {
    setLoading(true);
    fetchOrders();
    const interval = setInterval(fetchOrders, 10000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  // Advance order status
  async function advanceStatus(orderId: string, currentStatus: string) {
    const idx = statusFlow.indexOf(currentStatus);
    if (idx < 0 || idx >= statusFlow.length - 1) return;

    setUpdatingIds((prev) => new Set(prev).add(orderId));
    try {
      await api.put(`/orders/${orderId}/status`, { status: statusFlow[idx + 1] });
      await fetchOrders();
    } catch (e) {
      console.error('Failed to update status:', e);
    } finally {
      setUpdatingIds((prev) => {
        const next = new Set(prev);
        next.delete(orderId);
        return next;
      });
    }
  }

  // Group orders by status, sorted oldest first
  const grouped: Record<string, Order[]> = { PENDING: [], PREPARING: [], READY: [] };
  orders.forEach((o) => {
    if (grouped[o.status]) grouped[o.status].push(o);
  });
  Object.values(grouped).forEach((arr) =>
    arr.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
  );

  const currentTime = new Date(now).toLocaleTimeString('ar-SA', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white dark:bg-dark-card border-b border-gray-200 dark:border-dark-border px-4 py-3 flex items-center justify-between gap-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href="/pos"
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-dark-hover transition-colors"
            title="رجوع"
          >
            <ArrowRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </Link>
          <div className="flex items-center gap-2">
            <ChefHat className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">شاشة المطبخ</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Branch selector */}
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="input-field text-sm py-2 min-w-[140px]"
          >
            <option value="">كل الفروع</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.nameAr}
              </option>
            ))}
          </select>

          {/* Status badges */}
          <div className="hidden sm:flex items-center gap-2">
            {columns.map((col) => (
              <span key={col.status} className={cn('text-xs font-bold px-2.5 py-1 rounded-lg', col.badgeBg)}>
                {col.title}: {grouped[col.status]?.length || 0}
              </span>
            ))}
          </div>

          {/* Sound toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={cn(
              'p-2 rounded-xl transition-colors',
              soundEnabled
                ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                : 'bg-gray-100 dark:bg-dark-hover text-gray-400 dark:text-gray-500',
            )}
            title={soundEnabled ? 'إيقاف الصوت' : 'تفعيل الصوت'}
          >
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>

          {/* Clock */}
          <div className="flex items-center gap-1.5 text-sm font-medium text-gray-600 dark:text-gray-400">
            <Clock className="w-4 h-4" />
            <span className="font-mono">{currentTime}</span>
          </div>
        </div>
      </header>

      {/* Columns */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
            <p className="text-sm text-gray-500 dark:text-gray-400">جاري تحميل الطلبات...</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-3 gap-4 p-4 overflow-hidden">
          {columns.map((col) => {
            const colOrders = grouped[col.status] || [];
            return (
              <div key={col.status} className="flex flex-col min-h-0">
                {/* Column header */}
                <div className={cn('rounded-t-xl px-4 py-3 flex items-center justify-between', col.headerBg)}>
                  <h2 className="text-white font-bold text-base">{col.title}</h2>
                  <span className="bg-white/20 text-white text-sm font-bold px-2.5 py-0.5 rounded-lg">
                    {colOrders.length}
                  </span>
                </div>

                {/* Column body */}
                <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-dark-bg/50 rounded-b-xl border border-t-0 border-gray-200 dark:border-dark-border p-3 space-y-3">
                  {colOrders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-gray-600">
                      <ChefHat className="w-10 h-10 mb-2 opacity-40" />
                      <p className="text-sm">لا توجد طلبات</p>
                    </div>
                  ) : (
                    colOrders.map((order) => {
                      const overdue = isOverdue(order.createdAt);
                      const type = typeConfig[order.type];
                      const TypeIcon = type?.icon || Store;
                      const isUpdating = updatingIds.has(order.id);

                      return (
                        <div
                          key={order.id}
                          className={cn(
                            'bg-white dark:bg-dark-card rounded-xl border-2 p-4 transition-all kitchen-card-enter',
                            col.cardBorder,
                            overdue && 'border-red-500 dark:border-red-500 shadow-red-100 dark:shadow-red-900/20 shadow-md',
                          )}
                        >
                          {/* Card header */}
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <span className="text-lg font-bold font-mono text-gray-900 dark:text-white">
                                #{order.orderNumber.slice(-6)}
                              </span>
                              {type && (
                                <span className={cn('text-xs px-2 py-0.5 rounded-md font-medium flex items-center gap-1', type.class)}>
                                  <TypeIcon className="w-3 h-3" />
                                  {type.label}
                                </span>
                              )}
                            </div>
                            <div className={cn(
                              'flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md',
                              overdue
                                ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                                : 'bg-gray-100 dark:bg-dark-hover text-gray-600 dark:text-gray-400',
                            )}>
                              {overdue && <AlertCircle className="w-3 h-3" />}
                              <Clock className="w-3 h-3" />
                              <span>{getElapsed(order.createdAt)}</span>
                            </div>
                          </div>

                          {/* Items */}
                          <div className="space-y-1.5 mb-3">
                            {order.items.map((item) => (
                              <div key={item.id}>
                                <div className="flex items-start gap-2">
                                  <span className="w-6 h-6 rounded-md bg-gray-100 dark:bg-dark-hover text-gray-700 dark:text-gray-300 text-xs flex items-center justify-center font-bold flex-shrink-0 mt-0.5">
                                    {item.quantity}
                                  </span>
                                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                    {item.menuItem.nameAr}
                                  </span>
                                </div>
                                {item.notes && (
                                  <p className="text-xs text-amber-600 dark:text-amber-400 mr-8 mt-0.5">
                                    * {item.notes}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>

                          {/* Action button */}
                          <button
                            onClick={() => advanceStatus(order.id, order.status)}
                            disabled={isUpdating}
                            className={cn(
                              'w-full py-3 rounded-xl font-bold text-sm transition-all active:scale-[0.98]',
                              col.btnClass,
                              isUpdating && 'opacity-60 cursor-not-allowed',
                            )}
                            style={{ minHeight: '48px' }}
                          >
                            {isUpdating ? 'جاري التحديث...' : col.btnLabel}
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
