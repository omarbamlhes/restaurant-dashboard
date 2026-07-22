'use client';

import { useEffect, useState } from 'react';
import { Store } from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

export interface Branch {
  id: string;
  name: string;
  nameAr: string;
}

interface BranchFilterProps {
  /** Selected branch id, or 'all' for every branch */
  value: string;
  onChange: (branchId: string) => void;
  /** Notifies the parent once the branch list is loaded (e.g. to resolve names for exports) */
  onBranchesChange?: (branches: Branch[]) => void;
  className?: string;
}

/**
 * Reusable branch selector — fetches the restaurant's branches and renders a
 * dropdown with an "all branches" default. Shared by Dashboard, Reports, etc.
 */
export default function BranchFilter({ value, onChange, onBranchesChange, className }: BranchFilterProps) {
  const [branches, setBranches] = useState<Branch[]>([]);

  useEffect(() => {
    api.get('/branches')
      .then((res) => {
        setBranches(res.data);
        onBranchesChange?.(res.data);
      })
      .catch(() => {/* dropdown falls back to "كل الفروع" only */});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={cn('relative', className)}>
      <Store className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none pr-9 pl-8 py-2.5 rounded-xl text-sm font-medium bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border text-gray-900 dark:text-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500"
      >
        <option value="all">كل الفروع</option>
        {branches.map((b) => (
          <option key={b.id} value={b.id}>{b.nameAr}</option>
        ))}
      </select>
    </div>
  );
}
