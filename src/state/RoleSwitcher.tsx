import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ShieldCheck, Check } from 'lucide-react';
import { ROLES, type RoleId, useRole } from './role';

/**
 * Header role switcher.
 *
 * Shows the active role at all times, because a masked screen with no
 * explanation reads as a bug — the label is what tells an HR admin that the
 * payroll figures are missing on purpose.
 */
export function RoleSwitcher() {
  const { role, setRoleId } = useRole();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Active role: ${role.label}. Change role`}
        className="flex items-center gap-2 rounded-xl border border-hair-strong bg-surface/80 px-2.5 py-1.5 text-xs font-medium text-body shadow-soft transition-colors hover:bg-surface hover:text-strong"
      >
        <ShieldCheck className="w-4 h-4 text-emerald-600" />
        <span className="hidden sm:inline">{role.label}</span>
        <ChevronDown className="w-3.5 h-3.5 text-subtle" />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Switch role"
          className="absolute end-0 top-[calc(100%+8px)] z-50 w-80 overflow-hidden rounded-xl border border-hair-strong bg-surface p-1.5 shadow-2xl"
        >
          <p className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
            Viewing as
          </p>
          {ROLES.map((option) => {
            const active = option.id === role.id;
            return (
              <button
                key={option.id}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  setRoleId(option.id as RoleId);
                  setOpen(false);
                }}
                className={`flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-start transition-colors ${
                  active ? 'bg-sunken-strong/70' : 'hover:bg-sunken-strong/50'
                }`}
              >
                <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center">
                  {active ? (
                    <Check className="h-3.5 w-3.5 text-emerald-600" strokeWidth={3} />
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full bg-hair-strong" />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="flex flex-wrap items-baseline gap-x-2">
                    <span className="text-xs font-semibold text-strong">{option.label}</span>
                    <span dir="rtl" lang="ar" className="text-[10px] text-subtle">
                      {option.labelAr}
                    </span>
                  </span>
                  <span className="mt-0.5 block text-[11px] text-muted">{option.summary}</span>
                </span>
              </button>
            );
          })}
          <p className="mt-1 border-t border-hair px-2.5 pt-2 text-[10px] leading-relaxed text-subtle">
            Switching a role is a demonstration of access control, not an authentication check.
          </p>
        </div>
      )}
    </div>
  );
}
