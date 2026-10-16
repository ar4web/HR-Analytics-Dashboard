/**
 * Shared UI primitives.
 *
 * These lived inside `App.tsx` while it was the only screen. Now that there are
 * separate modules, they live here so every module renders its panels, headers
 * and status pills the same way — the alternative is each module reinventing
 * the card, which is how a ten-module app ends up looking like ten apps.
 */
import { Lock, Inbox, ShieldAlert, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Tone } from './KPICard';

export type { Tone };

/** Section wrapper: the surface card every panel sits in. */
export function Panel({
  children,
  className = '',
  delay = 0,
  tone,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  tone?: Tone;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay }}
      className={`${tone ? `tone-${tone} ` : ''}surface pad-panel ${className}`}
    >
      {children}
    </motion.div>
  );
}

/**
 * Panel heading. Accepts a bilingual title because the interface ships in both
 * English and Arabic; the Arabic line renders RTL whatever the document
 * direction is, so it stays correct in an English-layout page.
 */
export function CardHeader({
  title,
  titleAr,
  subtitle,
  subtitleAr,
  icon,
  tone = 'emerald',
  children,
}: {
  title: string;
  titleAr?: string;
  subtitle?: string;
  subtitleAr?: string;
  icon?: React.ReactNode;
  tone?: Tone;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        {icon && (
          <span className={`tile tone-${tone} grid h-9 w-9 shrink-0 place-items-center rounded-xl`}>
            {icon}
          </span>
        )}
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
            <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-strong">{title}</h3>
            {titleAr && (
              <span dir="rtl" lang="ar" className="text-[13px] font-medium text-muted">
                {titleAr}
              </span>
            )}
          </div>
          {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
          {subtitleAr && (
            <p dir="rtl" lang="ar" className="mt-0.5 text-[11px] text-subtle">
              {subtitleAr}
            </p>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}

export function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {items.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 rounded-full ring-2 ring-surface"
            style={{ backgroundColor: item.color, boxShadow: `0 1px 4px -1px ${item.color}aa` }}
          />
          <span className="text-[11px] font-medium text-body">{item.label}</span>
        </span>
      ))}
    </div>
  );
}

export function MiniStat({
  label,
  value,
  tone = 'slate',
  hint,
}: {
  label: string;
  value: string | number;
  tone?: Tone;
  hint?: string;
}) {
  return (
    <div
      className={`tone-${tone} flex items-center gap-3 rounded-xl border border-hair bg-gradient-to-br from-surface to-surface-2 px-3.5 py-2.5 shadow-soft`}
      title={hint}
    >
      <span className="tile grid h-7 w-7 shrink-0 place-items-center rounded-lg">
        <span className="h-1.5 w-1.5 rounded-full bg-surface" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-[11px] font-medium uppercase tracking-wide text-muted">{label}</p>
        <p className="tnum truncate text-sm font-bold text-strong">{value}</p>
      </div>
    </div>
  );
}

/**
 * Status pill. Uses an explicit status rather than a colour name so callers
 * cannot accidentally encode "good" as green in the high-contrast theme, where
 * chips also carry a ▲/▼ glyph.
 */
export function StatusPill({
  status,
  children,
}: {
  status: 'good' | 'warn' | 'bad' | 'neutral';
  children: React.ReactNode;
}) {
  const cls =
    status === 'good' ? 'chip-positive'
    : status === 'bad' ? 'chip-negative'
    : 'chip-neutral';
  return <span className={`chip ${cls}`}>{children}</span>;
}

/** Labelled progress bar, used for Saudization against target. */
export function ProgressBar({
  percent,
  target,
  tone = 'emerald',
  label,
}: {
  percent: number;
  target?: number;
  tone?: Tone;
  label?: string;
}) {
  const capped = Math.max(0, Math.min(100, percent));
  return (
    // The tone class has to be on this element: `.tile` reads --tone-* from its
    // nearest .tone-* ancestor, so without it every bar in a panel would take
    // the panel's tone and the per-row colour would be silently ignored.
    <div className={`tone-${tone}`}>
      <div className="relative flex h-2 overflow-hidden rounded-full bg-sunken ring-1 ring-inset ring-hair-strong/60">
        <motion.span
          initial={{ width: 0 }}
          animate={{ width: `${capped}%` }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className={`tile h-full`}
        />
      </div>
      {target !== undefined && (
        <p className="tnum mt-1.5 text-[10px] font-medium text-subtle">
          {label ?? `${percent.toFixed(1)}% of ${target}% target`}
        </p>
      )}
    </div>
  );
}

/** Compact key/value row used across the compliance tables. */
export function DataRow({
  label,
  value,
  hint,
  tone = 'slate',
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  hint?: string;
  tone?: Tone;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-hair/80 py-2 last:border-0" title={hint}>
      <span className={`tone-${tone} flex items-center gap-2 text-xs text-body`}>
        <span className="tile h-1.5 w-1.5 shrink-0 rounded-full" aria-hidden />
        {label}
      </span>
      <span className="tnum shrink-0 text-xs font-semibold text-strong">{value}</span>
    </div>
  );
}

/**
 * Masks a value the active role may not see.
 *
 * Deliberately renders a placeholder rather than omitting the field: an
 * absent column looks like a bug, whereas a locked one tells the viewer the
 * data exists and who may see it. `reason` is not decoration — "Finance or HR
 * Admin" is the actionable part.
 */
export function Sensitive({
  allowed,
  reason,
  children,
  masked = '•••••',
}: {
  allowed: boolean;
  reason: string;
  children: React.ReactNode;
  masked?: string;
}) {
  if (allowed) return <>{children}</>;
  return (
    <span
      className="inline-flex items-center gap-1.5 text-subtle"
      title={`Masked by role — visible to ${reason}`}
    >
      <Lock className="h-3 w-3 shrink-0" aria-hidden />
      <span className="tnum select-none" aria-hidden>{masked}</span>
      <span className="sr-only">Hidden — visible to {reason}</span>
    </span>
  );
}

/**
 * The state vocabulary every module needs. A dashboard that renders only its
 * happy path is a demo: an empty queue, a filtered-to-nothing table and a
 * role-restricted module all have to say what happened.
 */
export function EmptyState({
  kind = 'empty',
  title,
  titleAr,
  description,
  action,
}: {
  kind?: 'empty' | 'no-results' | 'restricted' | 'error';
  title: string;
  titleAr?: string;
  description: string;
  action?: React.ReactNode;
}) {
  const Icon = kind === 'restricted' ? ShieldAlert : kind === 'no-results' ? Search : Inbox;
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      <span
        className={`tile grid h-11 w-11 place-items-center rounded-full ${
          kind === 'restricted' ? 'tone-amber' : kind === 'error' ? 'tone-rose' : 'tone-slate'
        }`}
      >
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="text-sm font-semibold text-strong">{title}</p>
        {titleAr && (
          <p dir="rtl" lang="ar" className="mt-0.5 text-xs text-muted">{titleAr}</p>
        )}
      </div>
      <p className="max-w-sm text-xs leading-relaxed text-muted">{description}</p>
      {action}
    </div>
  );
}

