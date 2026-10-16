# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project

**HR Analytics Dashboard** — a single-page, front-end-only workforce analytics dashboard.
React 19 + TypeScript + Vite 7 + Tailwind CSS v4, animated with `framer-motion` and iconography
from `lucide-react`.

There is **no backend, no API layer, no database, and no routing**. Every number on screen comes
from hard-coded mock fixtures in `src/data/hrData.ts`. `react-router-dom` and `recharts` are
listed in `package.json` but are unused — all charts are hand-rolled SVG/div components.

`package.json` has `"name": "placeholder-model-1"`. That is an artifact of how the project was
exported; it is not meaningful. Renaming it also requires editing `name` in
`package-lock.json` — do not rename it unless explicitly asked.

## Commands

```bash
npm install          # install dependencies (node_modules is gitignored)
npm run dev          # Vite dev server, HMR — binds 0.0.0.0 on http://localhost:5173
npm run build        # tsc -b (project references) && vite build -> dist/
npm run lint         # eslint . (flat config, eslint.config.js)
npm run preview      # serve the built dist/ locally
```

There is **no test runner** configured (no vitest/jest/playwright). Do not invent a
`npm test` script; if tests are needed, propose adding a runner first.

### Verify work with

`npm run build` is the real type-check + bundle gate (`tsc -b` runs before `vite build`).
TypeScript is `strict: true` but has **no** `noUnusedLocals`/`noUnusedParameters`, so unused
imports fail lint rather than the build.

### Known pre-existing lint errors (2)

`npm run lint` reports two errors, both in `vite.config.ts` and both inherited from `main`:

| File | Error |
| --- | --- |
| `vite.config.ts` | `@ts-ignore` where `@ts-expect-error` is required; empty catch block |

The empty `catch {}` and the `@ts-ignore` are deliberate (they let a missing or broken
`.vite-source-tags.js` fail silently), so either leave them or replace the ignore with
`@ts-expect-error` — do not "fix" the catch by removing it.

Prefer leaving lint no worse than you found it, and avoid bundling unrelated fixes into a feature
change.

## Architecture

```
index.html                 # Vite entry; also hosts two injected analytics <script> tags (see below)
.vite-source-tags.js       # custom Vite plugin (see below)
vite.config.ts             # react + tailwindcss plugins; sourceTags() is loaded optionally
src/
  main.tsx                 # createRoot(...).render(<StrictMode><App /></StrictMode>)
  App.tsx                  # app shell + the whole page: sidebar state, header, filters, KPIs, charts, footer
  index.css                # Tailwind v4 entry + global CSS
  data/hrData.ts           # Employee interface, domain constants, and every mock dataset
  components/
    Sidebar.tsx            # app shell nav: icon rail / expanded / mobile drawer
    KPICard.tsx            # labelled stat + trend delta chip
    FilterBar.tsx          # dropdown filter row
    BarChart.tsx           # vertical + horizontal bar modes
    LineChart.tsx          # multi-series SVG line chart
    DonutChart.tsx         # SVG donut with legend + optional center label
    StackedBarChart.tsx    # horizontal 100%-scaled stacked bars
  App.css                  # empty; left over from the Vite template, unused
```

### Data flow

Everything on the dashboard is **derived from a generated population**. There are no hand-typed
KPI constants; the previous ones contradicted each other (a $78,500 average salary next to a
department table implying $80,138, 89 new hires next to 195, a 2,456 leave balance next to 14,122)
and are gone.

| File | Role |
| --- | --- |
| `src/data/random.ts` | Seeded PRNG (mulberry32) plus weighted / normal / skewed draws. Deterministic on purpose — the numbers must not change between reloads or between builds. |
| `src/data/employees.ts` | The 1,247-record population, its configuration (headcounts, salaries, attrition rates, compa-ratios, time-to-fill) and `AS_OF_DATE` / `PERIOD_START`. |
| `src/data/metrics.ts` | Every KPI and chart series, computed. Each metric carries value + target + direction + cadence. |
| `src/data/saudi.ts` | The Saudi reference layer: cities, labour-law entitlements, GOSI/levy/Nitaqat/WPS rules, holidays, Umm al-Qura conversion, prayer times, SAR formatting. Constants and pure functions only — no workforce figures. |
| `src/data/compliance.ts` | The regulatory view composed from `metrics.ts` plus `saudi.ts`: Nitaqat ladder, GOSI/WPS/expat-cost roll-ups, document queue, statutory framework, holiday calendar. |
| `src/data/palette.ts` | Series colours. Wong/IBM accessible palettes, **not** the brand emerald. |
| `src/data/hrData.ts` | Adapter over the above, keeping the old export names so panels migrate one at a time. New code imports from `metrics.ts`. |
| `src/components/ui.tsx` | Shared primitives (`Panel`, `CardHeader`, `MiniStat`, `StatusPill`, `ProgressBar`, `DataRow`). New panels compose these rather than restating a card. |

