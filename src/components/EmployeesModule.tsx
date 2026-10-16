/**
 * Employees — the directory, and the system of record the other modules point at.
 *
 * Three decisions worth stating:
 *
 * 1. Filtering is chip facets, never a page-level search box. The blueprint
 *    reserves search for the global header, and a facet row shows the active
 *    filter set instead of hiding it behind a click.
 * 2. Pay and identifiers go through `Sensitive`. A line manager sees the same
 *    directory with those cells locked, which is what least privilege looks like
 *    on a screen rather than in a policy document.
 * 3. The table becomes stacked cards below `md`. Nine columns do not compress
 *    into 360px, and a horizontally scrolling row of truncated names is not a
 *    directory anyone can use on a phone.
 */
import { useMemo, useState } from 'react';
import { ChevronDown, Users, BadgeCheck, Wallet, IdCard } from 'lucide-react';
import {
  CardHeader, EmptyState, FilterChips, MiniStat, Pagination, Panel, Sensitive,
  SortHeader, StatusPill, TableShell,
} from './ui';
import { useRole } from '../state/role';
import {
  DEFAULT_SORT, EMPTY_FILTERS, directoryStats, employeeDocuments, filterOptions,
  selectDirectory, worstDocumentStatus, type DirectoryFilters, type DirectorySort,
  type DirectorySortKey, type Employee,
} from '../data/people';
import { tenureYears } from '../data/employees';
import { formatGregorian, toHijri } from '../data/saudi';

const DOC_STATUS: Record<string, { status: 'good' | 'warn' | 'bad' | 'neutral'; label: string }> = {
  valid: { status: 'good', label: 'Valid' },
  warning: { status: 'neutral', label: '≤90 days' },
  critical: { status: 'warn', label: '≤30 days' },
  expired: { status: 'bad', label: 'Expired' },
};

const STATUS_TONE: Record<string, 'good' | 'warn' | 'neutral'> = {
  Active: 'good',
  'On Leave': 'warn',
  Inactive: 'neutral',
};

const DOCUMENT_TERM: Record<string, string> = {
  Iqama: '2 years, renewable',
  'Work permit': 'Tied to the iqama',
  Passport: 'Country of issue',
};

function newFilters(): DirectoryFilters {
  return { ...EMPTY_FILTERS };
}

