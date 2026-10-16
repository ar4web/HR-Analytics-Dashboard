import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export type Tone = 'emerald' | 'sky' | 'indigo' | 'violet' | 'rose' | 'amber' | 'cyan' | 'slate';

export interface CardTrend {
  /**
   * Whether this reading is good, bad or neither. Deliberately separate from
   * the direction of the number: turnover below target is *good*, and colouring
   * by "did the value go down" would paint it red.
   */
  status: 'good' | 'bad' | 'neutral';
  /** Short text, e.g. "2.1 pts under target" or "+4 days". */
  label: string;
}

interface KPICardProps {
  title: string;
  value: string | number;
  /** Legacy percentage change. Prefer `trend`, which knows about direction. */
  change?: number;
  changeLabel?: string;
  trend?: CardTrend;
  /** Shown under the value as "Target: …". */
  target?: string;
  /** Tooltip text explaining what the number counts. */
  hint?: string;
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
  trend,
  target,
  hint,
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
      className={`surface surface-lift hairline tone-${tone} group overflow-hidden pad-tile`}
      title={hint}
    >
      {/* The icon is placed out of flow: at lg:grid-cols-8 a card is only ~180px
          wide, so an inline icon tile would squeeze the value into ~55px. */}
      <div className="tile absolute end-5 top-5 grid h-9 w-9 place-items-center rounded-xl transition-transform duration-300 group-hover:scale-105">
        {icon}
      </div>

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate pe-11 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
            {title}
          </p>
          <p className="tnum mt-2 text-[20px] font-bold leading-none tracking-tight text-strong sm:text-[24px] xl:text-[26px]">
            {prefix}
            {typeof value === 'number' ? value.toLocaleString() : value}
            {suffix}
          </p>
          {trend && (
            <div className="mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-1">
              <span
                className={`chip ${
                  trend.status === 'good'
                    ? 'chip-positive'
                    : trend.status === 'bad'
                      ? 'chip-negative'
                      : 'chip-neutral'
                }`}
              >
                {trend.status === 'good' && <TrendingUp className="h-3 w-3" />}
                {trend.status === 'bad' && <TrendingDown className="h-3 w-3" />}
                {trend.status === 'neutral' && <Minus className="h-3 w-3" />}
                {trend.label}
              </span>
            </div>
          )}

          {!trend && change !== undefined && (
            <div className="mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-1">
              <span
                className={`chip ${
                  isPositive ? 'chip-positive' : isNegative ? 'chip-negative' : 'chip-neutral'
                }`}
              >
                {isPositive && <TrendingUp className="h-3 w-3" />}
                {isNegative && <TrendingDown className="h-3 w-3" />}
                {!isPositive && !isNegative && <Minus className="h-3 w-3" />}
                {isPositive ? '+' : ''}
                {change}%
              </span>
              {changeLabel && (
                <span className="truncate text-[11px] text-subtle">{changeLabel}</span>
              )}
            </div>
          )}

          {target && <p className="mt-2 truncate text-[11px] text-subtle">{target}</p>}
        </div>
      </div>
    </motion.div>
  );
}
