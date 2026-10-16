# Dashboard Evolution Plan

Status: **proposed** — awaiting decisions on the three open questions at the bottom.

Goal: fix the data flow, make every surface overflow-proof, give the sidebar a real workspace
behind it, and grow the app from one page into a set of modules.

---

## 1. Data flow audit (measured, not guessed)

### 1.1 What is sound

Every one of the seven distributions in `hrData.ts` sums to exactly **1,247** = `kpiData.totalEmployees`:
departmentBreakdown, gender, ageGroups, tenure, performanceData, locationData, salaryDistribution.
The fixtures were built from a common headcount, so the *shape* of the data is trustworthy.

### 1.2 What is broken

**(a) Headline KPIs are hand-typed and disagree with the detail data they sit above.**
Five of the eight headline figures cannot be reproduced from the tables and charts on the same screen:

| KPI | Declared in `kpiData` | Derived from the detail data | Delta |
| --- | --- | --- | --- |
| Avg. salary | `$78,500` | `$80,138` (headcount-weighted from `departmentBreakdown.avgSalary`) | −1,638 |
| Leave balance | `2,456` | `14,122` (sum of `leaveData.remaining`) | **−11,666** |
| New hires | `89` | `195` (sum of `hiringTrends.hires`) | **−106** |
| Attendance rate | `94.5%` | `94.65%` (mean of `attendanceData.present`) | −0.15 |
| Attrition rate | `8.2%` | `8.1%` (101 attrition rows ÷ 1,247) | +0.1 |

`hiringTrends` exits total **78** while `attritionData` totals **101** — the same underlying event
counted two different ways.

`activeEmployees: 1156` implies 91 inactive staff, but no dataset contains a status breakdown.

**(b) Nothing can be filtered, structurally.** `kpiData` is a literal object and every chart reads a
pre-aggregated array. The `Employee` interface is declared and **never used** — there are zero
employee-level records in the repo, so the `FilterBar` has nothing to filter. Today it changes
button labels only.

**(c) Dead weight.** `months`, `salaryDistribution` and `tenure` are exported and referenced by
nobody. A hardcoded `94.5%` is duplicated in the Attendance card header instead of reading
`kpiData.attendanceRate`. Activity dates are pinned to 2024 while the app is viewed in 2026.

### 1.3 Proposed fix — one source of truth

1. **`src/data/employees.ts`** — a deterministic, seeded generator emitting all 1,247 records
   against the `Employee` interface (`id, name, department, location, gender, status, joinDate,
   salary, performance, attendance, leaveBalance`) plus `age`, `tenureMonths`, `employmentType`,
   `leaveTakenByType`. Seeded PRNG ⇒ identical numbers on every reload and every build, and it is
   calibrated to reproduce the existing per-department counts (342 Engineering, 256 Sales, …) so the
   charts keep their current shape.
2. **`src/data/selectors.ts`** — pure functions `(employees, filters) => viewModel`, one per panel,
   returning *the exact prop shapes the components already take*. Components stay untouched;
   `App.tsx` stops hand-mapping data.
   ```
   selectKpis(rows, filters)            selectHiringTrend(rows, filters)
   selectDepartments(rows, filters)     selectAttrition(rows, filters)
   selectDemographics(rows, filters)    selectAttendance(rows, filters)
   selectPerformance(rows, filters)     selectLocations(rows, filters)
   selectSalaryBands(rows, filters)     selectLeave(rows, filters)
   ```
3. **`src/hooks/useHrData.ts`** — `useMemo` wrapper keyed on the filter object, so the ~1.2k-row
   pass runs once per filter change, not per render.
4. **Delete the dead exports** and the duplicated `94.5%`; make activity dates relative to the
   current year.

**Consequence, stated plainly:** the five KPIs above will start showing the derived values. That is
the point — after this change the headline and the detail cannot disagree. If you would rather keep
today's exact figures on screen, the alternative is to calibrate the generator so the aggregates
reproduce them, which means editing `leaveData` and `hiringTrends` — either way the fixtures change.

---

## 2. Overflow audit (computed at each breakpoint)

Content width = `min(viewport, 1600) − sidebar − 48px page padding`. Sidebar is 264px at `lg`+.

### 2.1 Confirmed overflow

**KPI grid** (`grid-cols-2 md:grid-cols-4 lg:grid-cols-8`, `p-5`) — the widest value `$78,500` at
26px needs ~97px:

| Breakpoint | Content | Cols | Card | Inner | Verdict |
| --- | --- | --- | --- | --- | --- |
| md 768 | 720 | 4 | 168 | 128 | fits |
| **lg 1024** | **712** | **8** | **75** | **35** | **overflow** |
| **xl 1280** | **968** | **8** | **107** | **67** | **overflow** |
| 2xl 1536 | 1224 | 8 | 139 | 99 | fits, tight |

Eight columns is wrong from `lg` through `xl` inclusive — the value is clipped in the most common
laptop range.

**Header row** — needs ~837px with all controls visible; available is 544 / 672 / 664 / 920px at
sm / md / lg / xl. It overflows **below xl**, and the sidebar makes `lg` the worst case (664px).

**Department table** — natural width ~680px inside an `overflow-x-auto` that has no `min-width`, so
from `sm` through `xl` (available 544→565px) the columns crush instead of scrolling.

**Charts at `lg:grid-cols-3`** — a card is 221px, leaving a 113px plot for 12 month labels: **9.4px
per label** where `Jan` needs ~16.5px. Labels are being truncated to `Ja…` at exactly the width
where users first see three columns.

