import { Construction } from 'lucide-react';
import { CardHeader, EmptyState, Panel } from './ui';

/**
 * Placeholder for a module that exists in the navigation but has not been built
 * yet.
 *
 * The alternative was letting these keys fall through to the dashboard, which
 * meant clicking "Recruitment" showed a breadcrumb reading *Recruitment* above
 * the overview's charts — a small lie that makes the whole app feel unreliable.
 * Saying what is coming, and which phase brings it, costs one screen.
 */
const PLAN: Record<string, { phase: number; title: string; description: string }> = {
  analytics: {
    phase: 6,
    title: 'Analytics',
    description: 'The exploratory surface: every series with its definition, a data-table alternative beside each chart, and drill-down from any figure to the rows behind it.',
  },
  departments: {
    phase: 3,
    title: 'Departments',
    description: 'Headcount against budget, span of control, growth and attrition per department — the table that currently sits on the overview, given its own module.',
  },
  recruitment: {
    phase: 3,
    title: 'Recruitment',
    description: 'Funnel by stage, time-to-fill and time-to-hire, cost-per-hire, offer acceptance and source effectiveness, all from the requisition records.',
  },
  attendance: {
    phase: 2,
    title: 'Attendance & Time',
    description: 'Absence reasons, lateness and overtime on the Sunday–Thursday week, a single-hue pattern heatmap, and the Ramadan and prayer-break hours that change the working day.',
  },
  performance: {
    phase: 4,
    title: 'Performance',
    description: 'Rating distribution, review completion, the 9-box grid and the cohorts at either end — built on the performance records already in the population.',
  },
  training: {
    phase: 4,
    title: 'Learning & Skills',
    description: 'Course completion, time-to-competency and skills gaps. The first module needing a new data set: it cannot be derived from the employee records alone.',
  },
  reports: {
    phase: 5,
    title: 'Reports',
    description: 'Saved reports, scheduled exports and the ISO 30414 view, so a compliance pack is a scheduled output rather than a manual assembly.',
  },
  settings: {
    phase: 5,
    title: 'Settings & Admin',
    description: 'Roles and permissions, metric targets, appearance defaults and the audit log that records who saw which record.',
  },
  help: {
    phase: 6,
    title: 'Help & Glossary',
    description: 'The metric dictionary — name, formula, source, cadence and owner for every figure in the app — plus keyboard shortcuts.',
  },
};

export function UpcomingModule({ moduleKey }: { moduleKey: string }) {
  const entry = PLAN[moduleKey];

  return (
    <Panel>
      <CardHeader
        title={entry?.title ?? 'Module'}
        titleAr="قيد الإنشاء"
        subtitle={`Planned for phase ${entry?.phase ?? '—'} of the delivery plan`}
        icon={<Construction className="w-4.5 h-4.5" />}
        tone="amber"
      />
      <EmptyState
        kind="empty"
        title={`${entry?.title ?? 'This module'} is not built yet`}
        titleAr="لم يتم إنشاء هذه الوحدة بعد"
        description={entry?.description ?? 'This module is on the delivery plan.'}
      />
      <p className="text-center text-[11px] text-subtle">
        Phase order and contents: <span className="font-medium text-body">MODULE-PLAN.md</span>
      </p>
    </Panel>
  );
}
