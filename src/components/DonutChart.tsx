import { useId, useState } from 'react';
import { motion } from 'framer-motion';

interface DonutChartProps {
  data: { name: string; value: number; color: string }[];
  title?: string;
  size?: number;
  thickness?: number;
  showLegend?: boolean;
  centerText?: string;
  centerValue?: string | number;
}

/**
 * Donut built from a single circle per slice using dash offsets, which avoids
 * arc/polar maths entirely. Slices are separated by a small gap; hovering one
 * thickens it and swaps the centre label for that slice's figures.
 */
export function DonutChart({
  data,
  title,
  size = 180,
  thickness = 35,
  showLegend = true,
  centerText,
  centerValue,
}: DonutChartProps) {
  const uid = useId().replace(/:/g, '');
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const total = data.reduce((sum, item) => sum + item.value, 0) || 1;
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const gap = Math.max(circumference * 0.012, 1);

  // Pure fold — no variable reassignment during render.
  // The gap is taken out of the END of each slice, so slice start positions stay
  // true to their fractions. Slices too small to afford the full gap keep a 2px
  // minimum, otherwise a 1% slice rounds away to nothing and looks like a bug.
  const segments = data.reduce<
    { name: string; value: number; color: string; fraction: number; length: number; offset: number }[]
  >((acc, item) => {
    const fraction = item.value / total;
    const previous = acc[acc.length - 1];
    const offset = previous ? previous.offset + previous.fraction * circumference : 0;
    const arc = fraction * circumference;
    const sliceGap = Math.min(gap, Math.max(arc - 2, 0));
    return [...acc, { ...item, fraction, offset, length: Math.max(arc - sliceGap, 2) }];
  }, []);

  const active = activeIndex !== null ? segments[activeIndex] : null;

  return (
    <div className="flex flex-col items-center">
      {title && <h4 className="mb-4 text-sm font-semibold text-body">{title}</h4>}

      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} role="img" aria-label={`${centerText ?? 'Total'}: ${centerValue ?? total}`}>
          <defs>
            <filter id={`${uid}-shadow`} x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#0f172a" floodOpacity="0.16" />
            </filter>
          </defs>

          {/* Track: gives the ring presence even where slices are small */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#f1f5f9"
            strokeWidth={thickness}
          />

          <g transform={`rotate(-90 ${size / 2} ${size / 2})`} filter={`url(#${uid}-shadow)`}>
            {segments.map((segment, index) => (
              <motion.circle
                key={segment.name}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={segment.color}
                strokeWidth={activeIndex === index ? thickness + 5 : thickness}
                strokeDasharray={`${segment.length} ${circumference - segment.length}`}
                strokeDashoffset={-segment.offset}
                strokeLinecap="butt"
                className="cursor-pointer transition-[stroke-width] duration-200"
                onMouseEnter={() => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(null)}
                initial={{ opacity: 0 }}
                animate={{ opacity: activeIndex === null || activeIndex === index ? 1 : 0.35 }}
                transition={{ duration: 0.35, delay: index * 0.12 }}
              />
            ))}
          </g>
        </svg>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="tnum text-2xl font-bold leading-none text-strong">
            {active ? active.value.toLocaleString() : centerValue}
          </span>
          <span className="mt-1 max-w-[75%] truncate text-[11px] font-medium text-muted">
            {active ? active.name : centerText}
          </span>
          {active && (
            <span className="tnum mt-0.5 text-[10px] font-semibold text-emerald-600">
              {(active.fraction * 100).toFixed(1)}%
            </span>
          )}
        </div>
      </div>

      {showLegend && (
        <div className="mt-5 w-full space-y-1.5">
          {segments.map((item, index) => (
            <button
              key={item.name}
              type="button"
              onMouseEnter={() => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
              className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-start transition-colors ${
                activeIndex === index ? 'bg-sunken' : ''
              }`}
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-surface"
                style={{ backgroundColor: item.color, boxShadow: `0 1px 4px -1px ${item.color}aa` }}
              />
              <span className="flex-1 truncate text-xs text-body">{item.name}</span>
              <span className="tnum text-xs font-semibold text-strong">{item.value.toLocaleString()}</span>
              <span className="tnum w-11 text-end text-[11px] font-medium text-subtle">
                {(item.fraction * 100).toFixed(1)}%
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
