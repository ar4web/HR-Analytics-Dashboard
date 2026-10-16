/**
 * Every number on the dashboard, computed from `employees`.
 *
 * Nothing is typed in by hand. If a figure looks wrong the fix belongs in the
 * population, or in a rate constant in `saudi.ts`, not in a literal here.
 *
 * Compliance figures carry their source and their review cadence, because in a
 * Saudi establishment these are the numbers an inspector asks about: Saudization
 * and the Nitaqat band, GOSI contributions, WPS wage compliance, iqama and
 * passport validity, and the accrued end-of-service liability.
 */
import {
  AS_OF_DATE,
  CITY_HEADCOUNTS,
  DEPARTMENTS,
  LEAVE_TYPES,
  PERIOD_START,
  activeEmployees,
  annualLeaveEntitlement,
  employees,
  tenureYears,
  type Employee,
  type Rating,
} from './employees';
import {
  COMPLIANCE,
  GOSI,
  LABOUR_LAW,
  SAUDI_TIME_ZONE,
  formatGregorian,
  hijriParts,
  nitaqatBand,
  prayerTimes,
  ramadanState,
  toHijri,
  type NitaqatBand,
  CITIES,
} from './saudi';
import { createRandom, randNormal, type Random } from './random';

export interface MetricDefinition {
  id: string;
  label: string;
  labelAr: string;
  value: number;
  unit: 'percent' | 'days' | 'currency' | 'currencyMonthly' | 'score' | 'count';
  target: number | null;
  /** True when a lower value is better. */
  inverse?: boolean;
  cadence: 'weekly' | 'monthly' | 'quarterly' | 'annually';
  hint: string;
}

const round = (value: number, decimals = 0) => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

const mean = (values: number[]): number =>
  values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : 0;

const sum = (values: number[]): number => values.reduce((a, b) => a + b, 0);

function monthLabel(date: Date): string {
  return date.toLocaleString('en-US', { month: 'short' });
}

// ---------------------------------------------------------------------------
// Reporting window
// ---------------------------------------------------------------------------

export const reportingMonths: { key: string; label: string }[] = (() => {
  const months: { key: string; label: string }[] = [];
  for (let offset = 11; offset >= 0; offset--) {
    const date = new Date(Date.UTC(AS_OF_DATE.getUTCFullYear(), AS_OF_DATE.getUTCMonth() - offset, 1));
    months.push({ key: `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`, label: monthLabel(date) });
  }
  return months;
})();

export const reportingPeriod = (() => {
  const first = new Date(Date.UTC(AS_OF_DATE.getUTCFullYear(), AS_OF_DATE.getUTCMonth() - 11, 1));
  return `${monthLabel(first)} ${first.getUTCFullYear()} – ${monthLabel(AS_OF_DATE)} ${AS_OF_DATE.getUTCFullYear()}`;
})();

/** Today in both calendars, and where the organisation sits in the Hijri year. */
export const calendar = {
  asOf: AS_OF_DATE,
  gregorian: new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(AS_OF_DATE),
  hijri: toHijri(AS_OF_DATE),
  hijriArabic: toHijri(AS_OF_DATE, { arabicNumerals: true }),
  hijriParts: hijriParts(AS_OF_DATE),
  timeZone: SAUDI_TIME_ZONE,
};

/** Ramadan changes the working day, so the dashboard states it explicitly. */
export const ramadan = ramadanState(AS_OF_DATE);
export const workingHours = {
  normal: LABOUR_LAW.workingHours.normal,
  weekly: LABOUR_LAW.workingHours.weekly,
  effective: ramadan.isRamadan ? LABOUR_LAW.workingHours.ramadan : LABOUR_LAW.workingHours.normal,
  effectiveWeekly: ramadan.isRamadan ? LABOUR_LAW.workingHours.ramadanWeekly : LABOUR_LAW.workingHours.weekly,
  basis: ramadan.isRamadan ? 'Ramadan hours (Art. 98)' : 'Standard hours (Art. 98)',
};

// ---------------------------------------------------------------------------
// Headcount and movement
// ---------------------------------------------------------------------------

export const headcount = {
  total: employees.length,
  active: employees.filter((e) => e.status === 'Active').length,
  onLeave: employees.filter((e) => e.status === 'On Leave').length,
  departed: employees.filter((e) => e.status === 'Inactive').length,
  departments: DEPARTMENTS.length,
  cities: CITY_HEADCOUNTS.length,
};

export const newHires = employees.filter((e) => new Date(e.joinDate) >= PERIOD_START);
export const leavers = employees.filter((e) => e.exitDate && new Date(e.exitDate) >= PERIOD_START);