/**
 * Chip-group filter. One control per facet, all visible at once — a dropdown
 * per filter hides the current state behind a click, and the blueprint bars
 * page-level search boxes, so facets are the whole filtering vocabulary here.
 */
export function FilterChips({
  label,
  labelAr,
  options,
  value,
  onChange,
}: {
  label: string;
  labelAr?: string;
  options: { value: string; label: string; count?: number }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="min-w-0">
      <div className="mb-1.5 flex items-baseline gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">{label}</span>
        {labelAr && (
          <span dir="rtl" lang="ar" className="text-[10px] text-subtle">{labelAr}</span>
        )}
      </div>
      <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(option.value)}
              className={`inline-flex min-h-[32px] items-center gap-1.5 rounded-full border px-3 text-[11px] font-medium transition-colors ${
                active
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700'
                  : 'border-hair bg-surface text-body hover:border-hair-strong hover:text-strong'
              }`}
            >
              {option.label}
              {option.count !== undefined && (
                <span className="tnum text-[10px] text-subtle">{option.count}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Scrollable table shell.
 *
 * The wrapper scrolls rather than the page, and the table keeps a minimum width
 * so columns compress to a readable floor instead of collapsing. Below `md`
 * callers render their own stacked cards — squashing a nine-column table into
 * 360px is never the right answer.
 */
export function TableShell({
  children,
  minWidth = 720,
  caption,
}: {
  children: React.ReactNode;
  minWidth?: number;
  caption?: string;
}) {
  return (
    <div className="overflow-x-auto" role="region" aria-label={caption} tabIndex={0}>
      <table className="w-full text-start" style={{ minWidth }}>
        {caption && <caption className="sr-only">{caption}</caption>}
        {children}
      </table>
    </div>
  );
}

/** Sortable column header. */
export function SortHeader({
  label,
  active,
  direction,
  onClick,
  align = 'start',
  className = '',
}: {
  label: string;
  active: boolean;
  direction: 'asc' | 'desc';
  onClick: () => void;
  align?: 'start' | 'end';
  className?: string;
}) {
  return (
    <th
      scope="col"
      className={`px-3 py-2 font-semibold ${align === 'end' ? 'text-end' : 'text-start'} ${className}`}
      aria-sort={active ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex items-center gap-1 transition-colors hover:text-strong ${
          active ? 'text-strong' : ''
        }`}
      >
        {label}
        <span aria-hidden className={active ? 'opacity-100' : 'opacity-30'}>
          {active && direction === 'desc' ? '\u2193' : '\u2191'}
        </span>
      </button>
    </th>
  );
}

/** Pagination footer for any list. */
export function Pagination({
  page,
  pages,
  total,
  pageSize,
  onPage,
  onPageSize,
  label = 'rows',
}: {
  page: number;
  pages: number;
  total: number;
  pageSize: number;
  onPage: (page: number) => void;
  onPageSize?: (size: number) => void;
  label?: string;
}) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-hair pt-3">
      <p className="tnum text-[11px] text-muted">
        {from.toLocaleString()}–{to.toLocaleString()} of {total.toLocaleString()} {label}
      </p>
      <div className="flex items-center gap-2">
        {onPageSize && (
          <label className="flex items-center gap-1.5 text-[11px] text-muted">
            <span className="sr-only">Rows per page</span>
            <select
              value={pageSize}
              onChange={(event) => onPageSize(Number(event.target.value))}
              className="rounded-lg border border-hair bg-surface px-2 py-1 text-[11px] font-medium text-body"
            >
              {[10, 25, 50, 100].map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </label>
        )}
        <button
          type="button"
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          className="min-h-[32px] rounded-lg border border-hair bg-surface px-3 text-[11px] font-medium text-body transition-colors hover:border-hair-strong hover:text-strong disabled:cursor-not-allowed disabled:opacity-40"
        >
          Previous
        </button>
        <span className="tnum text-[11px] text-muted">
          {page} / {Math.max(1, pages)}
        </span>
        <button
          type="button"
          onClick={() => onPage(page + 1)}
          disabled={page >= pages}
          className="min-h-[32px] rounded-lg border border-hair bg-surface px-3 text-[11px] font-medium text-body transition-colors hover:border-hair-strong hover:text-strong disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
