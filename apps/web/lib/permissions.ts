export type UserRole = 'OWNER' | 'MANAGER' | 'STAFF' | 'ADMIN';

export type Permission =
  | 'dashboard'
  | 'pos'
  | 'kitchen'
  | 'orders'
  | 'menu'
  | 'analytics'
  | 'inventory'
  | 'customers'
  | 'tables'
  | 'branches'
  | 'employees'
  | 'reports'
  | 'notifications'
  | 'settings';

export const ALL_PERMISSIONS: { key: Permission; label: string }[] = [
  { key: 'dashboard', label: 'الرئيسية' },
  { key: 'pos', label: 'نقطة البيع' },
  { key: 'kitchen', label: 'المطبخ' },
  { key: 'orders', label: 'الطلبات' },
  { key: 'menu', label: 'القائمة' },
  { key: 'analytics', label: 'التحليلات' },
  { key: 'inventory', label: 'المخزون' },
  { key: 'customers', label: 'العملاء' },
  { key: 'tables', label: 'الطاولات' },
  { key: 'branches', label: 'الفروع' },
  { key: 'employees', label: 'الموظفين' },
  { key: 'reports', label: 'التقارير' },
  { key: 'notifications', label: 'الإشعارات' },
  { key: 'settings', label: 'الإعدادات' },
];

const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  OWNER: [
    'dashboard', 'pos', 'kitchen', 'orders', 'menu',
    'analytics', 'inventory', 'customers', 'tables', 'branches', 'employees',
    'reports', 'notifications', 'settings',
  ],
  MANAGER: [
    'dashboard', 'pos', 'kitchen', 'orders', 'menu',
    'inventory', 'customers', 'tables', 'employees', 'notifications',
  ],
  STAFF: [
    'pos', 'kitchen', 'notifications',
  ],
  ADMIN: [
    'dashboard', 'pos', 'kitchen', 'orders', 'menu',
    'analytics', 'inventory', 'customers', 'tables', 'branches', 'employees',
    'reports', 'notifications', 'settings',
  ],
};

/**
 * Get effective permissions for a user.
 * If user has custom permissions array, use it.
 * Otherwise fall back to role defaults.
 */
export function getUserPermissions(role: string | undefined, customPermissions?: string[]): Permission[] {
  if (!role) return [];
  if (customPermissions && customPermissions.length > 0) {
    return customPermissions as Permission[];
  }
  return ROLE_PERMISSIONS[role] || [];
}

export function hasPermission(role: string | undefined, permission: Permission, customPermissions?: string[]): boolean {
  const perms = getUserPermissions(role, customPermissions);
  return perms.includes(permission);
}

export const ROUTE_PERMISSION_MAP: Record<string, Permission> = {
  '/dashboard': 'dashboard',
  '/pos': 'pos',
  '/kitchen': 'kitchen',
  '/orders': 'orders',
  '/menu': 'menu',
  '/analytics': 'analytics',
  '/inventory': 'inventory',
  '/customers': 'customers',
  '/tables': 'tables',
  '/branches': 'branches',
  '/employees': 'employees',
  '/reports': 'reports',
  '/notifications': 'notifications',
  '/settings': 'settings',
};

export function getFirstAllowedRoute(role: string | undefined, customPermissions?: string[]): string {
  if (!role) return '/login';
  const perms = getUserPermissions(role, customPermissions);
  for (const [route, permission] of Object.entries(ROUTE_PERMISSION_MAP)) {
    if (perms.includes(permission)) return route;
  }
  return '/login';
}

export function canAccessRoute(role: string | undefined, pathname: string, customPermissions?: string[]): boolean {
  if (!role) return false;
  const routeKey = Object.keys(ROUTE_PERMISSION_MAP).find(
    (key) => pathname === key || (key !== '/dashboard' && pathname.startsWith(key + '/'))
  );
  if (!routeKey) return true;
  return hasPermission(role, ROUTE_PERMISSION_MAP[routeKey], customPermissions);
}