export const turnover = {
  value: round((leavers.length / ((headcount.total + (headcount.total - newHires.length + leavers.length)) / 2)) * 100, 1),
  voluntary: leavers.filter((e) => e.exitType === 'voluntary').length,
  involuntary: leavers.filter((e) => e.exitType === 'involuntary').length,
  /** Saudi and expatriate turnover behave very differently and are watched separately. */
  saudiRate: round((leavers.filter((e) => e.isSaudi).length / Math.max(1, employees.filter((e) => e.isSaudi).length)) * 100, 1),
  expatRate: round((leavers.filter((e) => !e.isSaudi).length / Math.max(1, employees.filter((e) => !e.isSaudi).length)) * 100, 1),
};

// ---------------------------------------------------------------------------
// Saudization and Nitaqat — the primary compliance figure
// ---------------------------------------------------------------------------

export interface SaudizationRow {
  name: string;
  nameAr: string;
  total: number;
  saudis: number;
  expats: number;
  percent: number;
  target: number;
  /** Percentage points below the configured target; negative means ahead. */
  gap: number;
  /** Whole Saudi hires needed to reach the target. The actionable figure. */
  needed: number;
}

/**
 * How far below a department target counts as a gap. Headcount is a whole
 * number, so a ratio target can never be hit exactly; a department 0.1 points
 * under target is compliant in substance.
 */
export const MATERIAL_GAP_PP = 0.5;

const saudizationRows: SaudizationRow[] = DEPARTMENTS.map((dept) => {
  const rows = employees.filter((e) => e.department === dept.name);
  const saudis = rows.filter((e) => e.isSaudi).length;
  const percent = round((saudis / rows.length) * 100, 1);
  return {
    name: dept.name,
    nameAr: dept.nameAr,
    total: rows.length,
    saudis,
    expats: rows.length - saudis,
    percent,
    target: round(dept.saudizationTarget * 100, 1),
    gap: round(percent - dept.saudizationTarget * 100, 1),
    // A fraction of a person short is still one hire short. Reports as a
    // headcount because that is the thing a recruiter can act on.
    needed: Math.max(0, Math.ceil(dept.saudizationTarget * rows.length) - saudis),
  };
});

const totalSaudis = employees.filter((e) => e.isSaudi).length;

export const saudization = {
  percent: round((totalSaudis / employees.length) * 100, 1),
  saudis: totalSaudis,
  expats: employees.length - totalSaudis,
  band: nitaqatBand((totalSaudis / employees.length) * 100).band,
  bandTone: nitaqatBand((totalSaudis / employees.length) * 100).tone,
  /** Percent needed to reach the next band up, or null at Platinum. */
  toNextBand: (() => {
    const percent = (totalSaudis / employees.length) * 100;
    const bands = [40, 35, 30, 25, 15];
    const next = bands.filter((b) => b > percent).sort((a, b) => a - b)[0];
    return next === undefined ? null : { band: nitaqatBand(next + 0.1).band, percent: round(next - percent, 1), headcount: Math.ceil(((next / 100) * employees.length - totalSaudis)) };
  })(),
  byDepartment: saudizationRows,
  /**
   * Departments materially short of their own Saudization target — the action
   * list. Gated on `MATERIAL_GAP_PP` rather than on `needed > 0`: because
   * headcount is discrete, a department sitting 0.05 points under its target
   * arithmetically "needs" one hire, which is a rounding artefact, not a finding.
   */
  belowTarget: saudizationRows
    .filter((row) => row.gap <= -MATERIAL_GAP_PP)
    .sort((a, b) => a.gap - b.gap),
  /** Saudi hires needed to close the gaps above. Counts the material ones only. */
  totalHiresNeeded: saudizationRows
    .filter((row) => row.gap <= -MATERIAL_GAP_PP)
    .reduce((s, row) => s + row.needed, 0),
  byCity: CITY_HEADCOUNTS.map(({ city }) => {
    const rows = employees.filter((e) => e.city === city);
    const saudis = rows.filter((e) => e.isSaudi).length;
    return { city, total: rows.length, saudis, percent: round((saudis / rows.length) * 100, 1) };
  }),
  /** Saudization among leavers, which is how a rate can drift without hiring anyone. */
  leaverPercent: round((leavers.filter((e) => e.isSaudi).length / Math.max(1, leavers.length)) * 100, 1),
  newHirePercent: round((newHires.filter((e) => e.isSaudi).length / Math.max(1, newHires.length)) * 100, 1),
};

/** Nationality mix behind the Saudization figure. */
export const nationalityMix = (() => {
  const counts = new Map<string, { count: number; nationalityAr: string }>();
  for (const employee of employees) {
    const entry = counts.get(employee.nationality) ?? { count: 0, nationalityAr: employee.nationalityAr };
    entry.count += 1;
    counts.set(employee.nationality, entry);
  }
  return [...counts.entries()]
    .map(([nationality, { count, nationalityAr }]) => ({
      nationality,
      nationalityAr,
      count,
      percent: round((count / employees.length) * 100, 1),
    }))
    .sort((a, b) => b.count - a.count);
})();

// ---------------------------------------------------------------------------
// GOSI
// ---------------------------------------------------------------------------

