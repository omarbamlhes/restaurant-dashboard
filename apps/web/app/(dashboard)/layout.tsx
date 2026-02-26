'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/dashboard/Sidebar';
import Topbar from '@/components/dashboard/Topbar';
import Skeleton from '@/components/shared/Skeleton';
import { useAuthStore } from '@/stores/authStore';
import { cn } from '@/lib/utils';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, loadUser } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [isLoading, user, router]);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-dark-bg flex">
        {/* Sidebar skeleton */}
        <div className="hidden md:block w-64 h-screen fixed top-0 right-0 bg-white dark:bg-dark-card border-l border-gray-200 dark:border-dark-border">
          <div className="h-16 flex items-center gap-2 px-4 border-b border-gray-200 dark:border-dark-border">
            <Skeleton className="w-9 h-9 rounded-xl" />
            <Skeleton className="h-5 w-16" />
          </div>
          <div className="p-3 space-y-2 mt-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-11 w-full rounded-xl" />
            ))}
          </div>
        </div>
        {/* Content skeleton */}
        <div className="flex-1 mr-0 md:mr-64 pt-16 p-4 md:p-6">
          <Skeleton className="h-16 w-full fixed top-0 left-0 right-0 md:right-64 rounded-none z-30" />
          <div className="space-y-6 mt-4">
            <div className="space-y-2">
              <Skeleton className="h-7 w-40" />
              <Skeleton className="h-4 w-56" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-2xl" />
              ))}
            </div>
            <Skeleton className="h-72 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-dark-bg">
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <Topbar
        sidebarCollapsed={collapsed}
        onMenuToggle={() => setMobileOpen(!mobileOpen)}
      />
      <main
        className={cn(
          'pt-16 min-h-screen transition-all duration-300',
          'mr-0',
          collapsed ? 'md:mr-20' : 'md:mr-64',
        )}
      >
        <div className="p-4 md:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
