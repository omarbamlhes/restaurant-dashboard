'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  Plus, Minus, ShoppingCart, Utensils, CheckCircle2, X, Clock, User, Phone,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import SARSymbol from '@/components/shared/SARSymbol';

interface MenuItem {
  id: string;
  name: string;
  nameAr: string;
  description: string | null;
  descriptionAr: string | null;
  image: string | null;
  price: string;
  preparationTime: number | null;
}

interface Category {
  id: string;
  name: string;
  nameAr: string;
  menuItems: MenuItem[];
}

interface MenuData {
  restaurant: { id: string; name: string; nameAr: string; logo: string | null; currency: string };
  branch: { id: string; name: string; nameAr: string };
  table: { id: string; number: number; nameAr: string | null } | null;
  categories: Category[];
}

interface CartLine {
  item: MenuItem;
  quantity: number;
  notes?: string;
}

interface OrderResult {
  id: string;
  orderNumber: string;
  total: string;
  status: string;
}

const API_BASE = '/api';

// Render a price with the official Saudi Riyal glyph (matches the rest of the
// app), falling back to the currency code for non-SAR restaurants.
function Price({ value, currency = 'SAR' }: { value: string | number; currency?: string }) {
  const n = typeof value === 'string' ? Number(value) : value;
  return (
    <>
      {n.toFixed(2)} {currency === 'SAR' ? <SARSymbol /> : currency}
    </>
  );
}

