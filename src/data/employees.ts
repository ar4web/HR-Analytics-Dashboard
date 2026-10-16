/**
 * The employee population for a Saudi establishment.
 *
 * Everything the dashboard shows is derived from these records. The attributes
 * are the ones a Saudi HR system actually carries: the national ID / iqama
 * distinction, the allowance structure that wage calculations are built on,
 * Iqama and passport expiry for expatriates, and contract type under the Labour
 * Law.
 *
 * Calibration rules, which matter more than any single value:
 *   - Department headcounts and city headcounts are seeded as slots and paired
 *     off, so both sets of totals are exact.
 *   - Nationality is assigned per department to hit a configured Saudization
 *     rate, because Saudization is a compliance figure that gets reported and
 *     cannot be left to chance.
 *   - Fields are generated in dependency order (tenure → rating → pay → leave),
 *     since independent draws produce a population that does not hang together.
 */
import { CITIES, LABOUR_LAW, SAUDI_TIME_ZONE, prayerTimes, type City } from './saudi';
import { createRandom, pick, pickWeighted, randInt, randNormal, type Random } from './random';

export interface DepartmentConfig {
  name: string;
  nameAr: string;
  headcount: number;
  /** Target monthly gross salary in SAR. */
  targetSalary: number;
  /** Annual payroll budget in SAR. */
  budget: number;
  growth: number;
  /** Annual attrition rate. */
  attrition: number;
  /** Average pay as a share of the role midpoint. */
  compaRatio: number;
  /** Average days to fill a vacancy. */
  daysToFill: number;
  /** Share of the department that is Saudi. Drives population generation. */
  saudization: number;
  /**
   * The Saudization the department plans to reach, as a share of headcount.
   * Deliberately separate from `saudization`: that field only decides how the
   * population is generated, so if the target reused it every department would
   * sit exactly on target by construction and any reported gap would be an
   * artefact of rounding rather than a finding.
   */
  saudizationTarget: number;
}

export const DEPARTMENTS: DepartmentConfig[] = [
  { name: 'Engineering', nameAr: 'الهندسة', headcount: 342, targetSalary: 18500, budget: 76000000, growth: 12, attrition: 0.062, compaRatio: 1.02, daysToFill: 52, saudization: 0.26, saudizationTarget: 0.3 },
  { name: 'Sales', nameAr: 'المبيعات', headcount: 256, targetSalary: 14200, budget: 43600000, growth: 8, attrition: 0.105, compaRatio: 0.96, daysToFill: 34, saudization: 0.52, saudizationTarget: 0.5 },
  { name: 'Marketing', nameAr: 'التسويق', headcount: 187, targetSalary: 14800, budget: 33200000, growth: 15, attrition: 0.068, compaRatio: 0.99, daysToFill: 38, saudization: 0.38, saudizationTarget: 0.35 },
  { name: 'HR', nameAr: 'الموارد البشرية', headcount: 98, targetSalary: 13500, budget: 15900000, growth: 5, attrition: 0.05, compaRatio: 1.01, daysToFill: 30, saudization: 0.70, saudizationTarget: 0.65 },
  { name: 'Finance', nameAr: 'المالية', headcount: 134, targetSalary: 16200, budget: 26100000, growth: 3, attrition: 0.062, compaRatio: 1.03, daysToFill: 42, saudization: 0.48, saudizationTarget: 0.45 },
  { name: 'Operations', nameAr: 'العمليات', headcount: 145, targetSalary: 9800, budget: 17100000, growth: -2, attrition: 0.135, compaRatio: 0.94, daysToFill: 28, saudization: 0.18, saudizationTarget: 0.25 },
  { name: 'IT', nameAr: 'تقنية المعلومات', headcount: 65, targetSalary: 21000, budget: 16400000, growth: 18, attrition: 0.082, compaRatio: 1.08, daysToFill: 58, saudization: 0.30, saudizationTarget: 0.3 },
  { name: 'Legal', nameAr: 'الشؤون القانونية', headcount: 20, targetSalary: 24000, budget: 5800000, growth: 0, attrition: 0.055, compaRatio: 1.05, daysToFill: 65, saudization: 0.60, saudizationTarget: 0.55 },
];

