/**
 * Saudi reference data and the regulatory parameters the dashboard reports against.
 *
 * Two things are deliberately kept apart:
 *
 *   1. **Fixed facts** — the weekend is Friday–Saturday, the Umm al-Qura calendar
 *      is the official Hijri calendar, prayers are the Umm al-Qura method.
 *   2. **Configurable rates** — GOSI percentages, the expat work-permit levy,
 *      Nitaqat band thresholds. These change by ministerial decision and vary by
 *      the establishment's activity code. They are constants here, clearly
 *      marked, so that a change is a one-line edit rather than a hunt through
 *      components. Treat the numbers in `COMPLIANCE` as defaults to be confirmed
 *      against Qiwa / GOSI / MHRSD for a specific establishment — they are not
 *      legal advice.
 */

// ---------------------------------------------------------------------------
// Places
// ---------------------------------------------------------------------------

export interface City {
  city: string;
  cityAr: string;
  region: string;
  regionAr: string;
  /** For geo-fenced attendance: the site centre. */
  latitude: number;
  longitude: number;
  /** IANA zone — all of Saudi Arabia is one zone, but this keeps it explicit. */
  timeZone: string;
  /** Site type, which is what a geo-fence would actually be attached to. */
  siteType: 'Head office' | 'Regional office' | 'Branch' | 'Plant' | 'Warehouse';
}

export const CITIES: City[] = [
  {
    city: 'Riyadh',
    cityAr: 'الرياض',
    region: 'Riyadh Province',
    regionAr: 'منطقة الرياض',
    latitude: 24.7136,
    longitude: 46.6753,
    timeZone: 'Asia/Riyadh',
    siteType: 'Head office',
  },
  {
    city: 'Jeddah',
    cityAr: 'جدة',
    region: 'Makkah Province',
    regionAr: 'منطقة مكة المكرمة',
    latitude: 21.4858,
    longitude: 39.1925,
    timeZone: 'Asia/Riyadh',
    siteType: 'Regional office',
  },
  {
    city: 'Dammam',
    cityAr: 'الدمام',
    region: 'Eastern Province',
    regionAr: 'المنطقة الشرقية',
    latitude: 26.4207,
    longitude: 50.0888,
    timeZone: 'Asia/Riyadh',
    siteType: 'Regional office',
  },
  {
    city: 'Khobar',
    cityAr: 'الخبر',
    region: 'Eastern Province',
    regionAr: 'المنطقة الشرقية',
    latitude: 26.2794,
    longitude: 50.2080,
    timeZone: 'Asia/Riyadh',
    siteType: 'Branch',
  },
  {
    city: 'Makkah',
    cityAr: 'مكة المكرمة',
    region: 'Makkah Province',
    regionAr: 'منطقة مكة المكرمة',
    latitude: 21.3891,
    longitude: 39.8579,
    timeZone: 'Asia/Riyadh',
    siteType: 'Branch',
  },
  {
    city: 'Madinah',
    cityAr: 'المدينة المنورة',
    region: 'Al Madinah Province',
    regionAr: 'منطقة المدينة المنورة',
    latitude: 24.5247,
    longitude: 39.5692,
    timeZone: 'Asia/Riyadh',
    siteType: 'Branch',
  },
];

export const SAUDI_TIME_ZONE = 'Asia/Riyadh';

/** Saudi Arabia observes one time zone and no daylight saving. */
export const SAUDI_UTC_OFFSET_HOURS = 3;

// ---------------------------------------------------------------------------
// Locale formatting
// ---------------------------------------------------------------------------

/**
 * Hijri via the Umm al-Qura calendar, which is the official calendar of the
 * Kingdom (the `islamic-umalqura` calendar in `Intl`). Umm al-Qura is
 * observationally adjusted, so it can differ by a day from the tabular
 * arithmetic calendar used elsewhere.
 */
