import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: React.ReactNode;
  prefix?: string;
  suffix?: string;
  index?: number;
}

export function KPICard({ title, value, change, changeLabel, icon, prefix = '', suffix = '', index = 0 }: KPICardProps) {
  const isPositive = change && change > 0;
  const isNegative = change && change < 0;
  const isNeutral = change === 0 || change === undefined;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg hover:border-emerald-200 transition-all duration-300 group"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900 tracking-tight">
            {prefix}{typeof value === 'number' ? value.toLocaleString() : value}{suffix}
          </p>
          {change !== undefined && (
            <div className="flex items-center mt-2 gap-1">
              {isPositive && <TrendingUp className="w-4 h-4 text-emerald-500" />}
              {isNegative && <TrendingDown className="w-4 h-4 text-red-500" />}
              {isNeutral && <Minus className="w-4 h-4 text-gray-400" />}
              <span
                className={`text-sm font-medium ${
                  isPositive ? 'text-emerald-600' : isNegative ? 'text-red-600' : 'text-gray-500'
                }`}
              >
                {isPositive && '+'}{change}%
              </span>
              {changeLabel && <span className="text-xs text-gray-400 ml-1">{changeLabel}</span>}
            </div>
          )}
        </div>
        <div className="p-3 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl text-emerald-600 group-hover:from-emerald-100 group-hover:to-emerald-200 transition-all duration-300">
          {icon}
        </div>
      </div>
    </motion.div>
  );
}
