/**
 * The employee population. Everything the dashboard shows is derived from
 * these records — there are no hand-typed KPI numbers anywhere in the app.
 *
 * The population is calibrated to the department headcounts in DEPARTMENTS, so
 * the department table, the org-wide totals and the per-department charts can
 * never drift apart. Change a headcount or a rate here and every derived figure
 * moves with it, which is the point.
 *
 * Fields are generated in dependency order (tenure → rating → pay → leave)
 * because independent draws produce an implausible population: a hundred
 * five-year veterans rated "Below" with 60% attendance is not a company.
 */
import { createRandom, pick, pickWeighted, randInt, randNormal, type Random } from './random';

export const DEPARTMENTS = [
  { name: 'Engineering', headcount: 342, targetSalary: 83200, budget: 27900000, growth: 12, attrition: 0.062, compaRatio: 1.02, daysToFill: 52 },
  { name: 'Sales', headcount: 256, targetSalary: 77300, budget: 19500000, growth: 8, attrition: 0.105, compaRatio: 0.96, daysToFill: 34 },
  { name: 'Marketing', headcount: 187, targetSalary: 76000, budget: 14000000, growth: 15, attrition: 0.068, compaRatio: 0.99, daysToFill: 38 },
  { name: 'HR', headcount: 98, targetSalary: 79500, budget: 7600000, growth: 5, attrition: 0.05, compaRatio: 1.01, daysToFill: 30 },
  { name: 'Finance', headcount: 134, targetSalary: 85800, budget: 11300000, growth: 3, attrition: 0.062, compaRatio: 1.03, daysToFill: 42 },
  { name: 'Operations', headcount: 145, targetSalary: 67500, budget: 9700000, growth: -2, attrition: 0.135, compaRatio: 0.94, daysToFill: 28 },
  { name: 'IT', headcount: 65, targetSalary: 95400, budget: 6100000, growth: 18, attrition: 0.082, compaRatio: 1.08, daysToFill: 58 },
  { name: 'Legal', headcount: 20, targetSalary: 110000, budget: 2200000, growth: 0, attrition: 0.055, compaRatio: 1.05, daysToFill: 65 },
] as const;

export const LOCATIONS = [
  { city: 'New York', headcount: 342, growth: 8 },
  { city: 'San Francisco', headcount: 287, growth: 12 },
  { city: 'Chicago', headcount: 198, growth: 3 },
  { city: 'Austin', headcount: 156, growth: 18 },
  { city: 'Seattle', headcount: 145, growth: 6 },
  { city: 'Boston', headcount: 119, growth: -2 },
] as const;

export const LEAVE_TYPES = [
  { key: 'annual', label: 'Annual Leave', entitlement: 25 },
  { key: 'sick', label: 'Sick Leave', entitlement: 10 },
  { key: 'personal', label: 'Personal Leave', entitlement: 5 },
  { key: 'parental', label: 'Maternity/Paternity', entitlement: 20 },
] as const;

export type LeaveKey = (typeof LEAVE_TYPES)[number]['key'];
export type Department = (typeof DEPARTMENTS)[number]['name'];
export type Location = (typeof LOCATIONS)[number]['city'];

export type EmployeeStatus = 'Active' | 'Inactive' | 'On Leave';
export type ExitType = 'voluntary' | 'involuntary';
export type Gender = 'Male' | 'Female' | 'Other';
export type Rating = 'Exceeds' | 'Meets' | 'Needs Improvement' | 'Below';

export interface LeaveLine {
  used: number;
  remaining: number;
}

export interface Employee {
  id: string;
  name: string;
  department: Department;
  location: Location;
  gender: Gender;
  status: EmployeeStatus;
  /** ISO date. */
  joinDate: string;
  /** ISO date for anyone who has left within the reporting window, else null. */
  exitDate: string | null;
  exitType: ExitType | null;
  /** Annual, USD. */
  salary: number;
  /**
   * Salary divided by the department's pay midpoint. 1.0 = paid at market.
   * The midpoint is implied by the department rate, so this is derived, not
   * stored independently.
   */
  compaRatio: number;
  /** 0–100. Numeric form of `rating`. */
  performance: number;
  rating: Rating;
  /** 0–100, share of working days attended. */
  attendance: number;
  /** Days remaining across every leave type. */
  leaveBalance: number;
  leave: Record<LeaveKey, LeaveLine>;
  /** 0–10 answer to "how likely are you to recommend this as a place to work". */
  engagement: number;
  /** 0–12 month bucket, derived from birth year. */
  age: number;
  /** ISO date of the most recent promotion, or null. */
  lastPromotion: string | null;
}

