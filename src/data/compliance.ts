/**
 * The Saudi regulatory view.
 *
 * `metrics.ts` computes the workforce figures; this module composes them into
 * the things a Saudi establishment is actually evaluated on, and adds the
 * reference material the panels display: the Nitaqat ladder, the statutory
 * framework with its articles, and the holiday calendar.
 *
 * Split from `metrics.ts` because "how many people work here" and "are we
 * compliant" are different questions with different audiences — and because
 * the compliance surface is the one an inspector asks to see.
 */
import {
  documentAlerts,
  documents,
  payrollRuns,
  endOfService,
  expatCosts as baseExpatCosts,
  gosi,
  headcount,
  leavers,
  nationalityMix,
  prayerSchedule,
  ramadan,
  saudization as baseSaudization,
  turnover,
  workingHours,
  wps,
} from './metrics';
import { LABOUR_LAW, NITAQAT_BANDS, holidaysBetween } from './saudi';
import { AS_OF_DATE } from './employees';

export {
  documentAlerts,
  documents,
  endOfService,
  gosi,
  payrollRuns,
  prayerSchedule,
  ramadan,
  workingHours,
  wps,
};
export type { NitaqatBand, DocumentAlert } from './metrics';

/** The Nitaqat ladder, highest band first, for the band visualisation. */
export const nitaqatLadder = [...NITAQAT_BANDS]
  .sort((a, b) => b.minPercent - a.minPercent)
  .map((band) => ({ band: band.band, minPercent: band.minPercent, tone: band.tone }));

/** Saudization with the turnover split that the blended rate hides. */
export const saudization = {
  ...baseSaudization,
  saudiTurnover: turnover.saudiRate,
  expatTurnover: turnover.expatRate,
  /** Saudi share of the workforce, by city. */
  cities: baseSaudization.byCity,
  headcount: headcount.total,
};

/** Expatriate cost, with the nationality mix behind it. */
export const expatCosts = {
  ...baseExpatCosts,
  nationalityCount: nationalityMix.length,
  topNationalities: nationalityMix.filter((n) => n.nationality !== 'Saudi Arabia').slice(0, 6),
  /** Nationality mix including Saudis, for the share chart. */
  fullMix: nationalityMix,
  leaversThisPeriod: leavers.filter((e) => !e.isSaudi).length,
};

/**
 * The statutory framework, with the article each figure comes from. Kept as
 * data rather than prose so the panels and any future tooltip read the same
 * source.
 */
export interface LabourLawItem {
  title: string;
  titleAr: string;
  article: string;
  value: string;
}

export const labourLawReference: LabourLawItem[] = [
  {
    title: 'Working hours',
    titleAr: 'ساعات العمل',
    article: 'Art. 98',
    value: `${LABOUR_LAW.workingHours.normal} hours a day, ${LABOUR_LAW.workingHours.weekly} a week — reduced to ${LABOUR_LAW.workingHours.ramadan} and ${LABOUR_LAW.workingHours.ramadanWeekly} during Ramadan.`,
  },
  {
    title: 'Weekly rest',
    titleAr: 'الراحة الأسبوعية',
    article: 'Art. 104',
    value: `Friday and Saturday. The working week runs Sunday to Thursday.`,
  },
  {
    title: 'Annual leave',
    titleAr: 'الإجازة السنوية',
    article: 'Art. 109',
    value: `${LABOUR_LAW.annualLeave.underFiveYears} days below five years of service, ${LABOUR_LAW.annualLeave.fiveYearsAndOver} days at five and above.`,
  },
  {
    title: 'Sick leave',
    titleAr: 'الإجازة المرضية',
    article: 'Art. 117',
    value: '30 days at full pay, the next 60 at three quarters pay, then 30 unpaid — a grant, not a balance.',
  },
  {
    title: 'Maternity & paternity',
    titleAr: 'إجازة الوضع والمولود',
    article: 'Art. 151–152',
    value: `${LABOUR_LAW.maternityLeaveWeeks} weeks maternity, ${LABOUR_LAW.paternityLeaveDays} days paternity.`,
  },
  {
    title: 'Probation & notice',
    titleAr: 'فترة التجربة والإشعار',
    article: 'Art. 53, 75',
    value: `Probation up to ${LABOUR_LAW.probationDays} days. Notice ${LABOUR_LAW.noticeDays.underFiveYears} days, or ${LABOUR_LAW.noticeDays.fiveYearsAndOver} days once service reaches five years.`,
  },
  {
    title: 'End of service',
    titleAr: 'مكافأة نهاية الخدمة',
    article: 'Art. 84–85',
    value: 'Half a month per year for the first five, a full month thereafter. Resignation scales down; termination pays in full.',
  },
  {
    title: 'Wage payment',
    titleAr: 'دفع الأجور',
    article: 'WPS / Mudad',
    value: 'Wages must reach the employee through the Wage Protection System via a Saudi bank, on the agreed date.',
  },
];

/** Public holidays inside the planning window, dual-dated. */
export const saudiHolidays = (() => {
  const to = new Date(AS_OF_DATE);
  to.setUTCMonth(to.getUTCMonth() + 14);
  return holidaysBetween(AS_OF_DATE, to).slice(0, 6);
})();
