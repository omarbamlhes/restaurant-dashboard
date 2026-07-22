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
  Wifi,
  WifiOff,
  LogOut,
  Check,
  Flame,
} from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { useSocket } from '@/hooks/useSocket';
import { useAuthStore } from '@/stores/authStore';

// --- Types ---

interface Branch {
  id: string;
  nameAr: string;
}

interface KitchenStation {
  id: string;
  name: string;
  nameAr: string;
  color: string;
  _count: { menuItems: number };
}

interface OrderItem {
  id: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes?: string;
  stationStatus: 'PENDING' | 'PREPARING' | 'DONE';
  menuItem: {
    nameAr: string;
    stationId: string | null;
    station: { id: string; nameAr: string; color: string } | null;
  };
}

interface Order {
  id: string;
  orderNumber: string;
  type: string;
  status: string;
  total: number;
  createdAt: string;
  branchId: string;
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

const ITEM_STATUS_FLOW = ['PENDING', 'PREPARING', 'DONE'];

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
  const { logout } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [stations, setStations] = useState<KitchenStation[]>([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedStation, setSelectedStation] = useState(''); // '' = all stations
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());

  // WebSocket connection
  const { isConnected, socket } = useSocket();

  // Refs to avoid stale closures in socket handlers
  const selectedBranchRef = useRef(selectedBranch);
  selectedBranchRef.current = selectedBranch;
  const soundEnabledRef = useRef(soundEnabled);
  soundEnabledRef.current = soundEnabled;

  // Live clock + elapsed time refresh every 30s
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  // Fetch branches + stations once
  useEffect(() => {
    api.get('/branches').then((res) => setBranches(res.data)).catch(console.error);
    api.get('/kitchen-stations').then((res) => setStations(res.data)).catch(console.error);
  }, []);

  // Fetch orders (used for initial load + fallback polling)
  const fetchOrders = useCallback(async () => {
    try {
      const params: Record<string, string | number> = { limit: 50 };
      if (selectedBranch) params.branchId = selectedBranch;
      const { data } = await api.get('/orders', { params });
      const activeOrders: Order[] = (data.data || data).filter(
        (o: Order) => o.status === 'PENDING' || o.status === 'PREPARING' || o.status === 'READY',
      );
      setOrders(activeOrders);
    } catch (e) {
      console.error('Failed to fetch orders:', e);
    } finally {
      setLoading(false);
    }
  }, [selectedBranch]);

  // Initial fetch on mount + when branch changes
  useEffect(() => {
    setLoading(true);
    fetchOrders();
  }, [fetchOrders]);

  // Fallback polling only when WebSocket is disconnected
  useEffect(() => {
    if (isConnected) return;
    const interval = setInterval(fetchOrders, 10000);
    return () => clearInterval(interval);
  }, [isConnected, fetchOrders]);

  // WebSocket event listeners
  useEffect(() => {
    if (!socket) return;

    const handleNewOrder = (order: Order) => {
      if (!['PENDING', 'PREPARING', 'READY'].includes(order.status)) return;
      if (selectedBranchRef.current && order.branchId !== selectedBranchRef.current) return;

      setOrders((prev) => {
        if (prev.some((o) => o.id === order.id)) return prev;
        return [...prev, order];
      });
      if (soundEnabledRef.current) playBeep();
    };

    const handleStatusChanged = (order: Order) => {
      setOrders((prev) => {
        if (['PENDING', 'PREPARING', 'READY'].includes(order.status)) {
          const exists = prev.some((o) => o.id === order.id);
          if (exists) {
            return prev.map((o) => (o.id === order.id ? { ...o, ...order } : o));
          }
          if (selectedBranchRef.current && order.branchId !== selectedBranchRef.current) return prev;
          return [...prev, order];
        }
        return prev.filter((o) => o.id !== order.id);
      });
    };

    const handleItemStationChanged = (data: { orderId: string; itemId: string; stationStatus: string }) => {
      setOrders((prev) =>
        prev.map((o) => {
          if (o.id !== data.orderId) return o;
          return {
            ...o,
            items: o.items.map((item) =>
              item.id === data.itemId ? { ...item, stationStatus: data.stationStatus as any } : item,
            ),
          };
        }),
      );
    };

    socket.on('newOrder', handleNewOrder);
    socket.on('orderStatusChanged', handleStatusChanged);
    socket.on('itemStationStatusChanged', handleItemStationChanged);

    return () => {
      socket.off('newOrder', handleNewOrder);
      socket.off('orderStatusChanged', handleStatusChanged);
      socket.off('itemStationStatusChanged', handleItemStationChanged);
    };
  }, [socket]);

