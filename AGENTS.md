# Kortex engineering constitution

This file defines the standing engineering rules for this repository. It applies to humans and coding agents across the entire tree. More specific instructions may add constraints, but must not weaken the security, privacy, tenant-isolation, data-integrity, or migration rules below.

## Current foundation

Kortex is an iOS-first React Native application built with TypeScript, Expo, and Expo Router. It uses Supabase for authentication, PostgreSQL persistence, Row Level Security (RLS), RPCs, and Edge Functions. Native speech recognition handles live capture. React Three Fiber, Three.js, and Expo GL render the supplied brain asset. The domain uses unified entities, subtype data, first-class relationships, captures, and provenance.

This is the production foundation. Extend it incrementally. Do not rewrite it in SwiftUI, replace its architecture to land a feature, or bypass established repository, service, and domain boundaries.

## 1. Product principles

- Preserve the core loop: capture, understand, structure, connect, remember, reason, and explore.
- Capture first. Organize automatically. Refine later.
- Keep complexity in Kortex, not in the user's workflow. Never make the user operate a database through forms.
- AI is an input and reasoning layer over structured knowledge; it is never the data model or source of truth.
- The user must be able to inspect, correct, and understand the provenance of AI-created knowledge.
- Treat uncertainty explicitly. Ask, defer, or mark for review rather than inventing facts.
- User data, privacy, durability, and tenant isolation take priority over convenience, visual polish, analytics, or delivery speed.
- Preserve the user's original thought alongside derived structure. Derived summaries must not erase source context.

## 2. Architecture boundaries

Keep the established direction of dependencies:

```text
Expo Router screens and feature components
  -> application state and use-case orchestration
    -> domain interfaces
      -> repository and service adapters
        -> Supabase, Edge Functions, native speech, and local demo storage
```

- Views render state and emit intent. They must not contain Supabase queries, provider calls, SQL-shaped data manipulation, fixture logic, or graph layout algorithms.
- Domain models and service/repository interfaces must remain provider-independent.
- Supabase DTOs, AI provider payloads, native speech events, and Three.js objects must be mapped at their boundaries rather than leaking through the application.
- Preserve the existing repository/service/domain separation. Add a focused boundary or use case when behavior no longer has a clear owner; do not grow a screen or global store into an all-purpose subsystem.
- Preserve unified entity identity and first-class relationships. Domain-specific subtype tables may enrich an entity; they do not replace its stable entity ID.
- Do not replace queryable core fields with a giant JSON object. JSONB is for bounded, validated extension metadata.
- Architecture changes require evidence of a current constraint, alternatives considered, migration impact, and an ADR when the change crosses feature boundaries.
- Prefer the smallest reversible change that fits the architecture. Do not perform opportunistic rewrites or unrelated cleanup.

## 3. React Native and Expo rules

- React Native, Expo, Expo Router, Hermes, and the New Architecture remain the application platform unless an approved architecture decision says otherwise.
- Keep routes focused on navigation and screen composition. Reusable behavior belongs in feature, application, domain, data, or service modules.
- Use native modules where they materially improve iOS behavior, but wrap them behind typed interfaces and provide explicit unavailable/error states.
- Expo configuration and config plugins are authoritative under the current Continuous Native Generation model. Do not rely on manual edits to ignored generated `ios/` or `android/` files.
- Any native configuration change must survive a clean prebuild and native Release build. Review generated entitlements, privacy declarations, permissions, and deployment settings.
- Do not depend on experimental or unstable APIs without isolating them, documenting the reason, and defining a migration path.
- Do not add a dependency for behavior supported adequately by the existing stack or platform. A large/native dependency requires bundle-size, maintenance, license, security, and build-impact justification.
- Keep voice capture and essential navigation usable when 3D, remote data, or a noncritical native module is unavailable.
- Support safe areas, keyboard interaction, real device dimensions, Dynamic Type, VoiceOver, Reduce Motion, and minimum touch targets.

