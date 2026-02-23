import { TrendingUp } from 'lucide-react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-600 via-primary-700 to-emerald-900 flex-col items-center justify-center p-12 relative overflow-hidden">
        {/* Pattern overlay */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
        <div className="relative z-10 text-center text-white">
          <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-xl flex items-center justify-center mx-auto mb-6">
            <TrendingUp className="w-10 h-10" />
          </div>
          <h1 className="text-4xl font-bold mb-4">رستق</h1>
          <p className="text-xl text-white/80 mb-2">لوحة المطاعم الذكية</p>
          <p className="text-sm text-white/60 max-w-md mx-auto leading-relaxed">
            منصة تحليلات ذكية تساعدك على اتخاذ قرارات مبنية على بيانات لمطعمك
          </p>
        </div>

        {/* Stats preview */}
        <div className="relative z-10 grid grid-cols-3 gap-4 mt-12 w-full max-w-md">
          {[
            { label: 'مطعم يثق بنا', value: '١٢٠٠+' },
            { label: 'طلب يومي', value: '٥٠٠ ألف+' },
            { label: 'توفير شهري', value: '٣٠%' },
          ].map((s, i) => (
            <div key={i} className="bg-white/10 backdrop-blur-xl rounded-xl p-4 text-center">
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-white/70 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-slate-50 dark:bg-dark-bg">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    </div>
  );
}
