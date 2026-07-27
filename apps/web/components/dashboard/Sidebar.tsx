'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { hasPermission, type Permission } from '@/lib/permissions';
import RustaqIcon from '@/components/brand/RustaqIcon';
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
  Monitor,
  ChefHat,
  Armchair,
  UserCircle,
  X,
  CalendarClock,
  ReceiptText,
} from 'lucide-react';

const navItems: { href: string; label: string; icon: any; permission: Permission }[] = [
  { href: '/dashboard', label: 'الرئيسية', icon: LayoutDashboard, permission: 'dashboard' },
  { href: '/pos', label: 'نقطة البيع', icon: Monitor, permission: 'pos' },
  { href: '/kitchen', label: 'المطبخ', icon: ChefHat, permission: 'kitchen' },
  { href: '/menu', label: 'القائمة', icon: UtensilsCrossed, permission: 'menu' },
  { href: '/analytics', label: 'التحليلات', icon: BarChart3, permission: 'analytics' },
  { href: '/inventory', label: 'المخزون', icon: Package, permission: 'inventory' },
  { href: '/customers', label: 'العملاء', icon: UserCircle, permission: 'customers' },
  { href: '/tables', label: 'الطاولات', icon: Armchair, permission: 'tables' },
  { href: '/reservations', label: 'الحجوزات', icon: CalendarClock, permission: 'tables' },
  { href: '/branches', label: 'الفروع', icon: Building2, permission: 'branches' },
  { href: '/employees', label: 'الموظفين', icon: Users, permission: 'employees' },
  { href: '/reports', label: 'التقارير', icon: FileText, permission: 'reports' },
  { href: '/shift-report', label: 'تقرير نهاية اليوم', icon: ReceiptText, permission: 'reports' },
  { href: '/notifications', label: 'الإشعارات', icon: Bell, permission: 'notifications' },
  { href: '/settings', label: 'الإعدادات', icon: Settings, permission: 'settings' },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export default function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const userRole = user?.role;
  const userPermissions = user?.permissions;

  const filteredNavItems = navItems.filter((item) => hasPermission(userRole, item.permission, userPermissions));

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
        'fixed top-0 right-0 h-full z-50 transition-all duration-300 flex flex-col print:hidden',
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
              <RustaqIcon size={36} />
              <span className="text-lg font-bold text-gray-900 dark:text-white" style={{
                background: 'linear-gradient(135deg, #3cb878 0%, #2d8a5e 50%, #e8c352 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>رستق</span>
            </div>
          )}
          {collapsed && !mobileOpen && (
            <div className="mx-auto">
              <RustaqIcon size={36} />
            </div>
          )}
          {/* Mobile close button */}
          {mobileOpen && (
            <button
              onClick={onMobileClose}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-hover transition-colors md:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              aria-label="إغلاق القائمة"
            >
              <X className="w-5 h-5 text-gray-500" aria-hidden />
            </button>
          )}
        </div>

        {/* Nav items */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {filteredNavItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            const isCollapsedDesktop = collapsed && !mobileOpen;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn('sidebar-link', isActive && 'active', isCollapsedDesktop && 'justify-center px-3')}
                title={isCollapsedDesktop ? item.label : undefined}
                aria-label={isCollapsedDesktop ? item.label : undefined}
                aria-current={isActive ? 'page' : undefined}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" aria-hidden />
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
            aria-label={collapsed ? 'توسيع القائمة الجانبية' : 'طي القائمة الجانبية'}
            aria-expanded={!collapsed}
          >
            <ChevronLeft className={cn('w-5 h-5 transition-transform', collapsed && 'rotate-180')} aria-hidden />
          </button>
        </div>
      </aside>
    </>
  );
}