export function EmployeesModule() {
  const { role } = useRole();
  const can = role.can;

  const [filters, setFilters] = useState<DirectoryFilters>(newFilters);
  const [sort, setSort] = useState<DirectorySort>(DEFAULT_SORT);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [expanded, setExpanded] = useState<string | null>(null);

  const { rows, total, pages } = useMemo(
    () => selectDirectory(filters, sort, page, pageSize),
    [filters, sort, page, pageSize],
  );

  const activeCount =
    Object.values(filters).filter((value) => value !== 'all').length;

  const update = <K extends keyof DirectoryFilters>(key: K, value: DirectoryFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    // Any filter change invalidates the page number: page 7 of the old result
    // set is meaningless in the new one.
    setPage(1);
    setExpanded(null);
  };

  const toggleSort = (key: DirectorySortKey) => {
    setSort((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'asc' },
    );
    setPage(1);
  };

  const clearAll = () => {
    setFilters(newFilters());
    setPage(1);
    setExpanded(null);
  };

  return (
    <div className="section-stack">
      <Panel>
        <CardHeader
          title="Employee Directory"
          titleAr="دليل الموظفين"
          subtitle={`${directoryStats.total.toLocaleString()} records · ${directoryStats.active.toLocaleString()} active · ${directoryStats.onLeave} on leave`}
          icon={<Users className="w-4.5 h-4.5" />}
        >
          <div className="flex flex-wrap items-center justify-end gap-2">
            <StatusPill status="neutral">{role.label} view</StatusPill>
            {activeCount > 0 && (
              <button
                type="button"
                onClick={clearAll}
                className="min-h-[32px] rounded-lg border border-hair bg-surface px-3 text-[11px] font-medium text-body transition-colors hover:border-hair-strong hover:text-strong"
              >
                Clear {activeCount} {activeCount === 1 ? 'filter' : 'filters'}
              </button>
            )}
          </div>
        </CardHeader>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <MiniStat label="Headcount" value={directoryStats.total.toLocaleString()} tone="sky" />
          <MiniStat label="Active" value={directoryStats.active.toLocaleString()} tone="emerald" />
          <MiniStat label="Saudization" value={`${directoryStats.saudization}%`} tone="violet" hint={`${directoryStats.saudis.toLocaleString()} Saudi, ${directoryStats.expats.toLocaleString()} expatriate`} />
          <MiniStat label="Women" value={`${directoryStats.femaleShare}%`} tone="rose" hint={`${directoryStats.femaleCount} employees`} />
          <MiniStat label="Joined this period" value={directoryStats.newHires} tone="indigo" />
          <MiniStat label="Average tenure" value={`${directoryStats.averageTenure} yrs`} tone="amber" />
        </div>
      </Panel>

      <Panel delay={0.05}>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
          <FilterChips
            label="Origin"
            labelAr="الجنسية"
            options={filterOptions.origins}
            value={filters.origin}
            onChange={(value) => update('origin', value as DirectoryFilters['origin'])}
          />
          <FilterChips
            label="Department"
            labelAr="الإدارة"
            options={[{ value: 'all', label: 'All', count: directoryStats.total }, ...filterOptions.departments]}
            value={filters.department}
            onChange={(value) => update('department', value)}
          />
          <FilterChips
            label="Site"
            labelAr="الموقع"
            options={[{ value: 'all', label: 'All sites', count: directoryStats.total }, ...filterOptions.cities]}
            value={filters.city}
            onChange={(value) => update('city', value)}
          />
          <FilterChips
            label="Status"
            options={[{ value: 'all', label: 'Any status', count: directoryStats.total }, ...filterOptions.statuses]}
            value={filters.status}
            onChange={(value) => update('status', value)}
          />
          <FilterChips
            label="Contract"
            options={[{ value: 'all', label: 'Any contract', count: directoryStats.total }, ...filterOptions.contracts]}
            value={filters.contract}
            onChange={(value) => update('contract', value)}
          />
        </div>
      </Panel>

      <Panel delay={0.1}>
        {total === 0 ? (
          <EmptyState
            kind="no-results"
            title="No employees match these filters"
            titleAr="لا يوجد موظفون بهذه المعايير"
            description="Every facet is combined with AND, so a Saudi-only filter inside a department with no Saudi staff returns nothing. Clear a filter to widen the set."
            action={
              <button
                type="button"
                onClick={clearAll}
                className="mt-1 min-h-[36px] rounded-lg bg-emerald-600 px-3.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700"
              >
                Clear all filters
              </button>
            }
          />
        ) : (
          <>
            {/* Table — md and up. Below md the card list takes over. */}
            <div className="hidden md:block">
              <TableShell minWidth={860} caption="Employee directory">
                <thead>
                  <tr className="border-b border-hair-strong text-[10px] uppercase tracking-[0.08em] text-muted">
                    <th scope="col" className="w-8 px-2 py-2" />
                    <SortHeader label="Employee" active={sort.key === 'name'} direction={sort.direction} onClick={() => toggleSort('name')} />
                    <SortHeader label="Department" active={sort.key === 'department'} direction={sort.direction} onClick={() => toggleSort('department')} />
                    <SortHeader label="Site" active={sort.key === 'city'} direction={sort.direction} onClick={() => toggleSort('city')} />
                    <th scope="col" className="hidden px-3 py-2 text-start font-semibold lg:table-cell">Nationality</th>
                    <SortHeader label="Tenure" active={sort.key === 'tenure'} direction={sort.direction} onClick={() => toggleSort('tenure')} align="end" />
                    {/* Sorting by pay leaks the ranking even when the cells are
                        masked, so the sort is offered only to roles that may
                        read the values. */}
                    {can.viewSalaries && (
                      <SortHeader label="Monthly" active={sort.key === 'salary'} direction={sort.direction} onClick={() => toggleSort('salary')} align="end" />
                    )}
                    <th scope="col" className="px-3 py-2 text-start font-semibold">Documents</th>
                    <th scope="col" className="px-3 py-2 text-start font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((employee) => {
                    const isOpen = expanded === employee.id;
                    const docStatus = worstDocumentStatus(employee);
                    const doc = docStatus ? DOC_STATUS[docStatus] : null;
                    return (
                      <EmployeeRow
                        key={employee.id}
                        employee={employee}
                        can={can}
                        isOpen={isOpen}
                        doc={doc}
                        onToggle={() => setExpanded(isOpen ? null : employee.id)}
                      />
                    );
                  })}
                </tbody>
              </TableShell>
            </div>

            {/* Cards — below md. */}
            <div className="space-y-2.5 md:hidden">
              {rows.map((employee) => {
                const docStatus = worstDocumentStatus(employee);
                const doc = docStatus ? DOC_STATUS[docStatus] : null;
                return (
                  <EmployeeCard
                    key={employee.id}
                    employee={employee}
                    can={can}
                    doc={doc}
                    isOpen={expanded === employee.id}
                    onToggle={() => setExpanded(expanded === employee.id ? null : employee.id)}
                  />
                );
              })}
            </div>

            <Pagination
              page={page}
              pages={pages}
              total={total}
              pageSize={pageSize}
              onPage={setPage}
              onPageSize={(size) => {
                setPageSize(size);
                setPage(1);
              }}
              label="employees"
            />
          </>
        )}
      </Panel>

      {!can.viewSalaries && (
        <p className="text-[11px] leading-relaxed text-muted">
          Pay figures and personal identifiers are masked for the {role.label} role. Switch role in
          the header to compare what each role may see — this is the access control, not a display
          toggle.
        </p>
      )}
    </div>
  );
}