export default function QrMenuPage() {
  const params = useParams();
  const branchId = params.branchId as string;
  const tableId = params.tableId as string;

  const [data, setData] = useState<MenuData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [cart, setCart] = useState<Record<string, CartLine>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [result, setResult] = useState<OrderResult | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API_BASE}/public/menu/${branchId}?tableId=${tableId}`);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.message || 'تعذّر تحميل المنيو');
        }
        const json: MenuData = await res.json();
        setData(json);
        setActiveCategory(json.categories[0]?.id || null);
      } catch (e: any) {
        setError(e.message || 'خطأ');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [branchId, tableId]);

  const totalItems = useMemo(
    () => Object.values(cart).reduce((s, l) => s + l.quantity, 0),
    [cart],
  );
  const subtotal = useMemo(
    () => Object.values(cart).reduce((s, l) => s + Number(l.item.price) * l.quantity, 0),
    [cart],
  );
  const tax = Math.round(subtotal * 0.15 * 100) / 100;
  const total = Math.round((subtotal + tax) * 100) / 100;

  function addToCart(item: MenuItem) {
    setCart((prev) => {
      const line = prev[item.id];
      return {
        ...prev,
        [item.id]: { item, quantity: (line?.quantity || 0) + 1, notes: line?.notes },
      };
    });
  }

  function updateQty(itemId: string, delta: number) {
    setCart((prev) => {
      const line = prev[itemId];
      if (!line) return prev;
      const newQty = line.quantity + delta;
      if (newQty <= 0) {
        const { [itemId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [itemId]: { ...line, quantity: newQty } };
    });
  }

  function updateNotes(itemId: string, notes: string) {
    setCart((prev) => {
      const line = prev[itemId];
      if (!line) return prev;
      return { ...prev, [itemId]: { ...line, notes } };
    });
  }

  async function submitOrder() {
    if (totalItems === 0) return;
    setSubmitting(true);
    try {
      const items = Object.values(cart).map((l) => ({
        menuItemId: l.item.id,
        quantity: l.quantity,
        notes: l.notes || undefined,
      }));
      const res = await fetch(`${API_BASE}/public/orders/${branchId}/${tableId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          customerName: customerName || undefined,
          customerPhone: customerPhone || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'فشل إرسال الطلب');
      setResult(json);
      setCart({});
      setCartOpen(false);
    } catch (e: any) {
      toast.error(e.message || 'خطأ');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-dark-bg flex items-center justify-center">
        <div className="animate-pulse text-gray-500">جاري تحميل المنيو...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-dark-bg flex items-center justify-center p-6">
        <div className="glass-card p-8 max-w-sm text-center">
          <X className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold mb-2">{error || 'خطأ'}</h2>
          <p className="text-sm text-gray-500">يرجى مسح رمز QR مرة أخرى أو التواصل مع الخدمة.</p>
        </div>
      </div>
    );
  }

  if (result) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-dark-bg flex items-center justify-center p-6">
        <div className="glass-card p-8 max-w-sm text-center animate-[fadeInUp_0.5s]">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">تم إرسال طلبك</h2>
          <p className="text-sm text-gray-500 mb-4">رقم الطلب</p>
          <div className="text-3xl font-mono font-bold text-primary-600 mb-4">{result.orderNumber}</div>
          <div className="text-xl font-bold mb-6">{<Price value={result.total} currency={data.restaurant.currency} />}</div>
          <p className="text-sm text-gray-500 mb-6">
            يُحضَّر طلبك الآن. ستجده عند طاولتك قريباً.
          </p>
          <button
            onClick={() => setResult(null)}
            className="btn-primary w-full"
          >
            طلب إضافي
          </button>
        </div>
      </div>
    );
  }

  const currency = data.restaurant.currency;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-dark-bg pb-28">
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-dark-card/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-dark-border/50">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            {data.restaurant.logo ? (
              <img src={data.restaurant.logo} alt="" className="w-12 h-12 rounded-xl object-cover" />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-primary-100 dark:bg-primary-950 flex items-center justify-center">
                <Utensils className="w-6 h-6 text-primary-600" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h1 className="font-bold text-lg truncate">{data.restaurant.nameAr}</h1>
              <p className="text-xs text-gray-500 truncate">
                {data.branch.nameAr}
                {data.table && ` • طاولة ${data.table.nameAr || data.table.number}`}
              </p>
            </div>
          </div>
        </div>
        {data.categories.length > 0 && (
          <div className="max-w-2xl mx-auto px-4 pb-3 overflow-x-auto">
            <div className="flex gap-2">
              {data.categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setActiveCategory(cat.id);
                    document.getElementById(`cat-${cat.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className={cn(
                    'px-4 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors',
                    activeCategory === cat.id
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 dark:bg-dark-hover text-gray-700 dark:text-gray-300',
                  )}
                >
                  {cat.nameAr}
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      <main className="max-w-2xl mx-auto px-4 py-4 space-y-8">
        {data.categories.length === 0 && (
          <div className="text-center py-20 text-gray-500">لا توجد أصناف متاحة حالياً.</div>
        )}
        {data.categories.map((cat) => (
          <section key={cat.id} id={`cat-${cat.id}`}>
            <h2 className="font-bold text-xl mb-3">{cat.nameAr}</h2>
            <div className="space-y-3">
              {cat.menuItems.map((item) => {
                const line = cart[item.id];
                return (
                  <div
                    key={item.id}
                    className="glass-card p-4 flex gap-3 items-start"
                  >
                    {item.image && (
                      <img
                        src={item.image}
                        alt=""
                        className="w-20 h-20 rounded-xl object-cover flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold">{item.nameAr}</div>
                      {item.descriptionAr && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.descriptionAr}</p>
                      )}
                      <div className="flex items-center justify-between mt-2">
                        <div className="font-bold text-primary-600">{<Price value={item.price} currency={currency} />}</div>
                        {item.preparationTime && (
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Clock className="w-3 h-3" />
                            {item.preparationTime} د
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      {line ? (
                        <div className="flex items-center gap-2 bg-primary-50 dark:bg-primary-950/50 rounded-xl p-1">
                          <button
                            onClick={() => updateQty(item.id, -1)}
                            className="w-8 h-8 rounded-lg bg-white dark:bg-dark-card flex items-center justify-center"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-6 text-center font-bold">{line.quantity}</span>
                          <button
                            onClick={() => updateQty(item.id, 1)}
                            className="w-8 h-8 rounded-lg bg-primary-600 text-white flex items-center justify-center"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => addToCart(item)}
                          className="w-10 h-10 rounded-full bg-primary-600 text-white flex items-center justify-center shadow-md"
                          aria-label="إضافة"
                        >
                          <Plus className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </main>

      {totalItems > 0 && !cartOpen && (
        <button
          onClick={() => setCartOpen(true)}
          className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-primary-600 text-white rounded-full px-6 py-3 shadow-2xl flex items-center gap-3 font-bold z-40"
        >
          <ShoppingCart className="w-5 h-5" />
          <span>عرض السلة ({totalItems})</span>
          <span className="text-sm opacity-90">{<Price value={total} currency={currency} />}</span>
        </button>
      )}

      {cartOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-dark-card w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl max-h-[90vh] flex flex-col animate-[slideInUp_0.25s]">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-dark-border">
              <h3 className="font-bold text-lg">السلة</h3>
              <button onClick={() => setCartOpen(false)} className="p-2">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {Object.values(cart).map((line) => (
                <div key={line.item.id} className="border-b border-gray-100 dark:border-dark-border pb-3">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1">
                      <div className="font-semibold">{line.item.nameAr}</div>
                      <div className="text-xs text-gray-500">
                        {<Price value={line.item.price} currency={currency} />} × {line.quantity}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 bg-primary-50 dark:bg-primary-950/50 rounded-xl p-1">
                      <button
                        onClick={() => updateQty(line.item.id, -1)}
                        className="w-7 h-7 rounded-lg bg-white dark:bg-dark-card flex items-center justify-center"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-5 text-center text-sm font-bold">{line.quantity}</span>
                      <button
                        onClick={() => updateQty(line.item.id, 1)}
                        className="w-7 h-7 rounded-lg bg-primary-600 text-white flex items-center justify-center"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={line.notes || ''}
                    onChange={(e) => updateNotes(line.item.id, e.target.value)}
                    placeholder="ملاحظات (اختياري)"
                    className="input-field text-sm py-2"
                  />
                </div>
              ))}
              <div className="pt-2 space-y-3">
                <div className="relative">
                  <User className="absolute top-1/2 -translate-y-1/2 right-3 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="الاسم (اختياري)"
                    className="input-field pr-10"
                  />
                </div>
                <div className="relative">
                  <Phone className="absolute top-1/2 -translate-y-1/2 right-3 w-4 h-4 text-gray-400" />
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="رقم الجوال (اختياري)"
                    className="input-field pr-10"
                  />
                </div>
              </div>
            </div>
            <div className="border-t border-gray-200 dark:border-dark-border p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">المجموع الفرعي</span>
                <span>{<Price value={subtotal} currency={currency} />}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">ضريبة ١٥٪</span>
                <span>{<Price value={tax} currency={currency} />}</span>
              </div>
              <div className="flex justify-between text-lg font-bold">
                <span>الإجمالي</span>
                <span className="text-primary-600">{<Price value={total} currency={currency} />}</span>
              </div>
              <button
                disabled={submitting || totalItems === 0}
                onClick={submitOrder}
                className="btn-primary w-full disabled:opacity-60"
              >
                {submitting ? 'جاري الإرسال...' : 'تأكيد الطلب'}
              </button>
              <p className="text-xs text-gray-400 text-center">
                الدفع عند الطاولة للكاشير.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
