'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  Clock,
  LayoutDashboard,
  ChefHat,
  ChevronDown,
  Send,
  X,
  StickyNote,
  Percent,
  LogOut,
  Banknote,
  CreditCard,
  Split,
  Printer,
  BarChart3,
  Receipt as ReceiptIcon,
} from 'lucide-react';
import api from '@/lib/api';
import { cn, formatSAR } from '@/lib/utils';
import SARSymbol from '@/components/shared/SARSymbol';
import Receipt from '@/components/shared/Receipt';
import { useAuthStore } from '@/stores/authStore';
import { hasPermission } from '@/lib/permissions';

// --- Types ---

interface Category {
  id: string;
  name: string;
  nameAr: string;
  sortOrder: number;
  _count: { menuItems: number };
}

interface MenuItem {
  id: string;
  name: string;
  nameAr: string;
  price: number;
  isActive: boolean;
  category: { id: string; nameAr: string };
}

interface CartItem {
  menuItemId: string;
  nameAr: string;
  price: number;
  quantity: number;
  notes: string;
}

interface Branch {
  id: string;
  name: string;
  nameAr: string;
}

interface TableData {
  id: string;
  number: number;
  name?: string;
  nameAr?: string;
  capacity: number;
  status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED';
  orders: { id: string; orderNumber: string; total: number }[];
}

type OrderType = 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';
type PaymentMethod = 'CASH' | 'CARD' | 'SPLIT';

const orderTypeLabels: Record<OrderType, string> = {
  DINE_IN: 'محلي',
  TAKEAWAY: 'سفري',
  DELIVERY: 'توصيل',
};

const paymentMethodLabels: Record<string, string> = {
  CASH: 'نقدي',
  CARD: 'بطاقة',
  SPLIT: 'مقسم',
};

// --- Clock Component ---