/**
 * Contributions are charged on the contributory wage — basic pay plus the
 * housing allowance, capped at the ceiling GOSI publishes. Saudis are insured
 * for annuities and SANED; expatriates for occupational hazards only.
 */
function contributoryWage(employee: Employee): number {
  return Math.min(employee.basicSalary + employee.housingAllowance, GOSI.contributoryWageCeiling);
}

export const gosi = (() => {
  const insured = employees.filter((e) => e.gosiRegistered);
  const saudiInsured = insured.filter((e) => e.isSaudi);
  const expatInsured = insured.filter((e) => !e.isSaudi);

  const employerSaudi = sum(saudiInsured.map((e) => (contributoryWage(e) * GOSI.saudi.employer) / 100));
  const employerExpat = sum(expatInsured.map((e) => (contributoryWage(e) * GOSI.expat.employer) / 100));
  const employeeSaudi = sum(saudiInsured.map((e) => (contributoryWage(e) * GOSI.saudi.employee) / 100));
  const employeeExpat = sum(expatInsured.map((e) => (contributoryWage(e) * GOSI.expat.employee) / 100));

  const employerMonthly = employerSaudi + employerExpat;
  const employeeMonthly = employeeSaudi + employeeExpat;

  return {
    rates: GOSI,
    insuredCount: insured.length,
    uninsuredCount: employees.length - insured.length,
    employerMonthly: Math.round(employerMonthly),
    employeeMonthly: Math.round(employeeMonthly),
    totalMonthly: Math.round(employerMonthly + employeeMonthly),
    employerAnnual: Math.round(employerMonthly * 12),
    totalAnnual: Math.round((employerMonthly + employeeMonthly) * 12),
    /** The employer's share as a percentage of gross payroll. */
    employerShareOfPayroll: round((employerMonthly / sum(insured.map((e) => e.monthlyGross))) * 100, 2),
    breakdown: [
      { group: 'Saudi — employer', rate: GOSI.saudi.employer, base: sum(saudiInsured.map(contributoryWage)), amount: Math.round(employerSaudi) },
      { group: 'Saudi — employee', rate: GOSI.saudi.employee, base: sum(saudiInsured.map(contributoryWage)), amount: Math.round(employeeSaudi) },
      { group: 'Expatriate — employer', rate: GOSI.expat.employer, base: sum(expatInsured.map(contributoryWage)), amount: Math.round(employerExpat) },
      { group: 'Expatriate — employee', rate: GOSI.expat.employee, base: sum(expatInsured.map(contributoryWage)), amount: Math.round(employeeExpat) },
    ],
  };
})();

// ---------------------------------------------------------------------------
// Expatriate levy and documents
// ---------------------------------------------------------------------------

export const expatCosts = {
  /** The levy steps down once Saudis are at least as numerous as expatriates. */
  saudisOutnumberExpats: totalSaudis >= employees.length - totalSaudis,
  annualLevyPerExpat: totalSaudis >= employees.length - totalSaudis
    ? COMPLIANCE.expatLevy.saudisOutnumberExpats
    : COMPLIANCE.expatLevy.expatsOutnumberSaudis,
  expatCount: employees.length - totalSaudis,
  get annualLevyTotal(): number {
    return this.annualLevyPerExpat * this.expatCount;
  },
};

export interface DocumentAlert {
  employee: Employee;
  document: 'Iqama' | 'Passport' | 'Work permit';
  expiry: string;
  /** Gregorian expiry, display-ready, e.g. `18 Aug 2026`. */
  expiryLabel: string;
  /** The same date in the Umm al-Qura calendar, e.g. `5 Rabiʻ I 1448 AH`. */
  expiryHijri: string;
  daysRemaining: number;
  status: 'expired' | 'critical' | 'warning';
}

/**
 * Documents that need action, worst first. An expired iqama is not a paperwork
 * problem — it is an illegal employment situation, so it sorts above everything.
 */
export const documentAlerts: DocumentAlert[] = (() => {
  const alerts: DocumentAlert[] = [];
  const today = AS_OF_DATE.getTime();

  for (const employee of employees) {
    if (employee.status === 'Inactive') continue;

    const check = (document: DocumentAlert['document'], expiry: string | null) => {
      if (!expiry) return;
      const daysRemaining = Math.round((new Date(expiry).getTime() - today) / 86_400_000);
      if (daysRemaining > COMPLIANCE.documentWarningDays) return;
      const date = new Date(expiry);
      alerts.push({
        employee,
        document,
        expiry,
        expiryLabel: formatGregorian(date),
        expiryHijri: toHijri(date),
        daysRemaining,
        status: daysRemaining < 0 ? 'expired' : daysRemaining <= 30 ? 'critical' : 'warning',
      });
    };

    check('Iqama', employee.iqamaExpiry);
    check('Work permit', employee.workPermitExpiry);
    check('Passport', employee.passportExpiry);
  }

  return alerts.sort((a, b) => a.daysRemaining - b.daysRemaining);
})();