/** City headcounts. Must total the same population as the departments. */
export const CITY_HEADCOUNTS: { city: string; headcount: number; growth: number }[] = [
  { city: 'Riyadh', headcount: 412, growth: 14 },
  { city: 'Jeddah', headcount: 268, growth: 9 },
  { city: 'Dammam', headcount: 187, growth: 6 },
  { city: 'Khobar', headcount: 145, growth: 4 },
  { city: 'Makkah', headcount: 132, growth: 7 },
  { city: 'Madinah', headcount: 103, growth: 2 },
];

export const LEAVE_TYPES = [
  { key: 'annual', label: 'Annual Leave', labelAr: 'الإجازة السنوية', entitlement: 30 },
  { key: 'sick', label: 'Sick Leave', labelAr: 'الإجازة المرضية', entitlement: 120 },
  { key: 'personal', label: 'Personal Leave', labelAr: 'إجازة اضطرارية', entitlement: 5 },
  { key: 'parental', label: 'Maternity/Paternity', labelAr: 'إجازة الوضع/الوضع', entitlement: 70 },
] as const;

export type LeaveKey = (typeof LEAVE_TYPES)[number]['key'];
export type Department = string;
export type EmployeeStatus = 'Active' | 'Inactive' | 'On Leave';
export type ExitType = 'voluntary' | 'involuntary';
export type Gender = 'Male' | 'Female';
export type Rating = 'Exceeds' | 'Meets' | 'Needs Improvement' | 'Below';
export type ContractType = 'Limited' | 'Unlimited';

export interface LeaveLine {
  used: number;
  /**
   * Days still available. `null` for leave that is a per-year grant rather than
   * an accruing balance — sick leave is 120 days of cover, not 120 days owed, so
   * carrying an unused remainder on the books is meaningless.
   */
  remaining: number | null;
}

export interface Employee {
  id: string;
  nameEn: string;
  nameAr: string;
  /** 10 digits: national ID starting 1 for Saudis, iqama starting 2 for expats. */
  nationalId: string;
  nationality: string;
  nationalityAr: string;
  isSaudi: boolean;
  gender: Gender;
  department: Department;
  city: string;
  region: string;
  status: EmployeeStatus;
  joinDate: string;
  exitDate: string | null;
  exitType: ExitType | null;
  /** Contract type under the Saudi Labour Law. */
  contractType: ContractType;
  occupation: string;
  occupationAr: string;
  /** Monthly allowance structure, SAR. */
  basicSalary: number;
  housingAllowance: number;
  transportAllowance: number;
  monthlyGross: number;
  annualGross: number;
  compaRatio: number;
  performance: number;
  rating: Rating;
  attendance: number;
  leaveBalance: number;
  leave: Record<LeaveKey, LeaveLine>;
  engagement: number;
  age: number;
  lastPromotion: string | null;
  /** Expatriate-only documents. Null for Saudi nationals. */
  iqamaExpiry: string | null;
  passportExpiry: string | null;
  workPermitExpiry: string | null;
  /** End-of-service benefit accrued to date, SAR. */
  endOfServiceAccrual: number;
  /** Whether the employee is registered and contributions are up to date. */
  gosiRegistered: boolean;
}

/**
 * Reporting window. `AS_OF_DATE` is the previous month end — a mid-month cutoff
 * makes the final bar of every monthly chart a partial month.
 */
function endOfPreviousMonth(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), 0));
}

export const AS_OF_DATE = endOfPreviousMonth();
export const PERIOD_START = new Date(AS_OF_DATE.getFullYear(), AS_OF_DATE.getMonth() - 11, 1);

export const SEED = 20240115;

// ---------------------------------------------------------------------------
// Names
// ---------------------------------------------------------------------------

const SAUDI_MALE = [
  ['Abdullah', 'عبدالله'], ['Mohammed', 'محمد'], ['Ahmed', 'أحمد'], ['Faisal', 'فيصل'],
  ['Khalid', 'خالد'], ['Saud', 'سعود'], ['Fahad', 'فهد'], ['Sultan', 'سلطان'],
  ['Turki', 'تركي'], ['Bandar', 'بندر'], ['Nawaf', 'نواف'], ['Majed', 'ماجد'],
  ['Abdulaziz', 'عبدالعزيز'], ['Salman', 'سلمان'], ['Nasser', 'ناصر'], ['Talal', 'طلال'],
  ['Waleed', 'وليد'], ['Yousef', 'يوسف'], ['Ibrahim', 'إبراهيم'], ['Omar', 'عمر'],
  ['Ali', 'علي'], ['Hassan', 'حسن'], ['Meshal', 'مشعل'], ['Rakan', 'راكان'],
];