- **To change a number, change the population or a rate constant — never a literal in a component.**
  Headcounts are seeded as slots and paired off, so department and location totals are exact; if you
  edit one list without the other, `generateEmployees` throws rather than silently disagreeing.
- **Fields are generated in dependency order** (tenure → rating → attendance/engagement → pay →
  leave). Independent draws produce a population that does not hang together — a hundred
  five-year veterans rated "Below" with 60% attendance is not a company.
- **A metric id that no longer exists throws at module load and takes the app down**, not just the
  panel that reads it — `kpiData` in `hrData.ts` did exactly that for `activeEmployees`. Metric
  strips are re-readable by id (`metric()`), so keep the ids in step with the strips.
- **A target derived from the thing it measures is not a target.** Each department's Saudization
  target is a separate `saudizationTarget` from the generation ratio `saudization`; when the two
  shared one field every department sat exactly on target and every reported gap was rounding.
- **One exception pattern is worth more than random noise.** `payrollRuns` uses a fixed exception
  map: a random draw gave zero late runs across twelve months, so the panel reported perfect WPS
  compliance it had never earned.
- **`--c-subtle` is text, not decoration.** All four text levels are verified against both
  `--c-surface` and `--c-app` by `scripts/verify-theme.py`; do not lighten one without re-running it.
- **`AS_OF_DATE` is the previous month end, not today.** A mid-month cutoff makes the final bar of
  every monthly chart a partial month, so it reads as a collapse in hiring rather than an
  unfinished period. It also keeps the figures stable for the whole of a month.
- **Departures are confined to the trailing twelve months**, which is what makes the population
  mean "current staff plus everyone who left during the period" and makes attrition a real annual
  rate. Spreading exits over employees' whole history produced 0.5%.
- **Parental leave carries no standing balance** — it is granted per event. Accruing an entitlement
  for all 1,247 staff invented ~23,000 phantom days; the leave KPI is unused *annual* leave only.
- Turnover is separations ÷ average headcount, computed identically at org and department level so
  the rows reconcile with the headline.

### Filters are currently decorative ⚠️

`FilterBar` still does not filter anything. `activeFilters` in `App.tsx` is a display-only array;
selecting a month/department/location/gender/status changes the chip but not the data. The data
layer can support it now — `metrics.ts` derives everything from the population, so filtering means
passing a predicate down — but PLAN.md §3 puts the state in `useSearchParams` so a filtered view is
shareable by URL. Until that lands, do not describe the dashboard as filterable.

### Page layout (order in `App.tsx`)

`Sidebar` is `fixed` and the app root pads for it, so `App.tsx` renders: Sidebar (plus a mobile
scrim) → Header (hamburger + brand on mobile, search / bell / appearance menu / export / profile) →
`FilterBar` → 5 executive KPI cards → 8 operational KPI cards → Charts Row 1 (Hiring Trends line,
Department Distribution bar, Gender donut) → Charts Row 2 (Attrition stacked bar, Attendance line) →
Charts Row 3 (Performance bar, Location bar, Age bar) → Bottom (Department Overview table, Recent
Activity feed) → Leave Management cards → footer.

### Sidebar states

`Sidebar` has three presentation states, driven by two `App` state values plus CSS breakpoints —
no JS media queries:

| State | Trigger | Width | Look |
| --- | --- | --- | --- |
| Mobile drawer | `mobileOpen` (hamburger) | 288px | always labelled, `fixed` overlay + scrim, close via `X` / scrim / nav click |
| Expanded | default on ≥lg | 264px | labels, section headings, badges |
| Icon rail | `collapsed` (round chevron handle) | 96px | icons only, labels/badges/headings collapse to zero width, hover tooltip per item |