export const documents = {
  /** Everything inside the warning window — the working queue. */
  expiringCount: documentAlerts.length,
  expiredCount: documentAlerts.filter((a) => a.status === 'expired').length,
  criticalCount: documentAlerts.filter((a) => a.status === 'critical').length,
  /** Expired or due within 30 days: the items that need action this month. */
  actionableCount: documentAlerts.filter((a) => a.status !== 'warning').length,
  byType: (['Iqama', 'Passport', 'Work permit'] as const).map((type) => ({
    type,
    count: documentAlerts.filter((a) => a.document === type).length,
    expired: documentAlerts.filter((a) => a.document === type && a.status === 'expired').length,
  })),
  /** Share of expatriate documents currently valid. */
  complianceRate: round(
    ((employees.filter((e) => !e.isSaudi).length * 3 - documentAlerts.filter((a) => a.status === 'expired').length) /
      Math.max(1, employees.filter((e) => !e.isSaudi).length * 3)) *
      100,
    1,
  ),
};

// ---------------------------------------------------------------------------
// End-of-service benefit
// ---------------------------------------------------------------------------

export const endOfService = {
  /** Accrued liability across current staff, on the Art. 84 formula. */
  accrued: Math.round(sum(activeEmployees.map((e) => e.endOfServiceAccrual))),
  averagePerEmployee: Math.round(mean(activeEmployees.map((e) => e.endOfServiceAccrual))),
  /** What the same population would cost if everyone left today with full entitlement. */
  fullTerminationExposure: Math.round(
    sum(
      activeEmployees.map((e) => {
        const years = tenureYears(e);
        const firstFive = Math.min(years, 5);
        const beyond = Math.max(0, years - 5);
        return (firstFive * 0.5 + beyond) * e.monthlyGross;
      }),
    ),
  ),
  /** Staff past five years, where the accrual rate doubles. */
  overFiveYears: activeEmployees.filter((e) => tenureYears(e) >= 5).length,
  /** Settlements actually paid to people who left during the period. */
  settledThisPeriod: Math.round(
    sum(
      leavers.map((e) => {
        const years = tenureYears(e);
        const firstFive = Math.min(years, 5);
        const beyond = Math.max(0, years - 5);
        const gross = (firstFive * 0.5 + beyond) * e.monthlyGross;
        if (e.exitType === 'voluntary') {
          if (years < 2) return 0;
          if (years < 5) return gross / 3;
          if (years < 10) return (gross * 2) / 3;
        }
        return gross;
      }),
    ),
  ),
};

// ---------------------------------------------------------------------------
// Payroll and WPS
// ---------------------------------------------------------------------------

export const pay = {
  /** Mean monthly gross across current staff, SAR. */
  averageMonthly: Math.round(mean(activeEmployees.map((e) => e.monthlyGross))),
  medianMonthly: (() => {
    const sorted = activeEmployees.map((e) => e.monthlyGross).sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  })(),
  averageBasic: Math.round(mean(activeEmployees.map((e) => e.basicSalary))),
  monthlyPayroll: Math.round(sum(activeEmployees.map((e) => e.monthlyGross))),
  get annualPayroll(): number {
    return this.monthlyPayroll * 12;
  },
  compaRatio: round(mean(activeEmployees.map((e) => e.compaRatio)) * 100, 1),
  budget: sum(DEPARTMENTS.map((d) => d.budget)),
  /** Most recent month's payroll, as a single-cycle figure. */
  lastPayrollRun: Math.round(sum(activeEmployees.map((e) => e.monthlyGross))),
};

export interface PayrollRun {
  month: string;
  key: string;
  employees: number;
  amount: number;
  status: 'On time' | 'Late' | 'Pending';
  /** Days after the statutory deadline, when late. */
  daysLate: number;
  wpsFile: 'Accepted' | 'Rejected' | 'Not submitted';
}

/**
 * Monthly payroll cycles. WPS requires wages to reach the employee's Saudi bank
 * account by the agreed date; a run that misses it is a compliance event, not
 * an accounting inconvenience, so lateness is recorded rather than smoothed.
 */
export const payrollRuns: PayrollRun[] = (() => {
  const random: Random = createRandom(20240520);
  const last = reportingMonths.length - 1;

  // Months are indexed from the oldest. The pattern is fixed rather than random
  // so the compliance exceptions a reviewer sees are the same every time.
  // Two single events across the year, both closed, and a clean run since: a
  // late cycle inside the tolerated delay, and one file the bank rejected
  // (a mismatched IBAN, in practice) that was corrected and resubmitted.
  const exceptions: Record<number, { daysLate: number; wpsFile: PayrollRun['wpsFile'] }> = {
    4: { daysLate: 3, wpsFile: 'Accepted' },
    7: { daysLate: 0, wpsFile: 'Rejected' },
  };

  return reportingMonths.map((month, index) => {
    const exception = exceptions[index];
    const pending = index === last;

    return {
      month: month.label,
      key: month.key,
      employees: activeEmployees.length,
      amount: Math.round(sum(activeEmployees.map((e) => e.monthlyGross)) * (1 + (random() - 0.5) * 0.01)),
      status: pending ? 'Pending' : (exception?.daysLate ?? 0) > 0 ? 'Late' : 'On time',
      daysLate: exception?.daysLate ?? 0,
      wpsFile: pending ? 'Not submitted' : exception?.wpsFile ?? 'Accepted',
    };
  });
})();

