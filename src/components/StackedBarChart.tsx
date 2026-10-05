import { motion } from 'framer-motion';

interface StackedBarChartProps {
  data: { label: string; values: { key: string; value: number; color: string }[] }[];
  title?: string;
  height?: number;
}

export function StackedBarChart({ data, title, height = 200 }: StackedBarChartProps) {
  const maxTotal = Math.max(...data.map(d => d.values.reduce((sum, v) => sum + v.value, 0)));

  return (
    <div className="w-full">
      {title && <h4 className="text-sm font-semibold text-gray-700 mb-4">{title}</h4>}
      <div className="space-y-3">
        {data.map((item, index) => {
          const total = item.values.reduce((sum, v) => sum + v.value, 0);
          return (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center gap-3"
            >
              <span className="text-xs font-medium text-gray-600 w-24 truncate">{item.label}</span>
              <div className="flex-1 h-8 bg-gray-100 rounded-lg overflow-hidden flex">
                {item.values.map((v, i) => {
                  const width = (v.value / maxTotal) * 100;
                  return (
                    <motion.div
                      key={v.key}
                      initial={{ width: 0 }}
                      animate={{ width: `${width}%` }}
                      transition={{ duration: 0.8, delay: index * 0.05 + i * 0.05 }}
                      className="h-full flex items-center justify-center"
                      style={{ backgroundColor: v.color }}
                    >
                      {width > 10 && (
                        <span className="text-xs font-bold text-white">{v.value}</span>
                      )}
                    </motion.div>
                  );
                })}
              </div>
              <span className="text-xs font-medium text-gray-600 w-12 text-right">{total}</span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
