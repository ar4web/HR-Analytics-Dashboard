/**
 * Saudi compliance module.
 *
 * Everything here maps to something a Saudi establishment is actually measured
 * on or must be able to produce on request:
 *
 *   - Nitaqat / Saudization (MHRSD) — the band determines visa quotas and
 *     whether the company can sponsor new expatriate hires at all.
 *   - GOSI contributions, split Saudi / expatriate.
 *   - WPS wage compliance (Mudad), including late cycles and rejected files.
 *   - Iqama, work permit and passport validity (Muqeem).
 *   - The accrued end-of-service liability under Art. 84.
 *   - The statutory leave and working-hour framework the rest of the app
 *     reports against, including Ramadan hours.
 *
 * Where a rate is configurable (GOSI percentages, the expat levy, Nitaqat
 * thresholds) it is stated with its basis, because these change by ministerial
 * decision and a dashboard that hides its assumptions is worse than none.
 */
import {
  ShieldCheck, Users, FileWarning, Landmark, Scale, CalendarClock, HeartHandshake,
  Sun,
} from 'lucide-react';
import { CardHeader, DataRow, MiniStat, Panel, ProgressBar, StatusPill } from './ui';
import {
  documentAlerts, documents, endOfService, expatCosts, gosi, labourLawReference,
  nitaqatLadder, payrollRuns, prayerSchedule, ramadan, saudiHolidays, saudization,
  workingHours, wps, type NitaqatBand,
} from '../data/compliance';
import { formatSAR, formatSARCompact } from '../data/saudi';

/** Tone per Nitaqat band, so the band colour is decided in one place. */
const BAND_TONE: Record<NitaqatBand, 'emerald' | 'sky' | 'cyan' | 'indigo' | 'amber' | 'rose'> = {
  Platinum: 'emerald',
  'Green (High)': 'sky',
  'Green (Mid)': 'cyan',
  'Green (Low)': 'indigo',
  Yellow: 'amber',
  Red: 'rose',
};

