import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export type Tone = 'emerald' | 'sky' | 'indigo' | 'violet' | 'rose' | 'amber' | 'cyan' | 'slate';

interface KPICardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: React.ReactNode;
  prefix?: string;
  suffix?: string;
  index?: number;
  tone?: Tone;
}

/**
 * Stat card: gradient icon tile, tabular-figure value and a trend chip.
 * `tone` drives the icon tile, the top hairline and the value's hover accent
 * via the tone-* classes in index.css.
 */
export function KPICard({
  title,
  value,
  change,
  changeLabel,
  icon,
  prefix = '',
  suffix = '',
  index = 0,
  tone = 'emerald',
}: KPICardProps) {
  const isPositive = change !== undefined && change > 0;
  const isNegative = change !== undefined && change < 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
      className={`surface surface-lift hairline tone-${tone} group overflow-hidden p-5`}
    >
      {/* The icon is placed out of flow: at lg:grid-cols-8 a card is only ~180px
          wide, so an inline icon tile would squeeze the value into ~55px. */}
      <div className="tile absolute right-5 top-5 grid h-9 w-9 place-items-center rounded-xl transition-transform duration-300 group-hover:scale-105">
        {icon}
      </div>

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate pr-11 text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500">
            {title}
          </p>
          <p className="tnum mt-2 text-[20px] font-bold leading-none tracking-tight text-gray-900 sm:text-[24px] xl:text-[26px]">
            {prefix}
            {typeof value === 'number' ? value.toLocaleString() : value}
            {suffix}
          </p>
          {change !== undefined && (
            <div className="mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-1">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${
                  isPositive
                    ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100'
                    : isNegative
                      ? 'bg-rose-50 text-rose-700 ring-1 ring-rose-100'
                      : 'bg-gray-100 text-gray-600 ring-1 ring-gray-200'
                }`}
              >
                {isPositive && <TrendingUp className="h-3 w-3" />}
                {isNegative && <TrendingDown className="h-3 w-3" />}
                {!isPositive && !isNegative && <Minus className="h-3 w-3" />}
                {isPositive ? '+' : ''}
                {change}%
              </span>
              {changeLabel && (
                <span className="truncate text-[11px] text-gray-400">{changeLabel}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
