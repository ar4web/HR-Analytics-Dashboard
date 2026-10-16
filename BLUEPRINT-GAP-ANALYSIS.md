# Blueprint Gap Analysis

Checking our app against: the **Saudi enterprise super-app blueprint**, the **best-practices list**,
and the **geo-fenced attendance system spec**. Every status below is verified against the code, with
the evidence and the exact count.

Audited at commit `124cb71`. Repo scale: **12 source files · 2,117 LOC · 7 components · 0 routes ·
0 backend files.**

---

## Verdict in one line

**We have a well-built shell prototype for 1 of 10 modules, with no backend, no auth, no i18n and no
geo-fencing.** The blueprint describes a platform; this repo is the dashboard layer of one. What
exists is genuinely reusable as the platform's visual foundation — but roughly **85% of the blueprint
is unbuilt**, and the gaps are concentrated in exactly the areas that are hardest to retrofit later
(identity, permissions, Arabic/RTL, theming).

## Scorecard

| Blueprint area | Have | Partial | Missing | Score |
| --- | --- | --- | --- | --- |
| 1. Core shell | 1 | 2 | 4 | **~30%** |
| 2. Main modules | 1 | 1 | 8 | **~15%** |
| 3. Interface modes | 0 | 0 | 5 | **0%** |
| 4. Backend foundation | 0 | 0 | 9 | **0%** |
| 5. Saudi readiness | 0 | 0 | 7 | **0%** |
| 6. Geo-fenced attendance | 0 | 0 | all | **0%** |

---

## 1. Core shell

| Requirement | Status | Evidence |
| --- | --- | --- |
| Left sidebar | **HAVE** | `Sidebar.tsx` — 3 states, 96px rail / 264px expanded / mobile drawer, 11 items, keyboard `aria-current` |
| Top status bar | **PARTIAL** | `<header>` exists but is a *toolbar*, not a status bar: search, bell, gear, export, profile. No system status, sync state, environment badge, or timezone/clock — the things a status bar carries |
| Right context panel | **MISSING** | 0 hits. Would be a third column and **invalidates the width math** in `PLAN.md` §1.2 — needs re-derivation |
| Draggable widgets | **MISSING** | 0 hits for `dnd`/`Draggable`/`useDrag`/`sortable` |
| Square corners | **MISSING — conflicts** | **60 `rounded-*` occurrences vs 0 square.** The blueprint and our design language disagree; see Conflicts |
| Modern Saudi-friendly look | **PARTIAL** | Clean, dense-capable, token-driven — but see §5, none of the Saudi-specific layer exists |
| Mobile-responsive | **PARTIAL** | KPI grid reflows, drawer + scrim work, sidebar collapses. But `PLAN.md` §1.2 documents 4 real overflow bugs (KPI values clipped 1024–1279px, header overflows below xl, table crushes, chart labels truncated) |
| Theme system: light / dark / high-contrast | **MISSING** | **0 `dark:` variants, 0 high-contrast, 0 theme switcher.** Only `prefers-reduced-motion` exists. Light is hardcoded |

**Best-practice note we already satisfy:** "Keep navigation stable across all modules" — the sidebar is
shell-level, not per-page. And "limit first-level sidebar items; use expandable sections" — we have 11
flat items in 3 groups, which is close to the limit and will need collapsing when 10 modules land.

---

## 2. Main modules

| # | Module | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Dashboard / analytics | **HAVE** | `App.tsx` + 5 hand-rolled chart components |
| 2 | Users, roles, permissions | **MISSING** | 0 hits for `rbac`/`permission`/`can(` |
| 3 | CRM / sales | **MISSING** | absent entirely |
| 4 | HR / people ops | **PARTIAL** | Read-only aggregate metrics. No employee records — the `Employee` interface is declared and **never instantiated** |
| 5 | Finance / invoicing | **MISSING** | absent |
| 6 | Projects / tasks | **MISSING** | absent |
| 7 | Documents / e-sign | **MISSING** | absent |
| 8 | Messaging / notifications | **DECORATIVE** | A bell icon with a red dot and **no `onClick`** |
| 9 | Integrations hub | **MISSING** | absent |
| 10 | Settings / admin / compliance | **DECORATIVE** | A gear icon and a profile chip, **both with no `onClick`** |

**Verified inert controls** — 5 buttons render as working affordances but do nothing: search, bell,
gear, export, and profile in the header; "Sign out" in the sidebar. Blueprint says *"never hide
integration failures"*; the same honesty applies here — arguably they should be labelled as preview
stubs rather than presented as live.

Blueprint's "make every module share users, roles, notifications, files, analytics, and audit logs"
is currently impossible: **there is no shared services layer** (§4).

---

## 3. Interface modes

**0 of 5 exist.** There is exactly one view, rendered by one component (`App.tsx`).

| Mode | Status | What it needs |
| --- | --- | --- |
| Executive view | MISSING | 3–5 KPIs + targets + trends; no dense tables |
| Operations view | MISSING | Volume metrics, queues, exception flagging |
| Staff view | MISSING | Self-service: own records, leave requests, payslips |
| Mobile compact view | MISSING | Bottom nav, 3–5 stacked metrics, card-mode tables |
| Analytics-heavy view | MISSING | Filter canvas, cross-tabs, export |

