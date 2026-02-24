'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  UtensilsCrossed,
  BarChart3,
  Package,
  Building2,
  Users,
  FileText,
  Settings,
  Bell,
  ChevronLeft,
  TrendingUp,
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'الرئيسية', icon: LayoutDashboard },
  { href: '/menu', label: 'القائمة', icon: UtensilsCrossed },
  { href: '/analytics', label: 'التحليلات', icon: BarChart3 },
  { href: '/inventory', label: 'المخزون', icon: Package },
  { href: '/branches', label: 'الفروع', icon: Building2 },
  { href: '/employees', label: 'الموظفين', icon: Users },
  { href: '/reports', label: 'التقارير', icon: FileText },
  { href: '/notifications', label: 'الإشعارات', icon: Bell },
  { href: '/settings', label: 'الإعدادات', icon: Settings },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className={cn(
      'fixed top-0 right-0 h-full z-40 transition-all duration-300 flex flex-col',
      'bg-white dark:bg-dark-card border-l border-gray-200 dark:border-dark-border',
      collapsed ? 'w-20' : 'w-64',
    )}>
      {/* Logo */}
      <div className="h-16 flex items-center justify-center border-b border-gray-200 dark:border-dark-border px-4">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-primary-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900 dark:text-white">رستق</span>
          </div>
        )}
        {collapsed && (
          <div className="w-9 h-9 rounded-xl bg-primary-600 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn('sidebar-link', isActive && 'active', collapsed && 'justify-center px-3')}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span className="text-sm">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="p-3 border-t border-gray-200 dark:border-dark-border">
        <button
          onClick={onToggle}
          className="sidebar-link w-full justify-center"
        >
          <ChevronLeft className={cn('w-5 h-5 transition-transform', collapsed && 'rotate-180')} />
        </button>
      </div>
    </aside>
  );
}