interface RowProps {
  employee: Employee;
  can: ReturnType<typeof useRole>['role']['can'];
  doc: { status: 'good' | 'warn' | 'bad' | 'neutral'; label: string } | null;
  isOpen: boolean;
  onToggle: () => void;
}

function EmployeeRow({ employee, can, doc, isOpen, onToggle }: RowProps) {
  return (
    <>
      <tr className={`row-hover border-b border-hair/80 ${isOpen ? 'bg-sunken/60' : ''}`}>
        <td className="px-2 py-2">
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={isOpen}
            aria-label={`${isOpen ? 'Hide' : 'Show'} details for ${employee.nameEn}`}
            className="grid h-7 w-7 place-items-center rounded-lg text-subtle transition-colors hover:bg-sunken-strong hover:text-strong"
          >
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        </td>
        <td className="px-3 py-2">
          <p className="truncate text-xs font-semibold text-strong" title={employee.nameEn}>{employee.nameEn}</p>
          <p dir="rtl" lang="ar" className="truncate text-[10px] text-subtle">{employee.nameAr}</p>
        </td>
        <td className="px-3 py-2">
          <p className="truncate text-xs text-body">{employee.department}</p>
          <p dir="rtl" lang="ar" className="truncate text-[10px] text-subtle">{employee.occupationAr}</p>
        </td>
        <td className="px-3 py-2 text-xs text-body">{employee.city}</td>
        <td className="hidden px-3 py-2 text-xs text-body lg:table-cell">
          <span className="block">{employee.nationality}</span>
          <span dir="rtl" lang="ar" className="block text-[10px] text-subtle">{employee.nationalityAr}</span>
        </td>
        <td className="tnum px-3 py-2 text-end text-xs text-body">{tenureYears(employee).toFixed(1)} yrs</td>
        {can.viewSalaries && (
          <td className="tnum px-3 py-2 text-end text-xs font-medium text-strong">
            {employee.monthlyGross.toLocaleString()}
          </td>
        )}
        <td className="px-3 py-2">
          {doc ? <StatusPill status={doc.status}>{doc.label}</StatusPill> : <span className="text-[10px] text-subtle">—</span>}
        </td>
        <td className="px-3 py-2">
          <StatusPill status={STATUS_TONE[employee.status]}>{employee.status}</StatusPill>
        </td>
      </tr>
      {isOpen && (
        <tr className="border-b border-hair/80 bg-sunken/40">
          <td colSpan={can.viewSalaries ? 9 : 8} className="px-3 py-3">
            <RecordDetail employee={employee} can={can} />
          </td>
        </tr>
      )}
    </>
  );
}

function EmployeeCard({ employee, can, doc, isOpen, onToggle }: RowProps) {
  return (
    <div className="rounded-xl border border-hair bg-surface p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-strong">{employee.nameEn}</p>
          <p dir="rtl" lang="ar" className="truncate text-[11px] text-subtle">{employee.nameAr}</p>
          <p className="mt-1 text-[11px] text-muted">
            {employee.occupation} · {employee.department}
          </p>
        </div>
        <StatusPill status={STATUS_TONE[employee.status]}>{employee.status}</StatusPill>
      </div>

      <div className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
        <span className="text-muted">Site</span>
        <span className="text-end font-medium text-body">{employee.city}</span>
        <span className="text-muted">Nationality</span>
        <span className="text-end font-medium text-body">{employee.nationality}</span>
        <span className="text-muted">Contract</span>
        <span className="text-end font-medium text-body">{employee.contractType}</span>
        <span className="text-muted">Monthly</span>
        <span className="text-end font-medium text-body">
          <Sensitive allowed={can.viewSalaries} reason="Finance or HR Admin">
            SAR {employee.monthlyGross.toLocaleString()}
          </Sensitive>
        </span>
        <span className="text-muted">Documents</span>
        <span className="flex justify-end">
          {doc ? <StatusPill status={doc.status}>{doc.label}</StatusPill> : <span className="text-subtle">—</span>}
        </span>
      </div>

      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="mt-3 flex min-h-[36px] w-full items-center justify-center gap-1.5 rounded-lg border border-hair text-[11px] font-medium text-body transition-colors hover:border-hair-strong hover:text-strong"
      >
        {isOpen ? 'Hide record' : 'Full record'}
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="mt-3 border-t border-hair pt-3">
          <RecordDetail employee={employee} can={can} />
        </div>
      )}
    </div>
  );
}

