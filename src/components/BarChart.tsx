import { useId } from 'react';
import { motion } from 'framer-motion';

interface BarChartProps {
  data: { label: string; value: number; color?: string }[];
  title?: string;
  height?: number;
  showValues?: boolean;
  horizontal?: boolean;
}

/**
 * Bar chart in two orientations. Both use CSS gradients derived from each
 * series colour rather than SVG gradients, so the components stay plain divs
 * and animate with framer-motion's width/height interpolation.
 */
export function BarChart({ data, title, height = 200, showValues = true, horizontal = false }: BarChartProps) {
  const uid = useId().replace(/:/g, '');
  const maxValue = Math.max(...data.map((d) => d.value)) || 1;
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const colorOf = (item: { color?: string }) => item.color || '#10b981';

  if (horizontal) {
    return (
      <div className="w-full">
        {title && <h4 className="mb-4 text-sm font-semibold text-gray-700">{title}</h4>}
        <div className="space-y-3">
          {data.map((item, index) => {
            const share = (item.value / total) * 100;
            return (
              <motion.div
                key={`${uid}-${item.label}`}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05, duration: 0.4 }}
                className="group flex items-center gap-3"
              >
                <span className="w-20 truncate text-xs font-medium text-gray-600">{item.label}</span>
                <div className="relative h-6 flex-1 overflow-hidden rounded-full bg-gray-100 ring-1 ring-inset ring-gray-200/70">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(item.value / maxValue) * 100}%` }}
                    transition={{ duration: 0.8, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
                    className="flex h-full items-center justify-end rounded-full pr-2 shadow-[inset_0_1px_0_0_rgb(255_255_255/0.35)]"
                    style={{
                      backgroundImage: `linear-gradient(90deg, ${colorOf(item)}cc, ${colorOf(item)})`,
                    }}
                  >
                    {showValues && item.value / maxValue > 0.18 && (
                      <span className="tnum text-[11px] font-bold text-white drop-shadow-sm">{item.value}</span>
                    )}
                  </motion.div>
                </div>
                {showValues && (
                  <span className="tnum w-16 shrink-0 text-right text-[11px] font-medium text-gray-500">
                    {item.value / maxValue <= 0.18 ? item.value : `${share.toFixed(1)}%`}
                  </span>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {title && <h4 className="mb-4 text-sm font-semibold text-gray-700">{title}</h4>}
      <div className="flex items-end justify-between gap-2" style={{ height }}>
        {data.map((item, index) => (
          <motion.div
            key={`${uid}-${item.label}`}
            className="group flex h-full flex-1 flex-col items-center gap-2"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, duration: 0.4 }}
          >
            <div className="relative flex w-full flex-col justify-end overflow-hidden rounded-t-lg bg-gray-100/80 ring-1 ring-inset ring-gray-200/60" style={{ height: height - 30 }}>
              <div
                className="absolute inset-x-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                style={{ bottom: `${(item.value / maxValue) * 100}%`, height: 2, backgroundColor: colorOf(item) }}
              />
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${(item.value / maxValue) * 100}%` }}
                transition={{ duration: 0.8, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
                className="flex w-full items-start justify-center rounded-t-lg pt-2 shadow-[inset_0_1px_0_0_rgb(255_255_255/0.3)]"
                style={{
                  backgroundImage: `linear-gradient(180deg, ${colorOf(item)}, ${colorOf(item)}b8)`,
                }}
              >
                {showValues && item.value / maxValue > 0.28 && (
                  <span className="tnum text-[11px] font-bold text-white drop-shadow-sm">{item.value}</span>
                )}
              </motion.div>
            </div>
            <span className="w-full truncate text-center text-[10px] font-medium text-gray-400">{item.label}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
