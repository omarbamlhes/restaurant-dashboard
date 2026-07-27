'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  CalendarClock, Users, Clock, MapPin, Phone, User,
  Armchair, CheckCircle2, ChevronLeft, ChevronRight, Utensils, Download,
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { cn } from '@/lib/utils';

interface Restaurant {
  id: string;
  name: string;
  nameAr: string;
  logo: string | null;
  phone: string | null;
}

interface Branch {
  id: string;
  name: string;
  nameAr: string;
  address: string | null;
  city: string | null;
}

interface Table {
  id: string;
  number: number;
  nameAr: string | null;
  capacity: number;
}

interface BookingResult {
  id: string;
  date: string;
  time: string;
  endTime: string;
  table: { number: number; nameAr: string | null };
  branch: { nameAr: string };
}

type Step = 'branch' | 'datetime' | 'table' | 'info' | 'done';

const API_BASE = '/api';

function getToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function formatTime12(time: string) {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'م' : 'ص';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

const TIME_SLOTS = [
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
  '17:00', '17:30', '18:00', '18:30', '19:00', '19:30',
  '20:00', '20:30', '21:00', '21:30', '22:00', '22:30',
];

export default function PublicBookingPage() {
  const params = useParams();
  const restaurantId = params.restaurantId as string;

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingTables, setLoadingTables] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [step, setStep] = useState<Step>('branch');
  const [branchId, setBranchId] = useState('');
  const [date, setDate] = useState(getToday());
  const [time, setTime] = useState('');
  const [partySize, setPartySize] = useState(2);
  const [tableId, setTableId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [result, setResult] = useState<BookingResult | null>(null);
  const [downloading, setDownloading] = useState(false);
  const ticketRef = useRef<HTMLDivElement>(null);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  async function downloadTicket() {
    if (!ticketRef.current || !result) return;
    setDownloading(true);
    try {
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(ticketRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
      });

      // html2canvas leaves the live QR <canvas> blank, so composite it manually
      // at its measured position over the rendered ticket.
      const qr = qrCanvasRef.current;
      if (qr) {
        const tRect = ticketRef.current.getBoundingClientRect();
        const qRect = qr.getBoundingClientRect();
        const scale = canvas.width / tRect.width;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(
          qr,
          (qRect.left - tRect.left) * scale,
          (qRect.top - tRect.top) * scale,
          qRect.width * scale,
          qRect.height * scale,
        );
      }

      const link = document.createElement('a');
      link.download = `reservation-${result.id.slice(-6).toUpperCase()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch {
      // ignore — button stays available to retry
    } finally {
      setDownloading(false);
    }
  }

  // Load restaurant info
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API_BASE}/reservations/public/${restaurantId}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        setRestaurant(data.restaurant);
        setBranches(data.branches);
        if (data.branches.length === 1) {
          setBranchId(data.branches[0].id);
          setStep('datetime');
        }
      } catch {
        setError('المطعم غير موجود');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [restaurantId]);

  // Load tables when date/time selected
  async function fetchTables(showLoader = true) {
    if (!branchId || !date || !time) return;
    if (showLoader) { setLoadingTables(true); setTableId(''); }
    try {
      const r = await fetch(`${API_BASE}/reservations/public/${restaurantId}/tables?branchId=${branchId}&date=${date}&time=${time}&partySize=${partySize}`);
      const data = await r.json();
      setTables(data);
      // If selected table was taken, deselect it
      if (tableId && !data.find((t: Table) => t.id === tableId)) {
        setTableId('');
        if (step === 'info') setStep('table');
      }
    } catch { setTables([]); }
    finally { if (showLoader) setLoadingTables(false); }
  }

  useEffect(() => {
    fetchTables();
  }, [branchId, date, time, partySize, restaurantId]);

  // Auto-refresh tables every 5 seconds when on table/info step
  useEffect(() => {
    if ((step !== 'table' && step !== 'info') || !branchId || !date || !time) return;
    const interval = setInterval(() => fetchTables(false), 5000);
    return () => clearInterval(interval);
  }, [step, branchId, date, time, partySize, restaurantId]);

  async function handleSubmit() {
    setSubmitting(true);
    setError('');
    try {
      // Re-check table is still available before submitting
      const checkRes = await fetch(`${API_BASE}/reservations/public/${restaurantId}/tables?branchId=${branchId}&date=${date}&time=${time}&partySize=${partySize}`);
      const available = await checkRes.json();
      if (!available.find((t: Table) => t.id === tableId)) {
        setTables(available);
        setTableId('');
        setStep('table');
        setError('الطاولة لم تعد متاحة، اختر طاولة أخرى');
        setSubmitting(false);
        return;
      }

      const res = await fetch(`${API_BASE}/reservations/public/${restaurantId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branchId, tableId, customerName, customerPhone, partySize, date, time, notes: notes || undefined }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'فشل الحجز');
      }
      const data = await res.json();
      setResult(data);
      setStep('done');
    } catch (err: any) {
      // If table was taken (conflict), refresh tables and go back
      if (err.message.includes('محجوزة') || err.message.includes('مشغولة')) {
        await fetchTables(false);
        setTableId('');
        setStep('table');
      }
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  function selectBranch(id: string) {
    setBranchId(id);
    setStep('datetime');
  }

  function selectTime(t: string) {
    setTime(t);
    setStep('table');
  }

  function selectTable(id: string) {
    setTableId(id);
    setStep('info');
  }

  const selectedBranch = branches.find(b => b.id === branchId);
  const selectedTable = tables.find(t => t.id === tableId);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-gray-950 dark:to-gray-900 flex items-center justify-center">
        <div className="animate-pulse text-gray-400">جاري التحميل...</div>
      </div>
    );
  }

  if (error && !restaurant) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <Utensils className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-gray-950 dark:to-gray-900" dir="rtl">
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
              <Utensils className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h1 className="font-bold text-gray-900 dark:text-white">{restaurant?.nameAr}</h1>
              <p className="text-xs text-gray-400">حجز طاولة</p>
            </div>
          </div>
          {restaurant?.phone && (
            <a href={`tel:${restaurant.phone}`} className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800">
              <Phone className="w-4 h-4 text-gray-500" />
            </a>
          )}
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">
        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {(['branch', 'datetime', 'table', 'info'] as Step[]).map((s, i) => {
            const labels = ['الفرع', 'الموعد', 'الطاولة', 'البيانات'];
            const icons = [MapPin, CalendarClock, Armchair, User];
            const Icon = icons[i];
            const isActive = s === step;
            const isDone = ['branch', 'datetime', 'table', 'info'].indexOf(step) > i || step === 'done';
            return (
              <div key={s} className="flex items-center gap-2">
                {i > 0 && <div className={cn('w-8 h-0.5 rounded', isDone ? 'bg-primary-500' : 'bg-gray-200 dark:bg-gray-700')} />}
                <div className="flex flex-col items-center gap-1">
                  <div className={cn(
                    'w-9 h-9 rounded-xl flex items-center justify-center transition-all',
                    isActive ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/30' :
                    isDone ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400' :
                    'bg-gray-100 dark:bg-gray-800 text-gray-400'
                  )}>
                    {isDone && !isActive ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                  </div>
                  <span className={cn('text-[10px]', isActive ? 'text-primary-600 font-medium' : 'text-gray-400')}>{labels[i]}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Step: Branch */}
        {step === 'branch' && (
          <div className="space-y-3 animate-fade-in-up">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white text-center mb-4">اختر الفرع</h2>
            {branches.map(b => (
              <button
                key={b.id}
                onClick={() => selectBranch(b.id)}
                className="w-full p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 hover:border-primary-300 dark:hover:border-primary-700 hover:shadow-md transition-all text-right"
              >
                <div className="flex items-center gap-3">
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white">{b.nameAr}</p>
                    {b.address && (
                      <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {b.address}{b.city && ` - ${b.city}`}
                      </p>
                    )}
                  </div>
                  <div className="w-11 h-11 rounded-xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Step: DateTime */}
        {step === 'datetime' && (
          <div className="space-y-6 animate-fade-in-up">
            {/* Party Size */}
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white text-center mb-4">عدد الأشخاص</h2>
              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5, 6, 8, 10].map(n => (
                  <button
                    key={n}
                    onClick={() => setPartySize(n)}
                    className={cn(
                      'w-11 h-11 rounded-xl text-sm font-bold transition-all',
                      partySize === n
                        ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/30 scale-110'
                        : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300'
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Date */}
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 text-center">التاريخ</h3>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                min={getToday()}
                className="w-full p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-center text-gray-900 dark:text-white"
                dir="ltr"
              />
              <p className="text-center text-xs text-gray-400 mt-1">{formatDate(date)}</p>
            </div>

            {/* Time */}
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 text-center">الوقت</h3>
              <div className="grid grid-cols-4 gap-2">
                {TIME_SLOTS.map(t => (
                  <button
                    key={t}
                    onClick={() => selectTime(t)}
                    className={cn(
                      'py-2.5 rounded-xl text-sm font-medium transition-all',
                      time === t
                        ? 'bg-primary-600 text-white shadow-md'
                        : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300 hover:border-primary-300'
                    )}
                  >
                    {formatTime12(t)}
                  </button>
                ))}
              </div>
            </div>

            {branches.length > 1 && (
              <button onClick={() => setStep('branch')} className="text-sm text-primary-600 hover:underline">
                ← تغيير الفرع
              </button>
            )}
          </div>
        )}

        {/* Step: Table */}
        {step === 'table' && (
          <div className="space-y-4 animate-fade-in-up">
            <div className="text-center mb-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">اختر الطاولة</h2>
              <p className="text-xs text-gray-400 mt-1">
                {formatDate(date)} • {formatTime12(time)} • {partySize} أشخاص
              </p>
            </div>

            {loadingTables ? (
              <div className="text-center py-10 text-gray-400">جاري البحث عن الطاولات المتاحة...</div>
            ) : tables.length === 0 ? (
              <div className="text-center py-10">
                <Armchair className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">لا توجد طاولات متاحة لهذا الوقت</p>
                <button onClick={() => setStep('datetime')} className="mt-3 text-sm text-primary-600 hover:underline">
                  اختر وقت آخر
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {tables.map(t => (
                  <button
                    key={t.id}
                    onClick={() => selectTable(t.id)}
                    className={cn(
                      'p-4 rounded-2xl text-center transition-all border-2',
                      tableId === t.id
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 shadow-md'
                        : 'border-transparent bg-white dark:bg-gray-900 hover:border-primary-200 hover:shadow-sm'
                    )}
                  >
                    <Armchair className={cn('w-7 h-7 mx-auto mb-2', tableId === t.id ? 'text-primary-600' : 'text-emerald-500')} />
                    <p className="text-base font-bold text-gray-900 dark:text-white">{t.number}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{t.capacity} أشخاص</p>
                  </button>
                ))}
              </div>
            )}

            <button onClick={() => { setTime(''); setStep('datetime'); }} className="text-sm text-primary-600 hover:underline">
              ← تغيير الموعد
            </button>
          </div>
        )}

        {/* Step: Customer Info */}
        {step === 'info' && (
          <div className="space-y-5 animate-fade-in-up">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white text-center">بيانات الحجز</h2>

            {/* Summary */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <CalendarClock className="w-5 h-5 text-primary-500 mx-auto mb-1" />
                  <p className="text-xs font-bold text-gray-900 dark:text-white">{formatDate(date).split('،')[0]}</p>
                  <p className="text-[10px] text-gray-400">{formatTime12(time)}</p>
                </div>
                <div>
                  <Armchair className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                  <p className="text-xs font-bold text-gray-900 dark:text-white">طاولة {selectedTable?.number}</p>
                  <p className="text-[10px] text-gray-400">{selectedTable?.capacity} أشخاص</p>
                </div>
                <div>
                  <Users className="w-5 h-5 text-purple-500 mx-auto mb-1" />
                  <p className="text-xs font-bold text-gray-900 dark:text-white">{partySize}</p>
                  <p className="text-[10px] text-gray-400">أشخاص</p>
                </div>
              </div>
              {selectedBranch && (
                <p className="text-[10px] text-gray-400 text-center mt-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                  {selectedBranch.nameAr} {selectedBranch.address && `• ${selectedBranch.address}`}
                </p>
              )}
            </div>

            {/* Form */}
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">الاسم الكامل *</label>
                <input
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  className="w-full p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500/20 outline-none"
                  placeholder="محمد أحمد"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">رقم الجوال *</label>
                <input
                  value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value)}
                  className="w-full p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500/20 outline-none"
                  placeholder="05xxxxxxxx"
                  dir="ltr"
                  type="tel"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">ملاحظات</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500/20 outline-none"
                  rows={2}
                  placeholder="مناسبة خاصة، كرسي أطفال، حساسية طعام..."
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 dark:bg-rose-900/20 rounded-xl text-sm text-rose-600 dark:text-rose-400 text-center">
                {error}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={submitting || !customerName || !customerPhone}
              className="w-full py-3.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-sm transition-all disabled:opacity-50 shadow-lg shadow-primary-500/30"
            >
              {submitting ? 'جاري الحجز...' : 'تأكيد الحجز'}
            </button>

            <button onClick={() => setStep('table')} className="text-sm text-primary-600 hover:underline block mx-auto">
              ← تغيير الطاولة
            </button>
          </div>
        )}

        {/* Step: Done */}
        {step === 'done' && result && (
          <div className="text-center space-y-6 animate-fade-in-up py-8">
            <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">تم الحجز بنجاح!</h2>
              <p className="text-sm text-gray-400 mt-1">سيتم تأكيد حجزك قريباً</p>
            </div>

            {/* Downloadable reservation ticket — show this to the restaurant on arrival */}
            <div ref={ticketRef} className="bg-white rounded-2xl border border-gray-200 p-5 max-w-xs mx-auto" dir="rtl">
              <p className="text-sm font-bold text-gray-900 text-center mb-3">{restaurant?.nameAr}</p>

              <div className="bg-white p-3 rounded-xl inline-block mx-auto">
                <QRCodeCanvas
                  ref={qrCanvasRef}
                  value={JSON.stringify({ t: 'reservation', id: result.id })}
                  size={168}
                  level="M"
                  marginSize={0}
                />
              </div>
              <p className="text-xs text-gray-400 mt-3 text-center">رقم الحجز</p>
              <p className="text-lg font-bold tracking-widest text-gray-900 text-center" dir="ltr">
                {result.id.slice(-6).toUpperCase()}
              </p>
              <p className="text-[11px] text-gray-400 mt-2 text-center">أظهِر هذا الرمز عند وصولك للمطعم</p>

              <div className="space-y-3 text-right mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-gray-900">{result.branch.nameAr}</span>
                  <span className="text-xs text-gray-400">الفرع</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-gray-900">طاولة {result.table.number}</span>
                  <span className="text-xs text-gray-400">الطاولة</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-gray-900">{formatDate(result.date)}</span>
                  <span className="text-xs text-gray-400">التاريخ</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-gray-900">{formatTime12(result.time)} - {formatTime12(result.endTime)}</span>
                  <span className="text-xs text-gray-400">الوقت</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-gray-900">{partySize} أشخاص</span>
                  <span className="text-xs text-gray-400">العدد</span>
                </div>
              </div>
            </div>

            <button
              onClick={downloadTicket}
              disabled={downloading}
              className="w-full max-w-xs mx-auto py-3.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-sm transition-all disabled:opacity-50 shadow-lg shadow-primary-500/30 flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              {downloading ? 'جاري التحميل...' : 'تحميل الحجز'}
            </button>

            <p className="text-xs text-gray-400">
              للاستفسار تواصل معنا: {restaurant?.phone}
            </p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center py-4 text-[10px] text-gray-300 dark:text-gray-700">
        مدعوم بواسطة رستق
      </footer>
    </div>
  );
}