export const wps = {
  runs: payrollRuns.length,
  onTime: payrollRuns.filter((r) => r.status === 'On time').length,
  late: payrollRuns.filter((r) => r.status === 'Late').length,
  pending: payrollRuns.filter((r) => r.status === 'Pending').length,
  /**
   * Runs where wages reached employees on time. The current month is still
   * open, so it is excluded from the rate rather than counted as a failure —
   * scoring an in-flight payroll would understate compliance every month.
   */
  complianceRate: round(
    (payrollRuns.filter((r) => r.status === 'On time').length /
      Math.max(1, payrollRuns.filter((r) => r.status !== 'Pending').length)) *
      100,
    1,
  ),
  /**
   * Reportable exceptions, not merely late runs: either the tolerated delay was
   * exceeded, or the WPS file itself was refused. A refused file is a compliance
   * event even when the money later arrives, because the obligation is to pay
   * *through* the system.
   */
  violations: payrollRuns.filter(
    (r) =>
      r.wpsFile === 'Rejected' ||
      (r.status === 'Late' && r.daysLate > COMPLIANCE.wps.allowedDelayDays),
  ),
  filesAccepted: payrollRuns.filter((r) => r.wpsFile === 'Accepted').length,
  filesRejected: payrollRuns.filter((r) => r.wpsFile === 'Rejected').length,
  deadlineDay: COMPLIANCE.wps.requiredPaymentDay,
  allowedDelayDays: COMPLIANCE.wps.allowedDelayDays,
};

// ---------------------------------------------------------------------------
// Attendance, leave and engagement
// ---------------------------------------------------------------------------

export const attendance = {
  rate: round(mean(activeEmployees.map((e) => e.attendance)), 1),
  aboveThreshold: round((activeEmployees.filter((e) => e.attendance >= 90).length / activeEmployees.length) * 100, 1),
};

function leave_tier30_count(): boolean {
  return activeEmployees.filter((e) => annualLeaveEntitlement(e) === 30).length > 0;
}

export const leave = {
  /** Unused annual leave across current staff — the balance-sheet liability. */
  totalRemaining: sum(activeEmployees.map((e) => e.leave.annual.remaining ?? 0)),
  averageRemaining: round(mean(activeEmployees.map((e) => e.leave.annual.remaining ?? 0)), 1),
  byType: LEAVE_TYPES.map((type) => ({
    type: type.label,
    typeAr: type.labelAr,
    used: sum(activeEmployees.map((e) => e.leave[type.key].used)),
    // Null where the type is a per-year grant rather than an accruing balance.
    remaining: type.key === 'annual' || type.key === 'personal'
      ? sum(activeEmployees.map((e) => e.leave[type.key].remaining ?? 0))
      : null,
    entitlement: type.key === 'annual'
      ? (leave_tier30_count() ? LABOUR_LAW.annualLeave.fiveYearsAndOver : LABOUR_LAW.annualLeave.underFiveYears)
      : type.entitlement,
  })),
  /** Split by the statutory entitlement, since the two tiers behave differently. */
  tier21: activeEmployees.filter((e) => annualLeaveEntitlement(e) === LABOUR_LAW.annualLeave.underFiveYears).length,
  tier30: activeEmployees.filter((e) => annualLeaveEntitlement(e) === LABOUR_LAW.annualLeave.fiveYearsAndOver).length,
  onLeaveToday: activeEmployees.filter((e) => e.status === 'On Leave').length,
};

export const engagement = {
  average: round(mean(activeEmployees.map((e) => e.engagement)), 1),
  promoters: activeEmployees.filter((e) => e.engagement >= 9).length,
  passives: activeEmployees.filter((e) => e.engagement >= 7 && e.engagement < 9).length,
  detractors: activeEmployees.filter((e) => e.engagement < 7).length,
  get eNPS(): number {
    const n = activeEmployees.length;
    return Math.round(((this.promoters - this.detractors) / n) * 100);
  },
};

// ---------------------------------------------------------------------------
// Recruitment
// ---------------------------------------------------------------------------

export interface Requisition {
  id: string;
  department: string;
  city: string;
  openedDate: string;
  filledDate: string | null;
  daysOpen: number;
  offersExtended: number;
  offersAccepted: number;
  /** Whether the seat had to be advertised as Saudization-eligible. */
  saudizationPriority: boolean;
}

