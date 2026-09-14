<div align="center">
  <img height="150" src="https://media.giphy.com/media/M9gbBd9nbDrOTu1Mqx/giphy.gif"  />
</div>

###

<div align="center">
  <a href="https://linkedin.com/in/alexander-banaag" target="_blank">
    <img src="https://img.shields.io/static/v1?message=LinkedIn&logo=linkedin&label=&color=0077B5&logoColor=white&labelColor=&style=for-the-badge" height="25" alt="linkedin logo"  />
  </a>
  <a href="+971 50 423 4592" target="_blank">
    <img src="https://img.shields.io/static/v1?message=Whatsapp&logo=whatsapp&label=&color=25D366&logoColor=white&labelColor=&style=for-the-badge" height="25" alt="whatsapp logo"  />
  </a>
  <a href="alex.banaag1@gmail.com" target="_blank">
    <img src="https://img.shields.io/static/v1?message=Gmail&logo=gmail&label=&color=D14836&logoColor=white&labelColor=&style=for-the-badge" height="25" alt="gmail logo"  />
  </a>
</div>

###

<div align="center">
  <img src="https://visitor-badge.laobi.icu/badge?page_id=thefappybird.thefappybird&"  />
</div>

###

<h1 align="center">Hello xPin Team!</h1>

###

<h3 align="center">🛠 Language and tools used 🛠</h3>

###

<div align="center">
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg" height="40" alt="react logo"  />
  <img width="12" />
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/tailwindcss/tailwindcss-original-wordmark.svg" height="40" alt="tailwindcss logo"  />
  <img width="12" />
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/sass/sass-original.svg" height="40" alt="sass logo"  />
  <img width="12" />
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/github/github-original.svg" height="40" alt="github logo"  />
  <img width="12" />
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/javascript/javascript-original.svg" height="40" alt="javascript logo"  />
  <img width="12" />
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/typescript/typescript-original.svg" height="40" alt="typescript logo"  />
  <img width="12" />
  <img src="https://devicons.io/devicons/icons/react-query-icon.svg" height="40" alt="typescript logo"  />
  <img width="12" />
  <img src="https://devicons.io/devicons/icons/axios.svg" height="40" alt="typescript logo"  />
</div>

###
# Dynamic Engine — Generative AI Dashboard & Widget Builder

An adaptive workspace that renders real-time, customizable UI widgets from
structured JSON returned by a mock LLM backend.

## Repository structure

```
.
├── client/   React + TypeScript frontend (Vite, Tailwind, shadcn/ui)
└── server/   Express + TypeScript mock LLM API
```

This is an **npm workspaces** monorepo — one install, one dev command, no
`cd`-ing into subfolders required.

## Requirements

- Node.js 20+
- npm 10+

## Setup

From the repository root:

```bash
npm install
```

This installs dependencies for both `client/` and `server/` in one pass.

## Running locally

```bash
npm run dev
```

Runs both apps concurrently:

- **Client** — http://localhost:5173
- **Server** — http://localhost:4000

The client's dev server proxies any `/api/*` request to the backend
(`http://localhost:4000`), so the frontend never needs to know the backend's
port or deal with CORS during development.

## Other root scripts

```bash
npm run build   # production build for both client and server
npm run lint    # lint both workspaces
```

Each workspace also has its own scripts, runnable individually with
`npm run <script> -w client` / `-w server` if you ever need to work on just
one side.

## Architecture

### Dynamic Component Registry

`POST /api/generate-dashboard` returns one `DashboardResponse` — `{ layout,
theme, widgets: Widget[] }` — where each widget is a discriminated union on
`type` (`client/src/types/dashboard.ts`, mirrored exactly in
`server/src/types/dashboard.ts`). Nothing about a widget's shape is hardcoded
outside that union: the UI is a pure function of the schema.

`client/src/lib/widget-registry.ts` maps each `WidgetType` to a
`React.lazy`-loaded component:

