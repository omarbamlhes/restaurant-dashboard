'use client';

import { useCallback, useEffect, useState } from 'react';
import { LogIn, LogOut, Clock, Users, Loader2, CircleDot } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

interface AttendanceEmployee {
  id: string;
  nameAr: string;
  role: string;
  branch: string | null;
  onShift: boolean;
  currentShiftStart: string | null;
  todayMinutes: number;
}
interface AttendanceLog {
  id: string;
  employeeName: string;
  role: string;
  startTime: string;
  endTime: string | null;
  minutes: number;
  open: boolean;
}
interface AttendanceData {
  onShiftCount: number;
  totalActive: number;
  employees: AttendanceEmployee[];
  log: AttendanceLog[];
}

const ROLE_LABELS: Record<string, string> = {
  MANAGER: 'مدير',
  CHEF: 'طاهٍ',
  CASHIER: 'كاشير',
  WAITER: 'نادل',
  DELIVERY: 'مندوب',
};
const roleLabel = (r: string) => ROLE_LABELS[r] ?? r;

function formatDuration(minutes: number): string {
  if (minutes <= 0) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}د`;
  if (m === 0) return `${h}س`;
  return `${h}س ${m}د`;
}

const timeOf = (iso: string) =>
  new Date(iso).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });

export default function AttendanceBoard() {
  const [data, setData] = useState<AttendanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get<AttendanceData>('/employees/attendance');
      setData(data);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    // Refetch each minute so live on-shift durations stay current.
    const id = setInterval(() => load(), 60000);
    return () => clearInterval(id);
  }, [load]);

  async function toggle(emp: AttendanceEmployee) {
    setBusyId(emp.id);
    try {
      if (emp.onShift) {
        await api.post(`/employees/${emp.id}/check-out`);
        toast.success(`تم تسجيل انصراف ${emp.nameAr}`);
      } else {
        await api.post(`/employees/${emp.id}/check-in`);
        toast.success(`تم تسجيل حضور ${emp.nameAr}`);
      }
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'تعذّرت العملية');
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <div className="glass-card p-10 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
      </div>
    );
  }
  if (!data) {
    return <div className="glass-card p-6 text-center text-sm text-gray-400">تعذّر تحميل الحضور</div>;
  }

  return (
    <div className="space-y-4 animate-fade-in-up">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="glass-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <CircleDot className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">{data.onShiftCount}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">على الدوام الآن</p>
          </div>
        </div>
        <div className="glass-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">{data.totalActive}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">إجمالي النشطين</p>
          </div>
        </div>
      </div>

      {/* Roster */}
      <div className="glass-card overflow-hidden">
        <div className="divide-y divide-gray-100 dark:divide-dark-border">
          {data.employees.map((emp) => (
            <div key={emp.id} className="flex items-center gap-3 p-3.5">
              <div className={cn(
                'w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0',
                emp.onShift ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-gray-100 dark:bg-dark-hover text-gray-500',
              )}>
                {emp.nameAr.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{emp.nameAr}</p>
                  {emp.onShift && (
                    <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      على الدوام
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400">
                  {roleLabel(emp.role)}
                  {emp.branch ? ` · ${emp.branch}` : ''}
                  {emp.onShift && emp.currentShiftStart ? ` · منذ ${timeOf(emp.currentShiftStart)}` : ''}
                </p>
              </div>
              <div className="text-left shrink-0">
                <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 justify-end">
                  <Clock className="w-3 h-3" />
                  {formatDuration(emp.todayMinutes)}
                </div>
                <p className="text-[10px] text-gray-400">اليوم</p>
              </div>
              <button
                onClick={() => toggle(emp)}
                disabled={busyId === emp.id}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors shrink-0 disabled:opacity-40',
                  emp.onShift
                    ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100'
                    : 'bg-emerald-600 text-white hover:bg-emerald-700',
                )}
              >
                {busyId === emp.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : emp.onShift ? (
                  <><LogOut className="w-3.5 h-3.5" /> انصراف</>
                ) : (
                  <><LogIn className="w-3.5 h-3.5" /> حضور</>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Today's log */}
      {data.log.length > 0 && (
        <div className="glass-card p-4">
          <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3">سجل اليوم</h4>
          <div className="space-y-1.5">
            {data.log.map((s) => (
              <div key={s.id} className="flex items-center justify-between text-xs p-2 rounded-lg bg-gray-50 dark:bg-dark-hover">
                <span className="font-medium text-gray-700 dark:text-gray-300 truncate">{s.employeeName}</span>
                <span className="flex items-center gap-2 text-gray-500 dark:text-gray-400 shrink-0" dir="ltr">
                  <span className="tabular-nums">{timeOf(s.startTime)}</span>
                  <span>←</span>
                  <span className="tabular-nums">{s.open ? '···' : timeOf(s.endTime!)}</span>
                  <span className={cn('font-semibold', s.open ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-600 dark:text-gray-300')}>
                    {formatDuration(s.minutes)}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