export function toHijri(date: Date, opts: { arabicNumerals?: boolean } = {}): string {
  const locale = opts.arabicNumerals
    ? 'ar-SA-u-ca-islamic-umalqura-nu-arab'
    : 'en-US-u-ca-islamic-umalqura';
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

/** Hijri year/month/day as numbers, for comparisons and sorting. */
export function hijriParts(date: Date): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat('en-US-u-ca-islamic-umalqura', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return { year: get('year'), month: get('month'), day: get('day') };
}

const CURRENCY = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'SAR',
  maximumFractionDigits: 0,
});

/** Renders an amount in Saudi Riyals. Western digits: the app's numeral choice. */
export function formatSAR(amount: number): string {
  return CURRENCY.format(amount).replace('SAR', 'SAR ').replace(/\s+/g, ' ');
}

/** Abbreviated SAR for tight spaces — 1,240,000 becomes "SAR 1.24M". */
export function formatSARCompact(amount: number): string {
  if (Math.abs(amount) >= 1_000_000) return `SAR ${(amount / 1_000_000).toFixed(2)}M`;
  if (Math.abs(amount) >= 1_000) return `SAR ${Math.round(amount / 1000)}k`;
  return formatSAR(amount);
}

export function formatGregorian(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

// ---------------------------------------------------------------------------
// Saudi Labour Law — the entitlements the Leave module reports on
// ---------------------------------------------------------------------------

/**
 * Entitlements under the Saudi Labour Law (Royal Decree M/51). These are the
 * statutory minimums; an employer may be more generous, never less.
 */
export const LABOUR_LAW = {
  /** Art. 98 — 8 hours a day / 48 a week, reduced to 6 / 36 during Ramadan. */
  workingHours: { normal: 8, weekly: 48, ramadan: 6, ramadanWeekly: 36 },
  /** Art. 98 — the working day never exceeds 11 hours of actual work. */
  maxActualHours: 11,
  /** Art. 104 — Friday is the weekly rest day; the weekend is Fri–Sat. */
  weekend: ['Friday', 'Saturday'],
  /** Art. 53 — probation may not exceed 90 days. */
  probationDays: 90,
  /**
   * Art. 109 — 21 days of annual leave for under five years' service, 30 days
   * at five years and beyond.
   */
  annualLeave: { underFiveYears: 21, fiveYearsAndOver: 30 },
  /**
   * Art. 117 — sick leave is 30 days at full pay, the next 60 at three quarters
   * pay, then 30 unpaid.
   */
  sickLeave: [
    { days: 30, pay: 1 },
    { days: 60, pay: 0.75 },
    { days: 30, pay: 0 },
  ],
  /** Art. 151 — ten weeks of maternity leave. */
  maternityLeaveWeeks: 10,
  /** Art. 152 — three days of paternity leave. */
  paternityLeaveDays: 3,
  /** Art. 113 — five days for marriage, five for bereavement (spouse/kin), three (sibling). */
  marriageLeaveDays: 5,
  bereavementLeaveDays: { spouseOrKin: 5, sibling: 3 },
  /** Art. 114 — 10 to 15 days for Hajj, once during service. */
  hajjLeaveDays: { min: 10, max: 15 },
  /** Art. 75 — notice is 30 days, or 60 once service reaches five years. */
  noticeDays: { underFiveYears: 30, fiveYearsAndOver: 60 },
  /** Art. 74 — the employer may not terminate without a valid reason. */
  endOfServiceFormulaVersion: 'Art. 84 (termination) / Art. 85 (resignation)',
} as const;

/**
 * End-of-service benefit (مكافأة نهاية الخدمة).
 *
 * Article 84: half a month's wage for each of the first five years, one month's
 * wage for each year after. Article 85 scales that down for resignation:
 * nothing under two years, a third from two to five, two thirds from five to
 * ten, and the full amount at ten years and beyond.
 */
export function endOfServiceBenefit(
  monthlyWage: number,
  serviceYears: number,
  reason: 'termination' | 'resignation',
): number {
  const firstFive = Math.min(serviceYears, 5);
  const beyond = Math.max(0, serviceYears - 5);
  let benefit = firstFive * 0.5 * monthlyWage + beyond * monthlyWage;

  if (reason === 'resignation') {
    if (serviceYears < 2) benefit = 0;
    else if (serviceYears < 5) benefit *= 1 / 3;
    else if (serviceYears < 10) benefit *= 2 / 3;
  }

  return Math.round(benefit / 100) * 100;
}

// ---------------------------------------------------------------------------
// GOSI and Nitaqat
// ---------------------------------------------------------------------------

/**
 * GOSI contribution rates, as percentages of the contributory wage.
 *
 * Saudis are insured for annuities (pension) plus SANED (unemployment);
 * non-Saudis are covered for occupational hazards only. The employer's pension
 * share is on a published step-up schedule, so this is the single number to
 * change when the rate moves. Confirm current rates with GOSI before relying on
 * them for a payroll run.
 */
export const GOSI = {
  saudi: { employee: 9.75, employer: 11.75 },
  expat: { employee: 0, employer: 2 },
  /** Contributions are charged on wages up to this monthly ceiling. */
  contributoryWageCeiling: 45_000,
} as const;

/** Nitaqat (نطاقات) banding by Saudization percentage. */
export type NitaqatBand = 'Platinum' | 'Green (High)' | 'Green (Mid)' | 'Green (Low)' | 'Yellow' | 'Red';

/**
 * Band thresholds by Saudization percentage.
 *
 * ⚠️ Defaults only. Real Nitaqat thresholds are set per economic activity and
 * establishment size by MHRSD and are revised periodically — an establishment
 * must read its own band on Qiwa. These exist so the dashboard can show a band
 * and flag drift, not to assert where any particular company sits.
 */
export const NITAQAT_BANDS: { band: NitaqatBand; minPercent: number; tone: string }[] = [
  { band: 'Platinum', minPercent: 40, tone: 'emerald' },
  { band: 'Green (High)', minPercent: 35, tone: 'sky' },
  { band: 'Green (Mid)', minPercent: 30, tone: 'cyan' },
  { band: 'Green (Low)', minPercent: 25, tone: 'indigo' },
  { band: 'Yellow', minPercent: 15, tone: 'amber' },
  { band: 'Red', minPercent: 0, tone: 'rose' },
];

export function nitaqatBand(saudizationPercent: number): (typeof NITAQAT_BANDS)[number] {
  return NITAQAT_BANDS.find((b) => saudizationPercent >= b.minPercent) ?? NITAQAT_BANDS[NITAQAT_BANDS.length - 1];
}

// ---------------------------------------------------------------------------
// Other compliance parameters
// ---------------------------------------------------------------------------

export const COMPLIANCE = {
  /**
   * Work-permit (iqama) levy per expatriate employee per year. The rate steps
   * down when Saudis are at least as numerous as expatriates. Confirm current
   * amounts with MHRSD — these have moved repeatedly.
   */
  expatLevy: { expatsOutnumberSaudis: 9_600, saudisOutnumberExpats: 8_400 },
  /** Documents are flagged for action this far ahead of expiry. */
  documentWarningDays: 90,
  /** Value-added tax. */
  vatRate: 15,
  /**
   * Personal Data Protection Law (SDAIA). Breach notification window and the
   * retention default the dashboard reports against.
   */
  pdpl: { breachNotificationHours: 72, defaultRetentionYears: 5 },
  /** Wages must be paid through the Wage Protection System, via a Saudi bank. */
  wps: { requiredPaymentDay: 3, allowedDelayDays: 3 },
} as const;

// ---------------------------------------------------------------------------
// Official holidays
// ---------------------------------------------------------------------------

export interface Holiday {
  name: string;
  nameAr: string;
  /** 'gregorian' holidays fall on a fixed Gregorian date; 'hijri' ones shift. */
  basis: 'gregorian' | 'hijri';
  month: number;
  day: number;
  /** Inclusive length in days. */
  days: number;
}

/**
 * The public holidays the Kingdom observes. National Day and Founding Day are
 * fixed to the Gregorian calendar; the Eids follow the Hijri calendar and so
 * move about eleven days earlier each Gregorian year.
 */
export const HOLIDAYS: Holiday[] = [
  { name: 'Founding Day', nameAr: 'يوم التأسيس', basis: 'gregorian', month: 2, day: 22, days: 1 },
  { name: 'Eid al-Fitr', nameAr: 'عيد الفطر', basis: 'hijri', month: 10, day: 1, days: 4 },
  { name: 'Eid al-Adha', nameAr: 'عيد الأضحى', basis: 'hijri', month: 12, day: 10, days: 4 },
  { name: 'National Day', nameAr: 'اليوم الوطني', basis: 'gregorian', month: 9, day: 23, days: 1 },
];

function toDate(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}

/** Gregorian-date holidays inside a window. Hijri ones are resolved by search. */
function gregorianHolidays(from: Date, to: Date): { holiday: Holiday; date: Date }[] {
  const found: { holiday: Holiday; date: Date }[] = [];
  for (const holiday of HOLIDAYS.filter((h) => h.basis === 'gregorian')) {
    for (let year = from.getUTCFullYear(); year <= to.getUTCFullYear(); year++) {
      const date = new Date(Date.UTC(year, holiday.month - 1, holiday.day));
      if (date >= from && date <= to) found.push({ holiday, date });
    }
  }
  return found;
}

/**
 * Hijri holidays, located by walking the Hijri calendar rather than guessing an
 * offset — Umm al-Qura is observationally adjusted, so an arithmetic estimate
 * lands on the wrong day often enough to matter for a leave calendar.
 */
function hijriHolidays(from: Date, to: Date): { holiday: Holiday; date: Date }[] {
  const found: { holiday: Holiday; date: Date }[] = [];
  for (const holiday of HOLIDAYS.filter((h) => h.basis === 'hijri')) {
    const cursor = new Date(from);
    while (cursor <= to) {
      const parts = hijriParts(cursor);
      if (parts.month === holiday.month && parts.day === holiday.day) {
        found.push({ holiday, date: new Date(cursor) });
        cursor.setUTCDate(cursor.getUTCDate() + 25); // skip past this occurrence
        continue;
      }
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
  }
  return found;
}

export interface UpcomingHoliday {
  name: string;
  nameAr: string;
  date: Date;
  gregorian: string;
  hijri: string;
  days: number;
  daysAway: number;
}

/** Holidays between two dates, soonest first. */
export function holidaysBetween(from: Date, to: Date): UpcomingHoliday[] {
  const today = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  return [...gregorianHolidays(from, to), ...hijriHolidays(from, to)]
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map(({ holiday, date }) => ({
      name: holiday.name,
      nameAr: holiday.nameAr,
      date,
      gregorian: formatGregorian(date),
      hijri: toHijri(date),
      days: holiday.days,
      daysAway: Math.round((date.getTime() - today.getTime()) / 86_400_000),
    }));
}

export function toDateFromIso(iso: string): Date {
  return toDate(iso);
}

// ---------------------------------------------------------------------------
// Ramadan
// ---------------------------------------------------------------------------

/** Ramadan is the ninth month of the Hijri year. */
export const RAMADAN_HIJRI_MONTH = 9;

export interface RamadanState {
  isRamadan: boolean;
  /** Days until Ramadan starts, when it is not underway. */
  daysUntil: number | null;
  /** Day of Ramadan, 1-30. */
  dayOfRamadan: number | null;
  hijriYear: number;
}

export function ramadanState(at: Date, searchDays = 400): RamadanState {
  const parts = hijriParts(at);
  if (parts.month === RAMADAN_HIJRI_MONTH) {
    return { isRamadan: true, daysUntil: null, dayOfRamadan: parts.day, hijriYear: parts.year };
  }

  const cursor = new Date(at);
  for (let i = 1; i <= searchDays; i++) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    const next = hijriParts(cursor);
    if (next.month === RAMADAN_HIJRI_MONTH) {
      return { isRamadan: false, daysUntil: i, dayOfRamadan: null, hijriYear: parts.year };
    }
  }
  return { isRamadan: false, daysUntil: null, dayOfRamadan: null, hijriYear: parts.year };
}

// ---------------------------------------------------------------------------
// Prayer times
// ---------------------------------------------------------------------------

export interface PrayerTimes {
  fajr: string;
  sunrise: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
}

const DEG = Math.PI / 180;
const sin = (d: number) => Math.sin(d * DEG);
const cos = (d: number) => Math.cos(d * DEG);
const tan = (d: number) => Math.tan(d * DEG);
const arcsin = (x: number) => Math.asin(x) / DEG;
const arccos = (x: number) => Math.acos(x) / DEG;
const arctan2 = (y: number, x: number) => Math.atan2(y, x) / DEG;
const arccot = (x: number) => Math.atan(1 / x) / DEG;

function fixAngle(a: number): number {
  return a - 360 * Math.floor(a / 360);
}

function fixHour(h: number): number {
  return h - 24 * Math.floor(h / 24);
}

function julianDay(date: Date): number {
  let year = date.getUTCFullYear();
  let month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  if (month <= 2) {
    year -= 1;
    month += 12;
  }
  const a = Math.floor(year / 100);
  const b = 2 - a + Math.floor(a / 4);
  return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + b - 1524.5;
}

function sunPosition(jd: number) {
  const d = jd - 2451545.0;
  const g = fixAngle(357.529 + 0.98560028 * d);
  const q = fixAngle(280.459 + 0.98564736 * d);
  const l = fixAngle(q + 1.915 * sin(g) + 0.02 * sin(2 * g));
  const e = 23.439 - 0.00000036 * d;
  const declination = arcsin(sin(e) * sin(l));
  const rightAscension = fixHour(arctan2(cos(e) * sin(l), cos(l)) / 15);
  const equation = q / 15 - rightAscension;
  return { declination, equation };
}

/**
 * Prayer times by the Umm al-Qura method, which is what Saudi Arabia uses:
 * Fajr at 18.5° below the horizon, Isha 90 minutes after Maghrib, and Asr by
 * the Shafi'i shadow ratio. Near the poles these angles never resolve; that
 * cannot happen in Saudi Arabia, but the guards stay in place because the
 * function is exported.
 */
export function prayerTimes(date: Date, latitude: number, longitude: number): PrayerTimes {
  const jd = julianDay(date);
  const { declination, equation } = sunPosition(jd);
  const noon = 12 - equation; // local solar noon, hours

  const sunAngleTime = (angle: number, before: boolean): number => {
    const numerator = -sin(angle) - sin(declination) * sin(latitude);
    const denominator = cos(declination) * cos(latitude);
    if (denominator === 0) return Number.NaN;
    const ratio = numerator / denominator;
    if (ratio > 1 || ratio < -1) return Number.NaN;
    const hours = arccos(ratio) / 15;
    return noon + (before ? -hours : hours);
  };

  const asrAngle = -arccot(1 + tan(Math.abs(latitude - declination)));
  return {
    fajr: formatClock(sunAngleTime(18.5, true), longitude),
    sunrise: formatClock(sunAngleTime(0.833, true), longitude),
    dhuhr: formatClock(noon + 1 / 60, longitude), // a minute after true noon to be safe
    asr: formatClock(sunAngleTime(asrAngle, false), longitude),
    maghrib: formatClock(sunAngleTime(0.833, false), longitude),
    isha: formatClock(sunAngleTime(0.833, false) + 1.5, longitude), // 90 minutes after Maghrib
  };
}

/** Converts solar hours to the Kingdom's wall clock (UTC+3, no DST). */
function formatClock(hours: number, longitude: number): string {
  if (Number.isNaN(hours)) return '—';
  const local = fixHour(hours - longitude / 15 + SAUDI_UTC_OFFSET_HOURS);
  const h = Math.floor(local);
  const m = Math.round((local - h) * 60);
  const carry = m === 60 ? 1 : 0;
  return `${String((h + carry) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Saudization helpers
// ---------------------------------------------------------------------------

export interface SaudizationBand {
  band: NitaqatBand;
  percent: number;
  saudis: number;
  expats: number;
  tone: string;
}
