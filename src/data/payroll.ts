/**
 * Selectors for the Payroll & Comp module.
 *
 * The question this module answers is not "what do we pay people" but "what
 * does employing these people cost us, and is any of it wrong". Those are three
 * different numbers — salary, the statutory employer burden on top of it, and
 * the accrued liability for ending it — and a payroll screen that shows only
 * the first one understates the cost of employment by roughly a quarter.
 */
import { DEPARTMENTS, activeEmployees, type Employee } from './employees';
import { expatCosts, gosi, endOfService, pay, payrollRuns, salaryDistribution, wps } from './metrics';
import { GOSI, LABOUR_LAW } from './saudi';

export { pay, payrollRuns, salaryDistribution, wps, endOfService };

/** Monthly totals for each pay element. Allowances are statutory add-ons. */
export const allowanceSplit = (() => {
  const basic = activeEmployees.reduce((sum, e) => sum + e.basicSalary, 0);
  const housing = activeEmployees.reduce((sum, e) => sum + e.housingAllowance, 0);
  const transport = activeEmployees.reduce((sum, e) => sum + e.transportAllowance, 0);
  const total = basic + housing + transport;
  const share = (value: number) => Number(((value / total) * 100).toFixed(1));
  return {
    basic,
    housing,
    transport,
    total,
    basicShare: share(basic),
    housingShare: share(housing),
    transportShare: share(transport),
  };
})();

/**
 * The employer burden: what is paid to the employee is only part of the cost.
 * GOSI is the employer's share only — the employee's contribution is deducted
 * from their pay, not added to the company's.
 */
export const employerBurden = (() => {
  const gosiEmployerAnnual = gosi.employerAnnual;
  const levyAnnual = expatCosts.annualLevyTotal;
  const payrollAnnual = pay.annualPayroll;
  const totalAnnual = payrollAnnual + gosiEmployerAnnual + levyAnnual;
  return {
    payrollMonthly: pay.monthlyPayroll,
    payrollAnnual,
    gosiMonthly: gosi.employerMonthly,
    gosiAnnual: gosiEmployerAnnual,
    levyAnnual,
    /** Accrual, not a cash cost this year — shown separately for that reason. */
    eosbAccrued: endOfService.accrued,
    totalAnnual,
    /** True cost per head per year, all elements included. */
    perHeadAnnual: Math.round(totalAnnual / activeEmployees.length),
    overheadShare: Number((((totalAnnual - payrollAnnual) / payrollAnnual) * 100).toFixed(1)),
  };
})();

/** Budget position. `budget` is the annual figure held per department. */
export const budgetPosition = (() => {
  const budget = pay.budget;
  const actual = pay.annualPayroll;
  return {
    budget,
    actual,
    variance: budget - actual,
    utilization: Number(((actual / budget) * 100).toFixed(1)),
  };
})();

export interface DepartmentPay {
  name: string;
  nameAr: string;
  headcount: number;
  averageMonthly: number;
  compaRatio: number;
  /** Mean pay as a share of the department's own midpoint. */
  target: number;
  monthlyCost: number;
  annualCost: number;
  budget: number;
  budgetUtilization: number;
}

/** Cost and compa-ratio per department, against each department's own budget. */
export const payByDepartment: DepartmentPay[] = DEPARTMENTS.map((dept) => {
  const rows = activeEmployees.filter((e) => e.department === dept.name);
  const monthlyCost = rows.reduce((sum, e) => sum + e.monthlyGross, 0);
  const averageMonthly = rows.length ? Math.round(monthlyCost / rows.length) : 0;
  const compaRatio = rows.length
    ? rows.reduce((sum, e) => sum + e.compaRatio, 0) / rows.length
    : 0;
  return {
    name: dept.name,
    nameAr: dept.nameAr,
    headcount: rows.length,
    averageMonthly,
    compaRatio: Number((compaRatio * 100).toFixed(1)),
    target: dept.targetSalary,
    monthlyCost,
    annualCost: monthlyCost * 12,
    budget: dept.budget,
    budgetUtilization: Number((((monthlyCost * 12) / dept.budget) * 100).toFixed(1)),
  };
}).sort((a, b) => b.annualCost - a.annualCost);

export type AnomalyKind = 'below-band' | 'above-band' | 'unregistered' | 'no-gosi';

export interface PayAnomaly {
  employee: Employee;
  kind: AnomalyKind;
  label: string;
  detail: string;
}

/**
 * Pay exceptions worth a human's attention.
 *
 * Deliberately narrow. "Everyone is within one standard deviation" is not a
 * finding, and a list of 300 exceptions with a rubric nobody set is noise — at
 * ±15% this flagged 28% of the company. The band is ±20% of the role midpoint,
 * which is where pay control usually sits, and the two registration failures
 * that carry a compliance consequence.
 */
export const payAnomalies: PayAnomaly[] = (() => {
  const anomalies: PayAnomaly[] = [];

  for (const employee of activeEmployees) {
    if (employee.compaRatio < 1 - 0.2) {
      anomalies.push({
        employee,
        kind: 'below-band',
        label: 'Below band',
        detail: `${(employee.compaRatio * 100).toFixed(0)}% of the role midpoint — retention risk`,
      });
    } else if (employee.compaRatio > 1 + 0.2) {
      anomalies.push({
        employee,
        kind: 'above-band',
        label: 'Above band',
        detail: `${(employee.compaRatio * 100).toFixed(0)}% of the role midpoint — review at next cycle`,
      });
    }
    if (!employee.gosiRegistered) {
      anomalies.push({
        employee,
        kind: 'unregistered',
        label: 'GOSI not registered',
        detail: employee.isSaudi ? 'Saudi national not registered for GOSI' : 'Expatriate not registered for occupational hazards',
      });
    }
  }

  // Worst first: the further from the midpoint, the more it needs looking at.
  const severity = (row: PayAnomaly) => {
    const deviation = Math.abs(row.employee.compaRatio - 1);
    return row.kind === 'unregistered' || row.kind === 'no-gosi' ? 1 + deviation : deviation;
  };

  return anomalies.sort((a, b) => severity(b) - severity(a));
})();

/**
 * Rates with their basis, so the module states its own assumptions rather than
 * presenting a derived figure as a fact.
 *
 * The 25% housing / 10% transport split is market practice, not statute — the
 * Labour Law requires housing to be provided but does not fix a percentage —
 * and both are percentages **of basic**, so they come to 18.5% and 7.4% of
 * gross. The GOSI rates and the levy are regulated and do move by ministerial
 * decision.
 */
export const payrollBasis = {
  saudiEmployee: GOSI.saudi.employee,
  saudiEmployer: GOSI.saudi.employer,
  expatEmployer: GOSI.expat.employer,
  contributoryCeiling: GOSI.contributoryWageCeiling,
  housingShare: 0.25,
  transportShare: 0.1,
  /** The two shares are of basic; these are of gross, which is what charts show. */
  housingShareOfGross: 0.185,
  transportShareOfGross: 0.074,
  levyAnnual: expatCosts.annualLevyPerExpat,
  paidOnTimeDays: wps.allowedDelayDays,
  workingHours: LABOUR_LAW.workingHours.normal,
};

/** Headcount in each band, for the distribution chart. */
export const bandSummary = {
  bands: salaryDistribution,
  belowTenThousand: activeEmployees.filter((e) => e.monthlyGross < 10_000).length,
  total: activeEmployees.length,
};
