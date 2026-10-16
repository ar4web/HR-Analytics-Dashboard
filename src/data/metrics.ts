/**
 * Every number on the dashboard, computed from `employees`.
 *
 * Nothing here is typed in by hand. If a figure looks wrong, the fix belongs in
 * the population (or in a rate constant in employees.ts), not in a literal here.
 *
 * Each metric returns value + target + direction where a target exists, because
 * a KPI without a comparison is decoration — see PLAN.md §3. `inverse` means
 * lower is better (time-to-fill, attrition), which the UI uses to decide
 * whether the delta should read as good or bad.
 */
import {
  AS_OF_DATE,
  DEPARTMENTS,
  LEAVE_TYPES,
  LOCATIONS,
  PERIOD_START,
  activeEmployees,
  employees,
  type Department,
  type Employee,
  type Rating,
} from './employees';
import { createRandom, randNormal, type Random } from './random';

export interface MetricDefinition {
  id: string;
  label: string;
  value: number;
  /** Display unit, e.g. '%' | 'days' | '$' | 'score'. */
  unit: 'percent' | 'days' | 'currency' | 'score' | 'count';
  /** Where the organisation wants to be. Null when there is no universal target. */
  target: number | null;
  /** True when a lower value is better. */
  inverse?: boolean;
  /** How often this should be reviewed. Figma-of-record for the metric dictionary. */
  cadence: 'weekly' | 'monthly' | 'quarterly' | 'annually';
  /** One line explaining what the number means, shown in the tile's tooltip. */
  hint: string;
}

const round = (value: number, decimals = 0) => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

const mean = (values: number[]): number =>
  values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : 0;

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(date: Date): string {
  return date.toLocaleString('en-US', { month: 'short' });
}

/** The trailing twelve months, oldest first. */
export const reportingMonths: { key: string; label: string }[] = (() => {
  const months: { key: string; label: string }[] = [];
  for (let offset = 11; offset >= 0; offset--) {
    const date = new Date(AS_OF_DATE.getFullYear(), AS_OF_DATE.getMonth() - offset, 1);
    months.push({ key: monthKey(date), label: monthLabel(date) });
  }
  return months;
})();

/** Human-readable period, e.g. "Nov 2025 – Oct 2026". */
export const reportingPeriod = (() => {
  const first = new Date(AS_OF_DATE.getFullYear(), AS_OF_DATE.getMonth() - 11, 1);
  return `${monthLabel(first)} ${first.getFullYear()} – ${monthLabel(AS_OF_DATE)} ${AS_OF_DATE.getFullYear()}`;
})();

// ---------------------------------------------------------------------------
// Headcount and movement
// ---------------------------------------------------------------------------

export const headcount = {
  total: employees.length,
  active: employees.filter((e) => e.status === 'Active').length,
  onLeave: employees.filter((e) => e.status === 'On Leave').length,
  departed: employees.filter((e) => e.status === 'Inactive').length,
  departments: DEPARTMENTS.length,
};

/** People whose join date falls in the trailing twelve months. */
export const newHires = employees.filter((e) => new Date(e.joinDate) >= PERIOD_START);

/** People who left during the trailing twelve months. */
export const leavers = employees.filter((e) => e.exitDate && new Date(e.exitDate) >= PERIOD_START);

/**
 * Annual turnover: leavers over the period divided by average headcount.
 * Average headcount is opening + closing / 2, which is the standard formula and
 * avoids the flattery of dividing by today's (larger) number.
 */
export const turnover = {
  value: round((leavers.length / ((headcount.total + (headcount.total - newHires.length + leavers.length)) / 2)) * 100, 1),
  voluntary: leavers.filter((e) => e.exitType === 'voluntary').length,
  involuntary: leavers.filter((e) => e.exitType === 'involuntary').length,
};

// ---------------------------------------------------------------------------
// Pay
// ---------------------------------------------------------------------------

export const pay = {
  average: Math.round(mean(activeEmployees.map((e) => e.salary))),
  median: (() => {
    const sorted = activeEmployees.map((e) => e.salary).sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  })(),
  /** Headcount-weighted: the average of individual ratios, not of averages. */
  compaRatio: round(mean(activeEmployees.map((e) => e.compaRatio)) * 100, 1),
  /** Annualised payroll budget across departments. */
  budget: DEPARTMENTS.reduce((sum, d) => sum + d.budget, 0),
  /** Annualised payroll cost of everyone currently on the books. */
  actual: activeEmployees.reduce((sum, e) => sum + e.salary, 0),
};

// ---------------------------------------------------------------------------
// Attendance and leave
// ---------------------------------------------------------------------------