const SAUDI_FEMALE = [
  ['Nouf', 'نوف'], ['Sarah', 'سارة'], ['Reem', 'ريم'], ['Layan', 'ليان'],
  ['Munira', 'منيرة'], ['Aljawharah', 'الجوهرة'], ['Latifa', 'لطيفة'], ['Norah', 'نورة'],
  ['Jawaher', 'جواهر'], ['Aisha', 'عائشة'], ['Fatimah', 'فاطمة'], ['Maryam', 'مريم'],
  ['Zainab', 'زينب'], ['Amal', 'أمل'], ['Wafa', 'وفاء'], ['Hala', 'هالة'],
  ['Dalal', 'دلال'], ['Ghada', 'غادة'], ['Rania', 'رانيا'], ['Basma', 'بسمة'],
  ['Shaden', 'شادن'], ['Yasmin', 'ياسمين'], ['Lama', 'لمى'], ['Hessa', 'حصة'],
];

const SAUDI_FAMILY = [
  ['Al-Otaibi', 'العتيبي'], ['Al-Qahtani', 'القحطاني'], ['Al-Ghamdi', 'الغامدي'],
  ['Al-Harbi', 'الحربي'], ['Al-Shehri', 'الشهري'], ['Al-Zahrani', 'الزهراني'],
  ['Al-Dossari', 'الدوسري'], ['Al-Mutairi', 'المطيري'], ['Al-Anazi', 'العنزي'],
  ['Al-Shammari', 'الشمري'], ['Al-Subaie', 'السبيعي'], ['Al-Amri', 'العمري'],
  ['Al-Malki', 'المالكي'], ['Al-Juhani', 'الجهني'], ['Al-Balawi', 'البلوي'],
  ['Al-Rashidi', 'الرشيدي'], ['Al-Yami', 'اليامي'], ['Al-Asiri', 'العسيري'],
  ['Al-Sulami', 'السلمي'], ['Al-Hazmi', 'الحازمي'], ['Al-Nefaie', 'النفيعي'],
  ['Al-Turki', 'التركي'], ['Al-Jasser', 'الجاسر'], ['Al-Faraj', 'الفرج'],
  ['Al-Bassam', 'البسام'], ['Al-Naimi', 'النعيمي'], ['Al-Saleh', 'الصالح'],
];

/**
 * Expatriate nationalities, weighted roughly as they appear in the Saudi
 * private sector. Kept explicit so the nationality mix is a decision rather
 * than a by-product of the random stream.
 */
