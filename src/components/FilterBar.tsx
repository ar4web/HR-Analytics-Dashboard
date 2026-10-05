import { motion } from 'framer-motion';
import { Filter, X, ChevronDown } from 'lucide-react';
import { useState } from 'react';

interface FilterOption {
  label: string;
  value: string;
}

interface FilterConfig {
  key: string;
  label: string;
  options: FilterOption[];
}

interface FilterBarProps {
  filters: FilterConfig[];
  activeFilters: Record<string, string>;
  onFilterChange: (key: string, value: string) => void;
  onClearFilters: () => void;
}

export function FilterBar({ filters, activeFilters, onFilterChange, onClearFilters }: FilterBarProps) {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const activeCount = Object.values(activeFilters).filter(v => v !== 'all').length;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"
    >
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2 text-gray-600">
          <Filter className="w-4 h-4" />
          <span className="text-sm font-medium">Filters:</span>
        </div>
        
        {filters.map((filter) => (
          <div key={filter.key} className="relative">
            <button
              onClick={() => setOpenDropdown(openDropdown === filter.key ? null : filter.key)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeFilters[filter.key] !== 'all'
                  ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-transparent'
              }`}
            >
              {filter.label}: {filter.options.find(o => o.value === activeFilters[filter.key])?.label || 'All'}
              <ChevronDown className={`w-4 h-4 transition-transform ${openDropdown === filter.key ? 'rotate-180' : ''}`} />
            </button>
            
            {openDropdown === filter.key && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 min-w-[150px]"
              >
                {filter.options.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      onFilterChange(filter.key, option.value);
                      setOpenDropdown(null);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                      activeFilters[filter.key] === option.value
                        ? 'bg-emerald-50 text-emerald-700 font-medium'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </motion.div>
            )}
          </div>
        ))}
        
        {activeCount > 0 && (
          <button
            onClick={onClearFilters}
            className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <X className="w-4 h-4" />
            Clear ({activeCount})
          </button>
        )}
      </div>
    </motion.div>
  );
}