export const requisitions: Requisition[] = (() => {
  const random: Random = createRandom(20240401);
  const rows: Requisition[] = [];
  let index = 0;

  for (const hire of newHires) {
    const dept = DEPARTMENTS.find((d) => d.name === hire.department)!;
    const daysOpen = Math.max(7, Math.round(randNormal(random, dept.daysToFill, dept.daysToFill * 0.28)));
    const filled = new Date(hire.joinDate);
    const opened = new Date(filled.getTime() - daysOpen * 86_400_000);

    const roll = random();
    rows.push({
      id: `REQ-${String(++index).padStart(4, '0')}`,
      department: hire.department,
      city: hire.city,
      openedDate: opened.toISOString().slice(0, 10),
      filledDate: hire.joinDate,
      daysOpen,
      offersExtended: roll < 0.86 ? 1 : roll < 0.97 ? 2 : 3,
      offersAccepted: 1,
      // Departments behind on Saudization must advertise accordingly.
      saudizationPriority: dept.saudization > 0.4,
    });
  }
  return rows;
})();

export const recruiting = {
  timeToFill: round(mean(requisitions.map((r) => r.daysOpen)), 1),
  openRequisitions: sum(DEPARTMENTS.map((d) => Math.round(d.headcount * 0.012))),
  offerAcceptance: round(
    (sum(requisitions.map((r) => r.offersAccepted)) / sum(requisitions.map((r) => r.offersExtended))) * 100,
    1,
  ),
  firstYearAttrition: round(
    (leavers.filter((e) => tenureYears(e) < 1).length / Math.max(1, newHires.length)) * 100,
    1,
  ),
  /** Time to fill where the role was Saudization-priority. */
  timeToFillSaudized: round(
    mean(requisitions.filter((r) => r.saudizationPriority).map((r) => r.daysOpen)),
    1,
  ),
};

// ---------------------------------------------------------------------------
// Prayer times and the working day
// ---------------------------------------------------------------------------

export const prayerSchedule = CITIES.map((city) => ({
  city: city.city,
  cityAr: city.cityAr,
  region: city.region,
  times: prayerTimes(AS_OF_DATE, city.latitude, city.longitude),
}));

// ---------------------------------------------------------------------------
// KPI strips
// ---------------------------------------------------------------------------

/**
 * The executive strip. Saudization leads because in a Saudi establishment it is
 * the metric with regulatory consequences, not merely a workforce statistic.
 */
export const executiveMetrics: MetricDefinition[] = [
  {
    id: 'saudization',
    label: 'Saudization',
    labelAr: 'نسبة السعودة',
    value: saudization.percent,
    unit: 'percent',
    target: 40,
    cadence: 'monthly',
    hint: `Saudi nationals as a share of the workforce — the input to the Nitaqat band (currently ${saudization.band}). Reported to MHRSD and reviewed continuously.`,
  },
  {
    id: 'wpsCompliance',
    label: 'WPS Compliance',
    labelAr: 'التزام حماية الأجور',
    value: wps.complianceRate,
    unit: 'percent',
    target: 100,
    cadence: 'monthly',
    hint: `Payroll cycles where wages reached employees by the agreed date, per the Wage Protection System. ${wps.late} late and ${wps.pending} still open of ${wps.runs} runs; a delay beyond ${wps.allowedDelayDays} days is a reportable violation.`,
  },
  {
    id: 'turnover',
    label: 'Annual Turnover',
    labelAr: 'معدل الدوران السنوي',
    value: turnover.value,
    unit: 'percent',
    target: 10,
    inverse: true,
    cadence: 'monthly',
    hint: `Leavers over the period ÷ average headcount. Saudi ${turnover.saudiRate}%, expatriate ${turnover.expatRate}% — the two move for different reasons.`,
  },
  {
    id: 'timeToFill',
    label: 'Time to Fill',
    labelAr: 'مدة إشغال الوظيفة',
    value: recruiting.timeToFill,
    unit: 'days',
    target: 40,
    inverse: true,
    cadence: 'monthly',
    hint: 'Days from requisition approval to accepted offer, averaged across filled roles.',
  },
  {
    id: 'eNPS',
    label: 'eNPS',
    labelAr: 'مؤشر رضا الموظفين',
    value: engagement.eNPS,
    unit: 'score',
    target: 30,
    cadence: 'quarterly',
    hint: 'Share of promoters minus share of detractors on "would you recommend us as a place to work".',
  },
];

