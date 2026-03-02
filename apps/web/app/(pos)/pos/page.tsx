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
  ChevronDown,
  Send,
  X,
  StickyNote,
  Percent,
} from 'lucide-react';
import api from '@/lib/api';
import { cn, formatSAR } from '@/lib/utils';
import SARSymbol from '@/components/shared/SARSymbol';

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

type OrderType = 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';

const orderTypeLabels: Record<OrderType, string> = {
  DINE_IN: 'محلي',
  TAKEAWAY: 'سفري',
  DELIVERY: 'توصيل',
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

// --- Main POS Page ---

export default function POSPage() {
  // Data
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [activeCategory, setActiveCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Cart
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState<OrderType>('DINE_IN');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [discount, setDiscount] = useState(0);
  const [notesItemId, setNotesItemId] = useState<string | null>(null);

  // Submission
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState('');

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
  }

  function getCartQuantity(menuItemId: string): number {
    return cart.find((c) => c.menuItemId === menuItemId)?.quantity || 0;
  }

  // --- Calculations ---

  const subtotal = useMemo(() => cart.reduce((sum, c) => sum + c.price * c.quantity, 0), [cart]);
  const vat = useMemo(() => subtotal * 0.15, [subtotal]);
  const total = useMemo(() => Math.max(0, subtotal + vat - discount), [subtotal, vat, discount]);

  // --- Submit order ---

  async function submitOrder() {
    if (cart.length === 0 || !selectedBranch) return;
    setSubmitting(true);
    try {
      await api.post('/orders', {
        type: orderType,
        branchId: selectedBranch,
        discount,
        items: cart.map((c) => ({
          menuItemId: c.menuItemId,
          quantity: c.quantity,
          ...(c.notes ? { notes: c.notes } : {}),
        })),
      });
      clearCart();
      setToast('تم إرسال الطلب بنجاح');
      setTimeout(() => setToast(''), 3000);
    } catch (e) {
      console.error(e);
      setToast('حدث خطأ أثناء إرسال الطلب');
      setTimeout(() => setToast(''), 3000);
    } finally {
      setSubmitting(false);
    }
  }

  // --- Render ---

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <header className="h-14 flex-shrink-0 flex items-center justify-between px-4 bg-white dark:bg-dark-card border-b border-gray-200 dark:border-dark-border">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span className="hidden sm:inline">لوحة التحكم</span>
          </Link>
          <div className="h-5 w-px bg-gray-200 dark:bg-dark-border" />
          <h1 className="text-base font-bold text-gray-900 dark:text-white">نقطة البيع</h1>
        </div>

        <div className="flex items-center gap-4">
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
              <div className="flex items-center justify-center h-full">
                <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
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
                        'relative flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all duration-150 active:scale-95 min-h-[120px]',
                        'bg-white dark:bg-dark-card hover:shadow-md',
                        qty > 0
                          ? 'border-primary-500 dark:border-primary-400 shadow-sm'
                          : 'border-gray-200 dark:border-dark-border hover:border-primary-300 dark:hover:border-primary-600',
                      )}
                    >
                      {/* Quantity badge */}
                      {qty > 0 && (
                        <span className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-primary-600 text-white text-xs font-bold flex items-center justify-center shadow-sm">
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
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
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
                onClick={submitOrder}
                disabled={cart.length === 0 || submitting || !selectedBranch}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px] active:scale-[0.98]"
              >
                <Send className="w-4 h-4" />
                {submitting ? 'جاري الإرسال...' : 'إرسال الطلب'}
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

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-fade-in-up">
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
