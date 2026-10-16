import { motion } from 'framer-motion';

interface StackedBarChartProps {
  data: { label: string; values: { key: string; value: number; color: string }[] }[];
  title?: string;
  height?: number;
}

/**
 * Horizontal stacked bars. Each row is normalised against the largest row
 * total, so segment widths read as shares of the biggest department rather
 * than as a 100% composition.
 */
export function StackedBarChart({ data, title, height = 200 }: StackedBarChartProps) {
  const maxTotal = Math.max(...data.map((d) => d.values.reduce((sum, v) => sum + v.value, 0))) || 1;

  return (
    <div className="w-full">
      {title && <h4 className="mb-4 text-sm font-semibold text-gray-700">{title}</h4>}
      <div className="space-y-3" style={{ minHeight: height }}>
        {data.map((item, index) => {
          const total = item.values.reduce((sum, v) => sum + v.value, 0);
          return (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05, duration: 0.4 }}
              className="group flex items-center gap-3"
            >
              <span className="w-24 shrink-0 truncate text-xs font-medium text-gray-600 transition-colors group-hover:text-gray-900">
                {item.label}
              </span>

              <div className="flex h-7 flex-1 overflow-hidden rounded-lg bg-gray-100 ring-1 ring-inset ring-gray-200/70">
                {item.values.map((v, i) => {
                  const width = (v.value / maxTotal) * 100;
                  return (
                    <motion.div
                      key={v.key}
                      initial={{ width: 0 }}
                      animate={{ width: `${width}%` }}
                      transition={{ duration: 0.8, delay: index * 0.05 + i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                      className="flex h-full items-center justify-center shadow-[inset_0_1px_0_0_rgb(255_255_255/0.28)] transition-opacity duration-200 group-hover:opacity-95"
                      style={{
                        backgroundImage: `linear-gradient(135deg, ${v.color}, ${v.color}cc)`,
                        borderRight: i < item.values.length - 1 ? '1px solid rgb(255 255 255 / 0.55)' : undefined,
                      }}
                    >
                      {width > 9 && (
                        <span className="tnum text-[11px] font-bold text-white drop-shadow-sm">{v.value}</span>
                      )}
                    </motion.div>
                  );
                })}
              </div>

              <div className="w-14 shrink-0 text-right">
                <span className="tnum text-xs font-semibold text-gray-900">{total}</span>
                <span className="ml-1 text-[10px] font-medium text-gray-400">
                  {((total / maxTotal) * 100).toFixed(0)}%
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
