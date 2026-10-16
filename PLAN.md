# Dashboard Evolution Plan

Status: **proposed** — nothing built yet. Read this, then we agree the scope in §7.

Built from three inputs: a measured audit of the current code (§1), published guidance on HR
analytics, dashboard UX, data-visualisation accessibility, HRIS module structure, RTL and HR data
privacy (§2–§5), and the resulting plan (§6). Sources are linked so you can check any claim.

---

## 1. Audit of what exists (measured, not guessed)

### 1.1 The data cannot support filtering, and its headline numbers are wrong

All seven distributions in `hrData.ts` sum to exactly **1,247** = `kpiData.totalEmployees`, so the
fixtures share a common origin. But the headline KPIs are hand-typed and contradict the detail data
rendering on the same screen:

| KPI | Declared | Derived from the detail | Delta |
| --- | --- | --- | --- |
| Avg. salary | `$78,500` | `$80,138` | −1,638 |
| Leave balance | `2,456` | `14,122` | **−11,666** |
| New hires | `89` | `195` | **−106** |
| Attendance rate | `94.5%` | `94.65%` | −0.15 |
| Attrition rate | `8.2%` | `8.1%` | +0.1 |

`hiringTrends` exits total **78** while `attritionData` totals **101** — one event, two counts.
`activeEmployees: 1156` implies 91 inactive staff that exist in no dataset. The `Employee` interface
is declared and **never used**: there are zero employee-level records, so `FilterBar` is decorative
by construction. `months`, `salaryDistribution` and `tenure` are exported and referenced by nobody.

