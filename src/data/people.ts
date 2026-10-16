/**
 * Selectors for the Employees module.
 *
 * Filtering, sorting and pagination are data concerns, not display ones: the
 * same predicates have to hold whether the list renders as a table, as stacked
 * cards on a phone, or as rows in a future CSV export. They live here so the
 * component only decides how a row looks.
 */
import {
  AS_OF_DATE,
  CITY_HEADCOUNTS,
  DEPARTMENTS,
  activeEmployees,
  employees,
  tenureYears,
  type ContractType,
  type Employee,
  type EmployeeStatus,
} from './employees';
import { newHires } from './metrics';
import { COMPLIANCE } from './saudi';

export type { Employee };
export { employees };

export interface DirectoryFilters {
  department: string;
  city: string;
  status: string;
  /** Saudi national or expatriate — the split the whole app is organised around. */
  origin: 'all' | 'saudi' | 'expat';
  contract: string;
}

export const EMPTY_FILTERS: DirectoryFilters = {
  department: 'all',
  city: 'all',
  status: 'all',
  origin: 'all',
  contract: 'all',
};

export type DirectorySortKey = 'name' | 'department' | 'city' | 'tenure' | 'salary';
export interface DirectorySort {
  key: DirectorySortKey;
  direction: 'asc' | 'desc';
}

export const DEFAULT_SORT: DirectorySort = { key: 'name', direction: 'asc' };

const countBy = (values: string[]): Map<string, number> => {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return counts;
};

const deptCounts = countBy(employees.map((e) => e.department));
const cityCounts = countBy(employees.map((e) => e.city));
const statusCounts = countBy(employees.map((e) => e.status));
const contractCounts = countBy(employees.map((e) => e.contractType));

/** Filter facets, with the counts that make a chip row informative. */
export const filterOptions = {
  departments: DEPARTMENTS.map((dept) => ({
    value: dept.name,
    label: dept.name,
    labelAr: dept.nameAr,
    count: deptCounts.get(dept.name) ?? 0,
  })),
  cities: CITY_HEADCOUNTS.map((entry) => ({
    value: entry.city,
    label: entry.city,
    count: cityCounts.get(entry.city) ?? 0,
  })),
  statuses: (['Active', 'On Leave', 'Inactive'] as EmployeeStatus[]).map((status) => ({
    value: status,
    label: status,
    count: statusCounts.get(status) ?? 0,
  })),
  contracts: (['Limited', 'Unlimited'] as ContractType[]).map((contract) => ({
    value: contract,
    label: `${contract} contract`,
    count: contractCounts.get(contract) ?? 0,
  })),
  origins: [
    { value: 'all', label: 'All staff', count: employees.length },
    { value: 'saudi', label: 'Saudi', count: employees.filter((e) => e.isSaudi).length },
    { value: 'expat', label: 'Expatriate', count: employees.filter((e) => !e.isSaudi).length },
  ],
};

function matches(employee: Employee, filters: DirectoryFilters): boolean {
  if (filters.department !== 'all' && employee.department !== filters.department) return false;
  if (filters.city !== 'all' && employee.city !== filters.city) return false;
  if (filters.status !== 'all' && employee.status !== filters.status) return false;
  if (filters.contract !== 'all' && employee.contractType !== filters.contract) return false;
  if (filters.origin === 'saudi' && !employee.isSaudi) return false;
  if (filters.origin === 'expat' && employee.isSaudi) return false;
  return true;
}

/**
 * The filtered, sorted page of records.
 *
 * Sorted on a copy: `Array.prototype.sort` mutates, and the population array is
 * shared with every other module — sorting it in place would silently reorder
 * the dashboard's own series.
 */