/**
 * The window everything time-based is measured against: the trailing twelve
 * months end here.
 *
 * This is the last day of the previous calendar month, not today, because a
 * mid-month cutoff makes the final bar of every monthly chart a partial month —
 * it reads as a collapse in hiring or engagement when it is only an unfinished
 * period. Reporting as of period close is also what an HR system actually does,
 * and it keeps the figures stable for the whole of a month.
 */
function endOfPreviousMonth(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), 0));
}

export const AS_OF_DATE = endOfPreviousMonth();

/**
 * Start of the reporting window: the first day of the month eleven months ago,
 * so the window is twelve whole months. A rolling 365-day window would split a
 * month between the previous period and this one, and the monthly chart would
 * then not add up to the period total.
 */
export const PERIOD_START = new Date(AS_OF_DATE.getFullYear(), AS_OF_DATE.getMonth() - 11, 1);

export const SEED = 20240115;

const FIRST_NAMES = [
  'Sarah', 'Michael', 'Emily', 'James', 'Anna', 'David', 'Jessica', 'Daniel', 'Laura', 'Chris',
  'Nadia', 'Omar', 'Priya', 'Wei', 'Fatima', 'Diego', 'Yuki', 'Ahmed', 'Sofia', 'Liam',
  'Rachel', 'Marcus', 'Elena', 'Tom', 'Aisha', 'Noah', 'Chloe', 'Ibrahim', 'Grace', 'Hassan',
  'Maya', 'Peter', 'Zoe', 'Khalid', 'Hannah', 'Andre', 'Leila', 'Ryan', 'Amara', 'Victor',
  'Nora', 'Sam', 'Isabella', 'Tariq', 'Megan', 'Joseph', 'Layla', 'Adam', 'Ruth', 'Felix',
  'Dana', 'Jonas', 'Amelia', 'Rami', 'Clara', 'Hugo', 'Yasmin', 'Ethan', 'Salma', 'Ben',
];

const LAST_NAMES = [
  'Johnson', 'Chen', 'Davis', 'Wilson', 'Martinez', 'Thompson', 'Anderson', 'Lee', 'Walker', 'Hall',
  'Al-Rashid', 'Haddad', 'Nair', 'Zhang', 'Okonkwo', 'Silva', 'Tanaka', 'Khan', 'Rossi', 'Murphy',
  'Kelly', 'Novak', 'Petrov', 'Dubois', 'Fischer', 'Baker', 'Wright', 'Green', 'Adams', 'Nelson',
  'Carter', 'Mitchell', 'Roberts', 'Turner', 'Phillips', 'Campbell', 'Parker', 'Evans', 'Collins', 'Stewart',
  'Sanchez', 'Morris', 'Reed', 'Cook', 'Bell', 'Morgan', 'Bailey', 'Cooper', 'Richardson', 'Cox',
  'Al-Farsi', 'Farouk', 'Yilmaz', 'Kapoor', 'Nguyen', 'Kim', 'Patel', 'Okafor', 'Costa', 'Weber',
];

const GENDERS: { value: Gender; weight: number }[] = [
  { value: 'Male', weight: 687 },
  { value: 'Female', weight: 548 },
  { value: 'Other', weight: 12 },
];

const RATINGS: { value: Rating; weight: number }[] = [
  { value: 'Exceeds', weight: 15 },
  { value: 'Meets', weight: 60.6 },
  { value: 'Needs Improvement', weight: 18.8 },
  { value: 'Below', weight: 5.6 },
];

const RATING_SCORE: Record<Rating, [number, number]> = {
  Exceeds: [86, 99],
  Meets: [65, 85],
  'Needs Improvement': [45, 64],
  Below: [20, 44],
};

/** Age band weights, roughly a mid-size company's shape. */
const AGE_BANDS = [
  { value: [22, 25], weight: 12.5 },
  { value: [26, 35], weight: 39.2 },
  { value: [36, 45], weight: 28.6 },
  { value: [46, 55], weight: 14.3 },
  { value: [56, 64], weight: 5.4 },
];

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