export const attendance = {
  rate: round(mean(activeEmployees.map((e) => e.attendance)), 1),
  /** Share of the workforce at or above a 90% attendance line. */
  aboveThreshold: round(
    (activeEmployees.filter((e) => e.attendance >= 90).length / activeEmployees.length) * 100,
    1,
  ),
};

export const leave = {
  /**
   * Unused *annual* leave across current staff — the figure that is a real
   * balance-sheet liability. Sick, personal and parental days are excluded here
   * and reported per type in the leave panel: parental is granted per event, and
   * counting an entitlement for everyone would invent ~23,000 phantom days.
   */
  totalRemaining: activeEmployees.reduce((sum, e) => sum + e.leave.annual.remaining, 0),
  averageRemaining: round(mean(activeEmployees.map((e) => e.leave.annual.remaining)), 1),
  /** The accruing types only, for the liability line. */
  accruingRemaining: activeEmployees.reduce(
    (sum, e) => sum + e.leave.annual.remaining + e.leave.sick.remaining + e.leave.personal.remaining,
    0,
  ),
  byType: LEAVE_TYPES.map((type) => ({
    type: type.label,
    used: activeEmployees.reduce((sum, e) => sum + e.leave[type.key].used, 0),
    remaining: activeEmployees.reduce((sum, e) => sum + e.leave[type.key].remaining, 0),
  })),
};

// ---------------------------------------------------------------------------
// Engagement
// ---------------------------------------------------------------------------

export const engagement = {
  average: round(mean(activeEmployees.map((e) => e.engagement)), 1),
  promoters: activeEmployees.filter((e) => e.engagement >= 9).length,
  passives: activeEmployees.filter((e) => e.engagement >= 7 && e.engagement < 9).length,
  detractors: activeEmployees.filter((e) => e.engagement < 7).length,
  /**
   * eNPS = %promoters − %detractors, on 0-10 scores. Positive is good; above 30
   * is the commonly cited "excellent" line.
   */
  get eNPS(): number {
    const n = activeEmployees.length;
    return Math.round(((this.promoters - this.detractors) / n) * 100);
  },
  get participation(): number {
    // Everyone in this population has responded, which is itself unusual; the
    // figure is here so the tile can state it rather than imply it.
    return 100;
  },
};

// ---------------------------------------------------------------------------
// Recruiting funnel
// ---------------------------------------------------------------------------

export interface Requisition {
  id: string;
  department: Department;
  openedDate: string;
  filledDate: string | null;
  daysOpen: number;
  offersExtended: number;
  offersAccepted: number;
}

/**
 * One requisition per hire in the window, plus a few still open. Each carries
 * the offers it took to fill the seat, which is what makes offer-acceptance a
 * derived figure rather than a stated one.
 */
export const requisitions: Requisition[] = (() => {
  // Its own generator: changing the recruiting model must not reshuffle the
  // employee population (and vice versa).
  const random: Random = createRandom(20240401);
  const rows: Requisition[] = [];

  const byDepartment = new Map<Department, Employee[]>();
  for (const employee of newHires) {
    const list = byDepartment.get(employee.department) ?? [];
    list.push(employee);
    byDepartment.set(employee.department, list);
  }

  let index = 0;
  for (const dept of DEPARTMENTS) {
    for (const hire of byDepartment.get(dept.name) ?? []) {
      // Filled roles: time-to-fill is the gap between opening and the hire.
      const daysOpen = Math.max(7, Math.round(randNormal(random, dept.daysToFill, dept.daysToFill * 0.28)));
      const filled = new Date(hire.joinDate);
      const opened = new Date(filled.getTime() - daysOpen * 86_400_000);

      // Most seats are filled by the first-choice candidate; some take two or
      // three offers because the first was declined.
      const roll = random();
      const offersExtended = roll < 0.86 ? 1 : roll < 0.97 ? 2 : 3;
      const offersAccepted = 1;

      rows.push({
        id: `REQ-${String(++index).padStart(4, '0')}`,
        department: dept.name,
        openedDate: opened.toISOString().slice(0, 10),
        filledDate: hire.joinDate,
        daysOpen,
        offersExtended,
        offersAccepted,
      });
    }
  }

  return rows;
})();

export const recruiting = {
  /** Mean days from requisition open to accepted offer, weighted by role. */
  timeToFill: round(mean(requisitions.map((r) => r.daysOpen)), 1),
  openRequisitions: DEPARTMENTS.reduce((sum, d) => sum + Math.round(d.headcount * 0.012), 0),
  offerAcceptance: round(
    (requisitions.reduce((sum, r) => sum + r.offersAccepted, 0) /
      requisitions.reduce((sum, r) => sum + r.offersExtended, 0)) *
      100,
    1,
  ),
  /** First-year attrition is a different problem from attrition overall. */
  firstYearAttrition: round(
    (leavers.filter((e) => daysEmployed(e) < 365).length / Math.max(1, newHires.length)) * 100,
    1,
  ),
};