## 4. TypeScript quality rules

- Keep strict TypeScript enabled. Do not weaken compiler or lint rules to make a change pass.
- Avoid `any`, unchecked casts, non-null assertions, and broad index signatures. If an unsafe boundary is unavoidable, isolate it, validate it, and explain it.
- Validate all untrusted runtime data: Supabase rows, JSON/JSONB, deep links, local storage, Edge Function responses, native events, and AI output.
- Use discriminated unions for capture, authentication, network, AI, and rendering state machines. Impossible states should be unrepresentable where practical.
- Use stable UUID generation for durable identifiers. Do not use `Math.random()` for persisted identity or idempotency.
- Keep functions and modules single-purpose. Name domain concepts explicitly; avoid generic `data`, `item`, `manager`, or `utils` abstractions that hide ownership.
- Do not duplicate structured contracts by hand. Prefer a versioned source of truth and generated or shared validators where runtime boundaries permit it.
- Remove dead code only with evidence that it is unused and with build/test coverage appropriate to its native and web impact.

## 5. Supabase and migration rules

- Never rewrite, reorder, rename, or delete an applied migration. All database evolution is forward-only through a new timestamped migration.
- Never reset, seed, or run destructive commands against a linked staging or production database. Use an isolated local or ephemeral project for destructive testing.
- Every schema change must define ownership, RLS, grants, constraints, indexes, data backfill, operational rollout, and rollback/repair strategy.
- Keep core data queryable with UUID keys, timestamps, foreign keys, and appropriate indexes. Validate query plans for scale-sensitive access paths.
- Maintain referential ownership across generic entities, subtype rows, relationship endpoints, captures, tags, timeline events, follow-ups, and AI interpretations.
- Prefer transactional server operations for multi-row domain mutations. Partial graph or capture writes are unacceptable.
- Generate and use Supabase TypeScript types once that workflow is established; until then, map and validate database rows explicitly.
- Do not assume a full knowledge snapshot fits in one API response. All production list, activity, search, and graph-neighborhood APIs must be bounded and paginated.
- Keep local migration history and deployed schema in sync through reviewed deployment procedures. Do not make dashboard-only schema changes.

## 6. RLS and security rules

- RLS is mandatory on every user-owned table. Views must preserve equivalent tenant isolation through appropriate PostgreSQL/Supabase security semantics, such as `security_invoker` with underlying RLS; never disable or bypass those protections or treat client filtering as tenant isolation.
- Derive ownership from the authenticated server context. Do not trust a client-supplied `owner_id`, user ID, entity candidate set, or relationship endpoint without authorization checks.
- Cross-tenant entities and edges must be impossible through policies and database constraints, not merely unlikely in UI code.
- Every new table, RPC, view, storage bucket, and Edge Function must receive explicit least-privilege grants and two-user isolation tests.
- Client code may contain only Supabase public/anonymous credentials. Never expose a service-role key, database credential, AI provider key, signing secret, or private token in the app or any `EXPO_PUBLIC_*` value.
- Edge Functions must authenticate the caller, resolve the current user server-side, validate method/content type/size, enforce authorization, and return content-safe errors.
- Service-role use, if ever necessary in trusted server code, requires narrow scope, explicit review, and server-side authorization. It must never become a shortcut around RLS.
- Do not log transcripts, raw thoughts, entity context, access tokens, provider prompts, or personal knowledge. Log only redacted operational identifiers and safe metrics.
- Add rate limits, quotas, timeouts, retry budgets, and abuse controls to externally callable or cost-bearing operations.
- Security findings may be accepted only with a named owner, rationale, containment, and review date.

## 7. Authentication and privacy