⚠️ **Keep two things in sync when changing the rail width:** the `lg:w-24` / `lg:w-[264px]` on the
`<aside>` and the `lg:pl-24` / `lg:pl-[264px]` on the `App` root. Labels collapse via
`lg:max-w-0 lg:opacity-0`, so they stay visible on mobile even while collapsed on desktop. Nav
selection is local `useState` in `Sidebar`; the rail dimensions are *not* persisted across reloads.

The mobile scrim is `z-[60]` and the sidebar `z-[70]`, both above the sticky header's `z-40` —
keep that ordering if you add floating UI.

## Conventions

- **Adding a metric or series:** derive it in `src/data/metrics.ts` from `employees`. Do not inline
  data arrays in components or in `App.tsx`, and do not add a hand-typed constant — the whole point
  of the data layer is that a figure cannot disagree with the population behind it. New panels
  should import from `metrics.ts` rather than the `hrData.ts` adapter.
- **Adding a module:** four edits — a `NavItem` in `components/Sidebar.tsx`, a branch in the module
  switch in `App.tsx`, a `*Module.tsx` component that composes `components/ui.tsx`, and a
  `src/data/<module>.ts` facade when the figures need deriving (`data/compliance.ts` and
  `data/payroll.ts` are the patterns). Modules are **routes**: the active key lives in the URL hash
  (`state/useHashRoute.ts`) and the sidebar is controlled from it, so a module is linkable and the
  back button works. Nav badges come from the `badges` prop (live counts), never a literal.
- **An unbuilt module must say so.** `components/UpcomingModule.tsx` renders the phase it arrives in;
  never let a nav key fall through to the dashboard, or the breadcrumb contradicts the content.
- **Gating is `role.can.*`, and it is the real thing.** Salary cells go through `<Sensitive>`, whole
  modules return a restricted state, and sorting by a masked column is hidden — sorting leaks the
  ranking even when the values are hidden. Adding a module that shows pay or identifiers means
  deciding what each of the four roles in `state/role.ts` may see.
- **Module data goes in a facade, not the component.** Filtering, sorting and pagination live in
  `data/*.ts` so the same predicates hold for the table, the mobile card list and any future export.
- **Saudi content:** the reference layer is `src/data/saudi.ts` — put rates, articles, thresholds and
  calendars there, not in components. Anything regulatory states its basis in the UI (article number
  or percentage), because these change by ministerial decision.
- **Adding a chart:** either reuse an existing component in `src/components/` with a new
  `{ label, value, color }[]` mapping in `App.tsx`, or add a new presentational component there
  with a local `interface XxxProps`, a named export, and pure inline SVG/divs. Recharts is
  installed but deliberately unused — match the existing hand-rolled style rather than
  introducing a charting library into one section.
- **Animating:** wrap sections and list items in `motion.*` from `framer-motion` with
  `initial`/`animate` and a small staggered `transition={{ delay: ... }}`, matching the surrounding
  cards. Do not add CSS keyframe animations for new interactive elements; the keyframes in
  `index.css` are legacy.
- **Section comments:** top-level JSX blocks in `App.tsx` are labelled with `{/* Name */}`
  comments; keep that so the file stays navigable.
- Copy is hard-coded American English with USD amounts, and the population's locations are US
  cities. The layout is already direction-agnostic (logical properties, `dir` on `<html>`, RTL
  variants where transforms are involved), so switching to Arabic is a copy-and-data task rather
  than a re-layout — but the default remains English until that is asked for.
- Keep `strict` TypeScript happy without reaching for `any`; `tsc -b` gates the build.

## Styling

- **Tailwind CSS v4** through the `@tailwindcss/vite` plugin; `src/index.css` starts with the
  Google Fonts `@import url(...)` and then `@import "tailwindcss"`. That order matters: every
  `@import` must precede other rules, and Tailwind's import expands into rules, so swapping them
  produces a PostCSS warning on every build.
- There is **no `tailwind.config.js`** — v4 is CSS-first. Tokens live in the `@theme { ... }` block
  in `src/index.css` and become utilities (`--shadow-card` → `shadow-card`).
- **Only class names written literally in a source file are generated by Tailwind's scanner.** That
  is why the reusable visual classes below are hand-authored CSS rather than `@apply`d utilities —
  it makes runtime-interpolated names like `` `tone-${tone}` `` safe, since the CSS always exists.

### Theme tokens and the appearance system

