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
      <div className="tone-slate flex items-center gap-2.5 ps-1 pe-2">
        <span className="tile grid h-8 w-8 place-items-center rounded-lg">
          <SlidersHorizontal className="h-4 w-4" />
        </span>
        <div className="leading-tight">
          <p className="text-xs font-semibold text-strong">Filters</p>
          <p className="text-[11px] text-muted">
            {activeCount === 0 ? 'Showing all data' : `${activeCount} active`}
          </p>
        </div>
      </div>

      <span className="hidden h-8 w-px bg-sunken-strong sm:block" />

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
                  : 'bg-surface text-body ring-1 ring-hair-strong hover:bg-sunken hover:text-strong'
              }`}
            >
              <Filter className={`h-3.5 w-3.5 ${isActive ? 'text-emerald-500' : 'text-subtle'}`} />
              <span className="text-subtle">{filter.label}</span>
              <span className={isActive ? 'text-emerald-800' : 'text-body'}>
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
                    className="absolute start-0 top-full z-50 mt-2 max-h-72 min-w-[190px] overflow-y-auto rounded-xl border border-hair bg-surface py-1.5 shadow-pop ring-1 ring-hair"
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
                          className={`flex w-full items-center gap-2 px-3 py-2 text-start text-sm transition-colors ${
                            isSelected
                              ? 'bg-emerald-50 font-medium text-emerald-700'
                              : 'text-body hover:bg-sunken'
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
          <span className="hidden h-8 w-px bg-sunken-strong sm:block" />
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
      className="h-3.5 w-3.5 text-subtle"
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