- All persistent remote content must belong to the authenticated account and be protected by RLS. Signing into another account must never reveal prior account data from memory, caches, queues, or disk.
- Store sessions and sensitive pending captures using platform-appropriate protected storage. Plain AsyncStorage is not an acceptable final home for secrets or unencrypted personal capture content.
- Scope local keys and caches by user. Sign-out and account deletion must stop work, clear sensitive in-memory state, and purge that user's local data safely.
- Complete the full account lifecycle: sign-up, confirmation, sign-in, token refresh, password reset completion, sign-out, export, and deletion.
- Request microphone and speech permissions contextually. Denial or revocation must preserve text capture and provide a useful recovery path.
- Do not retain raw audio by default. Any retention requires explicit user choice, a documented purpose, a retention period, deletion controls, and protected storage.
- Minimize what is sent to AI providers. Retrieve only relevant memories, disclose external processing, and honor retention, deletion, and AI-exclusion controls.
- Privacy manifests, App Store disclosures, product copy, and actual Supabase/speech/AI data flows must agree before release.
- Never trade privacy protections for analytics or convenience. Telemetry must be content-safe and opt-in where law or product policy requires it.

## 8. AI safety and structured-output rules

- Treat model output as untrusted input, never as executable instructions or trusted database data.
- Permanent AI/provider secrets and unrestricted database access must never reach the client or model. Provider-supported short-lived ephemeral client credentials are allowed only when required for realtime voice or media connections; they must be minted by an authenticated Kortex server endpoint, be short-lived and least-privilege, and never grant database access.
- Use a strict, versioned structured response contract with bounded counts, lengths, enums, identifier formats, and confidence ranges.
- Validate AI output at three boundaries: provider response on the server, client receipt display, and transactional mutation input. Validation at one boundary does not replace another.
- Expose allowlisted application actions, not SQL, arbitrary table access, or generic mutation tools. Re-authorize every referenced entity under the caller's RLS context.
- Separate proposed creates, proposed updates, existing references, relationships, follow-ups, and clarifications. Never infer an existing entity solely from a name match without resolution policy.
- Preserve provenance: capture ID, source type, user confirmation/correction, provider, model, prompt/schema version, safe request ID, and timestamps.
- Mutations require user confirmation unless an explicitly documented and reversible fast-save policy covers the case. Low-confidence or ambiguous output must remain pending review.
- Treat captured documents, transcripts, and entity text as data that may contain prompt injection. They cannot override system policy, authorization, tool limits, or output schema.
- Never invent a Kortex fact. Answers must distinguish user memory, external knowledge, and inference and cite stable Kortex entity IDs where applicable.
- Provider failure must produce a truthful unavailable/retryable state, never a hidden deterministic production response.

## 9. Capture idempotency and data integrity

- Never silently lose or duplicate a user capture.
- Persist the original capture locally before network processing, with an account-scoped stable UUID and idempotency key. The capture control must acknowledge this durable handoff immediately.
- The capture lifecycle must be explicit and restorable, including pending, processing, ready for review, committing, committed, retryable failure, abandoned, and superseded states as applicable.
- Interpretation retries and commit retries must be safe after timeout, lost response, app termination, or repeated taps. Reusing an idempotency key must return the existing result, not create new entities or relationships.
- Commit confirmed structure atomically. Entity/subtype writes, relationships, follow-ups, timeline events, provenance, and capture status must either succeed together or remain safely retryable.
- Enforce idempotency and uniqueness in the database as well as the client. UI button disabling is not a correctness mechanism.
- Resolve existing entities before creating new ones. Ambiguous matches require confirmation or a draft/review state; silent duplicate creation is not acceptable.
- Manual correction must create accurate provenance and must not silently erase the original capture or previous explicit facts.
- Offline captures must remain recoverable across relaunch and sign-in state changes. Show whether they are stored locally, processing, or synced.
- Test the lost-response, double-submit, concurrent-submit, relaunch, offline-to-online, and partial-failure paths for every capture mutation change.

## 10. Knowledge graph architecture

