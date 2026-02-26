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
  Monitor,
  ChefHat,
  X,
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'الرئيسية', icon: LayoutDashboard },
  { href: '/pos', label: 'نقطة البيع', icon: Monitor },
  { href: '/kitchen', label: 'المطبخ', icon: ChefHat },
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
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export default function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden animate-fade-in"
          onClick={onMobileClose}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        'fixed top-0 right-0 h-full z-50 transition-all duration-300 flex flex-col',
        'bg-white dark:bg-dark-card border-l border-gray-200 dark:border-dark-border',
        // Desktop
        'hidden md:flex',
        collapsed ? 'md:w-20' : 'md:w-64',
        // Mobile: show when mobileOpen
        mobileOpen && 'flex w-64 animate-slide-in-right',
      )}>
        {/* Logo */}
        <div className="h-16 flex items-center justify-between border-b border-gray-200 dark:border-dark-border px-4">
          {(!collapsed || mobileOpen) && (
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-primary-600 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold text-gray-900 dark:text-white">رستق</span>
            </div>
          )}
          {collapsed && !mobileOpen && (
            <div className="w-9 h-9 rounded-xl bg-primary-600 flex items-center justify-center mx-auto">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
          )}
          {/* Mobile close button */}
          {mobileOpen && (
            <button
              onClick={onMobileClose}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-hover transition-colors md:hidden"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          )}
        </div>

        {/* Nav items */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            const isCollapsedDesktop = collapsed && !mobileOpen;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn('sidebar-link', isActive && 'active', isCollapsedDesktop && 'justify-center px-3')}
                title={isCollapsedDesktop ? item.label : undefined}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!isCollapsedDesktop && <span className="text-sm">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Collapse toggle - desktop only */}
        <div className="p-3 border-t border-gray-200 dark:border-dark-border hidden md:block">
          <button
            onClick={onToggle}
            className="sidebar-link w-full justify-center"
          >
            <ChevronLeft className={cn('w-5 h-5 transition-transform', collapsed && 'rotate-180')} />
          </button>
        </div>
      </aside>
    </>
  );
}
