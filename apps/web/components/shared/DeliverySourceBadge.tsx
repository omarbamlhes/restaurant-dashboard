import { cn } from '@/lib/utils';
import { deliverySourceMeta } from '@/lib/delivery-sources';

interface DeliverySourceBadgeProps {
  source: string;
  /** 'chip' = coloured pill with label; 'mark' = just the letter mark. */
  variant?: 'chip' | 'mark';
  className?: string;
}

/** Brand-tinted badge identifying which platform a delivery order came from. */
export default function DeliverySourceBadge({ source, variant = 'chip', className }: DeliverySourceBadgeProps) {
  const meta = deliverySourceMeta(source);
  if (!meta) return null;

  const mark = (
    <span className={cn('inline-flex items-center justify-center rounded-md text-[10px] font-bold w-4 h-4 shrink-0', meta.markClass)}>
      {meta.mark}
    </span>
  );

  if (variant === 'mark') return <span className={className}>{mark}</span>;

  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium', meta.badgeClass, className)}>
      {mark}
      {meta.label}
    </span>
  );
}