- Relationships are first-class domain records with stable IDs, typed direction, endpoints, context, confidence, provenance, creation source, and timestamps.
- Keep graph data access, candidate/neighborhood queries, layout calculation, rendering, viewport state, filtering, and selection state separate.
- Never architect the graph around loading all entities and relationships into one client snapshot. Query bounded neighborhoods and expand deliberately.
- Layout must be deterministic or persistently stable enough to preserve spatial context. Rendering changes must not unexpectedly reshuffle unrelated nodes.
- Define relationship taxonomy, inverse/symmetric semantics, and deduplication rules before relying on free-form relationship names.
- Use semantic zoom, culling, batching or appropriate native/off-thread work as scale requires. Avoid repeated full-edge scans and full-tree re-renders during interaction.
- Preserve first- and second-degree context without allowing distant nodes to dominate selection performance.
- The structured list is a first-class accessible representation of the same graph, including direction and relationship context. It is not a fallback to remove later.
- Graph-to-entity and entity-to-graph navigation must preserve selected identity and focus through stable entity IDs.

## 11. 3D performance and asset rules

- The supplied `source/Brain.fbx` is the canonical Kortex asset. Preserve it unchanged. Runtime GLB/USD-derived assets are separate, reproducible, optimized artifacts; do not replace the brain with stock or generated geometry.
- Keep the React Three Fiber scene persistent. Do not rebuild the scene, clone meshes, recreate materials, or allocate transient objects because React or transcription state changed.
- Load 3D assets asynchronously. The application, text capture, voice control, navigation, and error recovery must remain usable while the brain loads or if rendering fails.
- Use measured LOD selection, bounded shader/material cost, explicit resource disposal, and adaptive frame scheduling. Imperceptible idle motion does not justify continuous maximum-rate rendering.
- Touch rotation must use bounded inertia and damping and must not compete with capture gestures or navigation.
- Brain state transitions may update compact renderer parameters; they must not route high-frequency amplitude or frame state through broad React context updates.
- Respect Reduce Motion with a complete, intentionally rendered state. Demand rendering must explicitly invalidate when visible parameters change.
- Profile Release builds on the agreed minimum and target physical iPhones. Simulator FPS and a development counter are not production evidence.
- Record frame time, dropped frames, memory, startup/capture readiness, thermal behavior, and battery impact before and after material 3D changes.

## 12. Performance budgets

These are initial guardrails. Tighten or revise them only through measured product targets and a documented architecture decision.

- Primary capture controls must become interactive within 2 seconds of cold launch and 1 second of warm launch on the agreed minimum supported iPhone, excluding OS permission dialogs. 3D and knowledge hydration are never on this critical path.
- Capture touch feedback and visible listening acknowledgement must begin within 100 ms; native recognizer readiness may complete asynchronously and must have an honest state.
- Normal 3D and graph interaction target 60 FPS on supported devices. Report p50/p95 frame time and dropped-frame ratio; do not describe an experience as "fast" or "smooth" without a Release-device measurement.
- A performance-sensitive change must not regress its agreed p95 duration, memory peak, or dropped-frame ratio by more than 10% without explicit acceptance and rationale.
- Benchmark graph work at 100, 500, and 2,000 entities and at 10,000 relationships. The visible renderer may use bounded neighborhoods/LOD, but queries must remain complete and explicit about pagination.
- Production database requests must be bounded. No unpaginated collection query or hidden API row-cap truncation is acceptable.
- Keep transcription updates from causing full scene, graph, tab, or application re-renders. No capture update may introduce a main/JS-thread stall over 50 ms in the measured critical path.
- Measure application bundle and runtime asset changes. A compressed bundle/asset increase above 250 KB requires a written reason; a new native dependency also requires clean-build and launch measurements.
- Record test device, OS, build type, fixture size, measurement tool, and before/after values with performance claims.

## 13. Testing requirements