export function selectDirectory(
  filters: DirectoryFilters,
  sort: DirectorySort,
  page: number,
  pageSize: number,
): { rows: Employee[]; total: number; pages: number } {
  const filtered = employees.filter((employee) => matches(employee, filters));

  const direction = sort.direction === 'asc' ? 1 : -1;
  const sorted = [...filtered].sort((a, b) => {
    switch (sort.key) {
      case 'department':
        return a.department.localeCompare(b.department) * direction;
      case 'city':
        return a.city.localeCompare(b.city) * direction;
      case 'tenure':
        return (tenureYears(a) - tenureYears(b)) * direction;
      case 'salary':
        return (a.monthlyGross - b.monthlyGross) * direction;
      default:
        return a.nameEn.localeCompare(b.nameEn) * direction;
    }
  });

  const total = sorted.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), pages);
  const start = (safePage - 1) * pageSize;

  return { rows: sorted.slice(start, start + pageSize), total, pages };
}

/** Headline strip for the module. Every figure is a slice of the population. */
export const directoryStats = (() => {
  const saudis = employees.filter((e) => e.isSaudi).length;
  const females = employees.filter((e) => e.gender === 'Female').length;
  const tenureSum = activeEmployees.reduce((sum, employee) => sum + tenureYears(employee), 0);
  const ages = activeEmployees.map((employee) => employee.age).sort((a, b) => a - b);
  const medianAge = ages[Math.floor(ages.length / 2)];

  return {
    total: employees.length,
    active: employees.filter((e) => e.status === 'Active').length,
    onLeave: employees.filter((e) => e.status === 'On Leave').length,
    inactive: employees.filter((e) => e.status === 'Inactive').length,
    saudis,
    expats: employees.length - saudis,
    saudization: Number(((saudis / employees.length) * 100).toFixed(1)),
    femaleShare: Number(((females / employees.length) * 100).toFixed(1)),
    femaleCount: females,
    newHires: newHires.length,
    averageTenure: Number((tenureSum / Math.max(1, activeEmployees.length)).toFixed(1)),
    medianAge,
  };
})();

export type DocumentStatus = 'valid' | 'warning' | 'critical' | 'expired';

export interface EmployeeDocument {
  document: string;
  documentAr: string;
  expiry: string | null;
  daysRemaining: number | null;
  status: DocumentStatus;
}

const DAY_MS = 86_400_000;

function documentStatus(expiry: string | null): { daysRemaining: number | null; status: DocumentStatus } {
  if (!expiry) return { daysRemaining: null, status: 'valid' };
  const daysRemaining = Math.round((new Date(expiry).getTime() - AS_OF_DATE.getTime()) / DAY_MS);
  if (daysRemaining < 0) return { daysRemaining, status: 'expired' };
  if (daysRemaining <= 30) return { daysRemaining, status: 'critical' };
  if (daysRemaining <= COMPLIANCE.documentWarningDays) return { daysRemaining, status: 'warning' };
  return { daysRemaining, status: 'valid' };
}

/**
 * The compliance documents attached to one employee.
 *
 * Only expatriates hold an iqama and a work permit — a Saudi record carries a
 * national ID that does not expire, so the list legitimately comes back with
 * fewer rows rather than placeholders.
 */
export function employeeDocuments(employee: Employee): EmployeeDocument[] {
  const rows: { document: string; documentAr: string; expiry: string | null }[] = [
    { document: 'Work permit', documentAr: 'رخصة العمل', expiry: employee.workPermitExpiry },
    { document: 'Iqama', documentAr: 'الإقامة', expiry: employee.iqamaExpiry },
    { document: 'Passport', documentAr: 'جواز السفر', expiry: employee.passportExpiry },
  ];

  return rows
    .filter((row) => row.expiry !== null)
    .map((row) => ({ ...row, ...documentStatus(row.expiry) }));
}

/** Worst document status across an employee, for the row-level indicator. */
export function worstDocumentStatus(employee: Employee): DocumentStatus | null {
  const statuses = employeeDocuments(employee).map((doc) => doc.status);
  if (statuses.length === 0) return null;
  for (const level of ['expired', 'critical', 'warning', 'valid'] as DocumentStatus[]) {
    if (statuses.includes(level)) return level;
  }
  return null;
}
