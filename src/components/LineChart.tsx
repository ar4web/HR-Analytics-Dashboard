import { useId } from 'react';
import { motion } from 'framer-motion';

interface LineChartProps {
  data: { label: string; values: { key: string; value: number; color: string }[] }[];
  title?: string;
  height?: number;
  showGrid?: boolean;
}

/** Ticks/axis labels sit outside the stretched SVG so they render undistorted. */
const LABEL_BAND = 26;

function formatTick(value: number) {
  return Number.isInteger(value) ? value.toLocaleString() : value.toFixed(1);
}

/**
 * Multi-series line chart with a gradient area under each line.
 *
 * The plot is a `viewBox="0 0 100 100"` SVG with `preserveAspectRatio="none"`,
 * which scales non-uniformly — so strokes use `vector-effect="non-scaling-stroke"`
 * to stay uniform, and the point markers are HTML dots rather than <circle>
 * (a circle would be squashed into an ellipse).
 */
export function LineChart({ data, title, height = 200, showGrid = true }: LineChartProps) {
  const gradientId = useId().replace(/:/g, '');

  const series = data[0]?.values.map((v) => v.key) ?? [];
  const allValues = data.flatMap((d) => d.values.map((v) => v.value));
  const maxValue = Math.max(...allValues);
  const minValue = Math.min(...allValues);
  const range = maxValue - minValue || 1;
  const padding = range * 0.12;
  const adjustedMax = maxValue + padding;
  const adjustedMin = Math.max(0, minValue - padding);
  const adjustedRange = adjustedMax - adjustedMin || 1;

  const pointSpacing = 100 / (data.length - 1 || 1);
  const ticks = [0, 25, 50, 75, 100].map((pct) => adjustedMax - (pct / 100) * adjustedRange);

  const pointsFor = (key: string) =>
    data.map((d, i) => {
      const value = d.values.find((v) => v.key === key)?.value ?? 0;
      const norm = (value - adjustedMin) / adjustedRange;
      return { x: i * pointSpacing, y: 100 - norm * 100, norm, value };
    });

  const colorFor = (key: string) => data[0]?.values.find((v) => v.key === key)?.color ?? '#10b981';

  return (
    <div className="w-full">
      {title && <h4 className="mb-4 text-sm font-semibold text-gray-700">{title}</h4>}
      <div className="flex gap-3" style={{ height }}>
        {/* Value axis */}
        <div
          className="tnum flex w-9 shrink-0 flex-col justify-between text-right text-[10px] font-medium text-gray-400"
          style={{ paddingBottom: LABEL_BAND }}
        >
          {ticks.map((tick, i) => (
            <span key={i} className="leading-none">{formatTick(tick)}</span>
          ))}
        </div>

        <div className="relative flex-1">
          <div className="absolute inset-x-0 top-0" style={{ bottom: LABEL_BAND }}>
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full overflow-visible">
              <defs>
                {series.map((key) => {
                  const color = colorFor(key);
                  return (
                    <linearGradient key={key} id={`${gradientId}-${key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={color} stopOpacity="0.32" />
                      <stop offset="55%" stopColor={color} stopOpacity="0.1" />
                      <stop offset="100%" stopColor={color} stopOpacity="0" />
                    </linearGradient>
                  );
                })}
              </defs>

              {showGrid && (
                <>
                  {[0, 25, 50, 75, 100].map((y) => (
                    <line
                      key={y}
                      x1="0"
                      y1={y}
                      x2="100"
                      y2={y}
                      stroke="#94a3b8"
                      strokeOpacity={y === 100 ? 0.42 : 0.22}
                      strokeWidth="1"
                      strokeDasharray={y === 100 ? undefined : '3 4'}
                      vectorEffect="non-scaling-stroke"
                    />
                  ))}
                </>
              )}

              {series.map((key, index) => {
                const color = colorFor(key);
                const points = pointsFor(key);
                const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                const area = `${line} L 100 100 L 0 100 Z`;

                return (
                  <g key={key}>
                    <motion.path
                      d={area}
                      fill={`url(#${gradientId}-${key})`}
                      stroke="none"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.8, delay: 0.45 + index * 0.15 }}
                    />
                    <motion.path
                      d={line}
                      fill="none"
                      stroke={color}
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      vectorEffect="non-scaling-stroke"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 1.4, delay: index * 0.15, ease: 'easeInOut' }}
                    />
                  </g>
                );
              })}
            </svg>

            {/* HTML markers: perfect circles, plus a value tooltip on the peak of each series */}
            <div className="pointer-events-none absolute inset-0">
              {series.map((key) => {
                const color = colorFor(key);
                return pointsFor(key).map((p, i) => (
                  <motion.span
                    key={`${key}-${i}`}
                    className="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white"
                    style={{ left: `${p.x}%`, top: `${p.y}%`, backgroundColor: color, boxShadow: `0 2px 6px -1px ${color}80` }}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.9 + i * 0.04 }}
                  />
                ));
              })}
            </div>
          </div>

          {/* Category axis */}
          <div className="absolute inset-x-0 bottom-0 flex justify-between gap-1" style={{ height: LABEL_BAND }}>
            {data.map((d, i) => (
              <span key={i} className="flex-1 truncate text-center text-[10px] font-medium text-gray-400">
                {d.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