- Every behavior change needs tests proportional to its risk and a documented manual check where automation does not yet exist.
- Run `npm run check` for code changes. Do not merge with TypeScript or lint errors.
- Unit-test domain transformations, state machines, schema validators, entity resolution, graph calculations, repository mapping, and retry/idempotency logic.
- Test Supabase migrations from zero in an isolated environment and test upgrades from the previous schema. Never use real user data as fixtures.
- RLS integration tests must use at least two authenticated users and cover every affected table, view, RPC, storage policy, and Edge Function, including negative cross-tenant cases.
- Edge Function tests must cover authentication, method/payload rejection, strict AI validation, authorization of referenced IDs, timeouts, rate limits, provider failure, and content-safe errors.
- Capture tests must cover real text and native speech adapters, restore after relaunch, offline recovery, duplicate prevention, correction, and transactional commit.
- Maintain deterministic AI contract/evaluation fixtures for extraction, ambiguity, existing-entity resolution, relationships, dates, and refusal to invent facts. Fixtures do not replace testing the production adapter boundary.
- Add end-to-end coverage for sign-up/sign-in, capture, confirmation, persistence after relaunch, entity detail, graph focus, Ask Kortex evidence, password reset, sign-out cleanup, export, and deletion as those flows become releasable.
- Test accessibility, Reduce Motion, permission denial, offline, provider outage, Supabase outage, and minimum-size iPhones.
- Performance tests use Release builds and representative production-scale fixtures. Store results where regressions can be compared.
- If required test infrastructure does not exist, state the gap plainly and add it as an intentional scoped change; never substitute a hardcoded demo as proof.

## 14. CI and release expectations

- A releasable branch must pass lockfile-based install, typecheck/lint, automated tests, Expo diagnostics, secret/dependency scanning, iOS export, clean prebuild reproducibility, and native Release build.
- CI must include migration lint/apply tests, RLS isolation tests, and Edge Function type/lint/tests. Edge source must not remain outside quality gates.
- Keep development, staging, and production Supabase environments distinct. Promote reviewed migrations and functions; do not develop directly against production.
- Secrets belong in approved CI, EAS, Supabase, or platform secret stores. Builds must fail closed when required configuration is missing.
- Production builds must embed a JavaScript bundle and must not depend on Metro. Verify install and cold launch on a physical device before release.
- Prevent demo mode, development diagnostics, raw JSON, fixture controls, and verbose logging from entering signed production behavior.
- Rehearse database migrations and Edge Function rollout in staging. Every release needs a rollback/forward-fix plan that does not rewrite applied migrations.
- Release gates include privacy disclosure review, permission copy, accessibility, performance budgets, crash-free launch, account lifecycle, offline capture recovery, and tenant isolation.
- Add content-safe crash/error/performance observability and assign ownership before handling production personal data.
- A clean checkout must be able to reproduce the release without undocumented local state.

## 15. Git and change management

- Inspect branch, status, and relevant history before editing. Preserve user-owned and unrelated working-tree changes.
- Keep each change narrowly scoped. Do not mix feature work with dependency upgrades, schema redesign, generated native churn, or unrelated cleanup.
- Do not commit, push, deploy, merge, tag, or open a pull request unless the task explicitly authorizes it.
- Never use destructive Git commands to discard work without explicit approval and exact target verification.
- Applied migration files are immutable. New schema work receives a new forward-only migration in its own reviewable change.
- Never commit secrets, local environment files, auth sessions, production data, recordings, build products, Pods, or machine-specific state.
- Dependency changes require a reason, alternatives considered, version compatibility, maintenance/security/license review, bundle/build impact, and lockfile review.
- Commit messages and pull requests must state user impact, architecture impact, data/migration impact, security/privacy impact, test evidence, and measured performance impact where relevant.
- Update documentation and ADRs when a public contract, boundary, environment, schema, operational procedure, or permanent engineering rule changes.
- Do not weaken this constitution as a side effect of feature work. Changes to `AGENTS.md` must be deliberate and explicitly reviewed.

## 16. Design quality requirements