function buildLeave(random: Random, tenureDays: number, attendance: number): Record<LeaveKey, LeaveLine> {
  // Attendance is a decent proxy for leave-taking: someone who is always in the
  // office also tends to have days left over at year end.
  const attendanceFactor = (attendance - 90) / 10; // ~-1 to +1
  const taken = (mean: number, spread: number, entitlement: number) =>
    Math.max(0, Math.min(entitlement, Math.round(randNormal(random, mean - attendanceFactor, spread))));

  const annual = taken(15, 4, 25);
  // Sick and personal leave carry over only up to a small cap, so their
  // remaining balance is bounded rather than growing with tenure.
  const sick = taken(4.5, 2, 10);
  const personal = taken(2.4, 1, 5);

  // Parental leave is event-based rather than accrued, so it carries no
  // standing balance: most staff have neither taken it nor booked it, and
  // counting an entitlement for everyone would add a phantom ~23,000 days to
  // the org-wide leave liability.
  const onParentalLeave = random() < 0.02;
  const parental = onParentalLeave ? Math.round(randNormal(random, 12, 5)) : 0;

  const line = (used: number, entitlement: number): LeaveLine => ({
    used,
    remaining: Math.max(0, entitlement - used),
  });

  return {
    annual: line(annual, 25),
    sick: line(sick, 10),
    personal: line(personal, 5),
    parental: line(Math.max(0, Math.min(20, parental)), onParentalLeave ? 20 : 0),
  };
}

function buildEmployee(random: Random, index: number, department: Department, location: Location): Employee {
  const departmentConfig = DEPARTMENTS.find((d) => d.name === department)!;

  // Tenure decides almost everything else, so it comes first.
  const tenureBand = pickWeighted(random, [
    { value: 'fresh', weight: 15 },   // < 1 year
    { value: 'early', weight: 30 },   // 1-3 years
    { value: 'mid', weight: 24 },     // 3-5 years
    { value: 'senior', weight: 21 },  // 5-10 years
    { value: 'veteran', weight: 10 }, // 10+ years
  ]);
  const tenureDays =
    tenureBand === 'fresh' ? randInt(random, 20, 364)
    : tenureBand === 'early' ? randInt(random, 365, 1094)
    : tenureBand === 'mid' ? randInt(random, 1095, 1824)
    : tenureBand === 'senior' ? randInt(random, 1825, 3649)
    : randInt(random, 3650, 6200);

  const join = new Date(AS_OF_DATE.getTime() - tenureDays * 86_400_000);

  // Departures are assigned by markLeavers so the count per department is exact.
  const exitDate: string | null = null;
  const exitType: ExitType | null = null;
  const status: EmployeeStatus = random() < 0.025 ? 'On Leave' : 'Active';

  const rating = pickWeighted(random, RATINGS);
  const [scoreMin, scoreMax] = RATING_SCORE[rating];
  const performance = randInt(random, scoreMin, scoreMax);

  // Attendance correlates with the rating rather than being drawn independently.
  const attendance =
    rating === 'Exceeds' ? randNormal(random, 96.5, 1.6)
    : rating === 'Meets' ? randNormal(random, 94.8, 2.0)
    : rating === 'Needs Improvement' ? randNormal(random, 91.5, 3.0)
    : randNormal(random, 86.0, 5.0);

  const engagementBase =
    rating === 'Exceeds' ? 9.5
    : rating === 'Meets' ? 8.8
    : rating === 'Needs Improvement' ? 7.0
    : 4.9;
  const engagement = Math.max(0, Math.min(10, Math.round(randNormal(random, engagementBase, 1.3) * 10) / 10));

  // Pay: a bell curve around the department rate, tilted by service and
  // performance. recentreSalaries() then pins each department's mean to its
  // target, because those tilts would otherwise bias it upward.
  const seniorityUplift = 1 + Math.min(0.35, (tenureDays / 365) * 0.035);
  const performanceUplift = 1 + (performance - 72) / 400;
  const salary =
    randNormal(random, departmentConfig.targetSalary, departmentConfig.targetSalary * 0.16) *
    seniorityUplift *
    performanceUplift;

  // Age is drawn independently of tenure but bounded below by it: nobody joins
  // at fifteen.
  const ageBand = pickWeighted(random, AGE_BANDS);
  const age = Math.max(18 + Math.ceil(tenureDays / 365), randInt(random, ageBand[0], ageBand[1]));

  const leave = buildLeave(random, tenureDays, attendance);
  const leaveBalance = Object.values(leave).reduce((sum, l) => sum + l.remaining, 0);

  const wasPromoted = tenureDays > 700 && random() < 0.28;
  const lastPromotion = wasPromoted
    ? isoDate(new Date(AS_OF_DATE.getTime() - randInt(random, 30, Math.max(60, tenureDays - 400)) * 86_400_000))
    : null;

  return {
    id: `EMP-${String(index + 1).padStart(4, '0')}`,
    name: `${pick(random, FIRST_NAMES)} ${pick(random, LAST_NAMES)}`,
    department,
    location,
    gender: pickWeighted(random, GENDERS),
    status,
    joinDate: isoDate(join),
    exitDate,
    exitType,
    // Recentred below; the provisional value keeps the compa-ratio shape.
    salary: Math.round(salary),
    compaRatio: salary / (departmentConfig.targetSalary / departmentConfig.compaRatio),
    performance,
    rating,
    attendance: Math.max(60, Math.min(100, Math.round(attendance * 10) / 10)),
    leaveBalance,
    leave,
    engagement,
    age,
    lastPromotion,
  };
}

