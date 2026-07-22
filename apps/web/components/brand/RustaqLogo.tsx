import RustaqIcon from './RustaqIcon';

interface RustaqLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  variant?: 'light' | 'dark' | 'auto';
  className?: string;
}

const SIZES = {
  sm: { icon: 36, title: 'text-lg', subtitle: 'text-[9px] tracking-[0.25em]' },
  md: { icon: 56, title: 'text-2xl', subtitle: 'text-[10px] tracking-[0.3em]' },
  lg: { icon: 80, title: 'text-4xl', subtitle: 'text-xs tracking-[0.35em]' },
};

export default function RustaqLogo({ size = 'md', showText = true, variant = 'auto', className }: RustaqLogoProps) {
  const s = SIZES[size];

  const textColor = variant === 'light'
    ? 'text-white'
    : variant === 'dark'
      ? 'text-gray-900'
      : 'text-gray-900 dark:text-white';

  const subtitleColor = variant === 'light'
    ? 'text-white/60'
    : variant === 'dark'
      ? 'text-gray-400'
      : 'text-gray-400 dark:text-gray-500';

  return (
    <div className={`flex flex-col items-center gap-3 ${className || ''}`}>
      <RustaqIcon size={s.icon} />
      {showText && (
        <div className="text-center">
          <h1 className={`${s.title} font-bold ${textColor}`} style={{
            background: 'linear-gradient(135deg, #3cb878 0%, #2d8a5e 50%, #e8c352 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            رستق
          </h1>
          <p className={`${s.subtitle} font-medium ${subtitleColor} mt-0.5`}>
            R U S T A Q
          </p>
        </div>
      )}
    </div>
  );
}