/** The full record behind a row: Saudi attributes, pay structure, documents. */
function RecordDetail({ employee, can }: { employee: Employee; can: RowProps['can'] }) {
  const docs = employeeDocuments(employee);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <section>
        <h4 className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
          <IdCard className="h-3.5 w-3.5" /> Record
        </h4>
        <dl className="space-y-1.5 text-[11px]">
          <Field label={employee.isSaudi ? 'National ID' : 'Resident ID'}>
            <Sensitive allowed={can.viewPII} reason="HR Admin or Auditor" masked="••••••••">
              <span className="tnum">{employee.nationalId}</span>
            </Sensitive>
          </Field>
          <Field label="Occupation">
            <span>{employee.occupation}</span>
            <span dir="rtl" lang="ar" className="ms-2 text-subtle">{employee.occupationAr}</span>
          </Field>
          <Field label="Contract">{employee.contractType} term</Field>
          <Field label="Joined">
            <span>{formatGregorian(new Date(employee.joinDate))}</span>
            <span className="ms-2 text-subtle">{toHijri(new Date(employee.joinDate))}</span>
          </Field>
          <Field label="Region">{employee.region}</Field>
          {employee.exitDate && (
            <Field label="Left">
              <span>{formatGregorian(new Date(employee.exitDate))}</span>
              <span className="ms-2 text-subtle">{employee.exitType}</span>
            </Field>
          )}
        </dl>
      </section>

      <section>
        <h4 className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
          <Wallet className="h-3.5 w-3.5" /> Pay structure
        </h4>
        <Sensitive
          allowed={can.viewSalaries}
          reason="Finance or HR Admin"
          masked="Pay structure hidden"
        >
          <dl className="space-y-1.5 text-[11px]">
            <Field label="Basic">
              <span className="tnum">SAR {employee.basicSalary.toLocaleString()}</span>
            </Field>
            <Field label="Housing · 25%">
              <span className="tnum">SAR {employee.housingAllowance.toLocaleString()}</span>
            </Field>
            <Field label="Transport · 10%">
              <span className="tnum">SAR {employee.transportAllowance.toLocaleString()}</span>
            </Field>
            <Field label="Monthly gross">
              <span className="tnum font-semibold text-strong">SAR {employee.monthlyGross.toLocaleString()}</span>
            </Field>
            <Field label="Compa-ratio">
              <span className="tnum">{(employee.compaRatio * 100).toFixed(0)}% of midpoint</span>
            </Field>
            <Field label="End of service">
              <span className="tnum">SAR {employee.endOfServiceAccrual.toLocaleString()} accrued</span>
            </Field>
          </dl>
        </Sensitive>
        <p className="mt-2 text-[10px] leading-relaxed text-subtle">
          Allowances are percentages of basic, not of gross. GOSI:{' '}
          {employee.gosiRegistered ? 'registered' : 'not registered'}.
        </p>
      </section>

      <section>
        <h4 className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
          <BadgeCheck className="h-3.5 w-3.5" /> Documents & leave
        </h4>
        {docs.length === 0 ? (
          <p className="text-[11px] text-muted">
            No expatriate documents — a national ID does not expire, so there is nothing to renew.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {docs.map((doc) => (
              <li key={doc.document} className="flex items-center justify-between gap-2 text-[11px]">
                <span className="flex items-baseline gap-1.5">
                  <span className="text-body">{doc.document}</span>
                  <span dir="rtl" lang="ar" className="text-[10px] text-subtle">{doc.documentAr}</span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="tnum text-subtle">
                    {doc.expiry ? formatGregorian(new Date(doc.expiry)) : '—'}
                  </span>
                  <StatusPill status={DOC_STATUS[doc.status].status}>
                    {doc.daysRemaining !== null && doc.daysRemaining < 0
                      ? `${Math.abs(doc.daysRemaining)}d overdue`
                      : `${doc.daysRemaining}d`}
                  </StatusPill>
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-[10px] text-subtle">
          {docs.length > 0
            ? `${DOCUMENT_TERM[docs[0].document]} · validity is checked against the reporting date.`
            : 'Documents are tracked for expatriate staff only.'}
        </p>

        <dl className="mt-2 space-y-1.5 text-[11px]">
          <Field label="Annual leave">
            <span className="tnum">
              {employee.leaveBalance} days due
            </span>
          </Field>
          <Field label="Attendance">
            <span className="tnum">{employee.attendance.toFixed(1)}%</span>
          </Field>
          <Field label="Rating">{employee.rating}</Field>
        </dl>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
      <dt className="text-muted">{label}</dt>
      <dd className="text-end text-body">{children}</dd>
    </div>
  );
}
