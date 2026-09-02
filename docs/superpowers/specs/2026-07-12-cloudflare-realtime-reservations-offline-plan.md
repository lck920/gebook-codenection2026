# Cloudflare realtime, reservations, and offline implementation plan

**Design:** `2026-07-12-cloudflare-realtime-reservations-offline-design.md`  
**Execution rule:** Complete tasks in order; keep each task passing its focused
tests before moving to the next task.

## Phase 1 — Realtime foundation

### Task 1: Define runtime-neutral collaboration contracts

- Add `domain/realtime` event, scope, connection identity, and publisher port.
- Add pure validation for event payloads and revisions.
- Add unit tests for scope normalization and event construction.
- Export only the public contract from `domain/realtime/index.ts`.

### Task 2: Publish changes from trip use cases

- Inject an optional `TripChangePublisher` into `TripService`.
- Publish only after successful repository writes.
- Map each existing command to precise invalidation scopes.
- Include actor id, trip version, event id, and timestamp.
- Test that failed saves never publish and successful saves publish once.

### Task 3: Implement the Cloudflare Durable Object

- Add `infrastructure/realtime/trip-realtime-object.ts`.
- Use Hibernation APIs, signed internal grants, socket attachments, tags,
  presence snapshots, bounded SQLite event history, replay, and resync.
- Reject public business-event publication; accept it only on an internal
  secret-bearing endpoint.
- Add isolated tests with fake Durable Object state/WebSockets.

### Task 4: Add authenticated WebSocket entry routing

- Extend the Worker environment with the Durable Object binding and grant
  secret.
- Handle `/api/trips/:id/realtime` before constructing the per-request SQL app
  when possible, while still resolving Better Auth and trip membership through
  the application service.
- Validate trusted Origin and Upgrade headers.
- Forward a short-lived signed grant to the trip Durable Object.
- Add HTTP tests for 101/401/403/426 and untrusted origins.

### Task 5: Configure and validate deployment

- Add the Durable Object binding and `new_sqlite_classes` migration to
  `wrangler.api.jsonc`.
- Upgrade the compatibility date deliberately.
- Ensure `deploy-api.mjs` preserves bindings/migrations while overlaying vars.
- Add the realtime secret key to examples, sync script, and operations docs.
- Add a config test that inspects the generated deployment shape.

### Task 6: Connect the FSD frontend

- Add `shared/api/realtime` connection, protocol, reconnect, sequence, and
  visibility handling.
- Add an app-level provider that owns network lifecycle.
- Add planner-specific subscription logic that invalidates exact React Query
  keys and performs a full refetch after gaps.
- Replace cosmetic presence with Durable Object presence.
- Add connection/protocol/reconnect and cache-invalidation tests.

## Phase 2 — Reservation bounded context

### Task 7: Create the Reservation aggregate

- Add immutable reservation value types, lifecycle behavior, validation,
  revision checks, and repository port under `domain/reservation`.
- Cover every invariant and status transition with pure tests.

### Task 8: Generate and apply database changes

- Use `make db-migrate-dev` to create the PostgreSQL migration.
- Use `make db-pull && make db-generate` to regenerate the Prisma snapshot and
  client; never edit either generated schema by hand.
- Extend the maintained MySQL schema through its documented generation/apply
  workflow.
- Add repository contract tests for both SQL dialects where supported.

### Task 9: Add reservation application use cases and adapter

- Implement list/create/update/cancel/delete with trip authorization.
- Enforce `If-Match` revisions and idempotency keys.
- Publish realtime reservation changes after commits.
- Wire repository/service/publisher in the composition root.
- Add application tests for authorization, idempotency, and conflicts.

### Task 10: Add the HTTP contract

- Add Zod edge schemas and thin Hono handlers.
- Add reservation DTOs and stable error mappings.
- Add route, DTO, conventions, and error documentation.
- Extend API coverage tests so undocumented routes fail the suite.

### Task 11: Build the reservation planner mode

- Add `entities/reservation` public model API.
- Keep queries, mutations, grouping, forms, and conflict orchestration in
  `pages/travel-planner`.
- Build desktop list/detail and mobile full-height coss Dialog flows.
- Add linked indicators to schedule stops and localized EN/ZH copy.
- Verify coss form/Select/Dialog composition against local skill references.
- Add UI/model tests for all commands, empty/error/loading states, permissions,
  responsive behavior, and conflicts.

## Phase 3 — PWA and offline

### Task 12: Add installable PWA assets and safe caching

- Add manifest, maskable/regular icons, theme metadata, and service worker.
- Precache hashed assets/app shell only.
- Add bounded public image/map caching; explicitly bypass auth, API mutations,
  Agent streams, uploads, and WebSockets.
- Add update-ready UI and production-build assertions.

### Task 13: Add per-user IndexedDB snapshots

- Add a versioned database in `shared/lib/offline` with user/trip partitioning.
- Persist authoritative trip/reservation reads.
- Fall back only on connectivity failures, never HTTP authorization/server
  errors.
- Clear all user-owned local state on logout.
- Add migration, partitioning, stale-label, and cleanup tests.

### Task 14: Add the mutation queue

- Define the supported operation registry and optimistic reducers.
- Queue ordered commands with idempotency keys and base revisions.
- Replay on startup, online, visibility, WebSocket reconnect, and Background
  Sync where available.
- Implement capped retry, pause reasons, and authoritative replacement.
- Add exhaustive queue/replay/duplicate/auth/permission/transient tests.

### Task 15: Add conflict and connectivity UI

- Add one quiet planner status surface above mobile navigation.
- Add the coss conflict Dialog with local/server comparison, discard, and safe
  reapply actions.
- Apply 40 px touch targets, safe areas, tabular counts, reduced motion, exact
  property transitions, and centralized copy.
- Add accessibility and interaction tests.

### Task 16: Complete mobile planner adaptation

- Add bottom navigation for Map/Schedule/Reservations/Budget.
- Preserve mode scroll position and selected entities.
- Convert narrow-screen details/forms to safe-area full-height dialogs.
- Verify map controls and member presence never obscure primary actions.
- Test representative phone/tablet/desktop widths.

## Phase 4 — Completion audit

### Task 17: Update maintained documentation

- Update product scope and remove realtime/PWA non-goals.
- Update backend, API, Cloudflare, frontend, caching, and operations docs.
- Record new environment key names only; never commit production values.

### Task 18: Run proof-oriented verification

- Run focused tests after every task.
- Run `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm ui:check`,
  `pnpm docs:check`, and `pnpm build`.
- Run Wrangler config/build validation.
- Exercise two-client realtime and offline/reconnect browser scenarios.
- Audit every design requirement against code, tests, emitted PWA artifacts,
  and runtime evidence before marking the goal complete.