Blueprint's *"role-aware rendering so users only see what they can access"* has no implementation:
no roles, no permissions, and `Sidebar`'s active item is local `useState` disconnected from any route.

---

## 4. Backend foundation

**0 of 9. This repo has no server code whatsoever** — no API, no database, no ORM, no auth. The only
runtime dependency set is React + Vite + Tailwind + framer-motion + lucide.

| Requirement | Status | Evidence |
| --- | --- | --- |
| Auth + MFA | **MISSING** | 0 hits `auth`/`login`/`session`, 0 `mfa`/`otp`/`totp` |
| RBAC | **MISSING** | 0 hits `rbac`/`permission`/`can(` |
| Audit logs | **MISSING** | 0 hits `audit` |
| API layer | **MISSING** | 0 hits `express`/`fastify`/`nestjs`; no API client, no fetch/axios anywhere |
| File storage | **MISSING** | 0 hits `s3`/`storage`/`upload` |
| Notifications | **MISSING** | 0 hits for any send/push path |
| Search | **MISSING** | 1 `<input>` in the header, **not wired to anything**. No index, no query, no results |
| Reporting engine | **MISSING** | Charts render static fixtures |
| Integration connectors | **MISSING** | 0 hits `webhook`/`websocket` |

Blueprint's *"design the backend as domain modules with clear APIs"* and *"asynchronous where
possible"* are both greenfield. Nothing to preserve, nothing to break — which is the good news.

---

## 5. Saudi-market readiness

**0 of 7.** This is the widest gap relative to effort, because the retrofitting cost is real: the
research in `PLAN.md` §2.6 is explicit that RTL is far cheaper built in than bolted on.

| Requirement | Status | Evidence |
| --- | --- | --- |
| Arabic + English | **MISSING** | `lang="en"`; **0 i18n libraries**; **0 Arabic characters** in source |
| RTL / LTR | **MISSING** | **No `dir` attribute.** And critically: **39 physical directional classes (`pl-`, `pr-`, `ml-`, `mr-`, `left-`, `right-`) vs 0 logical (`ms-`, `me-`, `start-`, `end-`)** — RTL means touching 39 sites, and the sidebar's `left-0` / `-translate-x-full` are load-bearing for the drawer |
| Privacy policy | **MISSING** | no route, no content |
| Terms | **MISSING** | no route, no content |
| Consent / logging | **MISSING** | no consent capture, no logging of any kind |
| Compliance-ready admin controls | **MISSING** | no admin surface (the gear is inert) |
| Regional localisation | **MISSING** | **0 SAR**; amounts render USD; dates use unpinned `toLocaleString()`; no Hijri support; US city fixtures (New York, Austin…) |

**The 39-vs-0 number is the most actionable finding in this document.** Every one of those 39 is a
one-line change *today*, and a cross-cutting bug hunt once ten modules exist.

---

## 6. Geo-fenced attendance tracking

**Nothing exists.** Verified 0 hits for: `geofence`, `latitude`/`longitude`/`coords`, `check-in`/
`check-out`, `navigator.geolocation`, `polygon`/`radius_meters`/`bssid`/`beacon`, and
`mapbox`/`leaflet`/`google-maps`/`maplibre` in both source and `package.json`.

The schema the spec assumes does not exist either. Our closest field is:

```ts
// src/data/hrData.ts — the whole employee model today
export interface Employee {
  id: string; name: string; department: string; location: string;
  gender: 'Male' | 'Female' | 'Other'; status: 'Active' | 'Inactive' | 'On Leave';
  joinDate: string; salary: number; performance: number;
  attendance: number;   // <- a percentage. No timestamp, no coordinates, no device, no raw events
  leaveBalance: number;
}
```

| Spec section | Status | Notes |
| --- | --- | --- |
| 1. Architecture & stack | **MISSING** | No backend to host it. `PLAN.md` §4.1 proposes the data layer but not geo |
| 2. Schema (`Companies`, `Geofences`, `Employees`, `AttendanceLogs`) | **MISSING** | No database at all. `Companies` (tenancy) and `Employees` don't exist as persisted entities |
| 3. API (`/geofences`, `/attendance/check-in`, `/check-out`) | **MISSING** | No API layer |
| 4. Advanced (auto check-in, BSSID, live WebSocket tracking) | **MISSING** | No device APIs, no sockets |
| 5. Mobile UX + permissions | **MISSING** | No mobile app; no permission flow; single `md:` breakpoint is the extent of mobile work |

**Integration rules from the spec — current compliance:**

