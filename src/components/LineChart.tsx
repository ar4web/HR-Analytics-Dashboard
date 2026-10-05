import { motion } from 'framer-motion';

interface LineChartProps {
  data: { label: string; values: { key: string; value: number; color: string }[] }[];
  title?: string;
  height?: number;
  showGrid?: boolean;
}

export function LineChart({ data, title, height = 200, showGrid = true }: LineChartProps) {
  const allValues = data.flatMap(d => d.values.map(v => v.value));
  const maxValue = Math.max(...allValues);
  const minValue = Math.min(...allValues);
  const range = maxValue - minValue || 1;
  const padding = range * 0.1;
  const adjustedMax = maxValue + padding;
  const adjustedMin = Math.max(0, minValue - padding);
  const adjustedRange = adjustedMax - adjustedMin;

  const chartWidth = 100;
  const chartHeight = 100;
  const pointSpacing = chartWidth / (data.length - 1 || 1);

  const createPath = (values: { key: string; value: number; color: string }[]) => {
    const points = data.map((d, i) => {
      const value = d.values.find(v => v.key === values[0].key)?.value || 0;
      const x = i * pointSpacing;
      const y = chartHeight - ((value - adjustedMin) / adjustedRange) * chartHeight;
      return { x, y, value };
    });

    const pathD = points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
      .join(' ');

    return { pathD, points };
  };

  const uniqueKeys = data[0]?.values.map(v => v.key) || [];

  return (
    <div className="w-full">
      {title && <h4 className="text-sm font-semibold text-gray-700 mb-4">{title}</h4>}
      <div className="relative" style={{ height }}>
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          preserveAspectRatio="none"
          className="w-full h-full"
        >
          {showGrid && (
            <>
              {[0, 25, 50, 75, 100].map((y) => (
                <line
                  key={y}
                  x1="0"
                  y1={y}
                  x2={chartWidth}
                  y2={y}
                  stroke="#e5e7eb"
                  strokeWidth="0.5"
                  strokeDasharray="2,2"
                />
              ))}
            </>
          )}
          {uniqueKeys.map((key) => {
            const values = data[0].values.find(v => v.key === key);
            if (!values) return null;
            const color = values.color;
            const { pathD } = createPath(data.map(d => ({
              key,
              value: d.values.find(v => v.key === key)?.value || 0,
              color,
            })));

            return (
              <g key={key}>
                <motion.path
                  d={pathD}
                  fill="none"
                  stroke={color}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1.5 }}
                />
              </g>
            );
          })}
        </svg>
        <div className="absolute bottom-0 left-0 right-0 flex justify-between px-1">
          {data.map((d, i) => (
            <span key={i} className="text-[10px] text-gray-400">{d.label}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
