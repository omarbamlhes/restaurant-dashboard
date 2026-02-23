'use client';

import { Bell, Search, Sun, Moon, LogOut, User } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { useState } from 'react';

interface TopbarProps {
  sidebarCollapsed: boolean;
}

export default function Topbar({ sidebarCollapsed }: TopbarProps) {
  const { user, restaurant, logout } = useAuthStore();
  const { unreadCount } = useNotificationStore();
  const [isDark, setIsDark] = useState(true);

  const toggleTheme = () => {
    const html = document.documentElement;
    html.classList.toggle('dark');
    setIsDark(!isDark);
  };

  return (
    <header
      className="fixed top-0 left-0 z-30 h-16 flex items-center justify-between px-6 bg-white/80 dark:bg-dark-bg/80 backdrop-blur-xl border-b border-gray-200 dark:border-dark-border transition-all duration-300"
      style={{ right: sidebarCollapsed ? '5rem' : '16rem' }}
    >
      {/* Search */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="بحث..."
          className="w-full pr-10 pl-4 py-2 bg-gray-100 dark:bg-dark-card border-0 rounded-xl text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-primary-500/20 outline-none"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        {/* Theme toggle */}
        <button onClick={toggleTheme} className="relative p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-dark-card transition-colors">
          {isDark ? <Sun className="w-5 h-5 text-gray-500 dark:text-gray-400" /> : <Moon className="w-5 h-5 text-gray-500" />}
        </button>

        {/* Notifications */}
        <button className="relative p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-dark-card transition-colors">
          <Bell className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -left-0.5 w-5 h-5 bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* Divider */}
        <div className="w-px h-8 bg-gray-200 dark:bg-dark-border" />

        {/* Profile */}
        <div className="flex items-center gap-3">
          <div className="text-left">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{user?.name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{restaurant?.nameAr}</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center">
            <User className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          </div>
        </div>

        {/* Logout */}
        <button onClick={logout} className="p-2 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors" title="تسجيل خروج">
          <LogOut className="w-5 h-5 text-gray-500 dark:text-gray-400 hover:text-rose-600 dark:hover:text-rose-400" />
        </button>
      </div>
    </header>
  );
}