const EXPAT_GROUPS: {
  nationality: string;
  nationalityAr: string;
  weight: number;
  male: [string, string][];
  female: [string, string][];
  family: [string, string][];
}[] = [
  {
    nationality: 'India', nationalityAr: 'الهند', weight: 30,
    male: [['Rahul', 'راهول'], ['Rajesh', 'راجيش'], ['Anand', 'أناند'], ['Vinod', 'فينود'], ['Arun', 'أرون']],
    female: [['Priya', 'بريا'], ['Anjali', 'أنجالي'], ['Deepa', 'ديبا'], ['Meera', 'ميرا']],
    family: [['Sharma', 'شارما'], ['Nair', 'ناير'], ['Menon', 'مينون'], ['Pillai', 'بيلاي'], ['Kumar', 'كومار']],
  },
  {
    nationality: 'Pakistan', nationalityAr: 'باكستان', weight: 22,
    male: [['Imran', 'عمران'], ['Bilal', 'بلال'], ['Asif', 'آصف'], ['Kashif', 'كاشف'], ['Zeeshan', 'زيشان']],
    female: [['Ayesha', 'عائشة'], ['Sana', 'سناء'], ['Hina', 'هينا']],
    family: [['Khan', 'خان'], ['Hussain', 'حسين'], ['Rahman', 'رحمن'], ['Malik', 'مالك'], ['Chaudhry', 'تشودري']],
  },
  {
    nationality: 'Egypt', nationalityAr: 'مصر', weight: 18,
    male: [['Mostafa', 'مصطفى'], ['Amr', 'عمرو'], ['Khaled', 'خالد'], ['Tarek', 'طارق'], ['Sherif', 'شريف']],
    female: [['Nour', 'نور'], ['Dina', 'دينا'], ['Heba', 'هبة']],
    family: [['El-Sayed', 'السيد'], ['Hassan', 'حسن'], ['Mansour', 'منصور'], ['Fahmy', 'فهمي'], ['Abdel-Rahman', 'عبدالرحمن']],
  },
  {
    nationality: 'Philippines', nationalityAr: 'الفلبين', weight: 12,
    male: [['Rodel', 'روديل'], ['Arnel', 'أرنيل'], ['Jomar', 'جومار']],
    female: [['Grace', 'غريس'], ['Joy', 'جوي'], ['Mary Ann', 'ماري آن']],
    family: [['Santos', 'سانتوس'], ['Reyes', 'رييس'], ['Cruz', 'كروز'], ['Bautista', 'باوتستا']],
  },
  {
    nationality: 'Bangladesh', nationalityAr: 'بنغلاديش', weight: 8,
    male: [['Rafiq', 'رفيق'], ['Jamil', 'جميل'], ['Shahid', 'شاهد']],
    female: [['Nasrin', 'نسرين'], ['Farida', 'فريدة']],
    family: [['Chowdhury', 'تشودري'], ['Hossain', 'حسين'], ['Rahman', 'رحمن']],
  },
  {
    nationality: 'Sudan', nationalityAr: 'السودان', weight: 5,
    male: [['Omer', 'عمر'], ['Musa', 'موسى'], ['Yasir', 'ياسر']],
    female: [['Amal', 'أمل'], ['Sara', 'سارة']],
    family: [['El-Tayeb', 'الطيب'], ['Babiker', 'بابكر'], ['Osman', 'عثمان']],
  },
  {
    nationality: 'Jordan', nationalityAr: 'الأردن', weight: 5,
    male: [['Yazan', 'يزن'], ['Odai', 'عدي'], ['Laith', 'ليث']],
    female: [['Ruba', 'ربا'], ['Dana', 'دانة']],
    family: [['Al-Khatib', 'الخطيب'], ['Obeidat', 'عبيدات'], ['Masri', 'مصري']],
  },
];

// ---------------------------------------------------------------------------
// Occupations
// ---------------------------------------------------------------------------

const OCCUPATIONS: Record<string, [string, string][]> = {
  Engineering: [['Software Engineer', 'مهندس برمجيات'], ['Senior Software Engineer', 'مهندس برمجيات أول'], ['Civil Engineer', 'مهندس مدني'], ['Electrical Engineer', 'مهندس كهرباء'], ['Project Engineer', 'مهندس مشاريع'], ['QA Engineer', 'مهندس ضمان جودة'], ['Engineering Manager', 'مدير هندسة']],
  Sales: [['Sales Representative', 'مندوب مبيعات'], ['Account Manager', 'مدير حسابات'], ['Regional Sales Manager', 'مدير مبيعات إقليمي'], ['Business Development Officer', 'مسؤول تطوير أعمال'], ['Sales Analyst', 'محلل مبيعات']],
  Marketing: [['Marketing Specialist', 'أخصائي تسويق'], ['Digital Marketing Manager', 'مدير تسويق رقمي'], ['Brand Manager', 'مدير علامة تجارية'], ['Content Specialist', 'أخصائي محتوى'], ['Marketing Analyst', 'محلل تسويق']],
  HR: [['HR Specialist', 'أخصائي موارد بشرية'], ['Recruitment Officer', 'مسؤول توظيف'], ['HR Business Partner', 'شريك موارد بشرية'], ['Payroll Officer', 'مسؤول رواتب'], ['Training Coordinator', 'منسق تدريب'], ['HR Manager', 'مدير موارد بشرية']],
  Finance: [['Accountant', 'محاسب'], ['Financial Analyst', 'محلل مالي'], ['Treasury Officer', 'مسؤول خزينة'], ['Finance Manager', 'مدير مالي'], ['Internal Auditor', 'مراجع داخلي']],
  Operations: [['Operations Supervisor', 'مشرف عمليات'], ['Logistics Coordinator', 'منسق لوجستي'], ['Warehouse Operator', 'عامل مستودع'], ['Facilities Technician', 'فني مرافق'], ['Operations Manager', 'مدير عمليات']],
  IT: [['IT Support Specialist', 'أخصائي دعم تقني'], ['Systems Administrator', 'مدير أنظمة'], ['Network Engineer', 'مهندس شبكات'], ['Data Analyst', 'محلل بيانات'], ['Cybersecurity Analyst', 'محلل أمن سيبراني'], ['IT Manager', 'مدير تقنية معلومات']],
  Legal: [['Legal Counsel', 'مستشار قانوني'], ['Contracts Specialist', 'أخصائي عقود'], ['Paralegal', 'مساعد قانوني'], ['Compliance Officer', 'مسؤول التزام']],
};

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