export function CompliancePanel({ focus = 'all' }: { focus?: 'all' | 'documents' }) {
  const bandTone = BAND_TONE[saudization.band];
  const all = focus === 'all';

  return (
    <div className="space-y-6">
      {all && (
        <>
      {/* ---------------------------------------------------------------- */}
      {/* Nitaqat / Saudization                                            */}
      {/* ---------------------------------------------------------------- */}
      <Panel tone={bandTone} delay={0}>
        <CardHeader
          title="Saudization & Nitaqat"
          titleAr="السعودة ونطاقات"
          subtitle={`Saudi nationals as a share of the workforce — currently ${saudization.band}`}
          icon={<Users className="w-4.5 h-4.5" />}
          tone={bandTone}
        >
          <StatusPill status={bandTone === 'rose' || bandTone === 'amber' ? 'bad' : 'good'}>
            {saudization.band} band
          </StatusPill>
        </CardHeader>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
          {/* Headline figure and the ladder it sits on */}
          <div className="rounded-xl border border-hair bg-sunken/40 p-4">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                  Saudization
                </p>
                <p className="tnum mt-1.5 text-4xl font-bold leading-none text-strong">
                  {saudization.percent}
                  <span className="text-xl text-muted">%</span>
                </p>
              </div>
              <div className="text-end">
                <p className="tnum text-sm font-semibold text-emerald-600">
                  {saudization.saudis.toLocaleString()} Saudi
                </p>
                <p className="tnum text-sm font-semibold text-sky-600">
                  {saudization.expats.toLocaleString()} expatriate
                </p>
              </div>
            </div>

            <div className="mt-4">
              <ProgressBar
                percent={saudization.percent}
                target={40}
                tone={bandTone}
                label={`${saudization.percent}% of a 40% Platinum threshold`}
              />
            </div>

            {saudization.toNextBand && (
              <div className="mt-4 rounded-lg border border-hair bg-surface p-3">
                <p className="text-xs font-semibold text-body">
                  {saudization.toNextBand.headcount} more Saudi{' '}
                  {saudization.toNextBand.headcount === 1 ? 'hire' : 'hires'} reaches{' '}
                  {saudization.toNextBand.band}
                </p>
                <p className="mt-1 text-[11px] text-muted">
                  {saudization.toNextBand.percent} percentage points away. Band changes move visa
                  quotas, so this is a hiring-plan input, not just a report.
                </p>
              </div>
            )}

            <div className="mt-4 space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                Band ladder
              </p>
              <p className="text-[10px] text-subtle">
                Defaults — real thresholds are set per economic activity on Qiwa.
              </p>
              {nitaqatLadder.map((step) => {
                const active = step.band === saudization.band;
                return (
                  <div
                    key={step.band}
                    className={`flex items-center justify-between gap-3 rounded-md px-2 py-1 ${
                      active ? `tone-${BAND_TONE[step.band]} bg-sunken/70` : ''
                    }`}
                  >
                    <span className="flex items-center gap-2 text-[11px]">
                      <span className={`tile h-1.5 w-1.5 rounded-full ${active ? '' : 'opacity-40'}`} aria-hidden />
                      <span className={active ? 'font-semibold text-strong' : 'text-muted'}>{step.band}</span>
                    </span>
                    <span className="tnum text-[11px] text-muted">≥ {step.minPercent}%</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Per-department position and the action list */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
              By department
            </p>
            <div className="mt-2 space-y-2.5">
              {saudization.byDepartment.map((row) => {
                const short = row.needed > 0;
                return (
                  <div key={row.name} className="rounded-lg border border-hair bg-surface px-3 py-2.5">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                      <span className="flex items-baseline gap-2">
                        <span className="text-xs font-semibold text-strong">{row.name}</span>
                        <span dir="rtl" lang="ar" className="text-[11px] text-subtle">{row.nameAr}</span>
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="tnum text-xs font-semibold text-strong">{row.percent}%</span>
                        <span className="tnum text-[10px] text-subtle">target {row.target}%</span>
                        {short && (
                          <StatusPill status="warn">
                            {row.needed} {row.needed === 1 ? 'hire' : 'hires'} short
                          </StatusPill>
                        )}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <ProgressBar percent={row.percent} target={row.target} tone={short ? 'amber' : 'emerald'} />
                      </div>
                      <span className="tnum shrink-0 text-[10px] text-subtle">
                        {row.saudis}/{row.total}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <MiniStat
                label="Hires needed"
                value={saudization.totalHiresNeeded}
                tone="amber"
                hint="Saudi hires required to bring every department to its own target"
              />
              <MiniStat
                label="Leavers Saudi"
                value={`${saudization.leaverPercent}%`}
                tone="rose"
                hint="Saudization among people who left this period — a rate can drift without anyone being hired"
              />
              <MiniStat
                label="New hires Saudi"
                value={`${saudization.newHirePercent}%`}
                tone="sky"
              />
              <MiniStat
                label="Saudi turnover"
                value={`${saudization.saudiTurnover}%`}
                tone="violet"
                hint="Saudi nationals leave far less often than expatriates; watching the blended rate hides that"
              />
            </div>
          </div>
        </div>
      </Panel>

      {/* ---------------------------------------------------------------- */}
      {/* GOSI, WPS, expat cost                                            */}
      {/* ---------------------------------------------------------------- */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Panel delay={0.05}>
          <CardHeader
            title="GOSI Contributions"
            titleAr="اشتراكات التأمينات الاجتماعية"
            subtitle={`${gosi.insuredCount.toLocaleString()} insured, ${gosi.uninsuredCount} not registered`}
            icon={<Landmark className="w-4.5 h-4.5" />}
            tone="indigo"
          />
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                Employer cost
              </p>
              <p className="tnum mt-1 text-2xl font-bold leading-none text-strong">
                {formatSARCompact(gosi.employerMonthly)}
              </p>
              <p className="mt-1 text-[11px] text-muted">per month</p>
            </div>
            <div className="text-end">
              <p className="tnum text-sm font-semibold text-strong">
                {formatSARCompact(gosi.employerAnnual)}
              </p>
              <p className="text-[11px] text-muted">per year</p>
            </div>
          </div>

          <p className="tnum mt-2 text-[11px] text-subtle">
            {gosi.employerShareOfPayroll}% of gross payroll
          </p>

          <div className="mt-3">
            {gosi.breakdown.map((line) => (
              <DataRow
                key={line.group}
                label={
                  <span className="flex flex-col">
                    <span>{line.group}</span>
                    <span className="tnum text-[10px] text-subtle">{line.rate}% of contributory wage</span>
                  </span>
                }
                value={formatSAR(line.amount)}
                tone="indigo"
              />
            ))}
          </div>

          <p className="mt-3 text-[10px] leading-relaxed text-subtle">
            Saudis are insured for annuities and SANED; expatriates for occupational hazards only.
            Charged on basic pay plus housing, capped at{' '}
            {formatSAR(gosi.rates.contributoryWageCeiling)} a month. Rates are configurable — confirm
            with GOSI before a payroll run.
          </p>

          {gosi.uninsuredCount > 0 && (
            <div className="mt-3">
              <StatusPill status="bad">
                {gosi.uninsuredCount} employee{gosi.uninsuredCount === 1 ? '' : 's'} not registered
              </StatusPill>
            </div>
          )}
        </Panel>

        <Panel delay={0.1}>
          <CardHeader
            title="Wage Protection (WPS)"
            titleAr="نظام حماية الأجور"
            subtitle={`${wps.onTime} of ${wps.runs} cycles settled on time`}
            icon={<ShieldCheck className="w-4.5 h-4.5" />}
            tone={wps.complianceRate >= 100 ? 'emerald' : 'amber'}
          />
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="tnum text-3xl font-bold leading-none text-strong">{wps.complianceRate}%</p>
              <p className="mt-1 text-[11px] text-muted">of closed cycles on time</p>
            </div>
            <StatusPill status={wps.violations.length > 0 ? 'bad' : wps.late > 0 ? 'warn' : 'good'}>
              {wps.violations.length > 0
                ? `${wps.violations.length} ${wps.violations.length === 1 ? 'exception' : 'exceptions'}`
                : wps.late > 0
                  ? `${wps.late} late`
                  : 'Compliant'}
            </StatusPill>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <MiniStat label="On time" value={wps.onTime} tone="emerald" />
            <MiniStat label="Late" value={wps.late} tone="amber" />
            <MiniStat label="Open" value={wps.pending} tone="slate" />
          </div>

          <div className="mt-3">
            {wps.violations.length > 0 && (
              <div className="mb-2 rounded-lg border border-amber-500/40 bg-amber-500/5 px-3 py-2">
                <p className="text-[11px] font-medium text-body">
                  {wps.violations[0].wpsFile === 'Rejected'
                    ? `${wps.violations[0].month}: wage file refused by the bank and resubmitted.`
                    : `${wps.violations[0].month}: wages cleared ${wps.violations[0].daysLate} days past the deadline.`}
                </p>
              </div>
            )}
            <DataRow label="WPS files accepted" value={wps.filesAccepted} tone="emerald" />
            <DataRow
              label="WPS files rejected"
              value={wps.filesRejected}
              tone={wps.filesRejected > 0 ? 'rose' : 'slate'}
            />
            <DataRow label="Payment deadline" value={`Day ${wps.deadlineDay}`} tone="slate" />
            <DataRow label="Tolerated delay" value={`${wps.allowedDelayDays} days`} tone="slate" />
          </div>

          <div className="mt-3 space-y-1.5">
            {payrollRuns.map((run) => (
              <div key={run.key} className="flex items-center justify-between gap-2 text-[11px]">
                <span className="tnum text-muted">{run.month}</span>
                <span className="flex items-center gap-2">
                  {run.daysLate > 0 && (
                    <span className="tnum text-[10px] text-subtle">+{run.daysLate}d</span>
                  )}
                  {run.wpsFile === 'Rejected' && <span className="text-[10px] text-rose-500">file rejected</span>}
                  <span className="h-1.5 w-10 overflow-hidden rounded-full bg-sunken">
                    <span
                      className={`block h-full ${
                        run.status === 'On time' ? 'bg-emerald-500'
                        : run.status === 'Late' ? 'bg-amber-500'
                        : 'bg-slate-400'
                      }`}
                      style={{ width: '100%' }}
                    />
                  </span>
                </span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel delay={0.15}>
          <CardHeader
            title="Expatriate Cost"
            titleAr="تكاليف المقيمين"
            subtitle={`${expatCosts.expatCount.toLocaleString()} expatriate staff`}
            icon={<Scale className="w-4.5 h-4.5" />}
            tone="cyan"
          />
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                Work-permit levy
              </p>
              <p className="tnum mt-1 text-2xl font-bold leading-none text-strong">
                {formatSARCompact(expatCosts.annualLevyTotal)}
              </p>
              <p className="mt-1 text-[11px] text-muted">per year</p>
            </div>
            <div className="text-end">
              <p className="tnum text-sm font-semibold text-strong">
                {formatSAR(expatCosts.annualLevyPerExpat)}
              </p>
              <p className="text-[11px] text-muted">per expatriate</p>
            </div>
          </div>

          <div className="mt-3">
            <DataRow
              label="Levy band"
              value={expatCosts.saudisOutnumberExpats ? 'Reduced rate' : 'Standard rate'}
              tone={expatCosts.saudisOutnumberExpats ? 'emerald' : 'amber'}
              hint="The levy steps down once Saudis are at least as numerous as expatriates — Saudization is a direct cost lever"
            />
            <DataRow label="Expatriate share" value={`${(100 - saudization.percent).toFixed(1)}%`} tone="cyan" />
            <DataRow
              label="Nationalities"
              value={`${gosi.breakdown.length > 0 ? expatCosts.nationalityCount : 0}`}
              tone="slate"
            />
            <DataRow label="GOSI (expatriates)" value={formatSAR(gosi.breakdown[2].amount)} tone="indigo" />
          </div>

          <div className="mt-3 space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
              Nationality mix
            </p>
            {expatCosts.topNationalities.map((entry) => (
              <div key={entry.nationality} className="flex items-center justify-between gap-3 text-[11px]">
                <span className="flex items-center gap-2 text-body">
                  <span>{entry.nationality}</span>
                  <span dir="rtl" lang="ar" className="text-subtle">{entry.nationalityAr}</span>
                </span>
                <span className="tnum text-muted">{entry.count.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

        </>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* Documents, end of service, statutory framework                    */}
      {/* ---------------------------------------------------------------- */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Panel delay={0.2}>
          <CardHeader
            title="Iqama, Work Permit & Passport Validity"
            titleAr="صلاحية الإقامة ورخصة العمل والجواز"
            subtitle={`${documents.expiredCount} expired · ${documents.criticalCount} due within 30 days · ${documents.expiringCount} inside the 90-day window`}
            icon={<FileWarning className="w-4.5 h-4.5" />}
            tone={documents.expiredCount > 0 ? 'rose' : 'emerald'}
          />

          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MiniStat label="Expired" value={documents.expiredCount} tone="rose" />
            <MiniStat label="Due ≤30 days" value={documents.criticalCount} tone="amber" />
            <MiniStat label="In 90-day window" value={documents.expiringCount} tone="sky" />
            <MiniStat label="Valid" value={`${documents.complianceRate}%`} tone="emerald" />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-start">
              <thead>
                <tr className="border-b border-hair-strong text-[10px] uppercase tracking-[0.08em] text-muted">
                  <th className="px-3 py-2 text-start font-semibold">Employee</th>
                  <th className="hidden px-3 py-2 text-start font-semibold sm:table-cell">Nationality</th>
                  <th className="px-3 py-2 text-start font-semibold">Document</th>
                  <th className="px-3 py-2 text-start font-semibold">Expiry</th>
                  <th className="px-3 py-2 text-end font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {documentAlerts.slice(0, 8).map((alert) => (
                  <tr key={`${alert.employee.id}-${alert.document}`} className="row-hover border-b border-hair/80 last:border-0">
                    <td className="px-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-strong">{alert.employee.nameEn}</p>
                        <p dir="rtl" lang="ar" className="truncate text-[10px] text-subtle">
                          {alert.employee.nameAr} · {alert.employee.department}
                        </p>
                      </div>
                    </td>
                    <td className="hidden px-3 py-2 text-xs text-body sm:table-cell">
                      {alert.employee.nationality}
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-xs text-body">{alert.document}</span>
                      <span className="block text-[10px] text-subtle">compliance document</span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="tnum block text-xs text-body">{alert.expiryLabel}</span>
                      <span className="block text-[10px] text-subtle">{alert.expiryHijri}</span>
                    </td>
                    <td className="px-3 py-2 text-end">
                      {alert.status === 'expired' ? (
                        <StatusPill status="bad">Expired {Math.abs(alert.daysRemaining)}d ago</StatusPill>
                      ) : alert.status === 'critical' ? (
                        <StatusPill status="warn">{alert.daysRemaining}d left</StatusPill>
                      ) : (
                        <StatusPill status="neutral">{alert.daysRemaining}d left</StatusPill>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {documents.expiringCount > 8 && (
            <p className="mt-3 text-[11px] text-muted">
              Showing the 8 most urgent of {documents.expiringCount.toLocaleString()} documents in the
              warning window. An expired iqama is not a paperwork problem — it makes the employment
              unlawful, so these sort above everything else.
            </p>
          )}
        </Panel>

        <div className="space-y-6">
          <Panel delay={0.25}>
            <CardHeader
              title="End of Service"
              titleAr="مكافأة نهاية الخدمة"
              subtitle="Accrued liability, Art. 84"
              icon={<HeartHandshake className="w-4.5 h-4.5" />}
              tone="violet"
            />
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="tnum text-3xl font-bold leading-none text-strong">
                  {formatSARCompact(endOfService.accrued)}
                </p>
                <p className="mt-1 text-[11px] text-muted">accrued across current staff</p>
              </div>
              <div className="text-end">
                <p className="tnum text-sm font-semibold text-strong">
                  {formatSAR(endOfService.averagePerEmployee)}
                </p>
                <p className="text-[11px] text-muted">average per employee</p>
              </div>
            </div>
            <div className="mt-3">
              <DataRow
                label="Settled this period"
                value={formatSARCompact(endOfService.settledThisPeriod)}
                tone="violet"
                hint="Paid to people who left during the reporting window, scaled for resignation under Art. 85"
              />
              <DataRow
                label="Employees past 5 years"
                value={endOfService.overFiveYears}
                tone="amber"
                hint="Beyond five years the accrual rate doubles from half a month to a full month per year"
              />
            </div>
            <p className="mt-3 text-[10px] leading-relaxed text-subtle">
              Half a month's wage for each of the first five years, a full month thereafter (Art. 84).
              Resignation scales the benefit down: nothing under two years, a third to five, two
              thirds to ten, full at ten and beyond (Art. 85).
            </p>
          </Panel>

          <Panel delay={0.3}>
            <CardHeader
              title="Statutory Framework"
              titleAr="الإطار النظامي"
              subtitle="What the rest of this dashboard is measured against"
              icon={<CalendarClock className="w-4.5 h-4.5" />}
              tone="amber"
            />
            <div className="space-y-2.5">
              {labourLawReference.map((item) => (
                <div key={item.article} className="rounded-lg border border-hair bg-surface px-3 py-2">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-xs font-semibold text-strong">{item.title}</span>
                    <span className="tnum shrink-0 text-[10px] text-subtle">{item.article}</span>
                  </div>
                  <p className="mt-1 text-[11px] text-body">{item.value}</p>
                  <p dir="rtl" lang="ar" className="mt-0.5 text-[10px] text-subtle">{item.titleAr}</p>
                </div>
              ))}
            </div>

            <div className="mt-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                Upcoming public holidays
              </p>
              <div className="mt-2 space-y-1.5">
                {saudiHolidays.map((holiday) => (
                  <div key={`${holiday.name}-${holiday.gregorian}`} className="flex items-start justify-between gap-3 text-[11px]">
                    <span className="min-w-0">
                      <span className="block font-medium text-body">{holiday.name}</span>
                      <span dir="rtl" lang="ar" className="block text-[10px] text-subtle">{holiday.nameAr}</span>
                    </span>
                    <span className="shrink-0 text-end">
                      <span className="tnum block text-body">{holiday.gregorian}</span>
                      <span className="block text-[10px] text-subtle">{holiday.hijri}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Panel>
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Working hours & prayer times                                      */}
      {/* ---------------------------------------------------------------- */}
      <Panel delay={0.35}>
        <CardHeader
          title="Working Hours & Prayer Times"
          titleAr="ساعات العمل ومواقيت الصلاة"
          subtitle={`${workingHours.effective}-hour day, ${workingHours.effectiveWeekly}-hour week — ${workingHours.basis}`}
          icon={<Sun className="w-4.5 h-4.5" />}
          tone="amber"
        >
          <div className="flex flex-wrap items-center justify-end gap-2">
            <StatusPill status="neutral">Weekend: Friday–Saturday</StatusPill>
            {ramadan.isRamadan ? (
              <StatusPill status="warn">Ramadan day {ramadan.dayOfRamadan}</StatusPill>
            ) : (
              ramadan.daysUntil !== null && (
                <StatusPill status="neutral">Ramadan in {ramadan.daysUntil} days</StatusPill>
              )
            )}
          </div>
        </CardHeader>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {prayerSchedule.map((city) => (
            <div key={city.city} className="rounded-xl border border-hair bg-surface p-3">
              <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                <span className="text-xs font-semibold text-strong">{city.city}</span>
                <span dir="rtl" lang="ar" className="text-[11px] text-subtle">{city.cityAr}</span>
              </div>
              <p className="text-[10px] text-subtle">{city.region} Region</p>
              <dl className="mt-2 space-y-1">
                {([
                  ['Fajr', city.times.fajr],
                  ['Dhuhr', city.times.dhuhr],
                  ['Asr', city.times.asr],
                  ['Maghrib', city.times.maghrib],
                  ['Isha', city.times.isha],
                ] as const).map(([label, time]) => (
                  <div key={label} className="flex items-center justify-between gap-2">
                    <dt className="text-[11px] text-muted">{label}</dt>
                    <dd className="tnum text-[11px] font-medium text-body">{time}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>

        <p className="mt-3 text-[10px] leading-relaxed text-subtle">
          Calculated for each site for the reporting date in Arabia Standard Time (UTC+3). Prayer
          times are the operational clock here, not a decorative header: the 8-hour day, the prayer
          and rest breaks within it and the reduced Ramadan day all hang off them.
        </p>
      </Panel>
    </div>
  );
}
