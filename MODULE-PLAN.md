# Module delivery plan — two modules per phase

The blueprint (10 modules) and `PLAN.md` §4.5 (12 routes) both describe a scope far bigger than one
review can absorb. This splits it so **each phase ships exactly two modules** that share their
prerequisites, and ends green on every gate in `PLAN.md` §5.

Read with: `PLAN.md` §4.5 (module map), §4.6 (responsive contract), `CLAUDE.md` (conventions).

## Rules that apply to every phase

| Rule | Why |
| --- | --- |
| Two modules, not three | A phase that grows stops being reviewable, and the gates stop meaning anything. |
| Shared prerequisites land **in** the phase, once | Building the table primitive twice is how twelve screens end up inconsistent. |
| Every gate green before the next phase starts | `build`, `lint` (2-error baseline), `verify-classes.py`, `verify-theme.py`, SSR assertions. |
| A module is not "done" until its states are | Loading, empty, error, restricted, no-results. A happy path is a demo, not a module. |
| Figures derive from the population | No hand-typed arrays in components. New selectors go in a `src/data/<module>.ts` facade. |
| No page-level search bars | The global header search is the only search input (blueprint rule, standing). |

## Phase status

| Phase | Modules | Status |
| --- | --- | --- |
| **1** | Employees · Payroll & Comp | **done** |
| 2 | Attendance & Time · Leave | not started |
| 3 | Recruitment · Departments | not started |
| 4 | Performance · Learning & Skills | not started |
| 5 | Reports · Settings & Admin | not started |
| 6 | Analytics · Help | not started |
| 7 | Workspace shell & polish | not started |

---

## Phase 1 — Employees · Payroll & Comp

The two modules the rest of the app drills into, and the two that force the useful cross-cutting work:
a table primitive that behaves on a phone, a right-hand context panel, and **role gating**, because
both modules display data some roles must not see.

Shipped: role gating, the `Sensitive` mask, `TableShell` + row expansion + mobile card mode,
`EmptyState`/restricted/no-results states, chip facets, pagination, hash routes, and an honest
placeholder for modules that are still to come. Gates green; details in `CLAUDE.md`.

Cross-cutting work that landed here (once, for every later module):

- **Role & permission layer** — `src/state/role.ts` + `RoleProvider` + a header `RoleSwitcher`.
  Four roles (HR Admin, Manager, Finance, Auditor) with a capability matrix. The switcher must
  *actually* gate: masked salary and identifiers, restricted module states, a disabled export.
- **`Sensitive` primitive** — masks a value with a locked placeholder and states which roles may see
  it. Masking identifiers on a manager's screen is the floor a real HRIS is held to.
- **`TableShell` + row expansion** — `min-w-*` inside `overflow-x-auto`, column-priority hiding
  below `md`, stacked card mode on mobile, expandable child row for the full record.
- **Hash route** — `#/employees`, `#/payroll` … so a module is linkable and back/forward work,
  without pulling in a router the app does not otherwise use.
- **`EmptyState` / `RestrictedState` / `DataTable` footer** — the state vocabulary every module after
  this one reuses.

### Employees

Directory over the 1,247 records: bilingual name, department, site, occupation, nationality,
contract type, status, tenure. Chip filters only (department, city, status, Saudi/expatriate,
contract). Sortable columns, pagination, and a detail drawer carrying the Saudi attribute set —
national ID, iqama/work-permit/passport expiry with the days remaining, GOSI registration, the
basic/housing/transport split, leave balances, accrued end-of-service. Everything sensitive goes
through `Sensitive`.

### Payroll & Comp

Cost position (monthly, annualised, against the department budgets), the allowance split
(basic / 25% housing / 10% transport), salary bands, compa-ratio by department, the payroll-run
table with WPS status per cycle, and the employer burden — GOSI, the expatriate levy and the
end-of-service accrual, which together are the cost of employment a salary figure hides. Plus an
anomalies panel: pay outside the band, missing GOSI registration, missing bank/WPS data.

---

## Phase 2 — Attendance & Time · Leave

Share the calendar: the Sunday–Thursday week, the 8-hour day, Ramadan hours, prayer breaks, and the
Saudi public holidays. Cross-cutting: a single-hue heatmap, a request queue with approve/reject
states, and duration formatting that respects both calendars.

## Phase 3 — Recruitment · Departments

Cross-cutting: a funnel chart, an org/span-of-control view, and the department table **moved off the
overview** (it duplicates the Departments module today). Recruitment covers the funnel by stage,
time-to-fill, time-to-hire, cost-per-hire, offer acceptance and source effectiveness.

## Phase 4 — Performance · Learning & Skills

Cross-cutting: the 9-box grid and a skills-gap matrix. Performance brings review completion,
distribution and the top/bottom cohorts. Learning needs a new data set (courses, completion,
time-to-competency) — the first module that cannot be derived from the existing population alone.

## Phase 5 — Reports · Settings & Admin

The output and governance layer: saved reports, scheduled exports, the ISO 30414 view, then the roles
editor, metric-target editor and the audit-log viewer that records who saw which record.

## Phase 6 — Analytics · Help

Analytics is the exploratory surface (every series, with the data-table alternative beside each
chart). Help carries the metric glossary — name, formula, source, cadence, owner — which the
`MetricDefinition` objects already half-provide.

## Phase 7 — Workspace shell & polish

The remaining blueprint shell: right-hand context panel as a persistent surface (Phase 1 introduces
the drawer), draggable widgets, the five interface modes, keyboard navigation, command palette, and
a full Arabic/RTL pass over all twelve modules.

---

## Deferred deliberately

| Item | Why it waits |
| --- | --- |
| Backend, database, `POST /api/v1/*` | Front-end-only repo today; the data layer is shaped so it can be swapped for fetch without touching components. |
| Geo-fenced attendance (live tracking, BSSID, anti-spoofing) | Depends on the attendance module (Phase 2) and a backend; specced in the blueprint §6. |
| Arabic translation of all copy | The layout, logical properties and direction switch are done; translating twelve modules before their copy settles wastes the work. |
| Print/PDF and Excel export | Follows Reports (Phase 5), which defines what is worth exporting. |
