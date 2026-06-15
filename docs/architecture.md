# IdeoUI — Architecture & State Specification

This document describes how IdeoUI is structured: the single-source-of-truth
`AppStore`, the backend job/provider model, the persistence (cross-device)
model, the WebSocket reconciliation rules, and the routing-as-projection design.
It is the reference for maintaining the system and adding new features.

> Companion docs: [`engine.md`](engine.md) (provider/TOML engine system),
> [`docker.md`](docker.md) (deployment). This doc focuses on the
> **state/data-flow** architecture.

---

## 1. Goals & invariants

1. **One source of truth.** All persistent UI state lives in the backend; the
   frontend `AppStore` hydrates from it and applies server deltas. There is no
   second copy of authoritative state in component instance props, a separate
   `queueStore`, route flags, or "last settings" snapshots.
2. **Cross-device continuity.** A user can start on one machine, continue on
   another, and come back. Every save writes both a per-browser-tab row and a
   global row; reads return the newer of the two.
3. **Layout is derived, not stored.** Which panels are visible and which tab is
   active is a *pure function* of `{activeItemId, item.status, inspector,
   panels}`. Routing (the URL hash) is a *projection* of state.
4. **Cancellation is per-job.** Provider/engines are shared singletons, so a
   cancel token is threaded through each call rather than stored on the engine.
5. **Optimistic writes reconcile cleanly.** Local edits apply immediately and
   are debounce-patched; the server echo is merged by last-write-wins on
   `updatedAt` — no time-based field locks.

---

## 2. System at a glance

