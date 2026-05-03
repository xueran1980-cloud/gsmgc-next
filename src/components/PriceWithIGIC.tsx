/**
 * PriceWithIGIC — FINAL MAPPING CONTRACT
 * display BASE price + IGIC included
 */
import { formatPrice, calcIGIC } from '@/lib/display-formatter';

const IGIC_RATE = 0.07;

/** 计算含 IGIC 价格（数字） */
export function priceWithIgic(base: number): number {
  return Math.round(base * (1 + IGIC_RATE) * 100) / 100;
}

interface Props {
  price: number | string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export default function PriceWithIGIC({ price, size = 'md', className = '' }: Props) {
  const base = parseFloat(String(price || 0));
  const total = calcIGIC(base);

  const s = {
    sm: { main: 'text-sm', sub: 'text-[11px]' },
    md: { main: 'text-lg', sub: 'text-xs' },
    lg: { main: 'text-2xl', sub: 'text-sm' },
    xl: { main: 'text-4xl', sub: 'text-base' },
  }[size] || { main: 'text-lg', sub: 'text-xs' };

  return (
    <div className={className}>
      <span className={`font-black text-[#2563eb] ${s.main} leading-none`}>
        {formatPrice(base)}
      </span>
      <div className={`${s.sub} text-gray-500 mt-0.5 leading-none`}>
        IGIC incl. <span className="font-semibold text-gray-700">{formatPrice(total)}</span>
      </div>
    </div>
  );
}