function shuffleInPlace<T>(random: Random, items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

/**
 * Marks leavers and sets their exit date. Departures are confined to the
 * trailing twelve months so the population means what the dashboard implies:
 * current staff plus everyone who left during the period being reported. That
 * is what makes attrition a real annual rate rather than a count of everyone
 * who has ever left.
 */
function markLeavers(random: Random, population: Employee[]): void {
  for (const dept of DEPARTMENTS) {
    const leavers = Math.round(dept.headcount * dept.attrition);
    // Someone has to have been here at least a month before they can leave:
    // a person cannot resign before they start.
    const eligible = shuffleInPlace(
      random,
      population.filter(
        (e) => e.department === dept.name && daysBetween(new Date(e.joinDate), AS_OF_DATE) >= 30,
      ),
    );

    for (const employee of eligible.slice(0, leavers)) {
      const join = new Date(employee.joinDate);
      // The exit has to fall inside the reporting window, and at least a month
      // after the person joined.
      const earliest = Math.max(PERIOD_START.getTime(), join.getTime() + 30 * 86_400_000);
      if (earliest >= AS_OF_DATE.getTime()) continue;

      // Uniform across the allowed range. (Skewing early within the *window*
      // would bunch every departure into the first month and read as attrition
      // dramatically improving all year, which is an artifact, not a finding.)
      const exit = new Date(earliest + Math.round((AS_OF_DATE.getTime() - earliest) * random()));

      employee.exitDate = isoDate(exit);
      employee.exitType = random() < 0.22 ? 'involuntary' : 'voluntary';
      employee.status = 'Inactive';
      employee.lastPromotion = null;
      // Someone who has left takes their balance with them.
      employee.leave = {
        annual: { used: 25, remaining: 0 },
        sick: { used: 10, remaining: 0 },
        personal: { used: 5, remaining: 0 },
        parental: { used: 0, remaining: 0 },
      };
      employee.leaveBalance = 0;
    }
  }
}

/** Scales each department's salaries so its mean equals the configured rate. */
function recentreSalaries(population: Employee[], random: Random): void {
  for (const dept of DEPARTMENTS) {
    const rows = population.filter((e) => e.department === dept.name);
    const mean = rows.reduce((sum, e) => sum + e.salary, 0) / rows.length;
    const factor = dept.targetSalary / mean;
    const midpoint = dept.targetSalary / dept.compaRatio;

    for (const employee of rows) {
      // A little jitter so the figures don't all land on round numbers after
      // scaling, which would look machine-generated.
      const jitter = 1 + (random() - 0.5) * 0.006;
      employee.salary = Math.round((employee.salary * factor * jitter) / 100) * 100;
      employee.compaRatio = employee.salary / midpoint;
    }
  }
}

function generateEmployees(): Employee[] {
  const random = createRandom(SEED);

  // Seed a slot per constraint, then pair the two lists off. Exact totals
  // rather than approximate ones.
  const departmentSlots: Department[] = [];
  for (const dept of DEPARTMENTS) {
    for (let i = 0; i < dept.headcount; i++) departmentSlots.push(dept.name);
  }

  const locationSlots: Location[] = [];
  for (const loc of LOCATIONS) {
    for (let i = 0; i < loc.headcount; i++) locationSlots.push(loc.city);
  }

  if (departmentSlots.length !== locationSlots.length) {
    throw new Error(
      `Headcount mismatch: departments total ${departmentSlots.length}, locations total ${locationSlots.length}. ` +
        'Both must describe the same population.',
    );
  }

  // Shuffle both independently so department and location are uncorrelated
  // (otherwise every engineer would sit in New York).
  const depts = shuffleInPlace(random, departmentSlots);
  const locs = shuffleInPlace(random, locationSlots);

  const population = depts.map((department, index) => buildEmployee(random, index, department, locs[index]));
  markLeavers(random, population);
  recentreSalaries(population, random);
  return population;
}

/** The single source of truth for the whole dashboard. */
export const employees: Employee[] = generateEmployees();

/** Everyone still on the books — the base for most per-head metrics. */
export const activeEmployees = employees.filter((e) => e.status !== 'Inactive');