Industry guidance treats this exact failure mode as the thing to build against: dashboards need a
**single metric dictionary** (name, formula, source, cadence, owner) and **automated reconciliation**
that compares source systems against dashboard aggregates and surfaces exceptions
([EESI](https://www.eesipeo.com/news/hr-dashboard-metrics-key-metrics-guide/),
[MiHCM](https://mihcm.com/resources/blog/hr-analytics-dashboard-best-practices-and-examples/)).
Our plan makes disagreement structurally impossible rather than manually avoided.

### 1.2 Four surfaces overflow, at specific widths

Content width = `min(viewport, 1600) − sidebar − 48px`, sidebar 264px at `lg`+.

| Surface | Breakpoint | Available | Needed | Result |
| --- | --- | --- | --- | --- |
| KPI value `$78,500` | lg 1024 | 35px | 97px | **clipped** |
| KPI value | xl 1280 | 67px | 97px | **clipped** |
| Header row (all controls) | sm–lg | 544–664px | ~837px | **overflows until xl** |
| Department table | sm–xl | 544–565px | ~680px | crushes (no `min-width`) |
| Chart month labels | lg 1024 | 9.4px/label | 16.5px | labels truncated to `Ja…` |

### 1.3 Accessibility defects that need fixing regardless of new features

- **The Hiring Trends chart plots green against red** (`#10b981` hires vs `#f43f5e` exits). Red/green
  is the single most common colour-vision failure — roughly 8% of men cannot separate them, and for
  deuteranopia those two lines render as near-identical brown. Every "positive/negative" chip in the
  app repeats the same pairing.
- **Chart data has no text alternative.** Guidance is explicit: every visualisation should have a
  title, a caption and an accompanying data table
  ([Johns Hopkins accessibility guide](https://accessibility.jhu.edu/wp-content/uploads/sites/31/AccessibleDataVisualizationPresentation.pdf)).
- **Donut percentages are hover-revealed in the centre.** Tooltips are not keyboard accessible, so
  information must not live behind hover alone
  ([5of10](https://5of10.com/articles/accessibility-data-visualization/)). The legend does repeat the
  values, which saves it — but the pattern needs to be deliberate everywhere.
- Numbers inside bars are **centred**; scanning research says left-aligned data is faster to read
  ([wandr.studio](https://www.wandr.studio/blog/dashboard-ui-design)).

### 1.4 Information architecture problems

- **8 KPI cards is at the ceiling, and they're the wrong 8.** Guidance clusters around **3–5 KPIs for
  an executive view and never more than 8 on one screen**
  ([ThoughtSpot](https://www.thoughtspot.com/data-trends/dashboard/hr-metrics-kpis-examples),
  [hr.university](https://hr.university/analytics/hr-metrics-dashboard/)), and our set omits every
  high-signal metric the literature keeps naming: voluntary turnover, time-to-fill, cost-per-hire,
  offer acceptance, eNPS, compa-ratio.
- **"Departments" and "Leave Balance" are not KPIs** — they are counts of things, with no target and
  no direction. "A metric without a target is just a number"
  ([treegarden](https://treegarden.io/blog/hr-kpi-dashboard-design/)).
- **A long table sits on the main dashboard.** Guidance is that dense tables belong on drill-down
  pages, not the summary view
  ([designmonks](https://www.designmonks.co/blog/dashboard-design-dos-and-donts)). Our 8-row
  department table + activity feed + leave cards make the overview long instead of glanceable.

---

## 2. What the research recommends (the source material)

### 2.1 Metrics: what a real HR dashboard tracks

Recurring consensus across practitioner sources, grouped into the functional areas they use:

| Area | Recommended metrics | Benchmarks given |
| --- | --- | --- |
| Talent flow | Voluntary turnover, involuntary turnover, regrettable turnover, first-year turnover | Tech 10–15%/yr; healthcare 8–12%; first-year exits <20% |
| Hiring | Time-to-fill, time-to-hire, cost-per-hire, offer acceptance, source effectiveness | SHRM cost per hire $4,700–5,475; offer acceptance healthy 80–90%; time-to-fill 30–60 days corporate, 45–75 engineering |
| Cost | Labour cost per FTE, overtime spend, payroll exception rate, benefits cost ratio | — |
| Absence | Absenteeism rate, sick days per FTE, leave utilisation, peak leave months | — |
| Performance | Rating distribution, review completion, internal mobility, manager effectiveness | — |
| Equity | Gender/representation by level, promotion rates, pay-gap, compa-ratio | — |
| Engagement | eNPS, engagement index, wellbeing | eNPS >10 good, >50 excellent |
| Capability | Training completion, time-to-competency, skills gaps | Completion target 85%+ |

Sources: [MiHCM](https://mihcm.com/resources/blog/hr-analytics-dashboard-best-practices-and-examples/),
[Rippling](https://www.rippling.com/blog/best-metrics-to-track-for-hr),
[Dayforce](https://www.dayforce.com/blog/key-hr-metrics-your-team-should-track),
[klearskill](https://www.klearskill.com/blog/hr-kpis-dashboard),
[hyring](https://hyring.com/free-hr-toolkit/frameworks/hr-metrics-kpi-dashboard-framework),
[Upscend](https://www.upscend.com/blogs/hr-metrics-that-matter-12-kpis-dashboards-for-execs).

Three rules that come up repeatedly and change our design:

1. **Every metric carries three data points** — current value, comparison (target/benchmark/prior
   period), and direction. Trend direction is often more decision-relevant than the absolute value.
2. **Tiered cadence** — operational metrics update weekly, tactical monthly, strategic quarterly.
   Not everything should claim to be "real-time".
3. **Named ownership per metric** (CIPD practitioners: dashboards with clear KPI ownership are ~3×
   more likely to be reviewed at leadership level).
4. **ISO 30414** (human capital reporting) is the framework several sources recommend for grouping —
   useful as our module spine.

### 2.2 Dashboard UX: hierarchy, cognitive load, disclosure

- **The 5-second rule**: a newcomer must grasp the primary message within five seconds. If they
  hesitate, the hierarchy is wrong.
- **F-pattern**: critical KPIs top-left, supporting metrics below/right, drill-down content last.
- **Progressive disclosure in three tiers**: (1) summary cards with KPIs and alerts → (2) expandable
  panels for pattern analysis → (3) full analytical canvas with filters and pivots. Referenced to the
  IEEE VIS 2024 dashboard interaction study
  ([aufaitux](https://www.aufaitux.com/blog/ai-design-patterns-enterprise-dashboards/)).
- **Limit visible elements** on the first screen to about five; chunk related metrics; whitespace is
  what makes hierarchy visible.
- **Role-based views beat one-size dashboards**: a strategic view (4–6 metrics, monthly) for
  leadership, an operational view (10–15, weekly) for the HR team, and a recruiter view (live
  pipeline) for TA
  ([treegarden](https://treegarden.io/blog/hr-kpi-dashboard-design/),
  [agilityportal](https://agilityportal.io/blog/improve-dashboard-ui-tips-tricks)).
- **Don't block the whole page on the slowest panel**; each component owns its own loading, error and
  empty state ([foundey](https://foundey.com/blog/skeleton-screen-ui-design)).

### 2.3 Data visualisation and accessibility

- **Red/green is the failure to avoid.** Safe categorical palettes are published and tested: the Wong
  palette (blue `#0072B2`, orange `#E69F00`, vermillion `#D55E00`, purple `#CC79A7`, green
  `#009E73`) and IBM's colourblind-safe set (`#648FFF`, `#785EF0`, `#DC267F`, `#FE6100`, `#FFB000`)
  ([rgblind](https://rgblind.com/blog/color-blindness-friendly-chart-colors),
  [5of10](https://5of10.com/articles/accessibility-data-visualization/)).
- **The UK Government analysis guidance is the most actionable**: for two-series line charts use
  **dark blue and orange** — highest contrast, distinguishable in greyscale; keep at most 5 colours
  and prefer direct labels over legends
  ([Analysis Function](https://analysisfunction.civilservice.gov.uk/policy-store/data-visualisation-colours-in-charts/)).
- **Don't encode with colour alone** — pair it with labels, patterns, line styles or shapes.
- **Pie/donut limits**: 5–6 slices maximum, direct labels, sorted by size; a bar chart is usually
  better — Cleveland & McGill's research puts bars 20–30% more accurate for comparison tasks.
- **WCAG 2.1 AA**: 4.5:1 contrast for text, 3:1 for UI components, ≥3px focus indicators, 14px+
  text, colour never the sole carrier of meaning.
- **Every chart needs a data-table alternative** and keyboard-reachable interaction.

### 2.4 HRIS module structure (what "more modules" should mean)

Vendors converge on essentially the same module list
([Personio](https://www.personio.com/hr-lexicon/what-an-hris-is-and-why-you-should-care/),
[Workable](https://resources.workable.com/tutorial/hris-software-features),
[peoplespheres](https://peoplespheres.com/what-is-an-hris-20-key-features-to-complete-your-hris-experience/)):
core HR/employee records, employee self-service, payroll & benefits, time & attendance, leave &
absence, recruitment/ATS, onboarding, performance & goals, learning & development, compensation,
engagement/surveys, compliance, documents, org chart, reporting/analytics, offboarding.

A useful three-layer framing: **HRIS answers "what happened"** (system of record), **HRMS/HCM answers
"what's happening now"** (talent and planning), **workforce intelligence answers "why, and what
next"** ([Compono](https://www.compono.com/articles/hris-system-complete-guide-to-human-resource-information-systems)).
Our modules should be explicit about which layer they serve.

### 2.5 Navigation and responsive patterns

- **Responsive tables**: hide low-priority columns first, collapse hidden data into expandable child
  rows, or stack rows as cards on small screens — never squash
  ([handoff.design](https://handoff.design/responsive-design/responsive-data-tables.html),
  [Toptal](https://www.toptal.com/designers/dashboard-design/mobile-dashboard-ui)).
- **Touch targets** 44×44 (iOS) to 48×48 (Android) minimum.
- **Mobile dashboards** should carry 3–5 essential metrics, stacked vertically, with secondary
  detail behind deliberate interaction.
- **Deep links and URL state** so a filtered view is shareable.

### 2.6 RTL, bilingual and locale (directly relevant to a Saudi-based team)

- Set `dir="rtl"` and `lang="ar"` and use **CSS logical properties** (`margin-inline-start`,
  `padding-inline-end`, `inset-inline-start`, `text-align: start`) instead of `left`/`right`, so one
  stylesheet serves both directions
  ([bycomsolutions](https://bycomsolutions.com/blog/arabic-rtl-web-design-best-practices/),
  [esmnt](https://esmnt.com/insights/articles/arabic-website-design-rtl-ux)).
- **Mirror** navigation, the sidebar (right side), drawer slide direction, breadcrumb chevrons and
  directional arrows. **Do not mirror** logos, clocks, checkmarks, media controls.
- **Arabic needs an Arabic-designed font** — a Latin font with an Arabic fallback renders poorly.
  Candidates: IBM Plex Sans Arabic, Noto Sans Arabic, Tajawal, Cairo.
- Decide numerals explicitly (Western 0-9 vs Arabic-Indic ٠-٩) and apply consistently; most technical
  audiences prefer Western.
- Tailwind has first-class support (`ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`, `rtl:`), and
  the guidance is unambiguous that **retrofitting RTL costs far more than building it in** — which is
  an argument for switching to logical properties *now*, while the app is ~1,500 lines.

### 2.7 HR data privacy (the governance layer a demo usually skips)

- Classify fields: PII (name, DOB, address, national ID), financial (bank, salary), health, documents.
- **Least-privilege RBAC/ABAC with field-level permissions**; quarterly access reviews; MFA for
  privileged accounts ([Evolveup](https://evolveup.io/hr-data-privacy/)).
- **Immutable audit logs** answering who accessed what, when and why; exportable for investigations.
- **Mask or pseudonymise identifiers on manager-level dashboards** and use pseudonymised datasets for
  analytics ([MiHCM](https://mihcm.com/blog/ensuring-employee-data-privacy-best-practices-and-policy)).
- Data minimisation: only surface the fields required for the purpose; retention schedules per record
  type; access revoked automatically at offboarding.

### 2.8 UI states every module must handle

Loading (skeleton for >300–500ms, spinner below), **empty** (say why it's empty and give the next
action), **error** (plain language + retry + escape route), **filtered-to-nothing** (show the active
filters with one-click clear — "the empty state should diagnose its own cause"), permission-denied,
and stale-data indicators
([pixxen](https://pixxen.com/blog/saas-empty-state-design/),
[UXMagic](https://uxmagic.ai/blog/empty-states-ui-design)).
Copy should be direct, never apologetic ("Oops!"). State changes should be announced via ARIA live
regions. Skeletons must mirror the real layout.

---

## 3. Decisions this research forces (and where it contradicts what we built)

Being straight about this: the research disagrees with several things currently on screen.

| # | Current state | Research says | Action |
| --- | --- | --- | --- |
| 1 | Green vs red line chart, green/red status chips | Red/green fails ~8% of men | Re-palette series to blue/orange; keep green/red **only** with a paired icon+label, never colour alone |
| 2 | 8 KPI cards, no targets, no cadence | 3–5 for exec, ≤8 per view, every metric needs target + direction | Split into an exec strip (5) and a scrollable detail strip; add target/benchmark and sparkline direction |
| 3 | "Departments", "Leave Balance" as KPIs | Not decision-triggering | Replace with voluntary turnover, time-to-fill, offer acceptance, compa-ratio, eNPS |
| 4 | 8-row department table + activity + leave cards on the overview | Dense tables belong on drill-down pages | Move table to `/departments`; overview keeps summaries and links |
| 5 | Numbers centred in bars | Left-aligned data scans faster | Left-align values; keep the donut's centre label (it's a centre) |
| 6 | Charts with no text alternative | Every chart needs a data-table alternative | Add a per-panel "view as table" toggle + `aria-label`/caption on each chart |
| 7 | Filters change nothing | Filters must drive views, URL-persisted | Employee-level data + selectors + `useSearchParams` |
| 8 | 2024 dates hardcoded, USD, LTR-only, English-only | Locale should be explicit; RTL built in early | Logical CSS properties from now on; date/currency/number formatters; optional Arabic + RTL |
| 9 | No auth, no roles, no audit | Least-privilege roles, masking, audit trail | Simulate a role switcher (HR Admin / Manager / Exec) that actually gates panels and masks PII |
| 10 | No loading/empty/error states | Every module needs all states | UI kit ships `EmptyState`, `ErrorState`, `Skeleton`, `FilteredToNothing` |

---

## 4. Target architecture

### 4.1 Data layer — one source of truth

```
src/data/
  employees.ts     deterministic seeded generator, 1,247 records (PRNG → identical every build)
  schema.ts        field definitions + classifications (pii | financial | health | operational)
  dictionary.ts    the metric dictionary: name, formula, source, cadence, owner, target, thresholds
  selectors.ts     pure (employees, filters, role) => viewModel for every panel
src/hooks/
  useHrData.ts     memoised selector runner keyed on filters
  useFilters.ts    filter state <-> URL search params
  useRole.ts       active role + field-visibility rules
```

- `employees.ts` is calibrated so department counts, age bands and locations reproduce today's
  distributions — the charts keep their shape while the KPIs become derivable.
- `dictionary.ts` is the single metric registry. Every number on screen resolves through it, which is
  what makes §1.1 impossible to reintroduce.
- Selectors are pure and take `(rows, filters, role)`, so masking and filtering are the same
  mechanism. They also make the panels testable without a DOM.

### 4.2 Token and theming layer

Extend the existing `@theme` block: palette moves to semantic roles (`--color-brand-*`,
`--color-positive`, `--color-negative`, `--color-cat-1…5`), spacing/radius/density tokens, and a
`.dark` variant of the same variables. Chart series read from `--color-cat-*`, so re-paletting is one
CSS change, not eight components.

### 4.3 Workspace model — my recommendation

**Both, with the switcher doing real work**: a role workspace switcher (HR Admin / Manager /
Executive) above the nav, because the research is consistent that role-based views are what makes
dashboards adopted — and each workspace has its own nav subset and default landing page:

| Workspace | Nav subset | Landing |
| --- | --- | --- |
| **HR Ops** (default) | Overview, Employees, Attendance, Leave, Payroll, Recruitment, Reports | Executive overview |
| **Manager** | My Team, Attendance, Performance, Leave requests | Team overview |
| **Executive** | Overview, Departments, Payroll cost, Reports | 5-KPI strategic strip |

### 4.4 Shared UI kit (build before modules, or every module re-invents the card)

`Panel`, `SectionHeader`, `StatTile` (value + delta + target + sparkline), `DataTable` (sort, paginate,
responsive column priority, child-row expansion, view-as-table), `ChartFrame` (title, caption, legend,
data-table toggle, empty/loading states), `EmptyState`, `ErrorState`, `Skeleton`, `Badge`, `Drawer`,
`Toolbar`. Every module composes these.

### 4.5 Module map (aligned to the HRIS canon in §2.4)

| # | Module | Route | Layer | Primary audience | Key content |
| --- | --- | --- | --- | --- | --- |
| 1 | Overview | `/` | Intelligence | All | 5 strategic KPIs, trends, alerts, drill-down links |
| 2 | Employees | `/employees` | System of record | HR Ops | Directory: search, filter, sort, paginate, detail drawer, org chart |
| 3 | Recruitment | `/recruitment` | Record + intelligence | HR Ops | Funnel by stage, time-to-fill/hire, cost-per-hire, offer acceptance, source effectiveness |
| 4 | Attendance & Time | `/attendance` | Record | HR Ops, Manager | Absence reasons, late/overtime, single-hue heatmap, patterns |
| 5 | Leave | `/leave` | Record | HR Ops, Manager | Balances, request queue, entitlement burn-down, peak months |
| 6 | Performance | `/performance` | Talent | Manager, HR Ops | Distribution, 9-box, review completion, top/bottom performers |
| 7 | Payroll & Comp | `/payroll` | Financial | HR Ops, Exec | Salary bands, compa-ratio, cost by department, overtime, anomalies |
| 8 | Departments | `/departments` | Intelligence | Exec, HR Ops | Headcount vs budget, span of control, growth, the table moved off the overview |
| 9 | Learning & Skills | `/learning` | Talent | Manager | Completion rates, time-to-competency, skills gaps |
| 10 | Reports | `/reports` | Output | HR Ops | Saved reports, scheduled exports, ISO 30414 view |
| 11 | Settings / Admin | `/settings` | — | HR Admin | Roles & permissions, metric targets, density/theme/language, audit log viewer |
| 12 | Help | `/help` | — | All | Metric glossary (from `dictionary.ts`), keyboard shortcuts |

### 4.6 Responsive contract

| Rule | Detail |
| --- | --- |
| Reflow, don't shrink | KPI grid `grid-cols-2 md:grid-cols-4 2xl:grid-cols-8`; charts 1 → 2 (`lg`) → 3 (`xl`) columns |
| Size on **container**, not viewport | `@container` + `@min-*` on every panel (verified working in this Tailwind build) — the sidebar changes width by 168px without the viewport changing |
| Tables | `min-w-*` + `overflow-x-auto`; below `md` collapse each row into a stacked card with label/value pairs |
| Chart axes | Hide alternate ticks when the panel is narrow; never truncate a label to `Ja…` |
| Header | Progressive disclosure: search + profile name at `xl`, Export at `md`, icon buttons always |
| Touch | ≥44px targets; bottom nav on mobile if the drawer proves heavy |
| Global guard | `overflow-x: clip` on `body` (clip creates no scroll container, so sticky/fixed keep working) |
| Long strings | `truncate` **plus** `title` so clipped text stays reachable |

---

## 5. Verification approach

No browser exists in this sandbox, so every phase ships with machine checks, and visual judgement
stays yours on the preview:

1. **SSR render** the tree in Node and assert on markup (panel counts, ARIA roles, state variants).
2. **Class-token sweep**: extract every class from source, confirm the built CSS contains it.
3. **Width math** at each breakpoint, as in §1.2, before and after.
4. **Data invariants**: assert every dictionary metric reconciles with the underlying rows, and fail
   loudly if a headline number ever drifts from its selector (this is the regression test for §1.1).
5. **Contrast + palette check**: compute WCAG ratios for text pairs and simulate deuteranopia/
   protanopia over the series colours, asserting minimum perceptual distance.
6. `npm run build` + `npm run lint` (currently 2 pre-existing errors, both in `vite.config.ts`).

---

## 6. Delivery plan

| Phase | Deliverable | Unblocks |
| --- | --- | --- |
| **1. Foundation** | `employees.ts`, `schema.ts`, `dictionary.ts`, `selectors.ts`, `useHrData`, real filtering, reconciled KPIs, data-invariant tests | Everything. Fixes §1.1 |
| **2. Design tokens & a11y** | Semantic palette incl. colourblind-safe categorical set, density/dark tokens, logical CSS properties, `prefers-reduced-motion`, chart data-table alternative | §3 rows 1, 5, 6, 8 |
| **3. Responsive hardening** | Reflow contract §4.6, container queries, table card-mode, header disclosure, width-math checks | §1.2 |
| **4. UI kit** | Components in §4.4 incl. all six states | Stops module drift |
| **5. Workspace shell** | Router, role switcher, `NavLink` sidebar, URL filters, NotFound, breadcrumbs, keyboard nav | Every later module is a route |
| **6. Modules** | In §4.5 order, one or two per review | — |
| **7. Governance & polish** | Role gating + PII masking + audit log viewer, metric targets editor, command palette, optional Arabic/RTL pass | §3 rows 9, 10 |

Phases 2–4 are deliberately before new modules: they are cheap now and expensive to retrofit once
twelve screens exist.

---

## 7. Decisions I need from you

1. **KPI set** — do you accept replacing "Departments"/"Leave Balance" with turnover, time-to-fill,
   offer acceptance, compa-ratio and eNPS (§3 row 2–3), or do you want to keep the current eight on
   the overview and put the new metrics on a second strip?
2. **Colour** — switch to colourblind-safe series colours (blue/orange and the Wong/IBM sets) even
   though it moves away from the emerald brand accent, or keep emerald as the brand and reserve safe
   colours only for multi-series charts?
3. **Locale scope** — build RTL/Arabic in now (cheap, §2.6) or English-only for now with logical
   properties only, so Arabic is a later flip rather than a rewrite?
4. **Role simulation** — should the role switcher actually gate panels and mask salaries/PII (more
   convincing, more work), or just relabel navigation?
5. **Module order** — confirm the §4.5 sequence, or name the two you want first after Phase 5.