/** The operational snapshot behind the five above. */
export const operationalMetrics: MetricDefinition[] = [
  {
    id: 'totalEmployees',
    label: 'Total Employees',
    labelAr: 'إجمالي الموظفين',
    value: headcount.total,
    unit: 'count',
    target: null,
    cadence: 'monthly',
    hint: 'Everyone on the books, including those who left during the period.',
  },
  {
    id: 'saudiEmployees',
    label: 'Saudi Nationals',
    labelAr: 'الموظفون السعوديون',
    value: saudization.saudis,
    unit: 'count',
    target: null,
    cadence: 'monthly',
    hint: 'Saudi nationals on the books. Expressed as a share in the Saudization metric above.',
  },
  {
    id: 'expatEmployees',
    label: 'Expatriates',
    labelAr: 'المقيمون',
    value: saudization.expats,
    unit: 'count',
    target: null,
    cadence: 'monthly',
    hint: `Non-Saudi staff. Each carries a work-permit levy of SAR ${expatCosts.annualLevyPerExpat.toLocaleString()} a year.`,
  },
  {
    id: 'newHires',
    label: 'New Hires',
    labelAr: 'التعيينات الجديدة',
    value: newHires.length,
    unit: 'count',
    target: null,
    cadence: 'monthly',
    hint: `Joiners in the period, of whom ${saudization.newHirePercent}% are Saudi nationals.`,
  },
  {
    id: 'avgSalary',
    label: 'Average Salary',
    labelAr: 'متوسط الراتب',
    value: pay.averageMonthly,
    unit: 'currencyMonthly',
    target: null,
    cadence: 'quarterly',
    hint: 'Mean monthly gross, including housing and transport allowances. The median is shown in the payroll panel.',
  },
  {
    id: 'attendanceRate',
    label: 'Attendance Rate',
    labelAr: 'معدل الحضور',
    value: attendance.rate,
    unit: 'percent',
    target: 95,
    cadence: 'weekly',
    hint: 'Mean share of working days attended. The Saudi working week runs Sunday to Thursday.',
  },
  {
    id: 'leaveBalance',
    label: 'Leave Liability',
    labelAr: 'رصيد الإجازات',
    value: leave.totalRemaining,
    unit: 'days',
    target: null,
    inverse: true,
    cadence: 'monthly',
    hint: 'Unused annual leave days across current staff — a balance-sheet liability. 21 days under five years of service, 30 at five and above (Art. 109).',
  },
  {
    id: 'documentsExpiring',
    label: 'Documents Expiring',
    labelAr: 'مستندات قاربت الانتهاء',
    value: documents.actionableCount,
    unit: 'count',
    target: 0,
    inverse: true,
    cadence: 'weekly',
    hint: `${documents.expiredCount} already expired and ${documents.criticalCount} due within 30 days. Behind them, ${documents.expiringCount} documents sit inside the 90-day warning window.`,
  },
];

// ---------------------------------------------------------------------------
// Chart series
// ---------------------------------------------------------------------------

export const departmentBreakdown = DEPARTMENTS.map((dept) => {
  const rows = employees.filter((e) => e.department === dept.name);
  const active = rows.filter((e) => e.status !== 'Inactive');
  const deptLeavers = leavers.filter((e) => e.department === dept.name).length;
  const deptHires = newHires.filter((e) => e.department === dept.name).length;
  const opening = rows.length - deptHires + deptLeavers;
  const averageHeadcount = (opening + rows.length) / 2;
  const saudis = rows.filter((e) => e.isSaudi).length;

  return {
    name: dept.name,
    nameAr: dept.nameAr,
    count: rows.length,
    activeCount: active.length,
    budget: dept.budget,
    avgSalary: Math.round(mean(active.map((e) => e.monthlyGross))),
    growth: dept.growth,
    turnoverRate: round((deptLeavers / Math.max(1, averageHeadcount)) * 100, 1),
    compaRatio: round(mean(active.map((e) => e.compaRatio)) * 100, 1),
    saudization: round((saudis / rows.length) * 100, 1),
  };
});

function countByMonth(rows: Employee[], dateOf: (e: Employee) => string | null) {
  const buckets = new Map(reportingMonths.map((m) => [m.key, 0]));
  for (const row of rows) {
    const date = dateOf(row);
    if (!date) continue;
    const key = date.slice(0, 7);
    if (buckets.has(key)) buckets.set(key, buckets.get(key)! + 1);
  }
  return buckets;
}

export const hiringTrends = (() => {
  const hires = countByMonth(newHires, (e) => e.joinDate);
  const exits = countByMonth(leavers, (e) => e.exitDate);
  return reportingMonths.map((month) => ({
    month: month.label,
    key: month.key,
    hires: hires.get(month.key) ?? 0,
    exits: exits.get(month.key) ?? 0,
  }));
})();

export const attritionByDepartment = DEPARTMENTS.map((dept) => {
  const rows = leavers.filter((e) => e.department === dept.name);
  return {
    department: dept.name,
    departmentAr: dept.nameAr,
    voluntary: rows.filter((e) => e.exitType === 'voluntary').length,
    involuntary: rows.filter((e) => e.exitType === 'involuntary').length,
    activeCount: employees.filter((e) => e.department === dept.name && e.status !== 'Inactive').length,
  };
});

const GENDER_ORDER: Record<string, number> = { Male: 0, Female: 1 };

