import { motion } from 'framer-motion';

interface BarChartProps {
  data: { label: string; value: number; color?: string }[];
  title?: string;
  height?: number;
  showValues?: boolean;
  horizontal?: boolean;
}

export function BarChart({ data, title, height = 200, showValues = true, horizontal = false }: BarChartProps) {
  const maxValue = Math.max(...data.map(d => d.value));

  if (horizontal) {
    return (
      <div className="w-full">
        {title && <h4 className="text-sm font-semibold text-gray-700 mb-4">{title}</h4>}
        <div className="space-y-3">
          {data.map((item, index) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center gap-3"
            >
              <span className="text-xs font-medium text-gray-600 w-20 truncate">{item.label}</span>
              <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(item.value / maxValue) * 100}%` }}
                  transition={{ duration: 0.8, delay: index * 0.05 }}
                  className="h-full rounded-full flex items-center justify-end pr-2"
                  style={{ backgroundColor: item.color || '#10b981' }}
                >
                  {showValues && (item.value / maxValue) > 0.15 && (
                    <span className="text-xs font-bold text-white">{item.value}</span>
                  )}
                </motion.div>
              </div>
              {showValues && (item.value / maxValue) <= 0.15 && (
                <span className="text-xs font-medium text-gray-600">{item.value}</span>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {title && <h4 className="text-sm font-semibold text-gray-700 mb-4">{title}</h4>}
      <div className="flex items-end justify-between gap-2" style={{ height }}>
        {data.map((item, index) => (
          <motion.div
            key={item.label}
            className="flex-1 flex flex-col items-center gap-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <div className="w-full bg-gray-100 rounded-t-lg overflow-hidden flex flex-col justify-end" style={{ height: height - 30 }}>
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${(item.value / maxValue) * 100}%` }}
                transition={{ duration: 0.8, delay: index * 0.05 }}
                className="w-full rounded-t-lg flex items-start justify-center pt-2"
                style={{ backgroundColor: item.color || '#10b981' }}
              >
                {showValues && (item.value / maxValue) > 0.3 && (
                  <span className="text-xs font-bold text-white">{item.value}</span>
                )}
              </motion.div>
            </div>
            <span className="text-xs text-gray-500 truncate w-full text-center">{item.label}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
