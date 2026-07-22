'use client';

import { Bell, Search, Sun, Moon, LogOut, User, Menu as MenuIcon, X, UtensilsCrossed, Users, Package, ShoppingBag, UserCircle, Armchair, Building2 } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { useThemeStore } from '@/stores/themeStore';
import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { cn, formatSAR } from '@/lib/utils';
import SARSymbol from '@/components/shared/SARSymbol';

interface SearchResults {
  menuItems: any[];
  orders: any[];
  customers: any[];
  employees: any[];
}

interface TopbarProps {
  sidebarCollapsed: boolean;
  onMenuToggle?: () => void;
}

export default function Topbar({ sidebarCollapsed, onMenuToggle }: TopbarProps) {
  const { user, restaurant, logout } = useAuthStore();
  const { unreadCount, fetchNotifications } = useNotificationStore();
  const { theme, toggle: toggleTheme } = useThemeStore();
  const router = useRouter();

  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [searching, setSearching] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    useThemeStore.getState().setTheme(isDark ? 'dark' : 'light');
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Keyboard shortcut: Ctrl+K or Cmd+K
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
        setTimeout(() => inputRef.current?.focus(), 100);
      }
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setQuery('');
        setResults(null);
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  // Click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    }
    if (searchOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [searchOpen]);

  // Cache all data on first search
  const cacheRef = useRef<{ menu: any[]; orders: any[]; customers: any[]; employees: any[] } | null>(null);

  const loadCache = useCallback(async () => {
    if (cacheRef.current) return cacheRef.current;
    const [menuRes, ordersRes, customersRes, employeesRes] = await Promise.allSettled([
      api.get('/menu'),
      api.get('/orders?limit=100'),
      api.get('/customers'),
      api.get('/employees'),
    ]);
    const getArray = (res: PromiseSettledResult<any>) => {
      if (res.status !== 'fulfilled') return [];
      const d = res.value.data;
      return Array.isArray(d) ? d : (Array.isArray(d?.data) ? d.data : []);
    };
    cacheRef.current = {
      menu: getArray(menuRes),
      orders: getArray(ordersRes),
      customers: getArray(customersRes),
      employees: getArray(employeesRes),
    };
    return cacheRef.current;
  }, []);

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) { setResults(null); return; }
    setSearching(true);
    try {
      const data = await loadCache();
      const ql = q.toLowerCase();

      const menuItems = data.menu
        .filter((i: any) => i.nameAr?.includes(q) || i.name?.toLowerCase().includes(ql))
        .slice(0, 4);
      const orders = data.orders
        .filter((o: any) => o.orderNumber?.toLowerCase().includes(ql))
        .slice(0, 4);
      const customers = data.customers
        .filter((c: any) => c.name?.includes(q) || c.phone?.includes(q))
        .slice(0, 4);
      const employees = data.employees
        .filter((e: any) => e.nameAr?.includes(q) || e.name?.toLowerCase().includes(ql) || e.role?.includes(q))
        .slice(0, 4);

      setResults({ menuItems, orders, customers, employees });
    } catch {
      setResults(null);
    } finally {
      setSearching(false);
    }
  }, [loadCache]);

  function handleSearchInput(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(value), 300);
  }

  function navigate(path: string) {
    setSearchOpen(false);
    setQuery('');
    setResults(null);
    router.push(path);
  }

  const totalResults = results
    ? results.menuItems.length + results.orders.length + results.customers.length + results.employees.length
    : 0;

  return (
    <header
      className={`fixed top-0 left-0 z-30 h-16 flex items-center justify-between px-4 md:px-6 bg-white/80 dark:bg-dark-bg/80 backdrop-blur-xl border-b border-gray-200 dark:border-dark-border transition-all duration-300 right-0 ${sidebarCollapsed ? 'md:right-20' : 'md:right-64'}`}
    >
      {/* Mobile menu button */}
      {onMenuToggle && (
        <button
          onClick={onMenuToggle}
          className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-dark-card transition-colors md:hidden ml-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          aria-label="فتح القائمة"
        >
          <MenuIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" aria-hidden />
        </button>
      )}

      {/* Search */}
      <div className="relative flex-1 max-w-md" ref={searchRef}>
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => handleSearchInput(e.target.value)}
          onFocus={() => setSearchOpen(true)}
          placeholder="بحث... (⌘K)"
          className="w-full pr-10 pl-4 py-2 bg-gray-100 dark:bg-dark-card border-0 rounded-xl text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-primary-500/20 outline-none"
        />

        {/* Search Results Dropdown */}
        {searchOpen && query.length >= 2 && (
          <div className="absolute top-full mt-2 right-0 left-0 bg-white dark:bg-dark-card rounded-2xl shadow-2xl border border-gray-200 dark:border-dark-border overflow-hidden z-50 animate-fade-in-up">
            {searching ? (
              <div className="p-6 text-center text-sm text-gray-500 dark:text-gray-400" role="status" aria-live="polite">جاري البحث...</div>
            ) : results && totalResults > 0 ? (
              <div className="max-h-80 overflow-y-auto">
                {/* Menu Items */}
                {results.menuItems.length > 0 && (
                  <div>
                    <div className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-dark-hover flex items-center gap-2">
                      <UtensilsCrossed className="w-3.5 h-3.5" /> القائمة
                    </div>
                    {results.menuItems.map((item: any) => (
                      <button key={item.id} onClick={() => navigate('/menu')} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-dark-hover transition-colors text-right">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                          <UtensilsCrossed className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.nameAr}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">{formatSAR(item.price)} <SARSymbol /></p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Orders */}
                {results.orders.length > 0 && (
                  <div>
                    <div className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-dark-hover flex items-center gap-2">
                      <ShoppingBag className="w-3.5 h-3.5" /> الطلبات
                    </div>
                    {results.orders.map((order: any) => (
                      <button key={order.id} onClick={() => navigate('/orders')} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-dark-hover transition-colors text-right">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                          <ShoppingBag className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">#{order.orderNumber}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">{formatSAR(order.total)} <SARSymbol /></p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Customers */}
                {results.customers.length > 0 && (
                  <div>
                    <div className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-dark-hover flex items-center gap-2">
                      <UserCircle className="w-3.5 h-3.5" /> العملاء
                    </div>
                    {results.customers.map((c: any) => (
                      <button key={c.id} onClick={() => navigate('/customers')} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-dark-hover transition-colors text-right">
                        <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                          <UserCircle className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{c.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">{c.phone}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Employees */}
                {results.employees.length > 0 && (
                  <div>
                    <div className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-dark-hover flex items-center gap-2">
                      <Users className="w-3.5 h-3.5" /> الموظفين
                    </div>
                    {results.employees.map((emp: any) => (
                      <button key={emp.id} onClick={() => navigate('/employees')} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-dark-hover transition-colors text-right">
                        <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                          <Users className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{emp.nameAr}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">{emp.role}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : query.length >= 2 ? (
              <div className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">لا توجد نتائج لـ &quot;{query}&quot;</div>
            ) : null}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="relative p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-dark-card transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-dark-bg"
          aria-label={theme === 'dark' ? 'تفعيل الوضع الفاتح' : 'تفعيل الوضع الداكن'}
          title={theme === 'dark' ? 'الوضع الفاتح' : 'الوضع الداكن'}
        >
          {theme === 'dark' ? <Sun className="w-5 h-5 text-gray-500 dark:text-gray-400" aria-hidden /> : <Moon className="w-5 h-5 text-gray-500" aria-hidden />}
        </button>

        {/* Notifications */}
        <Link
          href="/notifications"
          className="relative p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-dark-card transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-dark-bg"
          aria-label={`الإشعارات${unreadCount > 0 ? ` (${unreadCount} غير مقروءة)` : ''}`}
        >
          <Bell className="w-5 h-5 text-gray-500 dark:text-gray-400" aria-hidden />
          {unreadCount > 0 && (
            <span
              className="absolute -top-0.5 -left-0.5 w-5 h-5 bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full animate-pulse tabular-nums"
              aria-hidden
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Link>

        {/* Divider */}
        <div className="w-px h-8 bg-gray-200 dark:bg-dark-border" />

        {/* Profile */}
        <div className="flex items-center gap-3">
          <div className="text-left">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{user?.name}</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">{restaurant?.nameAr}</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center">
            <User className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={logout}
          className="p-2 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-dark-bg"
          aria-label="تسجيل خروج"
          title="تسجيل خروج"
        >
          <LogOut className="w-5 h-5 text-gray-500 dark:text-gray-400 hover:text-rose-600 dark:hover:text-rose-400" aria-hidden />
        </button>
      </div>
    </header>
  );
}