export const demographics = {
  gender: [...new Set(activeEmployees.map((e) => e.gender))]
    .sort((a, b) => GENDER_ORDER[a] - GENDER_ORDER[b])
    .map((gender) => ({
      name: gender,
      value: activeEmployees.filter((e) => e.gender === gender).length,
    })),
  ageGroups: [
    { range: '18-25', test: (age: number) => age <= 25 },
    { range: '26-35', test: (age: number) => age >= 26 && age <= 35 },
    { range: '36-45', test: (age: number) => age >= 36 && age <= 45 },
    { range: '46-55', test: (age: number) => age >= 46 && age <= 55 },
    { range: '55+', test: (age: number) => age > 55 },
  ].map((band) => ({ range: band.range, count: activeEmployees.filter((e) => band.test(e.age)).length })),
  tenure: [
    { range: '< 1 year', test: (years: number) => years < 1 },
    { range: '1-3 years', test: (years: number) => years >= 1 && years < 3 },
    { range: '3-5 years', test: (years: number) => years >= 3 && years < 5 },
    { range: '5-10 years', test: (years: number) => years >= 5 && years < 10 },
    { range: '10+ years', test: (years: number) => years >= 10 },
  ].map((band) => ({ range: band.range, count: activeEmployees.filter((e) => band.test(tenureYears(e))).length })),
};

export const attendanceByMonth = reportingMonths.map((month) => {
  const rows = activeEmployees.filter((e) => e.joinDate.slice(0, 7) <= month.key);
  const base = mean(rows.map((e) => e.attendance));
  const monthIndex = new Date(`${month.key}-01T00:00:00Z`).getUTCMonth();
  const wobble = [-0.9, -0.4, 0.6, 0.2, -0.7, 1.1, -0.2, 0.7, 0.1, 0.4, -0.3, -1.1][monthIndex];
  const present = Math.max(85, Math.min(99, round(base + wobble, 1)));
  return { month: month.label, key: month.key, present, absent: round(100 - present, 1) };
});

export const performanceDistribution = (() => {
  const order: Rating[] = ['Exceeds', 'Meets', 'Needs Improvement', 'Below'];
  return order.map((rating) => {
    const count = activeEmployees.filter((e) => e.rating === rating).length;
    return { rating, count, percentage: round((count / activeEmployees.length) * 100, 1) };
  });
})();

export const locationBreakdown = CITY_HEADCOUNTS.map((entry) => {
  const city = CITIES.find((c) => c.city === entry.city)!;
  const rows = employees.filter((e) => e.city === entry.city);
  const active = rows.filter((e) => e.status !== 'Inactive');
  return {
    city: entry.city,
    cityAr: city.cityAr,
    region: city.region,
    employees: active.length,
    total: rows.length,
    growth: entry.growth,
    avgSalary: Math.round(mean(active.map((e) => e.monthlyGross))),
    saudization: round((rows.filter((e) => e.isSaudi).length / rows.length) * 100, 1),
    siteType: city.siteType,
  };
});

const SALARY_BANDS = [
  { range: '< 5k', min: 0, max: 5000 },
  { range: '5k-10k', min: 5000, max: 10000 },
  { range: '10k-15k', min: 10000, max: 15000 },
  { range: '15k-20k', min: 15000, max: 20000 },
  { range: '20k-30k', min: 20000, max: 30000 },
  { range: '30k+', min: 30000, max: Infinity },
];

export const salaryDistribution = SALARY_BANDS.map((band) => ({
  range: band.range,
  count: activeEmployees.filter((e) => e.monthlyGross >= band.min && e.monthlyGross < band.max).length,
}));

export const recentActivities = (() => {
  const items: { id: number; type: 'hire' | 'exit' | 'promotion' | 'leave'; name: string; nameAr: string; department: string; date: string }[] = [];
  const recentHires = [...newHires].sort((a, b) => b.joinDate.localeCompare(a.joinDate)).slice(0, 4);
  const recentExits = [...leavers].sort((a, b) => (b.exitDate ?? '').localeCompare(a.exitDate ?? '')).slice(0, 4);
  const recentPromotions = activeEmployees.filter((e) => e.lastPromotion).sort((a, b) => (b.lastPromotion ?? '').localeCompare(a.lastPromotion ?? '')).slice(0, 3);
  const onLeave = activeEmployees.filter((e) => e.status === 'On Leave').slice(0, 3);

  for (const e of recentHires) items.push({ id: 0, type: 'hire', name: e.nameEn, nameAr: e.nameAr, department: e.department, date: e.joinDate });
  for (const e of recentExits) items.push({ id: 0, type: 'exit', name: e.nameEn, nameAr: e.nameAr, department: e.department, date: e.exitDate! });
  for (const e of recentPromotions) items.push({ id: 0, type: 'promotion', name: e.nameEn, nameAr: e.nameAr, department: e.department, date: e.lastPromotion! });
  for (const e of onLeave) items.push({ id: 0, type: 'leave', name: e.nameEn, nameAr: e.nameAr, department: e.department, date: e.joinDate });

  return items.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6).map((item, index) => ({ ...item, id: index + 1 }));
})();

export type { NitaqatBand };