const AGE_BANDS = [
  { value: [22, 25], weight: 12.5 },
  { value: [26, 35], weight: 39.2 },
  { value: [36, 45], weight: 28.6 },
  { value: [46, 55], weight: 14.3 },
  { value: [56, 64], weight: 5.4 },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

function shuffleInPlace<T>(random: Random, items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

/** Tenure in years as of the reporting date. */
export function tenureYears(employee: Employee, at: Date = AS_OF_DATE): number {
  const end = employee.exitDate ? new Date(employee.exitDate) : at;
  return daysBetween(new Date(employee.joinDate), end) / 365.25;
}

/**
 * Statutory annual-leave entitlement: 21 days below five years' service, 30 at
 * five years and above (Labour Law Art. 109). Used instead of a flat number so
 * the leave panel reflects the law rather than a policy of convenience.
 */
export function annualLeaveEntitlement(employee: Employee): number {
  return tenureYears(employee) >= 5 ? LABOUR_LAW.annualLeave.fiveYearsAndOver : LABOUR_LAW.annualLeave.underFiveYears;
}

/** Ten-digit ID: national ID for Saudis, iqama for expatriates. */
function identityNumber(random: Random, isSaudi: boolean): string {
  const prefix = isSaudi ? '1' : '2';
  let digits = prefix;
  for (let i = 0; i < 9; i++) digits += String(randInt(random, 0, 9));
  return digits;
}

// ---------------------------------------------------------------------------
// Generation
// ---------------------------------------------------------------------------

interface Persona {
  nameEn: string;
  nameAr: string;
  nationality: string;
  nationalityAr: string;
  isSaudi: boolean;
}

function buildPersona(random: Random, isSaudi: boolean, gender: Gender): Persona {
  if (isSaudi) {
    const [givenEn, givenAr] = pick(random, gender === 'Male' ? SAUDI_MALE : SAUDI_FEMALE);
    const [familyEn, familyAr] = pick(random, SAUDI_FAMILY);
    return {
      nameEn: `${givenEn} ${familyEn}`,
      nameAr: `${givenAr} ${familyAr}`,
      nationality: 'Saudi Arabia',
      nationalityAr: 'السعودية',
      isSaudi: true,
    };
  }

  const group = pickWeighted(random, EXPAT_GROUPS.map((g) => ({ value: g, weight: g.weight })));
  const [givenEn, givenAr] = pick(random, gender === 'Male' ? group.male : group.female);
  const [familyEn, familyAr] = pick(random, group.family);
  return {
    nameEn: `${givenEn} ${familyEn}`,
    nameAr: `${givenAr} ${familyAr}`,
    nationality: group.nationality,
    nationalityAr: group.nationalityAr,
    isSaudi: false,
  };
}

function buildLeave(
  random: Random,
  tenure: number,
  attendance: number,
  isSaudi: boolean,
): Record<LeaveKey, LeaveLine> {
  const attendanceFactor = (attendance - 92) / 10;
  const drawn = (mean: number, spread: number) => Math.max(0, Math.round(randNormal(random, mean - attendanceFactor, spread)));

  const entitlement = tenure >= 5 ? LABOUR_LAW.annualLeave.fiveYearsAndOver : LABOUR_LAW.annualLeave.underFiveYears;
  // Expats typically take their full annual leave because it is tied to the
  // return ticket home; Saudi staff more often carry days into the next year.
  const taken = Math.min(entitlement, drawn(isSaudi ? entitlement * 0.55 : entitlement * 0.78, 4));

  // Sick leave: 30 days full pay, then 60 at three quarters, then 30 unpaid.
  // Most staff never touch the unpaid tier, so the balance is dominated by the
  // first two.
  const sickUsed = Math.max(0, Math.round(randNormal(random, 4.5, 3)));

  // Maternity is 10 weeks; paternity is 3 days.
  const parentalEntitlement = LABOUR_LAW.maternityLeaveWeeks * 7;
  const onParental = random() < 0.02;
  const parentalUsed = onParental ? randInt(random, 20, parentalEntitlement) : 0;

  const balance = (used: number, total: number): LeaveLine => ({ used, remaining: Math.max(0, total - used) });
  const grant = (used: number): LeaveLine => ({ used, remaining: null });

  return {
    annual: balance(taken, entitlement),
    // 30 days full pay, 60 at three quarters, 30 unpaid (Art. 117) — cover, not a balance.
    sick: grant(sickUsed),
    personal: balance(Math.max(0, Math.round(randNormal(random, 2.4, 1))), 5),
    parental: grant(parentalUsed),
  };
}

function buildEmployee(
  random: Random,
  index: number,
  department: DepartmentConfig,
  city: City,
  isSaudi: boolean,
): Employee {
  const tenureBand = pickWeighted(random, [
    { value: 'fresh', weight: 15 },
    { value: 'early', weight: 30 },
    { value: 'mid', weight: 24 },
    { value: 'senior', weight: 21 },
    { value: 'veteran', weight: 11 },
  ]);
  const tenureDays =
    tenureBand === 'fresh' ? randInt(random, 20, 364)
    : tenureBand === 'early' ? randInt(random, 365, 1094)
    : tenureBand === 'mid' ? randInt(random, 1095, 1824)
    : tenureBand === 'senior' ? randInt(random, 1825, 3649)
    : randInt(random, 3650, 6200);

  const join = new Date(Date.UTC(AS_OF_DATE.getUTCFullYear(), AS_OF_DATE.getUTCMonth(), AS_OF_DATE.getUTCDate() - tenureDays));
  const tenure = tenureDays / 365.25;

  const gender: Gender = random() < (isSaudi ? 0.52 : 0.78) ? 'Male' : 'Female';
  const persona = buildPersona(random, isSaudi, gender);

  const status: EmployeeStatus = random() < 0.025 ? 'On Leave' : 'Active';

  const rating = pickWeighted(random, RATINGS);
  const [scoreMin, scoreMax] = RATING_SCORE[rating];
  const performance = randInt(random, scoreMin, scoreMax);

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

  // Pay: a monthly gross that recentreSalaries pins to the department rate.
  const seniorityUplift = 1 + Math.min(0.35, tenure * 0.035);
  const performanceUplift = 1 + (performance - 72) / 400;
  const monthlyGross = randNormal(random, department.targetSalary, department.targetSalary * 0.16) *
    seniorityUplift * performanceUplift;

  const ageBand = pickWeighted(random, AGE_BANDS);
  const age = Math.max(18 + Math.ceil(tenureDays / 365), randInt(random, ageBand[0], ageBand[1]));

  const leave = buildLeave(random, tenure, attendance, isSaudi);
  const leaveBalance = leave.annual.remaining ?? 0;

  const wasPromoted = tenureDays > 700 && random() < 0.28;
  const lastPromotion = wasPromoted
    ? isoDate(new Date(AS_OF_DATE.getTime() - randInt(random, 30, Math.max(60, tenureDays - 400)) * 86_400_000))
    : null;

  const [occupation, occupationAr] = pick(random, OCCUPATIONS[department.name]);

  return {
    id: `EMP-${String(index + 1).padStart(4, '0')}`,
    nameEn: persona.nameEn,
    nameAr: persona.nameAr,
    nationalId: identityNumber(random, isSaudi),
    nationality: persona.nationality,
    nationalityAr: persona.nationalityAr,
    isSaudi,
    gender,
    department: department.name,
    city: city.city,
    region: city.region,
    status,
    joinDate: isoDate(join),
    exitDate: null,
    exitType: null,
    // Fixed-term contracts are the norm for expatriates; Saudis are usually on
    // unlimited contracts.
    contractType: isSaudi ? (random() < 0.25 ? 'Limited' : 'Unlimited') : 'Limited',
    occupation,
    occupationAr,
    basicSalary: Math.round(monthlyGross),
    housingAllowance: 0,
    transportAllowance: 0,
    monthlyGross: Math.round(monthlyGross),
    annualGross: Math.round(monthlyGross) * 12,
    compaRatio: monthlyGross / (department.targetSalary / department.compaRatio),
    performance,
    rating,
    attendance: Math.max(60, Math.min(100, Math.round(attendance * 10) / 10)),
    leaveBalance,
    leave,
    engagement,
    age,
    lastPromotion,
    iqamaExpiry: null,
    passportExpiry: null,
    workPermitExpiry: null,
    endOfServiceAccrual: 0,
    gosiRegistered: true,
  };
}

/**
 * Marks leavers. Departures are confined to the trailing twelve months, which
 * is what makes the population mean "current staff plus everyone who left
 * during the period" and makes attrition a real annual rate.
 */
function markLeavers(random: Random, population: Employee[]): void {
  for (const dept of DEPARTMENTS) {
    const leavers = Math.round(dept.headcount * dept.attrition);
    // Someone must have been here a month before they can resign.
    const eligible = shuffleInPlace(
      random,
      population.filter((e) => e.department === dept.name && daysBetween(new Date(e.joinDate), AS_OF_DATE) >= 30),
    );

    for (const employee of eligible.slice(0, leavers)) {
      const join = new Date(employee.joinDate);
      const earliest = Math.max(PERIOD_START.getTime(), join.getTime() + 30 * 86_400_000);
      if (earliest >= AS_OF_DATE.getTime()) continue;

      const exit = new Date(earliest + Math.round((AS_OF_DATE.getTime() - earliest) * random()));
      employee.exitDate = isoDate(exit);
      employee.exitType = random() < 0.22 ? 'involuntary' : 'voluntary';
      employee.status = 'Inactive';
      employee.lastPromotion = null;
      // Leave is settled on the final settlement; nothing carries over.
      employee.leave = {
        annual: { used: employee.leave.annual.used + (employee.leave.annual.remaining ?? 0), remaining: 0 },
        sick: employee.leave.sick,
        personal: employee.leave.personal,
        parental: employee.leave.parental,
      };
      employee.leaveBalance = 0;
    }
  }
}

/** Splits gross pay into the allowance structure and pins department means. */
function structurePay(population: Employee[], random: Random): void {
  for (const dept of DEPARTMENTS) {
    const rows = population.filter((e) => e.department === dept.name);
    const mean = rows.reduce((sum, e) => sum + e.monthlyGross, 0) / rows.length;
    const factor = dept.targetSalary / mean;

    for (const employee of rows) {
      const jitter = 1 + (random() - 0.5) * 0.006;
      const gross = Math.round((employee.monthlyGross * factor * jitter) / 50) * 50;

      // Standard Saudi structure: basic is the reference for every other
      // allowance, so each is derived from it rather than invented separately.
      const basic = Math.round(gross / 1.35); // basic + 25% housing + 10% transport
      const housing = Math.round(basic * 0.25);
      const transport = gross - basic - housing;

      employee.basicSalary = basic;
      employee.housingAllowance = housing;
      employee.transportAllowance = transport;
      employee.monthlyGross = gross;
      employee.annualGross = gross * 12;
      employee.compaRatio = gross / (dept.targetSalary / dept.compaRatio);
    }
  }
}

/**
 * Expatriate documents. Iqama and work permits run on a calendar year from
 * issue, so expiry dates cluster; passports are longer-lived. Both are stored
 * as real dates because the compliance panel's whole job is to surface the ones
 * that are about to lapse.
 */
function assignDocuments(random: Random, population: Employee[]): void {
  for (const employee of population) {
    if (employee.isSaudi) continue;

    const join = new Date(employee.joinDate);
    // Renewals follow the iqama anniversary, so most are months away; a small
    // share is genuinely overdue, because a compliance panel that always reads
    // 100% is not reporting anything.
    const tier = random();
    const offsetDays =
      tier < 0.03 ? randInt(random, -45, -1)     // overdue
      : tier < 0.12 ? randInt(random, 1, 30)     // due now
      : tier < 0.25 ? randInt(random, 31, 90)    // in the queue
      : randInt(random, 91, 400);                // comfortably valid

    const iqama = new Date(AS_OF_DATE);
    iqama.setUTCDate(iqama.getUTCDate() + offsetDays);
    employee.iqamaExpiry = isoDate(iqama);
    employee.workPermitExpiry = isoDate(iqama);

    // Passports are valid for years; only a handful are near expiry.
    const passport = new Date(AS_OF_DATE);
    passport.setUTCMonth(passport.getUTCMonth() + (random() < 0.03 ? randInt(random, 0, 2) : randInt(random, 3, 48)));
    employee.passportExpiry = isoDate(passport);

    // A small share of records are genuinely out of date, because a compliance
    // dashboard that always shows 100% is not reporting anything.
    employee.gosiRegistered = random() > 0.012;
    void join;
  }
}

/** Accrued end-of-service benefit, on the Labour Law Art. 84 formula. */
function accrueEndOfService(population: Employee[]): void {
  for (const employee of population) {
    const years = tenureYears(employee);
    const firstFive = Math.min(years, 5);
    const beyond = Math.max(0, years - 5);
    employee.endOfServiceAccrual = Math.round((firstFive * 0.5 + beyond) * employee.monthlyGross);
  }
}

function generateEmployees(): Employee[] {
  const random = createRandom(SEED);

  const departmentSlots: DepartmentConfig[] = [];
  for (const dept of DEPARTMENTS) {
    for (let i = 0; i < dept.headcount; i++) departmentSlots.push(dept);
  }

  const citySlots: City[] = [];
  for (const entry of CITY_HEADCOUNTS) {
    const city = CITIES.find((c) => c.city === entry.city);
    if (!city) throw new Error(`Unknown city: ${entry.city}`);
    for (let i = 0; i < entry.headcount; i++) citySlots.push(city);
  }

  if (departmentSlots.length !== citySlots.length) {
    throw new Error(
      `Headcount mismatch: departments total ${departmentSlots.length}, cities total ${citySlots.length}. ` +
        'Both must describe the same population.',
    );
  }

  // Saudization is a compliance figure, so each department's Saudi headcount is
  // set exactly rather than left to a per-person probability. The flag is
  // attached to its department *before* shuffling — shuffling the two lists
  // independently scrambles which department each flag belongs to, which
  // silently produced the right org-wide total with the wrong departments.
  const personSlots = departmentSlots.map((department) => ({ department, isSaudi: false }));
  let cursor = 0;
  for (const dept of DEPARTMENTS) {
    const saudis = Math.round(dept.headcount * dept.saudization);
    for (let i = 0; i < dept.headcount; i++) {
      personSlots[cursor + i].isSaudi = i < saudis;
    }
    cursor += dept.headcount;
  }

  const shuffledPeople = shuffleInPlace(random, personSlots);
  const shuffledCities = shuffleInPlace(random, citySlots);

  const population = shuffledPeople.map((slot, index) =>
    buildEmployee(random, index, slot.department, shuffledCities[index], slot.isSaudi),
  );

  markLeavers(random, population);
  structurePay(population, random);
  assignDocuments(random, population);
  accrueEndOfService(population);
  return population;
}

/** The single source of truth for the whole dashboard. */
export const employees: Employee[] = generateEmployees();

/** Everyone still on the books. */
export const activeEmployees = employees.filter((e) => e.status !== 'Inactive');

/** Prayer times for a city, for the working-day panel. */
export function cityPrayerTimes(cityName: string, date: Date = AS_OF_DATE) {
  const city = CITIES.find((c) => c.city === cityName) ?? CITIES[0];
  return prayerTimes(date, city.latitude, city.longitude);
}

export { SAUDI_TIME_ZONE };