- Kortex must feel quiet, precise, alive, personal, spatial, fast, and premium. Product behavior should reveal intelligence without displaying system complexity.
- Do not solve layout problems with generic SaaS cards, repetitive rounded rectangles, template dashboards, decorative pills, meaningless glow, or generic AI/chat UI.
- The 3D Kortex is the richest visual element. Surrounding UI remains restrained, readable, and useful if the asset is absent.
- Use concise product language. Prefer direct states such as "Listening", "Understanding", "Needs review", and "Saved to Kortex" over explanatory paragraphs.
- Voice capture is primary and text capture remains immediately available. Capture-to-receipt should feel like one continuous interaction, not a sequence of forms.
- Receipts present meaningful entities and relationships first. Editing is progressive, and every AI inference remains correctable.
- People, companies, projects, ideas, meetings, and documents share foundations but retain information hierarchy appropriate to their meaning.
- Motion explains state or preserves spatial context. Use a consistent motion and haptic language; avoid decorative loops, delay, excessive bounce, or vibration on every action.
- Design loading, empty, offline, permission-denied, ambiguous, retrying, restored, save-failed, and no-connection states as first-class product states.
- Review at real iPhone sizes with keyboard, safe areas, Dynamic Type, VoiceOver, Reduce Motion, contrast, and at least 44-point touch targets.

## 17. Demo and hardcoded-behavior isolation

- Demo mode must be explicit, development-only, and selected through the service/repository abstraction. It must never activate silently because production services fail.
- Demo entities, utterances, timestamps, AI interpretations, transcription, delays, or relationship results must not be imported into production screens or adapters.
- Views never contain fixtures. Deterministic data belongs in isolated fixture builders, mock repositories, tests, previews, or the explicit demo service.
- Production speech must use actual user input. Production AI must process the submitted capture or return a truthful unavailable/offline state.
- Development diagnostics, raw JSON, confidence internals, provider state, and technical IDs must be gated from production bundles and normal UI.
- Seed and verification scripts must target isolated environments, be repeatable, avoid global row-count assumptions, and clean up after themselves.
- Add a production-build safeguard that rejects demo configuration and fixture reachability before release.
- Never present hardcoded visual signals as evidence that real entities or relationships were discovered.

## 18. Definition of Done

A change is done only when all applicable statements are true:

- It satisfies the real user journey with authenticated, user-owned data; it is not merely a staged fixture path.
- It preserves architecture boundaries and does not introduce an unapproved rewrite or unjustified dependency.
- Structured and untrusted inputs are validated at the correct boundaries, and errors are content-safe.
- RLS, authorization, provenance, capture idempotency, atomicity, and cross-user isolation are tested for affected data paths.
- The user cannot silently lose or duplicate a capture across retry, lost response, offline use, repeated taps, or relaunch.
- Loading, empty, offline, denied, ambiguous, failure, retry, restore, and success states are handled where applicable.
- Typecheck, lint, relevant unit/integration/E2E tests, migration checks, Edge checks, and Release build checks pass.
- Performance is measured on representative data and physical target hardware, remains within the budgets above, and includes recorded evidence.
- VoiceOver, Dynamic Type, Reduce Motion, contrast, touch targets, keyboard, and real-device layouts are verified where UI changed.
- Privacy, retention, local cleanup, logs, permissions, secrets, and external AI data exposure have been reviewed.
- Database changes are forward-only, deployable, rehearsed, and accompanied by an operational rollback/forward-fix plan.
- Demo behavior and diagnostics cannot leak into production behavior.
- Documentation, generated contracts/types, and ADRs are updated when their source of truth changed.
- The final diff is scoped, contains no secrets or unrelated changes, and clearly reports tests, limitations, and any accepted risk.

If any applicable item is not met, report the work as incomplete or explicitly blocked. A screen that looks finished, a passing demo fixture, or the phrase "works on my machine" is not Definition of Done.