```
                       ┌──────────────────────────────────────────┐
                       │                 Browser                   │
                       │                                          │
                       │  AppRoot (Lit)  ──subscribe──►  AppStore  │
                       │     │  renders children via props    │     │
                       │     │  dispatch(actions)              │     │
                       │     ▼                                 │     │
                       │  control-panel / display-panel /      │     │
                       │  job-queue / editor-sidebar / ...     │     │
                       │                                       │     │
                       │         session.js  ◄──── load/save ──┤     │
                       │         ws-client.js ◄── WS deltas ────┤     │
                       └───────────────┬────────────────────────┴─────┘
                                       │ HTTP (/api/...)   WS (/ws/stream)
                                       ▼
┌──────────────────────────────────────────────────────────────────────┐
│                          FastAPI backend                              │
│                                                                      │
│  routes_jobs   routes_session   routes_system   routes_history        │
│      │              │                │               │                │
│      ▼              ▼                ▼               ▼                │
│  job_runner     SessionState    SystemSetting   GenerationHistory     │
│  (async tasks)  (global+tab)    (hold toggle)    (R2 + DB)            │
│      │                                                                │
│      ▼              cancel_tokens (per-job threading.Event)           │
│  GenericProvider ──► Engine (http | chat) ──► external APIs / R2      │
│                                                                      │
│  ActiveJob (items slice)        Alembic migrations                    │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 3. Frontend state (`src/state/`)

### 3.1 State shape

Defined in `app-store.js` → `initialState()`:

```js
AppState = {
  providers: { schemas, chatProviders, templates },   // loaded once at boot
  settings:  { theme, holdGeneration },
  generator: {                                        // = "last used", persisted
    prompt, magicPrompt, bypassUpsample, isJsonMode,
    selectedTemplate, selectedUpsampler, selectedEndpoint,
    providerParams, advancedMode, cachedUpsampledPrompt,
  },
  items:      ProgressItem[],                         // unified jobs + editor sessions
  selection:  { activeItemId, inspectorHistoryUuid }, // single active item
  panels:     { userLeftTab, userCenterTab },         // optional user overrides
  lightbox:   { hidden, src, prompt, seedLabel, itemId, index, previews },
  editor:     { selectedIndex, pinnedIndex, undoStacks:{}, redoStacks:{} }, // ephemeral
  history:    HistoryItem[],
  session:    { tabUuid },
  view:       'current' | 'history',                  // top-level view
  ui:         { isRefining, apiOnline },              // ephemeral
  toasts:     [...],
}
```

Key points:
- **`items`** unifies generation jobs and editor sessions — they differ only by
  `status`. Each item is normalized to camelCase by `normalizeItem()`
  (`selectors.js`).
- **`generator`** *is* the persisted "last used settings". Every field change
  is debounce-saved to the session row, so "change = saved, even without
  Generate" is free.
- **`editor.undoStacks/redoStacks`** are deliberately ephemeral (in-memory only).

### 3.2 The store API (`app-store.js`)

- `appStore.getState()` / `subscribe(fn)` / `dispatch(action)` — Redux-like.
- Reconciliation: `reconcileItem(raw)` (last-write-wins, see §6).
- Async effects: `loadProviders()`, `loadActiveJobs()`, `createItem(payload)`,
  `patchItem(id, updates, {debounce, fields})`, `updateItem(id, fields, opts)`
  (optimistic local + debounced patch), `removeItem(id)`, `clearCompleted()`,
  `fetchItem(id)`, `showToast(msg, type)`.

### 3.3 Selectors (`selectors.js`) — pure & tested

- `deriveLayout(state)` → `{ leftTab, centerView, showEditorSidebar,
  activeItemId }`. Panels are **derived**,
  never a second source of truth.
- `buildItemTree(items)` — stable tree (sort by `createdAt` asc), parent linkage
  by `uuid`, editor sessions own their generation chain (see §7). Renders with
  uniform depth-based indent.
- `selectActiveItem`, `selectDefaultProviderId`, `selectDefaultUpsamplerId`,
  `normalizeItem`.

`deriveLayout` mapping (`item = selectActiveItem(state)`):

| condition                                   | leftTab    | centerView | sidebar |
|---------------------------------------------|------------|------------|---------|
| no active item (home)                       | generator  | idle       | off     |
| inspector set (no active item)              | generator  | inspector  | on (RO) |
| status pending/upsampling/generating        | progress   | loading    | off     |
| status editing                              | generator  | editor     | on      |
| status completed                            | progress   | images     | off     |
| status held                                 | progress   | held       | off     |
| status failed                               | progress   | failed     | off     |

`panels.userLeftTab` is honored only when consistent with the active item's
status; **switching items clears the override** so the layout always re-derives
cleanly for the newly-selected item.

> Run `node src/state/selectors.test.mjs` to verify the derivation logic.

---

## 4. Boot / hydration order

`AppRoot.firstUpdated()` (`components/app-root.js`):

1. Register `hashchange` listener (navigates from URL → store).
2. `initHistoryApi()` → `loadHistory()` (seeds `state.history`).
3. `appStore.loadProviders()` — fetches `/api/providers/schemas`,
   `/api/providers/chat`, `/api/upsample_templates`; resolves default
   generation provider + default upsampler into `generator`.
4. `appStore.loadActiveJobs()` — `GET /api/jobs/active` → `INITIAL_SYNC`
   (seeds `items`).
5. `connectWs()` — opens `/ws/stream`; server immediately sends `initial_sync`.
6. `loadSession()` — `GET /api/session/state?tab_uuid=<tab>` (backend returns
   the newer of per-tab / global). Restores `generator` (incl.
   `selectedUpsampler`), re-selects the active item, and the route is projected
   from the restored selection.
7. From here the **server is authoritative**; the store applies deltas.

---

## 5. Frontend ↔ backend interactions

### 5.1 HTTP endpoints (frontend → backend)

| Endpoint                        | Method  | Purpose                                         |
|---------------------------------|---------|-------------------------------------------------|
| `/api/providers/schemas`        | GET     | All generation + upsampler provider schemas     |
| `/api/providers/chat`           | GET     | Chat-capable providers                          |
| `/api/upsample_templates`       | GET     | Upsample prompt templates                       |
| `/api/jobs`                     | POST    | Create a job / editor session (`createItem`)    |
| `/api/jobs/active`              | GET     | Active + recent items (bootstrap)               |
| `/api/jobs/{id}`                | GET / PATCH / DELETE | Fetch / edit fields / remove        |
| `/api/jobs/{id}/chat`           | POST    | Editor AI chat (streams via WS)                 |
| `/api/jobs/completed`           | DELETE  | Clear terminal items                            |
| `/api/session/state`            | GET / POST | Per-tab + global session slice               |
| `/api/history`                  | *       | Generation history CRUD (see `routes_history.py`) |
| `/api/history/{id}/previews.zip`| GET     | Preview ZIP for lightbox                        |
| `/api/system/settings`          | GET / POST | `hold_generation` toggle                      |
| `/api/log_error`                | POST    | Reactive JSON repair (see §10)                  |

### 5.2 WebSocket (`/ws/stream`) — backend → frontend

Bridged by `ws-client.js` → store dispatch:

| `event_type`        | Action                                                |
|---------------------|-------------------------------------------------------|
| `initial_sync`      | `INITIAL_SYNC` (merge by `updatedAt`, keep non-terminal) |
| `job_removed`       | `REMOVE_ITEM`                                         |
| `llm_stream`        | accumulate `thinking`/`content` tokens; chat → update last assistant message |
| `generation_progress` | `step` (previews/counter) / `status` → force `generating` |
| `job` / `job_update` / `job_created` / `job_completed` / `job_failed` | `reconcileItem(job)` |

Every reconcile goes through `reconcileItem` (§6), so optimistic edits are
preserved and stale updates are dropped.

### 5.3 Backend → frontend item shape

`job_state.job_to_dict()` returns the canonical camelCase object consumed by
`normalizeItem`. Notable fields: `id`, `uuid`, `parentUuid`,
`editorChainHeadUuid`, `status`, `params` (flattened client-facing params),
`providerParams`, `upsamplerParams`, `chatMessages`, `draftJson`, `images`,
`previewsUrl`, `updatedAt`, `createdAt`.

---

## 6. Reconciliation rules

Implemented in `reconcileInto()` (`app-store.js`):

- Each item carries a server **`updatedAt`** (authoritative timestamp).
- **WS inbound (`reconcileItem`)**: ignore an update strictly older than the
  current item's `updatedAt`. When merging, any field in the store's
  `_pendingFields[itemId]` set is preserved from the local value (an in-flight
  optimistic edit hasn't been echoed yet). This is clean last-write-wins by
  server time — **no 10-second lock window**.
- **Optimistic local write (`updateItem`)**: dispatches `UPDATE_ITEM_FIELDS`
  immediately, marks the fields pending, and debounce-patches (700 ms,
  coalesced). When the PATCH completes, those fields leave `_pendingFields`; the
  server's `job_update` echo then applies (content equal → no flicker).
- **In-flight conflict**: a WS update arriving *between* an optimistic write and
  its echo with a different value wins (its `updatedAt` is newer). Acceptable
  for single-user; the server is authoritative so there is no silent data loss.
- **Reconnect `initial_sync`**: merged by the same rules (never a blind
  replace), so edits made while disconnected survive.

---

## 7. Editor chaining

An **editor session** is an `ActiveJob` row with `status='editing'`. It carries
`editor_chain_head_uuid`, seeded at creation to `parent_uuid` (the history
ancestor).

`editorGenerate` (`controllers/editor-actions.js`):
1. New item's `parent_uuid = editorJob.editorChainHeadUuid` (history ancestor on
   the first generate, the previous result's `uuid` afterwards).
2. Advance `editorChainHeadUuid = result.uuid` and **PATCH the server** so it
   survives reload / device switch.

`buildItemTree` detects an editor's generation chain by walking
`editorChainHeadUuid` → `parentUuid` backwards and attaches it as the editor's
(collapsed) children, detaching those items from the generic forest. This is why
the queue shows editor parents collapsed with a child-status summary and
correct nesting.

---

## 8. Routing as projection

`utils/router.js`:
- `parseRoute(hash)` → route descriptor (pure).
- `selectionToHash(state)` → the hash that *should* represent the current state
  (pure).
- `routeToState(route, state)` → the selection/lightbox/view deltas a parsed
  route implies.

`AppRoot`:
- **State → URL**: `projectRoute()` computes `selectionToHash(state)` and writes
  it only when it differs (guarded by `_projectingHash` to suppress the
  resulting `hashchange`).
- **URL → state**: `handleRouteFromHash()` parses the hash and dispatches the
  implied deltas **idempotently** (skips re-selecting the already-active item).

Because layout is derived and there is a single authoritative hash writer, two
handlers can never compete to set the URL in the same tick. Reuse is one atomic
action (apply settings + clear active item); the panel follows from the derived
layout.

---

## 9. Backend internals

### 9.1 Provider / engine model

- `provider_loader.py` loads TOML provider configs; `providers/__init__.py`
  exposes `get_generation_providers()` / `get_upsampler_providers()` /
  `get_chat_providers()` / `get_default_upsampler_id()` /
  `get_provider_schemas()`. Each returns `{id: GenericProvider(id, config)}`.
- **`GenericProvider.__init__` does `self.engine = ENGINES[engine]()` — one
  engine instance per provider id, shared by all concurrent jobs.** This is why
  cancellation must be per-job via a token, not a method on the engine.
- Engines (`providers/engines/`): `HttpEngine` (diffusion + Ideogram-Magic
  upsample) and `ChatEngine` (LLM upsample/chat/describe). Both accept a
  trailing `cancel_token=None` kwarg and check it in their streaming loops.

### 9.2 Job lifecycle (`job_runner.execute_server_job`)

```
create_job (routes_jobs)
  ├── editing?          → status='editing' (returns immediately, editor session)
  └── else              → status='pending', schedule_job(job_id)
                              │   (hold_generation is NOT applied here — it must
                              │    only gate the generation step, never upsampling)
                              │
