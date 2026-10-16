/**
 * Payroll & Comp.
 *
 * The module answers three questions in order of who asks them: what does
 * employment cost (Finance), is any of it wrong (payroll control), and how does
 * pay sit against the market and the band (HR). The third is why the salary and
 * compa-ratio panels go through `Sensitive` — a line manager sees the cost
 * question without seeing individuals' pay.
 */
import {
  Banknote, ShieldCheck, TrendingDown, AlertTriangle, Scale, Coins,
} from 'lucide-react';
import {
  BarChart } from './BarChart';
import {
  CardHeader, DataRow, EmptyState, MiniStat, Panel, ProgressBar, Sensitive,
  StatusPill, TableShell,
} from './ui';
import { useRole } from '../state/role';
import {
  allowanceSplit, bandSummary, budgetPosition, employerBurden, pay, payAnomalies,
  payByDepartment, payrollBasis, payrollRuns, wps,
} from '../data/payroll';
import { formatSAR, formatSARCompact } from '../data/saudi';
import { CATEGORICAL } from '../data/palette';

const ANOMALY_TONE: Record<string, 'warn' | 'bad' | 'neutral'> = {
  'below-band': 'warn',
  'above-band': 'neutral',
  unregistered: 'bad',
  'no-gosi': 'bad',
};