**Never write a raw colour or a physical direction in a component.** There are two layers, and
components only ever see the second one:

1. **`src/index.css`** defines `--c-*` variables per theme. Three blocks set them:
   `:root, [data-theme='light']`, `[data-theme='dark']` and `[data-theme='contrast']`.
2. **The `@theme` block** maps those to Tailwind's colour namespace, so the utilities are
   `bg-surface`, `text-strong`, `border-hair-strong` and so on. Add a token in both places or the
   utility will not exist.

| Token | Use for |
| --- | --- |
| `app` | Page background (behind `.app-canvas`). |
| `surface`, `surface-2` | Cards, popovers, and the slightly recessed second level inside them. |
| `sunken`, `sunken-strong` | Inset wells: progress tracks, table stripes, empty states. |
| `hair`, `hair-strong` | Hairline borders and the stronger border on interactive chrome. |
| `strong`, `body`, `muted`, `subtle` | The four-level text scale, darkest/most prominent first. |
| `inverse`, `inverse-fg` | Chrome that is deliberately "opposite of the page" — the rail tooltip. |

- **Text scale rule:** all four levels clear WCAG AA (4.5:1) against *both* `surface` and `app`.
  `subtle` is the lightest a tertiary label may go. Run `python3 scripts/verify-theme.py` after
  touching any of them — it computes the real ratios and exits non-zero on a regression.
- **Colour-vision rule:** the two-series line chart uses `SERIES` in `App.tsx` (blue/orange), not
  the emerald brand. Emerald vs red measures dE 19 under deuteranopia, which is unreadable; the
  current pair measures 118. `verify-theme.py` checks this too.
- **Square corners:** every Tailwind radius step is set to `0px` in `@theme`. `rounded-full` is kept
  deliberately for pills, avatars and status dots. Never reintroduce a numeric radius.
- **Logical properties only:** `ps/pe/ms/me/start/end`, `border-s/e`, `rounded-s/e`,
  `text-start/end`. Physical `left/right` breaks RTL. The sidebar drawer and rail tooltip use
  `rtl:` variants for the transforms that cannot be expressed logically.
- **Density** comes from `--pad-panel` / `--pad-tile` / `--pad-cell` / `--gap-section`, switched by
  `[data-density]`. Use `.pad-panel`, `.pad-tile`, `.cell-y`, `.section-stack` rather than hardcoded
  padding, or the density control silently does nothing to that element.

### The appearance provider

`src/theme/ThemeProvider.tsx` owns `{theme, density, direction}`, mirrors them onto `<html>` as
`data-theme` / `data-theme-preference` / `data-density` / `dir` / `lang`, and persists to
`localStorage['hr-dash:appearance']`. `src/theme/appearance.ts` holds the context, types and
`useAppearance()` — split out so the provider file exports only a component (the
`react-refresh/only-export-components` lint rule requires it).

- `index.html` carries a **pre-paint script** for the same key so the first paint is already
  correct. It duplicates the allowlists on purpose (it cannot import them); if you change the
  storage shape, change both. Its `JSON.parse` is guarded in its own `try` so a corrupted value
  cannot prevent `dir`/`lang` from being applied.
- `ThemeMenu` in the header is the only control surface. It is a real popover with
  `aria-expanded`, so treat the header button as interactive when adding header tests.

### The visual system (all in `src/index.css`)

| Piece | What it does |
| --- | --- |
| `.app-canvas` | Page background: three radial colour glows over a vertical base gradient, plus a `::before` grid for depth. `isolation: isolate` is load-bearing — without it the `z-index: -1` grid paints behind the element's own background and disappears. All glows are disabled in the contrast theme. |
| `.surface` | The single card recipe (radius, border, translucent surface, elevation + inner highlight). Used by ~20 panels. Pair with `.surface-lift` for hover elevation. |
| `.header-elevation` | The sticky header's shadow. Theme-aware: a white highlight on light, a dim rim on dark, none in contrast. Never inline a fixed white shadow again. |
| `.hairline` | Tone-coloured accent line across a card's top edge via `::after`. |
| `.tile` | Gradient icon tile, coloured from the `--tone-*` variables of the nearest `.tone-*` ancestor. |
| `.chip` + `.chip-positive` / `.chip-negative` / `.chip-neutral` | Status pills. The contrast theme prefixes them with ▲/▼ so the meaning never rests on colour alone. |
| `.row-hover` | Tone-aware table row hover, replacing the old hardcoded `hover:bg-emerald-50/40` that flashed near-white in dark mode. |
| `.glass-bar` / `.glass-rail` | Backdrop-blur chrome for the sticky header and the sidebar only. |
| `.chart-plate` | Frosted inset behind chart SVGs. |
| `.tnum` | Tabular figures for KPI values, tables and axes so digits don't jitter. |
| `.tone-*` | Eight tones (emerald, sky, indigo, violet, rose, amber, cyan, slate). Each sets `--tone-1/2/soft/text/glow`; `.tile`, `.hairline`, `.row-hover`, `.tone-text` and `.tone-soft` read them. |

