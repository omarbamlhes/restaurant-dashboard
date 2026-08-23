'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { X, Search, UserPlus, Loader2, Crown, Phone } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { cn, formatNumber } from '@/lib/utils';

export interface PosCustomer {
  id: string;
  name: string;
  phone: string;
  loyaltyPoints?: number;
}

interface CustomerPickerModalProps {
  onClose: () => void;
  onSelect: (customer: PosCustomer) => void;
}

export default function CustomerPickerModal({ onClose, onSelect }: CustomerPickerModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PosCustomer[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '' });
  const [saving, setSaving] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout>>();

  // Debounced search.
  useEffect(() => {
    clearTimeout(debounce.current);
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounce.current = setTimeout(async () => {
      try {
        const { data } = await api.get(`/customers`, { params: { search: query.trim(), limit: 8 } });
        setResults(data.data || data || []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(debounce.current);
  }, [query]);

  // Prefill the create form when the query looks like a phone number.
  const queryIsPhone = useMemo(() => /^\d{6,}$/.test(query.trim()), [query]);

  async function handleCreate() {
    if (!form.name.trim() || !form.phone.trim()) {
      toast.error('الاسم ورقم الجوال مطلوبان');
      return;
    }
    setSaving(true);
    try {
      const { data } = await api.post('/customers', { name: form.name.trim(), phone: form.phone.trim() });
      toast.success('تمت إضافة العميل');
      onSelect({ id: data.id, name: data.name, phone: data.phone, loyaltyPoints: data.loyaltyPoints ?? 0 });
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'تعذّرت الإضافة');
    } finally {
      setSaving(false);
    }
  }

  function openCreate() {
    setForm({
      name: queryIsPhone ? '' : query.trim(),
      phone: queryIsPhone ? query.trim() : '',
    });
    setCreating(true);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-dark-card w-full max-w-md mx-4 rounded-2xl shadow-2xl animate-scale-in" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-dark-border">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">{creating ? 'عميل جديد' : 'ربط عميل'}</h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-hover transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {creating ? (
          /* Quick create */
          <div className="p-4 space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">الاسم</label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="اسم العميل"
                className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-dark-hover border border-gray-200 dark:border-dark-border text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                autoFocus
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">رقم الجوال</label>
              <input
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="05xxxxxxxx"
                dir="ltr"
                className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-dark-hover border border-gray-200 dark:border-dark-border text-gray-900 dark:text-gray-100 text-center focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setCreating(false)} className="flex-1 py-2.5 rounded-xl bg-gray-100 dark:bg-dark-hover text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-200 transition-colors">
                رجوع
              </button>
              <button onClick={handleCreate} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><UserPlus className="w-4 h-4" /> حفظ وربط</>}
              </button>
            </div>
          </div>
        ) : (
          /* Search + results */
          <div className="p-4">
            <div className="relative mb-3">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ابحث بالاسم أو رقم الجوال"
                className="w-full pr-9 pl-4 py-3 rounded-xl bg-gray-50 dark:bg-dark-hover border border-gray-200 dark:border-dark-border text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                autoFocus
              />
            </div>

            <div className="max-h-64 overflow-y-auto space-y-1.5">
              {loading ? (
                <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 text-gray-400 animate-spin" /></div>
              ) : results.length > 0 ? (
                results.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => onSelect(c)}
                    className="w-full flex items-center justify-between gap-3 p-3 rounded-xl bg-gray-50 dark:bg-dark-hover hover:bg-primary-50 dark:hover:bg-primary-950/30 transition-colors text-right"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{c.name}</p>
                      <p className="text-xs text-gray-400 flex items-center gap-1" dir="ltr"><Phone className="w-3 h-3" /> {c.phone}</p>
                    </div>
                    {typeof c.loyaltyPoints === 'number' && (
                      <span className="flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400 shrink-0">
                        <Crown className="w-3.5 h-3.5" />
                        {formatNumber(c.loyaltyPoints)}
                      </span>
                    )}
                  </button>
                ))
              ) : query.trim() ? (
                <p className="text-center text-sm text-gray-400 py-6">لا يوجد عميل مطابق</p>
              ) : (
                <p className="text-center text-sm text-gray-400 py-6">اكتب للبحث عن عميل</p>
              )}
            </div>

            <button
              onClick={openCreate}
              className={cn(
                'w-full mt-3 py-2.5 rounded-xl border border-dashed text-sm font-medium flex items-center justify-center gap-1.5 transition-colors',
                'border-primary-300 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950/30',
              )}
            >
              <UserPlus className="w-4 h-4" />
              عميل جديد{queryIsPhone ? ` (${query.trim()})` : ''}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
