/**
 * Shared UI primitives.
 *
 * These lived inside `App.tsx` while it was the only screen. Now that there are
 * separate modules, they live here so every module renders its panels, headers
 * and status pills the same way — the alternative is each module reinventing
 * the card, which is how a ten-module app ends up looking like ten apps.
 */
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
