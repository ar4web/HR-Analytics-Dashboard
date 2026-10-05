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

export function DonutChart({
  data,
  title,
  size = 180,
  thickness = 35,
  showLegend = true,
  centerText,
  centerValue,
}: DonutChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let currentAngle = -90;

  const segments = data.map((item) => {
    const percentage = (item.value / total) * 100;
    const angle = (percentage / 100) * 360;
    const startAngle = currentAngle;
    currentAngle += angle;
    return {
      ...item,
      percentage,
      startAngle,
      endAngle: currentAngle,
    };
  });

  const createArc = (startAngle: number, endAngle: number, radius: number) => {
    const start = polarToCartesian(radius, radius, radius, endAngle);
    const end = polarToCartesian(radius, radius, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;
    return [
      'M', start.x, start.y,
      'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y,
    ].join(' ');
  };

  const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;
    return {
      x: centerX + radius * Math.cos(angleInRadians),
      y: centerY + radius * Math.sin(angleInRadians),
    };
  };

  const radius = size / 2;
  const innerRadius = radius - thickness;

  return (
    <div className="flex flex-col items-center">
      {title && <h4 className="text-sm font-semibold text-gray-700 mb-4">{title}</h4>}
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {segments.map((segment, index) => (
            <motion.path
              key={segment.name}
              d={createArc(segment.startAngle, segment.endAngle, radius - thickness / 2)}
              fill="none"
              stroke={segment.color}
              strokeWidth={thickness}
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 1, delay: index * 0.1 }}
            />
          ))}
        </svg>
        {(centerText || centerValue) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {centerValue && <span className="text-2xl font-bold text-gray-900">{centerValue}</span>}
            {centerText && <span className="text-xs text-gray-500">{centerText}</span>}
          </div>
        )}
      </div>
      {showLegend && (
        <div className="flex flex-wrap justify-center gap-4 mt-4">
          {data.map((item) => (
            <div key={item.name} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-xs text-gray-600">{item.name}</span>
              <span className="text-xs font-medium text-gray-900">{item.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