execute_server_job(job_id, cancel_token)
  ├── advanced_mode + cached prompt → editing (editor session)
  ├── needs upsampling (magic/json) → status='upsampling'
  │     └── upsampler.upsample_prompt(..., cancel_token) [streaming, token-checked]
  ├── hold_generation (re-check)    → held            ← gates ONLY generation
  └── status='generating'
        └── provider.execute_stream(..., cancel_token) [token-checked]
            └── save_completed_history → status='completed'
```

`hold_generation` parks a job as `held` **after** upsampling completes and
**before** the generation call, so prompt upsampling always runs even while hold
is active. Releasing hold runs `resume_held_jobs()`, which re-schedules held
jobs; on resume their `upsampled_prompt` is already set so upsampling is skipped
and they proceed straight to generation.

### 9.3 Per-job cancellation (`cancellation.py` + `job_runner.py`)

- `cancel_tokens: dict[str, threading.Event]` keyed by `job_id`.
- `schedule_job` creates/clears a token; `execute_server_job` receives it and
  forwards it to every provider call. `get_cancel_token(job_id)` lets
  request-scoped flows (editor chat) share the same token.
- `cancel_job_task(job_id)`: **sets** the token, cancels the asyncio task, pops
  the token. The streaming loop checks `token.is_set()` each iteration →
  `response.close()` + raise `JobCancelled`.
- `execute_server_job` catches `JobCancelled` and `asyncio.CancelledError`
  *without* marking the job failed (the caller — `delete_job` — handles
  cleanup).

### 9.4 Persistence model

- **`ActiveJob`** (table `active_jobs`): the live `items` slice. Non-terminal +
  editing rows never age out of `/api/jobs/active`; terminal rows do after 10
  minutes but persist in history. Per-item editor state (e.g. the chain head)
  lives as columns here so it is shared across devices via the items slice.
- **`SessionState`** (table `session_states`): keyed by `tab_uuid`. The global
  row uses the sentinel `tab_uuid='__global__'`. `POST` upserts both the
  per-tab and the global row with identical payload + `last_updated`;
  `GET ?tab_uuid=X` returns whichever of the two is newer (tie → per-tab).
  No schema change is required to add fields here — `form_state` is a JSON
  column.
- **`GenerationHistory`** (table `generation_history`): immutable completed
  generations + R2 metadata.
- **`SystemSetting`**: key/value (e.g. `hold_generation`).

Schema evolution follows the standard Alembic chain (`backend/migrations/`);
new columns get a new revision whose `down_revision` is the current head.

---

## 10. Frontend component contract

AppRoot is the **only** store subscriber. It reads `deriveLayout(state)` and the
relevant slices, then passes data to children as **props** (children never
import the store directly). This keeps the single-source-of-truth guarantee
while avoiding a rewrite of every component.

| Component       | Reads (props from AppRoot)                              | Emits (events → AppRoot handlers)                          |
|-----------------|---------------------------------------------------------|------------------------------------------------------------|
| `control-panel` | generator slice, `providerSchemas`, `activeLeftTab`, …  | `generate`, `*-change`, `left-tab-change`, `select-job`, … |
| `display-panel` | `editorJob`, `activeTab`, `historyItems`, layout flags  | `reuse-settings`, `open-lightbox`, `editor-*`, `switch-tab`|
| `job-queue`     | `jobQueue`, `selectedJobId` → `buildItemTree`           | `select-job`, `cancel-job`, `clear-completed-jobs`         |
| `editor-sidebar`| active item's `upsampledPrompt`/`chatMessages`          | `update-prompt`, `send-chat`, `element-selected/pinned`    |
| `image-lightbox`| `lightbox` slice                                        | `close`, `reuse`, `reuse-advanced`, `hover-prompt`         |

> Note: `editor-sidebar` keeps a transient `_draft*` input buffer for typing
> smoothness; the authoritative value is the active item's `upsampledPrompt`,
> reconciled by §6.

### Error reporting / reactive JSON repair (unchanged)

`init.js` monkey-patches `JSON.parse` / `Response.prototype.json` to POST parse
failures to `/api/log_error`. `routes_system.log_frontend_error` reactively
repairs invalid JSON in `GenerationHistory`/`ActiveJob` rows (`json_repair`).
This stays as-is.

---

## 11. Design rationale

| Mechanism | Property it guarantees |
|-----------|------------------------|
| Layout is a pure derivation of `{activeItemId, status, inspector, panels}` | Panels can never disagree with the active item — no second source of truth to drift |
| Routing is a projection of state (single hash writer) | Two handlers can never race to set the URL in one tick |
| `editorChainHeadUuid` persisted server-side and advanced on each generate | Editor generation chains survive reload and device switches |
| Last-write-wins reconciliation by `updatedAt` with `_pendingFields` | Local edits apply instantly and never get clobbered by a stale server echo |
| Per-job cancel token threaded through shared engine singletons | Cancelling one job can never disturb another job on the same provider |
| `generator` slice is the persisted "last used" state (saved on every change) | Settings (incl. upsampler) are never silently lost on reload / navigation |
| Upsampler id resolved from provider schemas, never a hard-coded literal | The active provider config is the single source of valid ids |

---

## 12. Guidance for future features

### Add a new generation/upsampler provider
1. Add a TOML config under the provider config dir (see `engine.md`).
2. Nothing else — `load_all_providers` + `get_provider_schemas` expose it; the
   control-panel `<select>` renders from `providerSchemas`; mark `default: true`
   to make it the default. (No frontend change.)

### Add a new job `status`
1. Add it to `deriveLayout`'s switch (`selectors.js`) with a `centerView`.
2. Add a badge in `job-queue.js` if it should appear in the tree.
3. If terminal, add it to the prune filters in `INITIAL_SYNC` /
   `CLEAR_COMPLETED` / `delete_completed_jobs`.

### Add a new persisted UI slice (cross-device)
1. Add the field(s) to `AppState` (`initialState`) and a reducer case.
2. Include them in `session.js` `buildFormState` (save) and `loadSession`
   (restore).
3. No backend migration needed — `form_state` is a JSON column.

### Add a new persistent *per-item* field
1. Add a column to `ActiveJob` (`models.py`) + an Alembic migration
   (`down_revision = '<current head>'`).
2. Expose it in `job_to_dict` (`job_state.py`).
3. Add it to the PATCH allowlist in `routes_jobs.patch_job` if the client edits
   it.
4. Read it through `normalizeItem` (`selectors.js`).

### Add a new top-level view / route
1. Add a branch to `parseRoute` and `routeToState` (`router.js`).
2. Add the corresponding projection in `selectionToHash`.
3. Add a `view` value (or `centerView`) and a `deriveLayout` case if it changes
   panels.

### Make a child component store-aware
Today AppRoot passes store-derived props to children. If a child needs
fine-grained store access, it may `appStore.subscribe(...)` directly — but prefer
keeping AppRoot as the single subscriber so layout derivation stays centralized.

### Adding a new engine
1. Implement it in `providers/engines/` and register in `engines/__init__.py`.
2. Accept `cancel_token=None` on streaming methods and check
   `token_cancelled(token)` inside loops (raise `JobCancelled`). Non-streaming
   blocking calls: best-effort check before/after.

---

## 13. Verification

- `npm run build` (vite) — the de-facto frontend syntax/type gate.
- `node src/state/selectors.test.mjs` — pure-selector assertions.
- Backend import smoke: `uv run python -c "import backend.main"`.
- Alembic: `alembic upgrade head` / `alembic downgrade -1` (also auto-run on
  server startup via `main.py`).

## 14. Known limitations (by design)

- Single-user: simultaneous same-item edits across devices resolve
  last-write-wins by `updatedAt`.
- Editor undo/redo is ephemeral (lost on device switch); the draft itself is
  persisted server-side.
- Non-streaming single-shot provider calls can only be cancelled best-effort
  (a blocking `requests` call can't be interrupted without closing the socket);
  upsampling/generation streams are fully cancellable.