### 2.2 Responsive ruleset to codify

| # | Rule | Applied to |
| --- | --- | --- |
| 1 | KPI grid `grid-cols-2 md:grid-cols-4 2xl:grid-cols-8` — 8-up only where 139px+ cards exist; card padding `p-4 2xl:p-5` | KPI cards |
| 2 | `@container` on each panel; internal type/spacing keyed to **card** width via `@min-*`, not viewport | KPI cards, chart cards |
| 3 | Chart rows: 3-up only at `xl`+, 2-up at `lg`, 1-up below — a chart needs ≥260px to be legible | rows 1–3 |
| 4 | Line chart hides every other axis label when its own container is under ~20rem | `LineChart` |
| 5 | Tables get `min-w-[720px]` inside `overflow-x-auto` so they scroll rather than crush | all tables |
| 6 | Header progressive disclosure: search and profile name at `xl`+, Export at `md`+, icon buttons always | header |
| 7 | `overflow-x: clip` on `body` as a backstop (clip, **not** hidden — it creates no scroll container, so `sticky`/`fixed` keep working) | global |
| 8 | Dropdown menus clamp to `calc(100vw − 2rem)` and flip to right-alignment for trailing chips | `FilterBar` |
| 9 | Every truncatable string gets `truncate` **and** a `title` attribute so clipped text stays readable | all |

Rules 2 and 4 are the important ones: the sidebar changes available width by 168px without the
viewport changing, so viewport breakpoints alone cannot express "is this card wide enough".

---

## 3. Workspace + sidebar wiring

Today `Sidebar`'s `activeKey` is local `useState` and clicking it changes nothing but the highlight.
`react-router-dom@7` is installed and unused.

- **Shell**: `WorkspaceLayout` renders `Sidebar` + `<Outlet/>`, so every module shares the chrome.
  `Sidebar` items become `NavLink`s — active state derives from the URL, back/forward and deep links
  work, and the local `activeKey` state goes away.
- **Routing**: `BrowserRouter` (Vite's SPA fallback and the preview proxy both serve `index.html`).
  `HashRouter` is the fallback if deep links ever 404 on a static host.
- **Filters in the URL**: `useSearchParams` mirrors the filter state, so a filtered view is
  shareable and survives reload. This is what makes the filter work visible.
- **Routes**: `/` overview · `/employees` · `/departments` · `/attendance` · `/leave` ·
  `/performance` · `/payroll` · `/recruitment` · `/reports` · `/settings` · `/help` · `*` → NotFound.
- **Shared UI kit** (`src/components/ui/`): `Panel`, `StatTile`, `DataTable`, `EmptyState`,
  `Skeleton`, `Badge`, `SectionHeader`. Extract from the existing cards *before* adding modules —
  otherwise each new module re-invents the surface/padding conventions and they drift.

---

## 4. Modules to add

Ordered by value per effort. Each reads only from `selectors.ts`.

| Module | Route | Content |
| --- | --- | --- |
| Employee Directory | `/employees` | searchable/sortable/paginated table, filter-aware, row → detail drawer |
| Recruitment | `/recruitment` | pipeline funnel by stage, time-to-hire, source effectiveness, open roles |
| Attendance | `/attendance` | absence reasons, late/overtime, per-department heatmap |
| Performance | `/performance` | review cycles, 9-box grid, top/bottom performers |
| Payroll | `/payroll` | salary bands, comp-ratio vs band, outliers, cost by department |
| Departments | `/departments` | headcount vs budget, span of control, growth trend |
| Leave | `/leave` | balances, request queue, entitlement burn-down |
| Reports | `/reports` | saved report cards, export actions |
| Settings / Help | `/settings`, `/help` | density + theme preference, docs |

---

## 5. Phasing

| Phase | Deliverable | Why this order |
| --- | --- | --- |
| **1** | Data foundation: `employees.ts`, `selectors.ts`, `useHrData`, filters applied for real, KPIs reconciled | Unblocks everything; kills the 5 mismatches; makes the existing filters honest |
| **2** | Responsive hardening: ruleset §2.2, verified by width math at each breakpoint | Cheap, independent, and stops clipping before more surfaces exist |
| **3** | Workspace shell: router, `NavLink` sidebar, URL filters, NotFound, UI kit extraction | Every module after this is a route, not surgery |
| **4** | Modules in the §4 order, 1–2 per review | Each is additive once 1–3 exist |
| **5** | Polish: dark theme (tones are already variable-driven), density toggle, command palette | Depends on the UI kit |

### Verification approach

No browser is available in this sandbox, so every phase is checked by (a) SSR-rendering the tree in
Node and asserting on the markup, (b) extracting every class token from source and confirming the
built CSS contains it, (c) computing widths at each breakpoint like §2 does, and (d) `npm run build`
+ `npm run lint`. Visual judgement still needs your eyes on the preview.

---

## 6. Open questions

1. **Data foundation** — rebuild as derived employee-level data (recommended, 5 KPIs change to match
   the detail), or keep today's exact headline figures and adjust the fixtures to match them?
2. **First module batch** — which two after the shell: Directory + Recruitment, Attendance +
   Performance, Payroll + Departments, or something else?
3. **"Workspace" meaning** — (a) one workspace where the sidebar switches pages, (b) a workspace
   switcher with several top-level workspaces (Workforce / Recruiting / Finance), or (c) both.