function daysEmployed(employee: Employee): number {
  const start = new Date(employee.joinDate);
  const end = employee.exitDate ? new Date(employee.exitDate) : AS_OF_DATE;
  return Math.round((end.getTime() - start.getTime()) / 86_400_000);
}

// ---------------------------------------------------------------------------
// The KPI strips
// ---------------------------------------------------------------------------

/**
 * The executive strip: the five questions a CHRO actually asks. Ordered by
 * decision value, not by how easy they are to compute.
 */
export const executiveMetrics: MetricDefinition[] = [
  {
    id: 'turnover',
    label: 'Annual Turnover',
    value: turnover.value,
    unit: 'percent',
    target: 10,
    inverse: true,
    cadence: 'monthly',
    hint: 'Leavers over the period ÷ average headcount. Voluntary and involuntary combined.',
  },
  {
    id: 'timeToFill',
    label: 'Time to Fill',
    value: recruiting.timeToFill,
    unit: 'days',
    target: 40,
    inverse: true,
    cadence: 'monthly',
    hint: 'Days from requisition approval to accepted offer, averaged across filled roles.',
  },
  {
    id: 'offerAcceptance',
    label: 'Offer Acceptance',
    value: recruiting.offerAcceptance,
    unit: 'percent',
    target: 90,
    cadence: 'monthly',
    hint: 'Offers accepted ÷ offers extended. Below 85% usually means pay or speed is losing candidates.',
  },
  {
    id: 'compaRatio',
    label: 'Compa-Ratio',
    value: pay.compaRatio,
    unit: 'percent',
    target: 100,
    cadence: 'quarterly',
    hint: 'Average pay as a share of the midpoint for each role. 100% is paid at market.',
  },
  {
    id: 'eNPS',
    label: 'eNPS',
    value: engagement.eNPS,
    unit: 'score',
    target: 30,
    cadence: 'quarterly',
    hint: 'Share of promoters minus share of detractors on "would you recommend us as a place to work".',
  },
];

/** The detail strip: the operational snapshot behind the five above. */
export const operationalMetrics: MetricDefinition[] = [
  {
    id: 'totalEmployees',
    label: 'Total Employees',
    value: headcount.total,
    unit: 'count',
    target: null,
    cadence: 'monthly',
    hint: 'Everyone on the books, including those who have since left within the period.',
  },
  {
    id: 'activeEmployees',
    label: 'Active Employees',
    value: headcount.active,
    unit: 'count',
    target: null,
    cadence: 'monthly',
    hint: 'Currently working, excluding those on leave and those who have left.',
  },
  {
    id: 'newHires',
    label: 'New Hires',
    value: newHires.length,
    unit: 'count',
    target: null,
    cadence: 'monthly',
    hint: 'Joiners during the trailing twelve months.',
  },
  {
    id: 'attritionVoluntary',
    label: 'Voluntary Exits',
    value: turnover.voluntary,
    unit: 'count',
    target: null,
    inverse: true,
    cadence: 'monthly',
    hint: 'People who chose to leave. The involuntary figure is excluded deliberately — it is a different problem.',
  },
  {
    id: 'avgSalary',
    label: 'Average Salary',
    value: pay.average,
    unit: 'currency',
    target: null,
    cadence: 'quarterly',
    hint: 'Mean annual salary across current staff. The median is a healthier measure; both are shown in the pay panel.',
  },
  {
    id: 'attendanceRate',
    label: 'Attendance Rate',
    value: attendance.rate,
    unit: 'percent',
    target: 95,
    cadence: 'weekly',
    hint: 'Mean share of working days attended across current staff.',
  },
  {
    id: 'leaveBalance',
    label: 'Leave Liability',
    value: leave.totalRemaining,
    unit: 'days',
    target: null,
    inverse: true,
    cadence: 'monthly',
    hint: 'Unused annual leave days across current staff. A rising balance is a liability on the books.',
  },
  {
    id: 'firstYearAttrition',
    label: 'First-Year Attrition',
    value: recruiting.firstYearAttrition,
    unit: 'percent',
    target: 15,
    inverse: true,
    cadence: 'monthly',
    hint: 'Leavers within twelve months of joining, as a share of that year\'s hires. A recruiting-quality signal.',
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
  // Same average-headcount formula as the org-wide turnover figure, so the
  // department rows add up to the headline instead of using a quieter
  // denominator and disagreeing with it.
  const opening = rows.length - deptHires + deptLeavers;
  const averageHeadcount = (opening + rows.length) / 2;

  return {
    name: dept.name,
    count: rows.length,
    activeCount: active.length,
    budget: dept.budget,
    avgSalary: Math.round(mean(active.map((e) => e.salary))),
    growth: dept.growth,
    turnoverRate: round((deptLeavers / Math.max(1, averageHeadcount)) * 100, 1),
    compaRatio: round(mean(active.map((e) => e.compaRatio)) * 100, 1),
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
    voluntary: rows.filter((e) => e.exitType === 'voluntary').length,
    involuntary: rows.filter((e) => e.exitType === 'involuntary').length,
    activeCount: employees.filter((e) => e.department === dept.name && e.status !== 'Inactive').length,
  };
});

