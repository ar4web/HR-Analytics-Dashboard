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

### Known pre-existing lint errors (7)

`npm run lint` is currently red on `main`. These are not regressions you introduced:

| File | Error |
| --- | --- |
| `src/App.tsx` | unused `PieChart` import; unused `salaryDistribution` import |
| `src/components/DonutChart.tsx` | `react-hooks/immutability`: `currentAngle` reassigned during render; unused `innerRadius` |
| `src/components/StackedBarChart.tsx` | unused `height` prop |
| `vite.config.ts` | `@ts-ignore` where `@ts-expect-error` is required; empty catch block |

Prefer leaving lint no worse than you found it. Cleaning these up is welcome when it is in scope,
but avoid bundling unrelated fixes into a feature change.

## Architecture

```
index.html                 # Vite entry; also hosts two injected analytics <script> tags (see below)
.vite-source-tags.js       # custom Vite plugin (see below)
vite.config.ts             # react + tailwindcss plugins; sourceTags() is loaded optionally
src/
  main.tsx                 # createRoot(...).render(<StrictMode><App /></StrictMode>)
  App.tsx                  # the whole page: header, filters, KPIs, all chart sections, footer
  index.css                # Tailwind v4 entry + global CSS
  data/hrData.ts           # Employee interface, domain constants, and every mock dataset
  components/
    KPICard.tsx            # labelled stat + trend delta chip
    FilterBar.tsx          # dropdown filter row
    BarChart.tsx           # vertical + horizontal bar modes
    LineChart.tsx          # multi-series SVG line chart
    DonutChart.tsx         # SVG donut with legend + optional center label
    StackedBarChart.tsx    # horizontal 100%-scaled stacked bars
  App.css                  # empty; left over from the Vite template, unused
```

### Data flow

`hrData.ts` exports plain typed arrays/objects → `App.tsx` imports them and maps each one into the
`{ label, value, color }` / `{ label, values[] }` shape its chart component expects → the chart
component renders it. Chart-data transformation lives **inline in `App.tsx`** (see
`departmentChartData`, `hiringTrendData`, `attritionChartData`, etc.), not in the data module and
not in the components.

Components are presentational only: they hold no data and fetch nothing. Props are declared as
local `interface XxxProps` blocks above each component, and components are exported as **named**
exports (`export function BarChart(...)`), not defaults — `App.tsx` is the only default export.

### Page layout (order in `App.tsx`)

Header (search / bell / settings / export / profile) → `FilterBar` → 8 KPI cards → Charts Row 1
(Hiring Trends line, Department Distribution bar, Gender donut) → Charts Row 2 (Attrition stacked
bar, Attendance line) → Charts Row 3 (Performance bar, Location bar, Age bar) → Bottom (Department
Overview table, Recent Activity feed) → Leave Management cards → footer.

### Filters are currently decorative ⚠️

`FilterBar` + `activeFilters` state in `App.tsx` render and update correctly, but **nothing reads
`activeFilters`**. Selecting a month/department/location/gender/status changes only the button
labels; KPIs, charts, and tables are unaffected. `kpiData` in `hrData.ts` is a static object, not
a derivation, so making filters real means deriving the KPI/chart values from a per-employee
dataset. Do not claim filtering works.

## Conventions

- **Adding a dataset:** export a typed `const` from `src/data/hrData.ts` alongside the existing
  ones; do not inline data arrays in components or in `App.tsx`.
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
  comments; keep that so the ~640-line file stays navigable.
- `index.html` is the only `lang="en"` document and there is no i18n layer; copy is hard-coded
  American English with USD amounts, and `hrData.ts` locations are US cities. Preserve that
  unless the task asks otherwise.
- Keep `strict` TypeScript happy without reaching for `any`; `tsc -b` gates the build.

## Styling

- **Tailwind CSS v4** through the `@tailwindcss/vite` plugin; `src/index.css` starts with
  `@import "tailwindcss"`.
- There is **no `tailwind.config.js`** — v4 is CSS-first. Add design tokens with an `@theme { ... }`
  block in `src/index.css` rather than creating a JS config.
- Utility classes are written inline in JSX. The design system is: emerald primary, indigo/amber/
  red for secondary series, `rounded-2xl` cards on `bg-white` with `border-gray-100` + `shadow-sm`,
  `text-gray-900`/`text-gray-500` for primary/secondary text.
- A small set of reusable classes (`.glass`, `.card-hover`, `.gradient-text`, `.animate-fade-in`,
  custom scrollbar, print rules) lives at the bottom of `src/index.css`. Vite emits a build warning
  that the Google Fonts `@import url(...)` comes after `@import "tailwindcss"`; the font still
  loads, but the rule is technically out of order.
- Inter is loaded from the Google Fonts CDN at runtime, so the app needs network access to render
  its intended typography.
- Layout is responsive: KPI grid is `grid-cols-2 → md:4 → lg:8`, chart rows collapse to one column,
  and the department table is wrapped in `overflow-x-auto`.

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