- **Adding a tone-dependent element:** put a `.tone-*` class on any ancestor and use `.tile` /
  `.tone-text` / `.tone-soft` on descendants — the variables inherit. Adding a new tone means one
  new `.tone-<name>` rule setting all five variables, plus the name in the `Tone` union in
  `KPICard.tsx`.
- Charts use **CSS gradients** for bars/areas (via `backgroundImage`), and SVG `<linearGradient>`
  defs keyed off `useId()` in `LineChart`. Note `LineChart`'s plot SVG uses
  `preserveAspectRatio="none"`, so it scales non-uniformly: strokes carry
  `vector-effect="non-scaling-stroke"` and point markers are HTML dots, because an SVG `<circle>`
  would be squashed into an ellipse. Axis/value labels live outside the SVG for the same reason.
- Inter is loaded from the Google Fonts CDN at runtime, so the app needs network access to render
  its intended typography.
- Layout is responsive: KPI grid is `grid-cols-2 → md:4 → lg:8`, chart rows collapse to one column,
  and the department table is wrapped in `overflow-x-auto`. At `lg:grid-cols-8` a KPI card is only
  ~180px wide, which is why its icon tile is absolutely positioned rather than in flow — an inline
  icon leaves the value roughly 55px of width.
- `prefers-reduced-motion` disables animations/transitions, and `@media print` flattens surfaces
  and hides `.no-print`.

### Verification scripts

Both are run from the repo root and exit non-zero on failure. Run them after any styling change.

| Script | Checks |
| --- | --- |
| `scripts/verify-theme.py` | WCAG contrast for all four text levels, tone chips and inverse chrome in each of the three themes; deuteranopia dE for the chart series pairs; density values per preset. |
| `scripts/verify-classes.py` | Parses every `className` in `src/**/*.tsx` (expanding the runtime tone families), then asserts each token exists in `dist/assets/*.css`. Needs a build first. |

## Tooling notes

- **`.vite-source-tags.js`** is a custom Vite plugin that parses every `.tsx` with Babel at
  transform time and injects a `data-source-loc="path:line:col"` attribute into each JSX element, so
  an external element picker can map rendered DOM back to source. It runs in dev and build. It is
  committed to the repo even though `.gitignore` lists it. Wrapping it in `try/catch` in
  `vite.config.ts` is deliberate — a missing or broken plugin must not break the build.
- `vite.config.ts` is an **async** config function that calls `loadEnv` and promotes every
  `VITE_*` / `NEXT_PUBLIC_*` variable into a `process.env.*` define. There are currently no env
  files in the repo; add `.env.local` (gitignored via `*.local`) if you need one.
- The dev server sets `host: true` (binds `0.0.0.0`) and `allowedHosts: ['.e2b.app']`.
  Both are required by the hosted preview, which proxies the server from an `*.e2b.app` origin:
  Vite 403s any request whose `Host` header it does not recognise, and a server bound to
  `127.0.0.1` is unreachable from the proxy. Vite always allows `localhost` / `*.localhost` /
  bare IPs, so local browsing is unaffected. To use a different preview domain, set
  `VITE_ALLOWED_HOSTS="host-a,host-b"`; leave the DNS-rebinding protection on rather than reaching
  for `allowedHosts: true`. The `preview` block mirrors the same settings.
- **`index.html` carries injected third-party scripts** — an rrweb session recorder
  (`data-arena-recording`) and a page-view beacon (`data-arena-views`) that POSTs to
  `www.designarena.ai`. They are harness instrumentation, not application code. Leave them alone
  unless the task is explicitly about them.
- `dist/` and `node_modules/` are gitignored. Keep generated output out of commits.