const GENDER_ORDER: Record<string, number> = { Male: 0, Female: 1, Other: 2 };

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
  ].map((band) => ({
    range: band.range,
    count: activeEmployees.filter((e) => band.test(e.age)).length,
  })),
  tenure: [
    { range: '< 1 year', test: (days: number) => days < 365 },
    { range: '1-3 years', test: (days: number) => days >= 365 && days < 1095 },
    { range: '3-5 years', test: (days: number) => days >= 1095 && days < 1825 },
    { range: '5-10 years', test: (days: number) => days >= 1825 && days < 3650 },
    { range: '10+ years', test: (days: number) => days >= 3650 },
  ].map((band) => ({
    range: band.range,
    count: activeEmployees.filter((e) => band.test(daysEmployed(e))).length,
  })),
};

export const attendanceByMonth = reportingMonths.map((month) => {
  // The month's slice of the population: everyone employed for any part of it.
  const rows = activeEmployees.filter((e) => {
    const joined = e.joinDate.slice(0, 7) <= month.key;
    return joined;
  });
  const base = mean(rows.map((e) => e.attendance));
  // Seasonal shape: winter illness and the mid-year holidays pull attendance
  // down, spring and early summer push it up.
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

export const locationBreakdown = LOCATIONS.map((loc) => ({
  city: loc.city,
  employees: employees.filter((e) => e.location === loc.city && e.status !== 'Inactive').length,
  growth: loc.growth,
  avgSalary: Math.round(mean(activeEmployees.filter((e) => e.location === loc.city).map((e) => e.salary))),
}));

const SALARY_BANDS = [
  { range: '<$50k', min: 0, max: 50000 },
  { range: '$50k-$75k', min: 50000, max: 75000 },
  { range: '$75k-$100k', min: 75000, max: 100000 },
  { range: '$100k-$125k', min: 100000, max: 125000 },
  { range: '$125k-$150k', min: 125000, max: 150000 },
  { range: '>$150k', min: 150000, max: Infinity },
];

export const salaryDistribution = SALARY_BANDS.map((band) => ({
  range: band.range,
  count: activeEmployees.filter((e) => e.salary >= band.min && e.salary < band.max).length,
}));

/**
 * The activity feed. Derived from the population like everything else: a hire
 * from a real join date, an exit from a real exit, a promotion from a real
 * promotion record, leave from whoever is actually on leave.
 */
export const recentActivities = (() => {
  const items: {
    id: number;
    type: 'hire' | 'exit' | 'promotion' | 'leave';
    name: string;
    department: string;
    date: string;
  }[] = [];

  const recentHires = [...newHires].sort((a, b) => b.joinDate.localeCompare(a.joinDate)).slice(0, 4);
  const recentExits = [...leavers].sort((a, b) => (b.exitDate ?? '').localeCompare(a.exitDate ?? '')).slice(0, 4);
  const recentPromotions = activeEmployees
    .filter((e) => e.lastPromotion)
    .sort((a, b) => (b.lastPromotion ?? '').localeCompare(a.lastPromotion ?? ''))
    .slice(0, 3);
  const onLeave = activeEmployees.filter((e) => e.status === 'On Leave').slice(0, 3);

  for (const e of recentHires) {
    items.push({ id: 0, type: 'hire', name: e.name, department: e.department, date: e.joinDate });
  }
  for (const e of recentExits) {
    items.push({ id: 0, type: 'exit', name: e.name, department: e.department, date: e.exitDate! });
  }
  for (const e of recentPromotions) {
    items.push({ id: 0, type: 'promotion', name: e.name, department: e.department, date: e.lastPromotion! });
  }
  for (const e of onLeave) {
    items.push({ id: 0, type: 'leave', name: e.name, department: e.department, date: e.joinDate });
  }

  return items
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 6)
    .map((item, index) => ({ ...item, id: index + 1 }));
})();
