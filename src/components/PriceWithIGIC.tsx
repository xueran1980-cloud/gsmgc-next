/**
 * PriceWithIGIC — 显示 BASE 价格 + IGIC 含税价
 *
 * 用法：
 *   <PriceWithIGIC price={6.00} size="lg" />
 *   →  6.00 €
 *      IGIC 6.42 €
 */
const IGIC_RATE = 0.07;

export function igicAmount(base: number): number {
  return Math.round(base * IGIC_RATE * 100) / 100;
}

export function priceWithIgic(base: number): number {
  return Math.round(base * (1 + IGIC_RATE) * 100) / 100;
}

interface PriceWithIGICProps {
  price: number | string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export default function PriceWithIGIC({
  price,
  size = 'md',
  className = '',
}: PriceWithIGICProps) {
  const base = parseFloat(String(price || 0));
  const total = priceWithIgic(base);

  const sizeClasses: Record<string, { main: string; sub: string; total: string }> = {
    sm: { main: 'text-sm', sub: 'text-[11px]', total: 'text-xs' },
    md: { main: 'text-lg', sub: 'text-xs', total: 'text-sm' },
    lg: { main: 'text-2xl', sub: 'text-sm', total: 'text-base' },
    xl: { main: 'text-4xl', sub: 'text-base', total: 'text-lg' },
  };
  const s = sizeClasses[size] || sizeClasses.md;

  return (
    <div className={className}>
      <span className={`font-black text-[#2563eb] ${s.main} leading-none`}>
        {base.toFixed(2)} €
      </span>
      <div className={`${s.sub} text-gray-500 mt-0.5 leading-none`}>
        <span className="font-medium">IGIC</span> <span className="font-semibold text-gray-700">{total.toFixed(2)} €</span>
      </div>
    </div>
  );
}