| Rule | Status |
| --- | --- |
| "No local page-level search bars; global header search only" | **SATISFIED TODAY** — exactly 1 `<input>` and it is in the header. But the global search is unwired, so this rule currently holds only because no module has needed search yet. It will bind hard on Employee/CRM/Projects, and needs real search infrastructure behind it |
| "Do not add top padding to the navigation bar or sidebars" | **SATISFIED** — header is `px-6 py-3.5`, sidebar brand row `h-16` with `pl-7 pr-3`, nav `px-3 py-4`. Nothing to remove; **preserve as-is** |
| "Do NOT delete or rewrite working code; keep layout contexts intact" | **CONFLICT** — see below |
| "Respect the existing shell and design system" | **READY** — tokens, `.surface`, `.tile`, tone system, `Panel`-style cards all exist to build on |

---

## 7. Conflicts requiring your decision

These are places where the blueprint contradicts what's built or planned. I'd rather surface them
than quietly pick.

**C1 — Square corners vs 60 rounded surfaces.** The blueprint specifies square corners; our entire
visual language (documented in `CLAUDE.md`, applied across 11 cards + 7 chart components) is
`rounded-xl` / `rounded-2xl`. Impact is low *if* done in the token layer (`--radius-*` in the
`@theme` block) — that's a one-file change. It becomes expensive if done per-component later.
→ **Do you want square corners repo-wide, or square for enterprise chrome (panels, tables) with soft
radii retained for pills/badges/avatars?**

**C2 — "Keep all existing layout contexts intact" vs `PLAN.md` §3.** The research-driven plan
recommends moving the department table off the overview (dense tables belong on drill-down pages),
replacing 2 of the 8 KPI cards, and re-paletting the green/red chart. All three *rewrite working
layout*. The new instruction says not to. Both can't win.
→ **Which takes precedence — the research recommendations, or strict layout preservation?**

**C3 — Right context panel invalidates the width math.** Adding a third column to the shell changes
available content width, which is the basis of every overflow calculation in `PLAN.md` §1.2 and the
responsive contract in §4.6 (container queries were chosen precisely *because* sidebar width shifts
content width).
→ **Panel width when expanded, and should it push content or overlay it?** That single answer decides
whether we keep container queries or move to a different layout model.

**C4 — Scale mismatch.** The blueprint is a 10-module platform with auth, RBAC, audit, file storage
and integrations. The geo-fence spec assumes a working backend. This repo is a 2,117-line front-end
prototype. Delivering the blueprint means **standing up a real backend**, not extending this app.
→ **Is the expectation (a) extend this repo into the platform, (b) use this repo as the front-end
design system for a separate platform build, or (c) keep this as an interactive prototype and build
the platform elsewhere?**

---

## 8. What is genuinely reusable

Not everything is a gap. These are real assets the platform should inherit rather than rebuild:

| Asset | Why it matters |
| --- | --- |
| **Token layer** (`@theme` in `index.css`) | Colours, shadows, radius and type already sit in one place — which is exactly what makes C1 (square corners), dark mode and high-contrast *cheap* rather than a rewrite |
| **Tone system** (8 tones as CSS vars, `.tile` / `.tone-soft` / `.hairline`) | Theming primitive that a dark/high-contrast theme can re-map without touching components |
| **Shell skeleton** (three-state sidebar, glass header, mobile drawer + scrim) | ~90% of the "core shell" visual work; needs routes and a right panel, not a redesign |
| **7 chart components** | Hand-rolled SVG, prop-driven, no charting library lock-in — portable to any module |
| **Component conventions** | Named exports, local prop interfaces, presentational-only — a clean pattern for the UI kit to formalise |
| **`PLAN.md` §4.1** | The `employees.ts` / `selectors.ts` / `dictionary.ts` design is precisely the "master data model + metric dictionary" the blueprint's *Data architecture* section asks for |

The honest framing: **this is a strong design-system foundation wearing a dashboard.** The blueprint's
own first principle — *"start with one strong core platform, not 10 disconnected apps"* — argues for
promoting it into a shell + component library and putting the ten modules behind it. That is what
`PLAN.md` phases 1–5 were already heading toward; the blueprint mostly widens the scope of phase 6.

---

## 9. Recommended sequencing (if we accept the blueprint as the target)

| Order | Work | Why here |
| --- | --- | --- |
| 1 | **Decide C1–C4** | Each one changes the shape of everything after it |
| 2 | Token layer → square corners, dark, high-contrast, logical CSS properties (39 sites), density modes | Cheapest now, most expensive later; unblocks theming + RTL |
| 3 | Shell v2: routes, right context panel, workspace/role switcher, global search as the only search | The blueprint's "consistent shell" and "stable navigation" |
| 4 | UI kit + all six states (loading/empty/error/filtered-permission-denied/stale) | Stops drift across 10 modules |
| 5 | Backend foundation: identity, RBAC, audit, API, files, notifications, search | Blueprint §4, and a hard prerequisite for §6 |
| 6 | i18n + RTL + locale (SAR, Hijri, phone/address/tax) + policy pages + consent | Blueprint §5 |
| 7 | Modules in blueprint order, piloting one real workflow | Blueprint's own delivery rule |
| 8 | Geo-fenced attendance as a module behind the identity + audit it depends on | Needs items 5 and 7 |

Note that step 5 is a genuine fork in the road: everything before it can be done in this repo, and
everything after it needs a decision about where the platform actually lives (C4).