```ts
export const widgetRegistry: Record<WidgetType, LazyExoticComponent<...>> = {
  METRIC_CARD: lazy(() => import('.../metric-card-widget')),
  DATA_TABLE: lazy(() => import('.../data-table-widget')),
  DYNAMIC_FORM: lazy(() => import('.../dynamic-form-widget')),
  TEXT_INSIGHT: lazy(() => import('.../text-insight-widget')),
  ACTION_LIST: lazy(() => import('.../action-list-widget')),
  DISTRIBUTION_CHART: lazy(() => import('.../distribution-chart-widget')),
}
```

The render loop (`dashboard-grid.tsx` → `group-band.tsx`) looks up
`widgetRegistry[widget.type]` per entry in the array and falls back to
`UnknownWidgetFallback` for any `type` the registry doesn't recognize — a
malformed or future schema value degrades to one broken tile, not a crashed
page. Every resolved widget is wrapped in one shared `WidgetBoundary`
(`components/dashboard/widget-boundary.tsx`): a `Suspense` boundary sized by a
per-type skeleton (`WidgetSkeleton`, tuned to each archetype's real footprint
to keep Cumulative Layout Shift at zero while a chunk loads) plus a class
error boundary that catches genuine render-time crashes and offers a retry.
This wrapper is applied generically by the registry's render loop — never
copy-pasted per widget type.

### State architecture

- **Server state** (the `generate-dashboard` / `widget-action` requests
  themselves — loading/error/data) lives entirely in TanStack Query
  (`hooks/use-generate-dashboard.ts`, `hooks/use-widget-action.ts`). No
  component hand-rolls its own `fetch` + `useEffect` + `useState`.
- **Client UI state** — the current widget array, drag-and-drop order,
  session history, and the simulated streaming reveal — lives in one Zustand
  store (`stores/dashboard-store.ts`), persisted to `localStorage` so a
  reload restores exactly where you left off. This store deliberately holds
  *only* client-side-only concerns; it never duplicates TanStack Query's own
  fetch-status state.
- **Drag-and-drop reordering** (`@dnd-kit`) and the grid layout preset both
  satisfy the brief's "drag-and-drop **or** configurable grid" requirement —
  this project does both. Reordering is purely client-side: there's no
  persisted per-user dashboard to save a layout back to (each prompt
  generates a fresh one), so it's just array reordering in the store, no API
  round-trip.

### Optimistic-update strategy

Every widget interaction — a checklist toggle, a `DYNAMIC_FORM` submit, a
`DATA_TABLE` page/sort/filter query — goes through the *same* mutation
endpoint (`POST /api/widget-action`, dispatched by a widget-owned `action`
string) and the *same* client-side hook: `hooks/use-widget-action.ts`. That
hook implements the optimistic-update + rollback + toast pattern exactly
once:

1. `onMutate` — if the caller supplied an `optimisticUpdate`, apply it to the
   store immediately (instant feedback), and remember the previous widget.
2. `onError` — roll the store back to the remembered widget and surface a
   `sonner` toast (bottom-right) with the failure reason.
3. `onSuccess` — replace the widget with the server's full response (the
   contract is always a full replace, never a patch) and, optionally, show a
   success toast.

Not every call is optimistic, by design: a checklist toggle and a
`DYNAMIC_FORM` submit predict their own outcome, so they pass
`optimisticUpdate` and feel instant. A `DATA_TABLE` query doesn't — the
contract's own note is that a filtered/sorted/paged result isn't predictable
client-side — so it's called with no `optimisticUpdate`, and the widget shows
a loading skeleton off the hook's `isPending` instead of guessing.

`DYNAMIC_FORM` additionally demonstrates real *dynamic* validation: an
"escalation threshold must be ≥ review threshold" rule that depends on
another field's current value, not a static per-field min/max the controls
already enforce by construction. It's checked client-side (disables Submit,
inline error, immediate feedback) and re-checked server-side as defense in
depth (`server/src/routes/widget-action.ts`) — never trust the client alone.

### Widget catalog

`METRIC_CARD` (KPI + sparkline), `DATA_TABLE` (sortable/filterable,
virtualized via `@tanstack/react-virtual`, numbered pagination), `DYNAMIC_FORM`
(slider/toggle/select parameter controls with cross-field validation),
`TEXT_INSIGHT` (read-only narrative/commentary card), `ACTION_LIST`
(checkable action checklist), `DISTRIBUTION_CHART` (bucketed bar histogram).