  // Advance whole order status (used in "all stations" mode or READY column)
  async function advanceStatus(orderId: string, currentStatus: string) {
    const idx = statusFlow.indexOf(currentStatus);
    if (idx < 0 || idx >= statusFlow.length - 1) return;
    const newStatus = statusFlow[idx + 1];

    setUpdatingIds((prev) => new Set(prev).add(orderId));

    setOrders((prev) => {
      if (newStatus === 'COMPLETED') return prev.filter((o) => o.id !== orderId);
      return prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o));
    });

    try {
      await api.put(`/orders/${orderId}/status`, { status: newStatus });
      if (!isConnected) await fetchOrders();
    } catch {
      fetchOrders();
    } finally {
      setUpdatingIds((prev) => {
        const next = new Set(prev);
        next.delete(orderId);
        return next;
      });
    }
  }

  // Advance single item station status
  async function advanceItemStatus(orderId: string, itemId: string, currentStatus: string) {
    const idx = ITEM_STATUS_FLOW.indexOf(currentStatus);
    if (idx < 0 || idx >= ITEM_STATUS_FLOW.length - 1) return;
    const newStatus = ITEM_STATUS_FLOW[idx + 1];

    const key = `${orderId}-${itemId}`;
    setUpdatingIds((prev) => new Set(prev).add(key));

    // Optimistic update
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o;
        return {
          ...o,
          items: o.items.map((item) =>
            item.id === itemId ? { ...item, stationStatus: newStatus as any } : item,
          ),
        };
      }),
    );

    try {
      await api.put(`/orders/${orderId}/items/${itemId}/station-status`, { status: newStatus });
    } catch {
      fetchOrders();
    } finally {
      setUpdatingIds((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  }

  // Mark all items for a station in an order as next status
  async function advanceAllStationItems(order: Order) {
    const stationItems = getStationItems(order);
    const pendingItems = stationItems.filter(i => i.stationStatus !== 'DONE');
    if (pendingItems.length === 0) return;

    for (const item of pendingItems) {
      const idx = ITEM_STATUS_FLOW.indexOf(item.stationStatus);
      if (idx < ITEM_STATUS_FLOW.length - 1) {
        await advanceItemStatus(order.id, item.id, item.stationStatus);
      }
    }
  }

  // Filter items by selected station (items without a station appear everywhere)
  function getStationItems(order: Order): OrderItem[] {
    if (!selectedStation) return order.items;
    return order.items.filter(
      (item) => item.menuItem.stationId === selectedStation || !item.menuItem.stationId,
    );
  }

  // Check if order has items for selected station
  function hasStationItems(order: Order): boolean {
    if (!selectedStation) return true;
    return order.items.some(
      (item) => item.menuItem.stationId === selectedStation || !item.menuItem.stationId,
    );
  }

  // Get station-specific order status
  function getStationOrderStatus(order: Order): string {
    if (!selectedStation) return order.status;
    const items = getStationItems(order);
    if (items.length === 0) return order.status;
    if (items.every(i => i.stationStatus === 'DONE')) return 'READY';
    if (items.some(i => i.stationStatus === 'PREPARING' || i.stationStatus === 'DONE')) return 'PREPARING';
    return 'PENDING';
  }

  // In station mode, group by station-specific status
  const grouped: Record<string, Order[]> = { PENDING: [], PREPARING: [], READY: [] };
  orders.forEach((o) => {
    if (!hasStationItems(o)) return;
    const status = selectedStation ? getStationOrderStatus(o) : o.status;
    if (grouped[status]) grouped[status].push(o);
  });
  Object.values(grouped).forEach((arr) =>
    arr.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
  );

  const totalActive = grouped.PENDING.length + grouped.PREPARING.length + grouped.READY.length;

  const currentTime = new Date(now).toLocaleTimeString('ar-SA', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const selectedStationInfo = stations.find(s => s.id === selectedStation);

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
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">
              {selectedStationInfo ? selectedStationInfo.nameAr : 'شاشة المطبخ'}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Station selector */}
          {stations.length > 0 && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setSelectedStation('')}
                className={cn(
                  'text-xs px-3 py-2 rounded-lg font-medium transition-all',
                  !selectedStation
                    ? 'bg-primary-600 text-white shadow-md'
                    : 'bg-gray-100 dark:bg-dark-hover text-gray-600 dark:text-gray-300 hover:bg-gray-200',
                )}
              >
                الكل
              </button>
              {stations.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedStation(s.id)}
                  className={cn(
                    'text-xs px-3 py-2 rounded-lg font-medium transition-all flex items-center gap-1.5',
                    selectedStation === s.id
                      ? 'text-white shadow-md'
                      : 'bg-gray-100 dark:bg-dark-hover text-gray-600 dark:text-gray-300 hover:bg-gray-200',
                  )}
                  style={selectedStation === s.id ? { backgroundColor: s.color } : undefined}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: selectedStation === s.id ? 'white' : s.color }}
                  />
                  {s.nameAr}
                </button>
              ))}
            </div>
          )}

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

          {/* Connection indicator */}
          <div
            className={cn(
              'flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg',
              isConnected
                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
            )}
            title={isConnected ? 'متصل - تحديث لحظي' : 'غير متصل - تحديث كل 10 ثواني'}
          >
            {isConnected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            <span className="hidden md:inline">{isConnected ? 'متصل' : 'غير متصل'}</span>
          </div>

          {/* Clock */}
          <div className="flex items-center gap-1.5 text-sm font-medium text-gray-600 dark:text-gray-400">
            <Clock className="w-4 h-4" />
            <span className="font-mono">{currentTime}</span>
          </div>

          {/* Logout */}
          <button
            onClick={logout}
            className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-dark-hover"
            title="تسجيل الخروج"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden md:inline">خروج</span>
          </button>
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
                      const stationItems = getStationItems(order);
                      const totalItems = order.items.length;
                      const showingPartial = selectedStation && stationItems.length < totalItems;

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
                              {showingPartial && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-dark-hover text-gray-400">
                                  {stationItems.length}/{totalItems}
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
                            {stationItems.map((item) => (
                              <div key={item.id} className="group/item">
                                <div className="flex items-start gap-2">
                                  <span className="w-6 h-6 rounded-md bg-gray-100 dark:bg-dark-hover text-gray-700 dark:text-gray-300 text-xs flex items-center justify-center font-bold flex-shrink-0 mt-0.5">
                                    {item.quantity}
                                  </span>
                                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100 flex-1">
                                    {item.menuItem.nameAr}
                                  </span>

                                  {/* Per-item station status (in station mode) */}
                                  {selectedStation && (
                                    <button
                                      onClick={() => advanceItemStatus(order.id, item.id, item.stationStatus)}
                                      disabled={item.stationStatus === 'DONE' || updatingIds.has(`${order.id}-${item.id}`)}
                                      className={cn(
                                        'flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg transition-all flex-shrink-0',
                                        item.stationStatus === 'PENDING' && 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 hover:bg-blue-200',
                                        item.stationStatus === 'PREPARING' && 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 hover:bg-amber-200',
                                        item.stationStatus === 'DONE' && 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 cursor-default',
                                      )}
                                    >
                                      {item.stationStatus === 'PENDING' && <><Flame className="w-3 h-3" /> ابدأ</>}
                                      {item.stationStatus === 'PREPARING' && <><Check className="w-3 h-3" /> جاهز</>}
                                      {item.stationStatus === 'DONE' && <><Check className="w-3 h-3" /> تم</>}
                                    </button>
                                  )}

                                  {/* Station badge (in all-stations mode) */}
                                  {!selectedStation && item.menuItem.station && (
                                    <span
                                      className="text-[10px] px-1.5 py-0.5 rounded text-white flex-shrink-0"
                                      style={{ backgroundColor: item.menuItem.station.color }}
                                    >
                                      {item.menuItem.station.nameAr}
                                    </span>
                                  )}
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
                          {selectedStation ? (
                            // Station mode: advance all items for this station
                            <button
                              onClick={() => advanceAllStationItems(order)}
                              disabled={isUpdating || stationItems.every(i => i.stationStatus === 'DONE')}
                              className={cn(
                                'w-full py-3 rounded-xl font-bold text-sm transition-all active:scale-[0.98]',
                                stationItems.every(i => i.stationStatus === 'DONE')
                                  ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 cursor-default'
                                  : col.btnClass,
                                isUpdating && 'opacity-60 cursor-not-allowed',
                              )}
                              style={{ minHeight: '48px' }}
                            >
                              {stationItems.every(i => i.stationStatus === 'DONE')
                                ? '✓ تم التحضير'
                                : stationItems.some(i => i.stationStatus === 'PREPARING')
                                  ? 'تم - جاهز ✓'
                                  : 'ابدأ الكل'
                              }
                            </button>
                          ) : (
                            // All-stations mode: advance whole order
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
                          )}
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
