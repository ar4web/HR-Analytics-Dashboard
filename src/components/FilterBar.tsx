import { motion, AnimatePresence } from 'framer-motion';
import { Check, Filter, RotateCcw, SlidersHorizontal, X } from 'lucide-react';
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
  const activeEntries = filters.filter((f) => activeFilters[f.key] !== 'all');
  const activeCount = activeEntries.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="surface no-print flex flex-wrap items-center gap-3 p-3.5"
    >
      <div className="tone-slate flex items-center gap-2.5 pl-1 pr-2">
        <span className="tile grid h-8 w-8 place-items-center rounded-lg">
          <SlidersHorizontal className="h-4 w-4" />
        </span>
        <div className="leading-tight">
          <p className="text-xs font-semibold text-gray-900">Filters</p>
          <p className="text-[11px] text-gray-500">
            {activeCount === 0 ? 'Showing all data' : `${activeCount} active`}
          </p>
        </div>
      </div>

      <span className="hidden h-8 w-px bg-gray-200 sm:block" />

      {filters.map((filter) => {
        const isActive = activeFilters[filter.key] !== 'all';
        const selected = filter.options.find((o) => o.value === activeFilters[filter.key]);

        return (
          <div key={filter.key} className="relative">
            <button
              type="button"
              onClick={() => setOpenDropdown(openDropdown === filter.key ? null : filter.key)}
              aria-expanded={openDropdown === filter.key}
              className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium shadow-soft transition-all duration-200 ${
                isActive
                  ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 hover:ring-emerald-300'
                  : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Filter className={`h-3.5 w-3.5 ${isActive ? 'text-emerald-500' : 'text-gray-400'}`} />
              <span className="text-gray-400">{filter.label}</span>
              <span className={isActive ? 'text-emerald-800' : 'text-gray-700'}>
                {isActive ? selected?.label : 'All'}
              </span>
              <ChevronToggle open={openDropdown === filter.key} />
            </button>

            <AnimatePresence>
              {openDropdown === filter.key && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setOpenDropdown(null)} aria-hidden />
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                    className="absolute left-0 top-full z-50 mt-2 max-h-72 min-w-[190px] overflow-y-auto rounded-xl border border-gray-100 bg-white py-1.5 shadow-pop ring-1 ring-gray-900/5"
                  >
                    {filter.options.map((option) => {
                      const isSelected = activeFilters[filter.key] === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => {
                            onFilterChange(filter.key, option.value);
                            setOpenDropdown(null);
                          }}
                          className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                            isSelected
                              ? 'bg-emerald-50 font-medium text-emerald-700'
                              : 'text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          <span className="flex-1 truncate">{option.label}</span>
                          {isSelected && <Check className="h-3.5 w-3.5 text-emerald-600" />}
                        </button>
                      );
                    })}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        );
      })}

      {activeCount > 0 && (
        <>
          <span className="hidden h-8 w-px bg-gray-200 sm:block" />
          <button
            type="button"
            onClick={onClearFilters}
            className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
            <span className="grid h-4 min-w-4 place-items-center rounded-full bg-rose-100 px-1 text-[10px] font-bold text-rose-700">
              {activeCount}
            </span>
            <X className="h-3.5 w-3.5" />
          </button>
        </>
      )}
    </motion.div>
  );
}

function ChevronToggle({ open }: { open: boolean }) {
  return (
    <motion.svg
      animate={{ rotate: open ? 180 : 0 }}
      transition={{ duration: 0.2 }}
      className="h-3.5 w-3.5 text-gray-400"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m6 9 6 6 6-6" />
    </motion.svg>
  );
}
