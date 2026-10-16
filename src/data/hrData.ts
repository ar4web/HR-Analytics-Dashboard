/**
 * Compatibility layer over the derived data.
 *
 * This file used to hold hand-typed KPI constants, and five of them disagreed
 * with the distributions sitting next to them in the same file (average salary
 * 78,500 against 80,138 implied by the department table; a leave balance of
 * 2,456 against 14,122; 89 new hires against 195; 94.5% attendance against
 * 94.65%; 8.2% attrition against 8.1%). Nothing here is typed in by hand any
 * more — every export is a view over the seeded employee records.
 *
 * It is kept as a thin adapter so the panels could be migrated one at a time
 * rather than in a single risky rewrite. New code should import from
 * `./metrics` directly.
 */
import { DEPARTMENTS, LOCATIONS, type Department, type Location } from './employees';
import {
  attritionByDepartment,
  attendanceByMonth,
  demographics as derivedDemographics,
  departmentBreakdown as derivedDepartmentBreakdown,
  headcount,
  hiringTrends as derivedHiringTrends,
  leave as derivedLeave,
  locationBreakdown as derivedLocationBreakdown,
  newHires,
  operationalMetrics,
  pay,
  performanceDistribution as derivedPerformance,
  recentActivities as derivedActivities,
  reportingMonths,
  salaryDistribution as derivedSalaryDistribution,
  turnover,
} from './metrics';
import { categoricalColor } from './palette';

export type { Employee } from './employees';

export const departments: Department[] = DEPARTMENTS.map((d) => d.name);
export const locations: Location[] = LOCATIONS.map((l) => l.city);
export const months: string[] = reportingMonths.map((m) => m.label);

/** Reads a derived operational metric by id, so the strip stays the definition. */
function metric(id: string): number {
  const found = operationalMetrics.find((m) => m.id === id);
  if (!found) throw new Error(`Unknown metric: ${id}`);
  return found.value;
}

/**
 * Only retained for panels not yet migrated to the metric strips. Prefer
 * `executiveMetrics` / `operationalMetrics` in `./metrics`, which carry the
 * target, cadence and direction that make a number actionable.
 */
export const kpiData = {
  totalEmployees: metric('totalEmployees'),
  activeEmployees: metric('activeEmployees'),
  newHires: newHires.length,
  attritionRate: turnover.value,
  avgSalary: pay.average,
  attendanceRate: metric('attendanceRate'),
  leaveBalance: derivedLeave.totalRemaining,
  departmentCount: headcount.departments,
};

export const departmentBreakdown = derivedDepartmentBreakdown;

export const hiringTrends = derivedHiringTrends;

export const attritionData = attritionByDepartment;

export const demographicsData = {
  // Slices carry their own colour because the donut draws them directly; the
  // palette is colourblind-safe rather than the brand emerald.
  gender: derivedDemographics.gender.map((entry, index) => ({
    ...entry,
    color: categoricalColor(index),
  })),
  ageGroups: derivedDemographics.ageGroups,
  tenure: derivedDemographics.tenure,
};

export const attendanceData = attendanceByMonth;

export const performanceData = derivedPerformance;

export const locationData = derivedLocationBreakdown;

export const salaryDistribution = derivedSalaryDistribution;

export const leaveData = derivedLeave.byType;

export const recentActivities = derivedActivities;