function LiveClock() {
  const [time, setTime] = useState('');

  useEffect(() => {
    function tick() {
      setTime(new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return <span className="font-mono text-sm tabular-nums">{time}</span>;
}

// --- Shift Report Modal ---

function ShiftReportModal({ branchId, onClose }: { branchId: string; onClose: () => void }) {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    api.get('/orders/shift-report', { params: { from: today, to: today, branchId } })
      .then((res) => setReport(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [branchId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm print:bg-white print:backdrop-blur-none" onClick={onClose}>
      <div className="bg-white dark:bg-dark-card w-full max-w-2xl mx-4 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto print:shadow-none print:rounded-none print:max-w-none print:mx-0 print:max-h-none" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-dark-border print:hidden">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">تقرير الوردية</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-medium transition-colors"
            >
              <Printer className="w-4 h-4" />
              طباعة
            </button>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-hover transition-colors">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div id="shift-report-content" className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
            </div>
          ) : !report ? (
            <p className="text-center text-gray-500 py-12">لا توجد بيانات</p>
          ) : (
            <div className="space-y-6">
              {/* Title for print */}
              <div className="hidden print:block text-center mb-4">
                <h2 className="text-xl font-bold">تقرير الوردية (Z-Report)</h2>
                <p className="text-sm text-gray-500">{report.period.from}</p>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50">
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">الإيرادات</p>
                  <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300 mt-1">{formatSAR(report.totalRevenue)} <SARSymbol /></p>
                </div>
                <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50">
                  <p className="text-xs text-blue-600 dark:text-blue-400">عدد الطلبات</p>
                  <p className="text-lg font-bold text-blue-700 dark:text-blue-300 mt-1">{report.totalOrders}</p>
                </div>
                <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/50">
                  <p className="text-xs text-purple-600 dark:text-purple-400">متوسط الفاتورة</p>
                  <p className="text-lg font-bold text-purple-700 dark:text-purple-300 mt-1">{formatSAR(report.avgOrderValue)} <SARSymbol /></p>
                </div>
                <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50">
                  <p className="text-xs text-rose-600 dark:text-rose-400">ملغية</p>
                  <p className="text-lg font-bold text-rose-700 dark:text-rose-300 mt-1">{report.cancelledOrders}</p>
                </div>
              </div>

              {/* Financial Summary */}
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-dark-hover border border-gray-200 dark:border-dark-border">
                <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3">الملخص المالي</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">المجموع الفرعي</span><span className="font-medium">{formatSAR(report.totalSubtotal)} <SARSymbol /></span></div>
                  <div className="flex justify-between"><span className="text-gray-500">الضريبة (15%)</span><span className="font-medium">{formatSAR(report.totalTax)} <SARSymbol /></span></div>
                  {report.totalDiscount > 0 && <div className="flex justify-between text-rose-600"><span>الخصومات</span><span className="font-medium">-{formatSAR(report.totalDiscount)} <SARSymbol /></span></div>}
                  <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-dark-border font-bold"><span>الإجمالي</span><span>{formatSAR(report.totalRevenue)} <SARSymbol /></span></div>
                </div>
              </div>

              {/* Payment Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-4 rounded-xl bg-gray-50 dark:bg-dark-hover border border-gray-200 dark:border-dark-border">
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3">حسب طريقة الدفع</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-gray-500">نقدي ({report.payment.cash.count})</span><span className="font-medium">{formatSAR(report.payment.cash.total)} <SARSymbol /></span></div>
                    <div className="flex justify-between"><span className="text-gray-500">بطاقة ({report.payment.card.count})</span><span className="font-medium">{formatSAR(report.payment.card.total)} <SARSymbol /></span></div>
                    {report.payment.split.count > 0 && <div className="flex justify-between"><span className="text-gray-500">مقسم ({report.payment.split.count})</span><span className="font-medium">-</span></div>}
                    {report.payment.totalChange > 0 && <div className="flex justify-between text-amber-600"><span>الباقي المعاد</span><span className="font-medium">{formatSAR(report.payment.totalChange)} <SARSymbol /></span></div>}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-gray-50 dark:bg-dark-hover border border-gray-200 dark:border-dark-border">
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3">حسب نوع الطلب</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-gray-500">محلي ({report.orderTypes.dineIn.count})</span><span className="font-medium">{formatSAR(report.orderTypes.dineIn.total)} <SARSymbol /></span></div>
                    <div className="flex justify-between"><span className="text-gray-500">سفري ({report.orderTypes.takeaway.count})</span><span className="font-medium">{formatSAR(report.orderTypes.takeaway.total)} <SARSymbol /></span></div>
                    <div className="flex justify-between"><span className="text-gray-500">توصيل ({report.orderTypes.delivery.count})</span><span className="font-medium">{formatSAR(report.orderTypes.delivery.total)} <SARSymbol /></span></div>
                  </div>
                </div>
              </div>

              {/* Top Items */}
              {report.topItems.length > 0 && (
                <div className="p-4 rounded-xl bg-gray-50 dark:bg-dark-hover border border-gray-200 dark:border-dark-border">
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3">الأصناف الأكثر مبيعاً</h4>
                  <div className="space-y-2">
                    {report.topItems.map((item: any, i: number) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-md bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 text-xs flex items-center justify-center font-bold">{i + 1}</span>
                          <span className="text-gray-700 dark:text-gray-300">{item.nameAr}</span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>{item.quantity} وحدة</span>
                          <span className="font-medium text-gray-700 dark:text-gray-300">{formatSAR(item.revenue)} <SARSymbol /></span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Main POS Page ---

export default function POSPage() {
  const { user, logout } = useAuthStore();
  const userRole = user?.role;
  const userPerms = user?.permissions;

  // Data
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [tables, setTables] = useState<TableData[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [activeCategory, setActiveCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Cart
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState<OrderType>('DINE_IN');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [discount, setDiscount] = useState(0);
  const [notesItemId, setNotesItemId] = useState<string | null>(null);

  // Payment modal
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [cashInput, setCashInput] = useState('');
  const [splitCash, setSplitCash] = useState('');
  const [splitCard, setSplitCard] = useState('');

  // Submission
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState('');

  // Receipt
  const [receiptOrder, setReceiptOrder] = useState<any>(null);

  // Shift report
  const [showShiftReport, setShowShiftReport] = useState(false);

  // --- Fetch data ---

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [itemsRes, catsRes, branchesRes] = await Promise.all([
        api.get('/menu'),
        api.get('/menu/categories'),
        api.get('/branches'),
      ]);
      setMenuItems(itemsRes.data);
      setCategories(catsRes.data);
      setBranches(branchesRes.data);
      if (branchesRes.data.length > 0 && !selectedBranch) {
        setSelectedBranch(branchesRes.data[0].id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Fetch tables when branch changes
  useEffect(() => {
    if (selectedBranch) {
      api.get('/tables', { params: { branchId: selectedBranch } })
        .then((res) => setTables(res.data))
        .catch(() => setTables([]));
    }
  }, [selectedBranch]);

  // Reset table when order type changes
  useEffect(() => {
    if (orderType !== 'DINE_IN') {
      setSelectedTable(null);
    }
  }, [orderType]);

  // --- Filtered items ---

  const filteredItems = useMemo(() => {
    let items = menuItems.filter((i) => i.isActive);
    if (activeCategory) {
      items = items.filter((i) => i.category.id === activeCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      items = items.filter(
        (i) => i.nameAr.toLowerCase().includes(q) || i.name.toLowerCase().includes(q),
      );
    }
    return items;
  }, [menuItems, activeCategory, searchQuery]);

  // --- Cart helpers ---

  function addToCart(item: MenuItem) {
    setCart((prev) => {
      const existing = prev.find((c) => c.menuItemId === item.id);
      if (existing) {
        return prev.map((c) =>
          c.menuItemId === item.id ? { ...c, quantity: c.quantity + 1 } : c,
        );
      }
      return [...prev, { menuItemId: item.id, nameAr: item.nameAr, price: item.price, quantity: 1, notes: '' }];
    });
  }

  function updateQuantity(menuItemId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((c) => (c.menuItemId === menuItemId ? { ...c, quantity: c.quantity + delta } : c))
        .filter((c) => c.quantity > 0),
    );
  }

  function updateNotes(menuItemId: string, notes: string) {
    setCart((prev) =>
      prev.map((c) => (c.menuItemId === menuItemId ? { ...c, notes } : c)),
    );
  }

  function clearCart() {
    setCart([]);
    setDiscount(0);
    setNotesItemId(null);
    setSelectedTable(null);
  }

  function getCartQuantity(menuItemId: string): number {
    return cart.find((c) => c.menuItemId === menuItemId)?.quantity || 0;
  }

  // --- Calculations ---

  const subtotal = useMemo(() => cart.reduce((sum, c) => sum + c.price * c.quantity, 0), [cart]);
  const vat = useMemo(() => Math.round(subtotal * 0.15 * 100) / 100, [subtotal]);
  const total = useMemo(() => Math.max(0, Math.round((subtotal + vat - discount) * 100) / 100), [subtotal, vat, discount]);

  // --- Payment logic ---

  function openPaymentModal() {
    if (cart.length === 0 || !selectedBranch) return;
    setPaymentMethod('CASH');
    setCashInput('');
    setSplitCash('');
    setSplitCard('');
    setShowPayment(true);
  }

  const cashPaid = parseFloat(cashInput) || 0;
  const changeAmount = paymentMethod === 'CASH' ? Math.max(0, Math.round((cashPaid - total) * 100) / 100) : 0;
  const canPayCash = paymentMethod === 'CASH' && cashPaid >= total;
  const canPayCard = paymentMethod === 'CARD';
  const splitCashVal = parseFloat(splitCash) || 0;
  const splitCardVal = parseFloat(splitCard) || 0;
  const canPaySplit = paymentMethod === 'SPLIT' && Math.round((splitCashVal + splitCardVal) * 100) >= Math.round(total * 100);

  const canSubmitPayment = canPayCash || canPayCard || canPaySplit;

  async function submitOrder() {
    if (!canSubmitPayment) return;
    setSubmitting(true);
    try {
      let paidAmount = total;
      let cashAmt = 0;
      let cardAmt = 0;

      if (paymentMethod === 'CASH') {
        paidAmount = cashPaid;
        cashAmt = cashPaid;
      } else if (paymentMethod === 'CARD') {
        cardAmt = total;
      } else {
        paidAmount = splitCashVal + splitCardVal;
        cashAmt = splitCashVal;
        cardAmt = splitCardVal;
      }

      const { data: order } = await api.post('/orders', {
        type: orderType,
        branchId: selectedBranch,
        discount,
        paymentMethod,
        paidAmount,
        cashAmount: cashAmt,
        cardAmount: cardAmt,
        tableId: orderType === 'DINE_IN' ? selectedTable : undefined,
        items: cart.map((c) => ({
          menuItemId: c.menuItemId,
          quantity: c.quantity,
          ...(c.notes ? { notes: c.notes } : {}),
        })),
      });

      setShowPayment(false);
      clearCart();

      // Fetch receipt data
      try {
        const { data: receiptData } = await api.get(`/orders/${order.id}/receipt`);
        setReceiptOrder(receiptData);
      } catch {
        // If receipt fails, just show success toast
        showToast('تم إرسال الطلب بنجاح');
      }

      // Refresh tables
      if (selectedBranch) {
        api.get('/tables', { params: { branchId: selectedBranch } })
          .then((res) => setTables(res.data))
          .catch(() => {});
      }
    } catch (e: any) {
      showToast(e.response?.data?.message || 'حدث خطأ أثناء إرسال الطلب');
    } finally {
      setSubmitting(false);
    }
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  function handleCashQuick(amount: number) {
    setCashInput(String(amount));
  }

  // --- Render ---

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <header className="h-14 flex-shrink-0 flex items-center justify-between px-4 bg-white dark:bg-dark-card border-b border-gray-200 dark:border-dark-border">
        <div className="flex items-center gap-4">
          {hasPermission(userRole, 'dashboard', userPerms) && (
            <>
              <Link
                href="/dashboard"
                className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span className="hidden sm:inline">لوحة التحكم</span>
              </Link>
              <div className="h-5 w-px bg-gray-200 dark:bg-dark-border" />
            </>
          )}
          {hasPermission(userRole, 'kitchen', userPerms) && (
            <>
              <Link
                href="/kitchen"
                className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
              >
                <ChefHat className="w-4 h-4" />
                <span className="hidden sm:inline">المطبخ</span>
              </Link>
              <div className="h-5 w-px bg-gray-200 dark:bg-dark-border" />
            </>
          )}
          <h1 className="text-base font-bold text-gray-900 dark:text-white">نقطة البيع</h1>
        </div>

        <div className="flex items-center gap-4">
          {/* Shift Report */}
          <button
            onClick={() => setShowShiftReport(true)}
            className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
            title="تقرير الوردية"
          >
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">الوردية</span>
          </button>
          <div className="h-5 w-px bg-gray-200 dark:bg-dark-border" />

          {/* Logout */}
          <button
            onClick={logout}
            className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
            title="تسجيل الخروج"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">خروج</span>
          </button>
          <div className="h-5 w-px bg-gray-200 dark:bg-dark-border" />
          {/* Branch selector */}
          <div className="relative">
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="appearance-none bg-gray-50 dark:bg-dark-hover border border-gray-200 dark:border-dark-border rounded-lg pl-8 pr-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.nameAr}</option>
              ))}
            </select>
            <ChevronDown className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>

          {/* Clock */}
          <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
            <Clock className="w-4 h-4" />
            <LiveClock />
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Right side - Menu (70%) */}
        <div className="flex-1 flex flex-col overflow-hidden border-l border-gray-200 dark:border-dark-border">
          {/* Search + Categories */}
          <div className="flex-shrink-0 p-4 space-y-3 bg-white dark:bg-dark-card border-b border-gray-100 dark:border-dark-border/50">
            {/* Search */}
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث عن صنف..."
                className="w-full pr-10 pl-4 py-2.5 rounded-xl bg-gray-50 dark:bg-dark-hover border border-gray-200 dark:border-dark-border text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Category tabs */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              <button
                onClick={() => setActiveCategory('')}
                className={cn(
                  'px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors min-h-[44px]',
                  !activeCategory
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 dark:bg-dark-hover text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-border',
                )}
              >
                الكل
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={cn(
                    'px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors min-h-[44px]',
                    activeCategory === cat.id
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 dark:bg-dark-hover text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-border',
                  )}
                >
                  {cat.nameAr}
                </button>
              ))}
            </div>
          </div>

          {/* Items Grid */}
          <div className="flex-1 overflow-y-auto p-4">
            {loading ? (
              <div
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3"
                role="status"
                aria-busy="true"
                aria-label="جاري تحميل القائمة"
              >
                {Array.from({ length: 12 }).map((_, i) => (
                  <div
                    key={i}
                    className="min-h-[120px] rounded-2xl border-2 border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card animate-shimmer"
                  />
                ))}
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500">
                <Search className="w-12 h-12 mb-3 opacity-50" />
                <p className="text-sm">لا توجد أصناف</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {filteredItems.map((item) => {
                  const qty = getCartQuantity(item.id);
                  return (
                    <button
                      key={item.id}
                      onClick={() => addToCart(item)}
                      className={cn(
                        'relative flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all duration-150 active:scale-95 min-h-[120px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-dark-bg',
                        'bg-white dark:bg-dark-card hover:shadow-md',
                        qty > 0
                          ? 'border-primary-500 dark:border-primary-400 shadow-sm'
                          : 'border-gray-200 dark:border-dark-border hover:border-primary-300 dark:hover:border-primary-600',
                      )}
                    >
                      {/* Quantity badge */}
                      {qty > 0 && (
                        <span
                          className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-primary-600 text-white text-xs font-bold flex items-center justify-center shadow-sm tabular-nums"
                          aria-label={`عدد ${qty} في السلة`}
                        >
                          {qty}
                        </span>
                      )}

                      {/* First letter avatar */}
                      <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-950/30 text-primary-700 dark:text-primary-400 flex items-center justify-center text-lg font-bold mb-2">
                        {item.nameAr.charAt(0)}
                      </div>

                      {/* Name */}
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100 text-center leading-tight line-clamp-2 mb-1">
                        {item.nameAr}
                      </span>

                      {/* Price */}
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                        {formatSAR(item.price)} <SARSymbol />
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Left side - Cart (30%) */}
        <div className="w-[360px] flex-shrink-0 flex flex-col bg-white dark:bg-dark-card">
          {/* Order type buttons */}
          <div className="flex-shrink-0 p-3 border-b border-gray-100 dark:border-dark-border/50">
            <div className="flex gap-2">
              {(Object.entries(orderTypeLabels) as [OrderType, string][]).map(([type, label]) => (
                <button
                  key={type}
                  onClick={() => setOrderType(type)}
                  className={cn(
                    'flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors min-h-[44px]',
                    orderType === type
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 dark:bg-dark-hover text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-dark-border',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Table Picker for DINE_IN */}
          {orderType === 'DINE_IN' && tables.length > 0 && (
            <div className="flex-shrink-0 p-3 border-b border-gray-100 dark:border-dark-border/50">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">اختر طاولة</p>
              <div className="grid grid-cols-5 gap-1.5">
                {tables.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      if (t.status === 'AVAILABLE') setSelectedTable(selectedTable === t.id ? null : t.id);
                    }}
                    disabled={t.status === 'OCCUPIED' || t.status === 'RESERVED'}
                    className={cn(
                      'p-2 rounded-lg text-xs font-medium text-center transition-colors min-h-[40px]',
                      selectedTable === t.id
                        ? 'bg-primary-600 text-white ring-2 ring-primary-300'
                        : t.status === 'AVAILABLE'
                          ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50 hover:bg-emerald-100 dark:hover:bg-emerald-950/40'
                          : t.status === 'OCCUPIED'
                            ? 'bg-rose-50 dark:bg-rose-950/20 text-rose-500 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 cursor-not-allowed opacity-70'
                            : 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50 cursor-not-allowed opacity-70',
                    )}
                  >
                    {t.number}
                  </button>
                ))}
              </div>
              {selectedTable && (
                <p className="text-xs text-primary-600 dark:text-primary-400 mt-1.5">
                  طاولة {tables.find((t) => t.id === selectedTable)?.number}
                </p>
              )}
            </div>
          )}

          {/* Cart items */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500">
                <ShoppingCart className="w-12 h-12 mb-3 opacity-50" />
                <p className="text-sm">السلة فارغة</p>
                <p className="text-xs mt-1">اضغط على صنف لإضافته</p>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.menuItemId}
                  className="p-3 rounded-xl bg-gray-50 dark:bg-dark-hover border border-gray-100 dark:border-dark-border/50"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {item.nameAr}
                      </p>
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                        {formatSAR(item.price)} <SARSymbol />
                      </p>
                    </div>
                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                      {formatSAR(item.price * item.quantity)} <SARSymbol />
                    </p>
                  </div>

                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => updateQuantity(item.menuItemId, -1)}
                        className="w-8 h-8 rounded-lg bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border flex items-center justify-center hover:bg-gray-100 dark:hover:bg-dark-border transition-colors active:scale-95"
                      >
                        {item.quantity === 1 ? (
                          <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                        ) : (
                          <Minus className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
                        )}
                      </button>
                      <span className="w-8 text-center text-sm font-bold text-gray-900 dark:text-gray-100">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.menuItemId, 1)}
                        className="w-8 h-8 rounded-lg bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border flex items-center justify-center hover:bg-gray-100 dark:hover:bg-dark-border transition-colors active:scale-95"
                      >
                        <Plus className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
                      </button>
                    </div>

                    <button
                      onClick={() => setNotesItemId(notesItemId === item.menuItemId ? null : item.menuItemId)}
                      className={cn(
                        'p-1.5 rounded-lg transition-colors',
                        item.notes
                          ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/30'
                          : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300',
                      )}
                    >
                      <StickyNote className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Notes input */}
                  {notesItemId === item.menuItemId && (
                    <div className="mt-2">
                      <input
                        type="text"
                        value={item.notes}
                        onChange={(e) => updateNotes(item.menuItemId, e.target.value)}
                        placeholder="ملاحظات... (مثل: بدون بصل)"
                        className="w-full px-3 py-2 rounded-lg bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border text-xs text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-primary-500"
                        autoFocus
                      />
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Cart footer - totals + actions */}
          <div className="flex-shrink-0 border-t border-gray-200 dark:border-dark-border p-3 space-y-3">
            {/* Discount input */}
            {cart.length > 0 && (
              <div className="flex items-center gap-2">
                <Percent className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={discount || ''}
                  onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                  placeholder="خصم (ريال)"
                  className="flex-1 px-3 py-2 rounded-lg bg-gray-50 dark:bg-dark-hover border border-gray-200 dark:border-dark-border text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  dir="ltr"
                />
              </div>
            )}

            {/* Totals */}
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-gray-500 dark:text-gray-400">
                <span>المجموع الفرعي</span>
                <span>{formatSAR(subtotal)} <SARSymbol /></span>
              </div>
              <div className="flex justify-between text-gray-500 dark:text-gray-400">
                <span>ضريبة (15%)</span>
                <span>{formatSAR(vat)} <SARSymbol /></span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-rose-500">
                  <span>خصم</span>
                  <span>-{formatSAR(discount)} <SARSymbol /></span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold text-gray-900 dark:text-white pt-1.5 border-t border-gray-200 dark:border-dark-border">
                <span>الإجمالي</span>
                <span className="text-primary-600 dark:text-primary-400">{formatSAR(total)} <SARSymbol /></span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              <button
                onClick={openPaymentModal}
                disabled={cart.length === 0 || !selectedBranch}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px] active:scale-[0.98]"
              >
                <Banknote className="w-4 h-4" />
                الدفع
              </button>
              {cart.length > 0 && (
                <button
                  onClick={clearCart}
                  className="px-4 py-3 rounded-xl border border-gray-200 dark:border-dark-border text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-dark-hover transition-colors min-h-[48px] active:scale-[0.98]"
                  title="مسح السلة"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {showPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowPayment(false)}>
          <div className="bg-white dark:bg-dark-card w-full max-w-md mx-4 rounded-2xl shadow-2xl animate-scale-in" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-dark-border">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">الدفع</h3>
              <button onClick={() => setShowPayment(false)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-hover transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Total display */}
              <div className="text-center p-4 rounded-xl bg-primary-50 dark:bg-primary-950/20 border border-primary-200 dark:border-primary-900/50">
                <p className="text-xs text-primary-600 dark:text-primary-400 mb-1">المطلوب</p>
                <p className="text-3xl font-bold text-primary-700 dark:text-primary-300">{formatSAR(total)} <SARSymbol /></p>
              </div>

              {/* Payment method tabs */}
              <div className="flex gap-2">
                {([
                  { key: 'CASH' as PaymentMethod, label: 'نقدي', icon: Banknote },
                  { key: 'CARD' as PaymentMethod, label: 'بطاقة', icon: CreditCard },
                  { key: 'SPLIT' as PaymentMethod, label: 'مقسم', icon: Split },
                ]).map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setPaymentMethod(key)}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-colors',
                      paymentMethod === key
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 dark:bg-dark-hover text-gray-600 dark:text-gray-400 hover:bg-gray-200',
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
              </div>

              {/* CASH mode */}
              {paymentMethod === 'CASH' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">المبلغ المدفوع</label>
                    <input
                      type="number"
                      value={cashInput}
                      onChange={(e) => setCashInput(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-dark-hover border border-gray-200 dark:border-dark-border text-2xl font-bold text-center text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      dir="ltr"
                      autoFocus
                    />
                  </div>
                  {/* Quick amounts */}
                  <div className="grid grid-cols-3 gap-2">
                    {[10, 20, 50, 100, 200, 500].map((amt) => (
                      <button
                        key={amt}
                        onClick={() => handleCashQuick(amt)}
                        className="py-2.5 rounded-xl bg-gray-100 dark:bg-dark-hover text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-border transition-colors"
                      >
                        {amt}
                      </button>
                    ))}
                  </div>
                  {/* Exact amount button */}
                  <button
                    onClick={() => setCashInput(total.toFixed(2))}
                    className="w-full py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 text-sm font-medium border border-emerald-200 dark:border-emerald-900/50 hover:bg-emerald-100 dark:hover:bg-emerald-950/30 transition-colors"
                  >
                    المبلغ بالضبط ({formatSAR(total)})
                  </button>
                  {/* Change display */}
                  {cashPaid >= total && (
                    <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 text-center">
                      <p className="text-xs text-emerald-600 dark:text-emerald-400">الباقي</p>
                      <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{formatSAR(changeAmount)} <SARSymbol /></p>
                    </div>
                  )}
                </div>
              )}

              {/* CARD mode */}
              {paymentMethod === 'CARD' && (
                <div className="p-6 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 text-center">
                  <CreditCard className="w-12 h-12 text-blue-400 mx-auto mb-3" />
                  <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">سيتم خصم المبلغ من البطاقة</p>
                  <p className="text-2xl font-bold text-blue-800 dark:text-blue-200 mt-2">{formatSAR(total)} <SARSymbol /></p>
                </div>
              )}

              {/* SPLIT mode */}
              {paymentMethod === 'SPLIT' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">نقدي</label>
                    <input
                      type="number"
                      value={splitCash}
                      onChange={(e) => setSplitCash(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-dark-hover border border-gray-200 dark:border-dark-border text-lg font-bold text-center text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      dir="ltr"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">بطاقة</label>
                    <input
                      type="number"
                      value={splitCard}
                      onChange={(e) => setSplitCard(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-dark-hover border border-gray-200 dark:border-dark-border text-lg font-bold text-center text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      dir="ltr"
                    />
                  </div>
                  <div className="flex justify-between text-sm p-3 rounded-xl bg-gray-50 dark:bg-dark-hover">
                    <span className="text-gray-500">المجموع</span>
                    <span className={cn('font-bold', (splitCashVal + splitCardVal) >= total ? 'text-emerald-600' : 'text-rose-600')}>
                      {formatSAR(splitCashVal + splitCardVal)} / {formatSAR(total)} <SARSymbol />
                    </span>
                  </div>
                  {(splitCashVal + splitCardVal) > total && (
                    <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 text-center">
                      <p className="text-xs text-emerald-600">الباقي</p>
                      <p className="text-lg font-bold text-emerald-700">{formatSAR(Math.round((splitCashVal + splitCardVal - total) * 100) / 100)} <SARSymbol /></p>
                    </div>
                  )}
                </div>
              )}

              {/* Submit button */}
              <button
                onClick={submitOrder}
                disabled={!canSubmitPayment || submitting}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-5 h-5" />
                {submitting ? 'جاري الإرسال...' : 'تأكيد وإرسال الطلب'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {receiptOrder && (
        <Receipt order={receiptOrder} onClose={() => { setReceiptOrder(null); showToast('تم إرسال الطلب بنجاح'); }} />
      )}

      {/* Shift Report Modal */}
      {showShiftReport && selectedBranch && (
        <ShiftReportModal branchId={selectedBranch} onClose={() => setShowShiftReport(false)} />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] animate-fade-in-up">
          <div className={cn(
            'px-6 py-3 rounded-xl text-sm font-medium shadow-lg',
            toast.includes('خطأ')
              ? 'bg-rose-600 text-white'
              : 'bg-emerald-600 text-white',
          )}>
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}
