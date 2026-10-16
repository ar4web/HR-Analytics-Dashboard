import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Contrast, Languages, Monitor, Moon, Rows3, Settings, Sun, X } from 'lucide-react';
import {
  useAppearance,
  type Density,
  type Direction,
  type ThemeChoice,
} from '../theme/appearance';

const THEME_OPTIONS: { value: ThemeChoice; label: string; hint: string; icon: typeof Sun }[] = [
  { value: 'system', label: 'System', hint: 'Follow device', icon: Monitor },
  { value: 'light', label: 'Light', hint: 'Default', icon: Sun },
  { value: 'dark', label: 'Dark', hint: 'Low light', icon: Moon },
  { value: 'contrast', label: 'High contrast', hint: 'WCAG AA+', icon: Contrast },
];

const DENSITY_OPTIONS: { value: Density; label: string; hint: string }[] = [
  { value: 'compact', label: 'Compact', hint: 'More rows on screen' },
  { value: 'comfortable', label: 'Comfortable', hint: 'Default' },
  { value: 'executive', label: 'Executive', hint: 'Presentation spacing' },
];

const DIRECTION_OPTIONS: { value: Direction; label: string; hint: string }[] = [
  { value: 'ltr', label: 'English (LTR)', hint: 'Left to right' },
  { value: 'rtl', label: 'العربية (RTL)', hint: 'Right to left' },
];

/**
 * Appearance popover behind the header's settings control: theme, density and
 * direction. Presentation only — it writes to ThemeProvider, which owns the
 * data attributes on <html>.
 */
export function ThemeMenu() {
  const { theme, density, direction, setTheme, setDensity, setDirection, reset } = useAppearance();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Appearance settings"
        aria-expanded={open}
        className="grid h-9 w-9 place-items-center rounded-xl border border-hair-strong bg-surface/80 text-body shadow-soft transition-colors hover:bg-surface hover:text-strong"
      >
        <Settings
          className={`h-4 w-4 transition-transform duration-300 ${open ? 'rotate-90' : ''}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              role="dialog"
              aria-label="Appearance settings"
              className="absolute end-0 top-full z-50 mt-2 w-[17rem] max-w-[calc(100vw-2rem)] rounded-xl border border-hair-strong bg-surface p-3 shadow-pop"
            >
              <div className="mb-2 flex items-center justify-between px-1">
                <p className="text-xs font-semibold text-strong">Appearance</p>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={reset}
                    className="rounded-md px-1.5 py-0.5 text-[11px] font-medium text-muted transition-colors hover:bg-sunken hover:text-strong"
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label="Close appearance settings"
                    className="grid h-5 w-5 place-items-center rounded-md text-subtle transition-colors hover:bg-sunken hover:text-strong"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>

              <Group label="Theme">
                {THEME_OPTIONS.map((option) => (
                  <Row
                    key={option.value}
                    selected={theme === option.value}
                    onClick={() => setTheme(option.value)}
                    icon={<option.icon className="h-3.5 w-3.5" />}
                    label={option.label}
                    hint={option.hint}
                  />
                ))}
              </Group>

              <Group label="Density" icon={<Rows3 className="h-3 w-3" />}>
                {DENSITY_OPTIONS.map((option) => (
                  <Row
                    key={option.value}
                    selected={density === option.value}
                    onClick={() => setDensity(option.value)}
                    label={option.label}
                    hint={option.hint}
                  />
                ))}
              </Group>

              <Group label="Direction" icon={<Languages className="h-3 w-3" />}>
                {DIRECTION_OPTIONS.map((option) => (
                  <Row
                    key={option.value}
                    selected={direction === option.value}
                    onClick={() => setDirection(option.value)}
                    label={option.label}
                    hint={option.hint}
                  />
                ))}
              </Group>

              <p className="mt-1 border-t border-hair px-1 pt-2 text-[10px] leading-relaxed text-subtle">
                Direction switches the layout to RTL. Interface copy is not translated yet.
              </p>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function Group({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-2 last:mb-0">
      <p className="mb-1 flex items-center gap-1.5 px-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-subtle">
        {icon}
        {label}
      </p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function Row({
  selected,
  onClick,
  icon,
  label,
  hint,
}: {
  selected: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  label: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-start transition-colors ${
        selected ? 'bg-sunken text-strong' : 'text-body hover:bg-sunken/60 hover:text-strong'
      }`}
    >
      {icon && <span className={selected ? 'text-emerald-600' : 'text-subtle'}>{icon}</span>}
      <span className="flex-1">
        <span className="block text-xs font-medium">{label}</span>
        <span className="block text-[10px] text-subtle">{hint}</span>
      </span>
      {selected && <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" />}
    </button>
  );
}