export function PayrollModule() {
  const { role } = useRole();
  const can = role.can;

  // A module-level gate, not a masked column: if a role may not see payroll at
  // all, the honest answer is a restricted state that says so.
  if (!can.viewPayroll) {
    return (
      <Panel>
        <EmptyState
          kind="restricted"
          title="Payroll is not available to this role"
          titleAr="الرواتب غير متاحة لهذا الدور"
          description={`The ${role.label} role sees headcount, Saudization and team records, but payroll cost and individual pay belong to Finance and HR Admin. Switch role in the header to view it.`}
        />
      </Panel>
    );
  }

  const anomaliesByKind = {
    below: payAnomalies.filter((a) => a.kind === 'below-band').length,
    above: payAnomalies.filter((a) => a.kind === 'above-band').length,
    unregistered: payAnomalies.filter((a) => a.kind === 'unregistered' || a.kind === 'no-gosi').length,
  };

  const bandChart = bandSummary.bands.map((band, index) => ({
    label: band.range,
    value: band.count,
    // Ordered ramp rather than a status colour: these are bands of a single
    // distribution, not categories in competition.
    color: CATEGORICAL[index % CATEGORICAL.length],
  }));

  const compaChart = payByDepartment.map((dept) => ({
    label: dept.name,
    value: dept.compaRatio,
    color: dept.compaRatio < 95 ? '#f59e0b' : dept.compaRatio > 105 ? '#6366f1' : '#10b981',
  }));

  return (
    <div className="section-stack">
      {/* Cost position ---------------------------------------------------- */}
      <Panel>
        <CardHeader
          title="Payroll Cost"
          titleAr="تكلفة الرواتب"
          subtitle={`${payByDepartment.reduce((sum, d) => sum + d.headcount, 0).toLocaleString()} paid staff · reporting month`}
          icon={<Banknote className="w-4.5 h-4.5" />}
        >
          <StatusPill status={budgetPosition.utilization > 100 ? 'bad' : 'good'}>
            {budgetPosition.utilization}% of budget
          </StatusPill>
        </CardHeader>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <MiniStat label="Monthly payroll" value={formatSARCompact(employerBurden.payrollMonthly)} tone="emerald" />
          <MiniStat label="Annualised" value={formatSARCompact(employerBurden.payrollAnnual)} tone="sky" />
          <MiniStat label="Average monthly" value={formatSAR(pay.averageMonthly)} tone="violet" hint={`Median ${formatSAR(pay.medianMonthly)}`} />
          <MiniStat label="Compa-ratio" value={`${pay.compaRatio}%`} tone="indigo" hint="Mean pay as a share of the role midpoint" />
          <MiniStat label="Budget left" value={formatSARCompact(budgetPosition.variance)} tone="amber" hint={`Annual budget ${formatSARCompact(budgetPosition.budget)}`} />
          <MiniStat label="Cost per head" value={formatSARCompact(employerBurden.perHeadAnnual)} tone="cyan" hint="Salary plus GOSI and levy, per year" />
        </div>

        <div className="mt-4">
          <ProgressBar
            percent={budgetPosition.utilization}
            target={100}
            tone={budgetPosition.utilization > 100 ? 'rose' : 'emerald'}
            label={`${formatSARCompact(budgetPosition.actual)} of ${formatSARCompact(budgetPosition.budget)} committed`}
          />
        </div>
      </Panel>

      {/* Employer burden + allowances ------------------------------------- */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Panel delay={0.05}>
          <CardHeader
            title="Cost of Employment"
            titleAr="تكلفة التوظيف"
            subtitle={`Salary is ${(100 - employerBurden.overheadShare).toFixed(1)}% of the total`}
            icon={<Coins className="w-4.5 h-4.5" />}
            tone="violet"
          />
          <div className="mt-1">
            <DataRow label="Salaries, annual" value={formatSARCompact(employerBurden.payrollAnnual)} tone="emerald" />
            <DataRow
              label={`GOSI, employer (${payrollBasis.saudiEmployer}% / ${payrollBasis.expatEmployer}%)`}
              value={formatSARCompact(employerBurden.gosiAnnual)}
              tone="indigo"
            />
            <DataRow
              label="Expatriate levy"
              value={formatSARCompact(employerBurden.levyAnnual)}
              tone="cyan"
              hint={`${formatSAR(payrollBasis.levyAnnual)} per expatriate per year`}
            />
            <DataRow label="Total cash cost" value={formatSARCompact(employerBurden.totalAnnual)} tone="slate" />
            <DataRow
              label="End-of-service accrual"
              value={formatSARCompact(employerBurden.eosbAccrued)}
              tone="amber"
              hint="A liability, not cash paid this year — kept out of the column above"
            />
          </div>
          <p className="mt-3 text-[10px] leading-relaxed text-subtle">
            Employer overhead runs{' '}
            <span className="tnum font-semibold text-body">{employerBurden.overheadShare}%</span> on
            top of gross salary. The GOSI rates and the levy are regulated and move by ministerial
            decision; the 25% housing and 10% transport allowances are market practice, both stated
            as percentages of basic pay.
          </p>
        </Panel>

        <Panel delay={0.1}>
          <CardHeader
            title="Pay Structure"
            titleAr="هيكل الأجر"
            subtitle="Basic and allowances, monthly"
            icon={<Scale className="w-4.5 h-4.5" />}
            tone="emerald"
          />
          <div className="flex h-3 overflow-hidden rounded-full ring-1 ring-inset ring-hair-strong/60">
            {[
              { share: allowanceSplit.basicShare, color: '#0072b2' },
              { share: allowanceSplit.housingShare, color: '#56b4e9' },
              { share: allowanceSplit.transportShare, color: '#e69f00' },
            ].map((segment, index) => (
              <span
                key={index}
                style={{ width: `${segment.share}%`, backgroundColor: segment.color }}
                className="block h-full"
              />
            ))}
          </div>
          <div className="mt-3">
            <DataRow label={`Basic · ${allowanceSplit.basicShare}%`} value={formatSARCompact(allowanceSplit.basic)} tone="sky" />
            <DataRow label={`Housing · ${allowanceSplit.housingShare}%`} value={formatSARCompact(allowanceSplit.housing)} tone="cyan" />
            <DataRow label={`Transport · ${allowanceSplit.transportShare}%`} value={formatSARCompact(allowanceSplit.transport)} tone="amber" />
            <DataRow label="Monthly gross" value={formatSARCompact(allowanceSplit.total)} tone="slate" />
          </div>
          <p className="mt-3 text-[10px] leading-relaxed text-subtle">
            Housing is 25% and transport 10% <span className="font-semibold">of basic</span>, so they
            come to {allowanceSplit.housingShare}% and {allowanceSplit.transportShare}% of gross. The
            Labour Law requires housing to be provided; it does not fix a percentage.
          </p>
        </Panel>

        <Panel delay={0.15}>
          <CardHeader
            title="Wage Protection (WPS)"
            titleAr="حماية الأجور"
            subtitle={`${wps.onTime} of ${wps.runs} cycles on time`}
            icon={<ShieldCheck className="w-4.5 h-4.5" />}
            tone={wps.violations.length > 0 ? 'amber' : 'emerald'}
          />
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="tnum text-3xl font-bold leading-none text-strong">{wps.complianceRate}%</p>
              <p className="mt-1 text-[11px] text-muted">of closed cycles paid on time</p>
            </div>
            <StatusPill status={wps.violations.length > 0 ? 'warn' : 'good'}>
              {wps.violations.length > 0 ? `${wps.violations.length} exception` : 'Compliant'}
            </StatusPill>
          </div>
          <div className="mt-4">
            <DataRow label="Payment deadline" value={`Day ${wps.deadlineDay}`} tone="slate" />
            <DataRow label="Tolerated delay" value={`${wps.allowedDelayDays} days`} tone="slate" />
            <DataRow label="Files accepted" value={wps.filesAccepted} tone="emerald" />
            <DataRow
              label="Files refused"
              value={wps.filesRejected}
              tone={wps.filesRejected > 0 ? 'rose' : 'slate'}
            />
          </div>
          <p className="mt-3 text-[10px] leading-relaxed text-subtle">
            Wages must reach employees through the Wage Protection System via a Saudi bank account.
            Compliance is tracked per cycle, so a run is never reported as clean while it is still
            open.
          </p>
        </Panel>
      </div>

      {/* Distribution and compa-ratio ------------------------------------- */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel delay={0.2}>
          <CardHeader
            title="Salary Bands"
            titleAr="نطاقات الرواتب"
            subtitle={`Monthly gross, ${bandSummary.total.toLocaleString()} paid staff`}
            icon={<Coins className="w-4.5 h-4.5" />}
            tone="sky"
          />
          <div className="chart-plate p-4">
            <BarChart data={bandChart} height={200} />
          </div>
          <p className="mt-3 text-[10px] leading-relaxed text-subtle">
            {bandSummary.belowTenThousand} staff are below SAR 10,000 a month — the band that the
            expatriate levy and the housing allowance bite hardest against.
          </p>
        </Panel>

        <Panel delay={0.25}>
          <CardHeader
            title="Compa-Ratio by Department"
            titleAr="نسبة الأجر إلى منتصف النطاق"
            subtitle="Mean pay against each department's midpoint"
            icon={<Scale className="w-4.5 h-4.5" />}
            tone="indigo"
          />
          <div className="chart-plate p-4">
            <BarChart data={compaChart} height={200} />
          </div>
          <p className="mt-3 text-[10px] leading-relaxed text-subtle">
            100% is the midpoint of the role's range. The whole company sits at {pay.compaRatio}%, so
            the spread between departments matters more than the average: Operations at{' '}
            {payByDepartment.find((d) => d.name === 'Operations')?.compaRatio}% is where pay is most
            likely losing people.
          </p>
        </Panel>
      </div>

      {/* Runs and cost by department -------------------------------------- */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Panel delay={0.3}>
          <CardHeader
            title="Payroll Runs"
            titleAr="دورات الرواتب"
            subtitle="Twelve most recent cycles"
            icon={<ShieldCheck className="w-4.5 w-4.5" />}
            tone="emerald"
          />
          <TableShell minWidth={520} caption="Payroll runs by cycle">
            <thead>
              <tr className="border-b border-hair-strong text-[10px] uppercase tracking-[0.08em] text-muted">
                <th scope="col" className="px-3 py-2 text-start font-semibold">Cycle</th>
                <th scope="col" className="px-3 py-2 text-end font-semibold">Staff</th>
                <th scope="col" className="px-3 py-2 text-end font-semibold">Amount</th>
                <th scope="col" className="px-3 py-2 text-start font-semibold">WPS file</th>
                <th scope="col" className="px-3 py-2 text-start font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {payrollRuns.map((run) => (
                <tr key={run.key} className="row-hover border-b border-hair/80 last:border-0">
                  <td className="px-3 py-2 text-xs text-body">{run.month}</td>
                  <td className="tnum px-3 py-2 text-end text-xs text-body">{run.employees.toLocaleString()}</td>
                  <td className="tnum px-3 py-2 text-end text-xs font-medium text-strong">
                    {formatSARCompact(run.amount)}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {run.wpsFile === 'Rejected' ? (
                      <span className="text-rose-500">Refused</span>
                    ) : run.wpsFile === 'Not submitted' ? (
                      <span className="text-subtle">Not submitted</span>
                    ) : (
                      <span className="text-body">Accepted</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <StatusPill
                      status={run.status === 'On time' ? 'good' : run.status === 'Late' ? 'warn' : 'neutral'}
                    >
                      {run.status}
                      {run.daysLate > 0 ? ` +${run.daysLate}d` : ''}
                    </StatusPill>
                  </td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        </Panel>

        <Panel delay={0.35}>
          <CardHeader
            title="Cost by Department"
            titleAr="التكلفة حسب الإدارة"
            subtitle="Annualised gross against each department's budget"
            icon={<Banknote className="w-4.5 h-4.5" />}
            tone="cyan"
          />
          <TableShell minWidth={620} caption="Payroll cost by department">
            <thead>
              <tr className="border-b border-hair-strong text-[10px] uppercase tracking-[0.08em] text-muted">
                <th scope="col" className="px-3 py-2 text-start font-semibold">Department</th>
                <th scope="col" className="px-3 py-2 text-end font-semibold">Staff</th>
                <th scope="col" className="px-3 py-2 text-end font-semibold">Average</th>
                <th scope="col" className="px-3 py-2 text-end font-semibold">Compa</th>
                <th scope="col" className="px-3 py-2 text-end font-semibold">Annual</th>
                <th scope="col" className="px-3 py-2 text-end font-semibold">Budget</th>
              </tr>
            </thead>
            <tbody>
              {payByDepartment.map((dept) => (
                <tr key={dept.name} className="row-hover border-b border-hair/80 last:border-0">
                  <td className="px-3 py-2">
                    <p className="text-xs font-medium text-strong">{dept.name}</p>
                    <p dir="rtl" lang="ar" className="text-[10px] text-subtle">{dept.nameAr}</p>
                  </td>
                  <td className="tnum px-3 py-2 text-end text-xs text-body">{dept.headcount}</td>
                  <td className="tnum px-3 py-2 text-end text-xs text-body">
                    <Sensitive allowed={can.viewSalaries} reason="Finance or HR Admin">
                      {dept.averageMonthly.toLocaleString()}
                    </Sensitive>
                  </td>
                  <td className="tnum px-3 py-2 text-end text-xs text-body">{dept.compaRatio}%</td>
                  <td className="tnum px-3 py-2 text-end text-xs font-medium text-strong">
                    {formatSARCompact(dept.annualCost)}
                  </td>
                  <td className="px-3 py-2 text-end">
                    <span className="tnum block text-xs text-muted">{formatSARCompact(dept.budget)}</span>
                    <span
                      className={`tnum block text-[10px] ${
                        dept.budgetUtilization > 100 ? 'text-rose-500' : 'text-subtle'
                      }`}
                    >
                      {dept.budgetUtilization}% used
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        </Panel>
      </div>

      {/* Anomalies --------------------------------------------------------- */}
      <Panel delay={0.4}>
        <CardHeader
          title="Pay Anomalies"
          titleAr="حالات تحتاج مراجعة"
          subtitle={`${payAnomalies.length} of ${bandSummary.total.toLocaleString()} staff outside ±20% of midpoint, or not registered`}
          icon={<AlertTriangle className="w-4.5 h-4.5" />}
          tone={anomaliesByKind.unregistered > 0 ? 'amber' : 'emerald'}
        >
          <div className="flex flex-wrap items-center justify-end gap-2">
            <StatusPill status="neutral">{anomaliesByKind.below} below band</StatusPill>
            <StatusPill status="neutral">{anomaliesByKind.above} above band</StatusPill>
            <StatusPill status={anomaliesByKind.unregistered > 0 ? 'bad' : 'good'}>
              {anomaliesByKind.unregistered} unregistered
            </StatusPill>
          </div>
        </CardHeader>

        <Sensitive allowed={can.viewSalaries} reason="Finance or HR Admin" masked="Anomaly detail hidden">
          <TableShell minWidth={560} caption="Pay anomalies">
            <thead>
              <tr className="border-b border-hair-strong text-[10px] uppercase tracking-[0.08em] text-muted">
                <th scope="col" className="px-3 py-2 text-start font-semibold">Employee</th>
                <th scope="col" className="px-3 py-2 text-start font-semibold">Department</th>
                <th scope="col" className="px-3 py-2 text-start font-semibold">Finding</th>
                <th scope="col" className="px-3 py-2 text-start font-semibold">Kind</th>
              </tr>
            </thead>
            <tbody>
              {payAnomalies.slice(0, 8).map((anomaly) => (
                <tr key={`${anomaly.employee.id}-${anomaly.kind}`} className="row-hover border-b border-hair/80 last:border-0">
                  <td className="px-3 py-2">
                    <p className="truncate text-xs font-medium text-strong">{anomaly.employee.nameEn}</p>
                    <p dir="rtl" lang="ar" className="truncate text-[10px] text-subtle">{anomaly.employee.nameAr}</p>
                  </td>
                  <td className="px-3 py-2 text-xs text-body">{anomaly.employee.department}</td>
                  <td className="px-3 py-2 text-[11px] text-body">{anomaly.kind === 'unregistered' ? anomaly.detail : `${(anomaly.employee.compaRatio * 100).toFixed(0)}% — ${anomaly.detail.split('— ')[1] ?? anomaly.detail}`}</td>
                  <td className="px-3 py-2">
                    <StatusPill status={ANOMALY_TONE[anomaly.kind]}>{anomaly.label}</StatusPill>
                  </td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        </Sensitive>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5 text-[11px] text-muted">
            <TrendingDown className="h-3.5 w-3.5" />
            Below band is the retention risk; above band is a budget and pay-equity question.
            Unregistered is a compliance failure and is listed first.
          </span>
        </div>
      </Panel>
    </div>
  );
}
