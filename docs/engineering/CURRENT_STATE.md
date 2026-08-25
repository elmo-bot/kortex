# Kortex current engineering state

Audit date: 2026-08-25

Repository: `https://github.com/elmo-bot/kortex.git`

Audited commit: `003f3331e2679f4c179cec2ab8c9537459910da6` (`Initial Kortex mobile app`)

Audited branch: `chore/engineering-foundation`

## How to read this document

- **FACT** means the statement was verified from a tracked repository file, Git metadata, a local build/check, or a read-only query to the linked Supabase project. The source of the fact is named where useful.
- **RECOMMENDATION** means a proposed production step. Recommendations are not descriptions of current behavior.
- **NOT VERIFIED** means the repository and available read-only checks did not provide enough evidence. No conclusion is inferred from missing evidence.

No application code, dependency, database object, or remote service was changed during this audit. This document is the only repository change.

## Executive assessment

**FACT:** The repository is a coherent, buildable React Native/Expo proof-of-product with a real Supabase schema, authenticated data path, live native speech recognition, a structured capture contract, explicit graph relationships, and the supplied 3D brain asset. It is not a SwiftUI application and it is not merely a web application wrapped for iOS.

**FACT:** It is not production-ready today. The highest-impact blockers found are:

1. The linked Supabase project has no `OPENAI_*` Edge Function secrets, so deployed AI endpoints currently return an unavailable response.
2. Data loading is whole-snapshot/client-side and will silently stop at the Supabase API row cap; it cannot represent the stated 2,000-contact/10,000-relationship target.
3. Capture commit is not idempotent. Repeating a commit for one capture can create duplicate entities and interpretations.
4. Authentication tokens and pending raw captures are stored in unencrypted AsyncStorage, and the app has no complete data-retention/account-deletion/privacy lifecycle.
5. Password-reset initiation exists, but there is no reset-completion screen that lets the user set a new password.
6. There is no CI/CD, automated UI/integration/Edge Function test suite, crash reporting, production telemetry, release configuration, or environment promotion strategy in the repository.
7. The iOS folder is generated and Git-ignored. This is valid Expo CNG practice only if prebuild/release reproducibility is enforced in CI; no such enforcement currently exists.

**RECOMMENDATION:** Treat the present code as the production foundation, not as production-complete software. Stabilize data integrity, privacy, auth lifecycle, server boundaries, and automated delivery before expanding product scope.

## Audit evidence and limits

### Verified checks

**FACT:** The following checks passed during this audit:

- `npm run check` (strict TypeScript plus Expo ESLint)
- `npm run verify:demo`
- `npx expo-doctor` (`21/21` checks)
- `npx expo export --platform ios` (Hermes bundle produced; 1,918 modules, approximately 6.7 MB bytecode, 25 assets)
- Native Xcode Release build for a generic iOS Simulator destination with an embedded `main.jsbundle`
- `supabase db lint --linked --level warning` (no `public` or `extensions` schema errors)
- `supabase migration list --linked` (local and remote both report migration `202608240001`)

**FACT:** `npm audit --omit=dev` reports 11 moderate findings through `uuid <11.1.1`, reached through Expo's transitive `xcode`/config tooling. Its proposed forced fix would install a breaking, older Expo version. No dependency was changed during this audit.

### Repository and Git baseline

**FACT:** Git contains one commit and one branch. Remote `HEAD` points to `chore/engineering-foundation`; there is no `main` branch, tag, or additional history visible in the repository. The working tree was clean before this document was created.

**FACT:** The commit tracks 99 files totaling approximately 28.81 MiB. The largest intentional tracked payloads are the original FBX (approximately 11.3 MB), its source archive (approximately 11.3 MB), and two optimized GLBs (approximately 4.2 MB combined).

**FACT:** Generated/local directories are present but ignored: `ios/`, `.expo/`, `dist-ios/`, `node_modules/`, and `supabase/.temp/`. The local workspace occupied approximately 1.5 GB during the audit; the generated `ios/` directory alone occupied approximately 630 MB, mostly Pods/build products.

### Not verified

The following are **NOT VERIFIED** because the evidence is not present in the repository or exposed by the read-only checks used:

- Apple Sign in provider credentials and production readiness in the Supabase dashboard
- Email deliverability, custom SMTP, production email templates, and domain reputation
- Supabase backup/PITR settings, log drains, spending limits, database connection limits, and production plan
- App Store Connect setup, distribution signing, provisioning, TestFlight, privacy labels, and review status
- OpenAI organization data controls, retention settings, quotas, or contractual/privacy configuration
- Real-device 3D frame rate, thermal behavior, battery use, and speech behavior across supported iPhones/locales
- Production behavior on Android or web
- Deployed Edge Function source equivalence to the tracked source; the CLI confirms active functions and versions, not a source checksum
- Existing production data quality or row counts; user data was deliberately not inspected

# 1. Current architecture

## Verified facts

### Application shape

**FACT:** The tracked application is TypeScript/React Native using Expo Router. `app.json` and `package.json` are the authoritative source; `ios/` and `android/` are ignored generated outputs. The local generated iOS workspace contains a Swift `ExpoAppDelegate`, React Native New Architecture, Hermes, and Expo autolinking.

**FACT:** The runtime flow is:

```text
Expo Router screens
  -> KortexProvider / KortexStore
    -> KnowledgeRepository + AIService interfaces
      -> SupabaseRepository + RemoteAIService (normal mode)
      -> LocalDemoRepository + DemoAIService (explicit demo mode)
        -> Supabase tables/RPC + authenticated Edge Functions
```

**FACT:** `EXPO_PUBLIC_KORTEX_MODE=demo` is the only condition that selects deterministic demo services. All other values select the Supabase adapters. `AuthGate` separately refuses to show the product when Supabase mode is selected without a public URL/key.

**FACT:** `KortexStore` owns one in-memory `KnowledgeSnapshot` containing entities, relationships, timeline events, and captures. It also owns capture orchestration and an AsyncStorage-backed pending queue. It loads once when the provider mounts and reloads after an entity update; it does not subscribe to Realtime, refresh on foreground, paginate, or continuously reconcile remote changes.

**FACT:** The primary routes are four native tabs (`Kortex`, `Brain`, `Connections`, `Activity`) plus entity detail, Ask Kortex, settings, and a development-only debug surface. Tabs use `expo-router/unstable-native-tabs`.

### Native versus web

**FACT:** This is a React Native application with native modules, not a SwiftUI application. iOS uses generated Swift/Objective-C native integration for Expo, speech recognition, Apple authentication, GL rendering, gestures, and haptics.

**FACT:** A web target is declared (`web.output = static`) and React DOM/React Native Web are installed. No web-specific fallback was found for the iOS-oriented symbols, speech, native tabs, or 3D interaction, and no web build/test was run as part of the repository scripts.

**FACT:** The local generated iOS configuration has bundle identifier `ai.kortex.mobile`, deployment target iOS 16.4, Hermes, React Native New Architecture, Apple Sign in entitlement, microphone/speech usage descriptions, dark appearance, and portrait orientation. `CADisableMinimumFrameDurationOnPhone` is enabled.

### Architectural boundaries

**FACT:** Domain interfaces are provider-independent and use UUID-shaped string identifiers. AI interpretation is represented by a structured `CaptureInterpretation`, client-validated with Zod before display or persistence.

**FACT:** Relationships are first-class rows and reference the unified `entities` table. Domain subtype tables exist for contacts, companies, ideas, projects, meetings, and documents.

**FACT:** The client directly reads and updates Supabase tables under RLS. Confirmed AI output is persisted through the `commit_capture` SQL RPC. Therefore the RPC is a preferred write path, but not an exclusive write boundary: authenticated clients have owner-scoped `FOR ALL` policies on the tables.

## Recommendations

**RECOMMENDATION:** Retain the repository/service separation, unified entity identity, subtype tables, and controlled capture receipt flow. Evolve the snapshot repository into paged/query-specific repositories rather than replacing the architecture.

**RECOMMENDATION:** Decide explicitly whether Expo CNG remains authoritative. If yes, make `expo prebuild --clean` reproducibility a CI check and keep native customizations in config plugins. If native files become hand-maintained, track them and stop treating them as disposable generated output.

# 2. Current technology stack

## Verified facts

| Area | Current technology | Verified version/configuration |
|---|---|---|
| Language | TypeScript | 6.0.3, strict mode |
| UI runtime | React / React Native | React 19.2.3, React Native 0.86.2 |
| Application framework | Expo | SDK/package 57.0.16 installed; CLI 57.0.18 |
| Navigation | Expo Router | 57.0.16; file routes and unstable native tabs |
| JS engine | Hermes | enabled in generated iOS project |
| Native architecture | React Native New Architecture | enabled in generated iOS `Info.plist` |
| State | React context/hooks | one `KortexProvider`; no external state library |
| Database/auth/functions | Supabase | JS 2.109.0; CLI 2.72.7 locally |
| Validation | Zod | 4.4.3 for client AI responses |
| Local persistence | AsyncStorage | 2.2.0 |
| Voice | `expo-speech-recognition` | 56.0.1; native live recognition |
| 3D | Three.js + React Three Fiber + Expo GL | Three 0.185.1, R3F 9.7.0, Expo GL 57.0.2 |
| Graph | React Native SVG + Gesture Handler + Reanimated | SVG 15.15.4, gestures 2.32.0, Reanimated 4.5.1 |
| Authentication | Supabase email/password, optional Apple identity token | PKCE, persisted session |
| Server AI | OpenAI Responses API and transcription API | Edge Function defaults: `gpt-5-mini`, `gpt-4o-mini-transcribe` |
| Database search | PostgreSQL `tsvector`, pgvector schema | indexes exist; neither path is used by the app |
| Build | Expo prebuild + CocoaPods + Xcode | local Xcode 26.6; generated iOS target 16.4 |

**FACT:** `package-lock.json` lockfile version 3 is tracked.

**FACT:** React Compiler is enabled as an Expo experiment. The generated Podfile enables React Native Screens gamma/Fabric behavior, and the app imports Expo Router's unstable native tabs.

**FACT:** Metro globally disables package `exports` resolution to avoid loading duplicate Three.js runtimes. This is a project-wide compatibility switch, not a Three-only alias.

**FACT:** Direct dependencies with no tracked source import were found: `@expo/ui`, `expo-blur`, `expo-constants`, `expo-font`, `expo-glass-effect`, `expo-image`, `expo-linear-gradient`, and `expo-web-browser`. Some may be transitive/runtime requirements, but the repository does not document such a reason. `react-dom` and `react-native-web` are only relevant to the declared web target. `expo-asset` is referenced by app configuration but not application code.

## Recommendations

**RECOMMENDATION:** Establish a supported-version policy and verify experimental APIs before each release. In particular, isolate or replace `unstable-native-tabs`, Screens gamma behavior, React Compiler experiments, and the global Metro package-exports workaround when stable alternatives are available.

**RECOMMENDATION:** After ownership is established, remove only dependencies proven unnecessary by native and web builds. This audit did not remove any dependency.

# 3. What is implemented

## Verified facts

### Authentication and account entry

- Email/password account creation and sign-in call Supabase Auth.
- Email confirmation uses a `kortex://auth/callback` PKCE redirect and code exchange.
- Password-reset email initiation exists.
- Apple identity-token sign-in code exists but the button is gated by `EXPO_PUBLIC_APPLE_AUTH_ENABLED=true`.
- Sessions persist in AsyncStorage and refresh automatically.
- A short first-launch screen is persisted locally.
- Signing out is available from settings.

### Capture and structured intelligence

- Text capture accepts up to 4,000 characters in the UI.
- Voice capture uses native speech recognition with interim text, punctuation, locale selection, volume events, permission handling, and `recordingOptions.persist=false`.
- The brain exposes `idle`, `listening`, `understanding`, `connecting`, and `complete` UI states.
- A pending local capture is written before the app creates the Supabase capture or calls AI.
- Remote capture interpretation sends the raw thought plus up to 250 in-memory known entities to an authenticated Edge Function.
- AI output has strict client-side limits for entity counts, relationships, strings, UUIDs, confidence values, and relationship naming.
- The capture receipt displays entities, relationships, follow-ups, clarifications, and progressive editing of proposed non-reference names.
- User confirmation calls `commit_capture`, then reloads the snapshot and navigates to the primary entity.

### Structured knowledge and graph

- Six entity types exist in client and database models: contact, company, idea, project, meeting, and document.
- The Brain view provides local text/tag/field search, type filters, and a virtualized entity list.
- Entity detail shows type-specific headings, summary, first five related entities, generic knowledge fields, related timeline events, and name/summary editing.
- Activity groups timeline events and shows locally pending failed captures plus rows marked for review.
- Connections supports pan, pinch zoom, search filtering, first-/second-degree emphasis, selection history, entity focus, an inspector, Ask Kortex, and a structured list alternative.
- Contextual Ask Kortex calls an authenticated read-only Edge Function and client-validates answer references and provenance labels.

### 3D asset and rendering

- The supplied `source/Brain.fbx` is preserved and byte-identical to the FBX inside `brain-hologram.zip` (SHA-256 `f25e0b1a...b68285b`).
- `kortex-brain.glb` contains 2 meshes/primitives, 2 materials, 110,000 uploaded vertices, and 180,000 triangles; it is approximately 2.7 MB.
- `kortex-brain-low.glb` contains 2 meshes/primitives, 2 materials, 64,000 uploaded vertices, and 88,000 triangles; it is approximately 1.5 MB.
- Both GLBs use quantized geometry, contain no textures or animation clips, and are loaded asynchronously.
- Runtime rendering clones the loaded scene once per selected asset, replaces mesh materials, and mutates transforms/material energy in the render loop without reconstructing React state each frame.
- The model supports drag, inertia, damping, state energy, amplitude response, a complete pulse, a lower LOD heuristic, reduced-motion behavior, error fallback, and a development FPS counter.

### Data protection already present

- No secret-shaped OpenAI key, Supabase secret key, JWT, or private key was found in tracked files by the audit scan.
- The client environment contains only `EXPO_PUBLIC_*` values; `.env.local` is ignored.
- Edge Functions use the caller's Authorization header and anon key, call `auth.getUser()`, and do not use service-role credentials in source.
- Every user-owned table in the migration has RLS enabled and an `auth.uid()` owner policy.
- Cross-entity foreign keys include `owner_id`, preventing relationships between entities owned by different users.

# 4. What is mocked or hardcoded

## Verified facts

### Explicit development/demo code

- `src/data/demoSeed.ts` contains nine fixed entities, seven relationships, and three activity records, including Monitora, Ahmed Hassan, Mahmoud Al Mokdad, and Kortex.
- `src/services/ai/DemoAIService.ts` is a deterministic keyword parser with fixed Sarah, North Studio, Mahmoud, and Meeting Intelligence responses and an artificial 1.05-second delay.
- `src/data/demoJourneys.ts` contains fixed Sarah and idea utterances.
- `LocalDemoRepository` persists these fixtures in AsyncStorage.
- Demo mode is opt-in through `EXPO_PUBLIC_KORTEX_MODE=demo`; no production view directly imports demo entities.

### Hardcoded or simulated product behavior

- `DemoTranscriptionService` always returns the Sarah fixture. It is not connected to the active capture flow.
- The three visual nodes shown during the 3D `connecting` state are fixed coordinates and colors; they are not derived from the interpreted entities or relationships.
- Voice recognition has fixed contextual terms `Kortex` and `Monitora`.
- Edge Function prompts, allowed attribute keys, provider endpoints, and fallback model names are hardcoded in function source.
- All visible application copy is hardcoded English; no localization catalog exists.
- Demo timestamps are fixed around August 2026.
- The graph layout is a deterministic concentric/radial formula, not a force simulation or persisted user layout.
- AI interpretation records store provider/model as the literals `openai_or_demo` and `validated`, not the provider and model actually used.

## Recommendations

**RECOMMENDATION:** Keep deterministic fixtures as test fixtures, but prevent demo mode from being enabled in signed production builds and move demo-only transcription files out of the production dependency graph.

**RECOMMENDATION:** Make connection-state visuals data-driven only after measuring the cost; the current fixed signals should be documented as a visual state effect, not represented as a true graph rendering.

# 5. What is missing

## Verified facts

### Production-blocking behavior

- The linked Supabase project has no `OPENAI_API_KEY`, `OPENAI_MODEL`, or `OPENAI_TRANSCRIBE_MODEL` secret. Only Supabase-provided secrets were listed. All three AI-related functions are active, but their source explicitly returns 503 when `OPENAI_API_KEY` is absent.
- Password reset sends an email but there is no route/UI that calls `auth.updateUser()` with a new password after the reset link is exchanged.
- There is no account deletion, data export, transcript/capture deletion, retention control, or local queue purge on sign-out.
- There is no persistent UI for a previously interpreted-but-unconfirmed receipt. Dismissing a receipt or terminating the app can leave a ready capture plus a local queue item; retry reinterprets instead of restoring the receipt.
- There is no idempotency guard that marks a capture as already committed before creating entities.
- There is no server-side rate limit, per-user quota, provider timeout, retry budget, or cost accounting for Edge Function AI calls.

### Product/data capability gaps

- Entity resolution is prompt-based over at most 250 recent client-loaded entities. There is no database fuzzy match, semantic candidate retrieval, merge workflow, or canonical identity service.
- Search is a local substring scan. PostgreSQL full-text and pgvector indexes are not called by the client or Edge Functions, and no embeddings are generated.
- `follow_ups`, normalized tags, subtype tables, AI interpretations, captures, meeting decisions/action points, and document storage are not exposed through complete product workflows.
- `followUps[].relatedEntityId` is accepted by the client contract but ignored by `commit_capture`.
- Needs-review items can be opened, but there is no clarification answer/resolve/dismiss state transition.
- Entity editing only changes display name and summary. There is no editing of fields, tags, relationships, provenance, subtype fields, or deletion.
- Manual creation flows, relationship editing, merge/duplicate resolution, and undo/audit restore are absent.
- The store has no server refresh on foreground, pull-to-refresh, Realtime subscription, conflict handling, or optimistic concurrency/version check.

### Engineering/release gaps

- There is no `.github/`, CI workflow, EAS configuration, Fastlane setup, release channel configuration, staging environment, production environment map, or deployment approval workflow.
- There is no Jest/Vitest setup, React component test, native test, Edge Function test, migration test in CI, end-to-end test, accessibility automation, screenshot test, load test, or performance baseline.
- There is no crash reporting, performance monitoring, structured product telemetry, alerting, or support diagnostics pipeline.
- Edge Function source is excluded from both TypeScript and ESLint checks.
- Supabase-generated TypeScript database types are absent; database rows are manually mapped from untyped values.
- The only Git history is one initial commit. There is no protected/default production branch or release tag visible.
- There is no documented dependency update policy, threat model, incident response plan, data classification, privacy policy, or architecture decision record process.

## Recommendations

**RECOMMENDATION:** Do not add more entity types or major UI surfaces until the capture lifecycle, auth lifecycle, data ownership/privacy lifecycle, and production delivery pipeline are complete and tested.

# 6. Technical debt

## Verified facts

### High priority

1. **Non-idempotent commits.** `commit_capture` accepts a capture regardless of current status and inserts a new `ai_interpretations` row and any proposed create entities on every call. A retry after a lost response can duplicate entities.
2. **Client/server schema duplication.** The Zod schema, Edge Function JSON schema, and SQL validation are separate hand-maintained contracts. They do not enforce identical constraints. The Edge Function parses provider JSON but does not validate the parsed output against an independent runtime schema before returning it; SQL only validates selected structural properties and relies on casts/check constraints for the rest.
3. **Repository/subtype divergence.** The app loads only `entities` and ignores subtype tables. `commit_capture` partially writes subtype fields, while general UI reads generic `knowledge_fields`. These representations can drift.
4. **Tag divergence.** `tags` and `entity_tags` exist but current code writes only `entities.tags_cache`. Updates replace the cache with newly proposed tags instead of preserving existing tags. The local demo adapter merges tags, so local and Supabase behavior differ.
5. **Knowledge field duplication.** SQL updates append `knowledge_fields || v_fields`; repeated updates can produce duplicate keys. The local adapter replaces fields with matching keys, so adapter behavior differs.
6. **Direct owner CRUD.** Every table policy is `FOR ALL`. The client can bypass `commit_capture` for its own rows, making the claim that the RPC is the controlled persistence boundary an integrity convention rather than an enforced database boundary.
7. **Capture lifecycle gaps.** `failed` exists as a database status but is not set by the client. Dismissed/abandoned/expired capture states do not exist. Local and remote state can become orphaned.

### Medium priority

- `KortexStore` owns loading, local search, graph helpers, capture orchestration, retry state, and mutations in one context. Any snapshot change recreates helper closures and updates all consumers.
- `makeId()` uses `Math.random()` rather than a platform cryptographic UUID generator.
- Entity edit state is initialized before asynchronous entity availability and is not synchronized when the entity later loads. A direct deep link followed by edit can hold empty initial edit state.
- Entity updates have no visible save failure handling.
- Timed brain transitions use an unmanaged `setTimeout`; it is not cancelled on unmount or a newer capture.
- The 3D error boundary intentionally discards error details, while no production error reporter exists.
- The global Metro `unstable_enablePackageExports=false` workaround affects every dependency.
- `supabase/config.toml` declares project id `kortex`, while the linked remote identity exists only in ignored local Supabase state. Environment ownership is not explicit in tracked configuration.
- The initial migration combines the entire schema, policies, triggers, indexes, and a large RPC in one 227-line migration. There is no migration test history beyond the initial state.
- The migration stores inaccurate interpretation provider/model metadata.
- Relationship type is free-form snake_case with no taxonomy, inverse/symmetric semantics, or uniqueness normalization for reversed symmetric edges.
- Database constraints do not enforce that a `contacts` row points to an `entities` row whose `entity_type` is `contact` (the same applies to other subtype tables).

### Dead or duplicate code/assets

**FACT:** `TranscriptionService`, `DemoTranscriptionService`, and `RemoteTranscriptionService` have no consumers. The deployed `transcribe-capture` function is also not used by the active native speech flow.

**FACT:** `meetingIntelligenceDemoCapture` is not consumed. `sarahDemoCapture` is only consumed by the unused demo transcription service.

**FACT:** Several default Expo starter assets are tracked but not referenced by `app.json` or source: Expo badges/logo, React logos, tutorial image, and old tab icons. The audit did not delete them.

**FACT:** Multiple direct dependencies have no source import, as listed in section 2. The native build output confirms that at least `@expo/ui` is still compiled, adding build time and third-party warnings despite no tracked UI usage.

**FACT:** The original FBX and source archive intentionally duplicate approximately 11.3 MB. This is provenance, not necessarily dead data, but Git LFS or external artifact policy is not configured.

## Recommendations

**RECOMMENDATION:** Fix data-integrity differences before feature development. Make capture commits idempotent, generate/share one contract, align local and remote adapter semantics, and define one source of truth for subtype fields and tags.

**RECOMMENDATION:** Remove dead code/dependencies/assets only in a dedicated, independently build-verified change after this audit is approved.

# 7. Security risks

## Verified protections

- All user-owned tables enable RLS and compare owner identity with `auth.uid()`.
- Composite foreign keys prevent cross-owner graph edges and subtype references.
- Edge Functions require JWT verification in `config.toml` and also resolve the user with `auth.getUser()`.
- `ask-kortex` reads with the user's JWT and filters model-returned entity IDs against the set returned by RLS-protected queries.
- `commit_capture` is `SECURITY INVOKER`, verifies ownership of capture/existing entities/endpoints, and runs transactionally.
- No service-role/provider secret is present in client source or tracked environment files.
- Provider error logs contain request ID/stage/status, not raw transcript or memory content.
- Raw audio persistence is disabled in the active speech implementation.

## Verified risks

| Severity | Risk | Repository evidence / impact |
|---|---|---|
| High | Sensitive local data is not encrypted at rest by the app | Supabase auth session/refresh data and pending raw thoughts use AsyncStorage. Pending items remain across sign-out and have no retention purge. Device OS protections still apply, but app-level secure storage/encryption is absent. |
| High | Broad personal context is sent to an external AI provider | Interpretation sends the raw capture and up to 250 entity summaries/tags; Ask sends up to 500 entities and 1,500 relationships. There is no consent/versioned privacy notice, redaction layer, data-classification filter, or per-memory AI exclusion in code. |
| High | AI endpoints have no abuse/cost controls | Any authenticated user can invoke interpretation, Ask, or transcription repeatedly. There is no rate limit, quota, maximum requests per capture, timeout, or spend guard in source. |
| Medium | Database write integrity is client-controllable | Owner-scoped `FOR ALL` policies permit authenticated clients to write their own tables directly and submit arbitrary JSON to `commit_capture`. This does not cross tenant boundaries, but it permits forged provenance and bypasses intended validation. |
| Medium | Privacy manifest/data-disclosure mismatch risk | Generated iOS `PrivacyInfo.xcprivacy` declares no collected data types, while the product sends account identifiers, user content/transcripts, and knowledge to Supabase and potentially OpenAI. App Store privacy labels are not present in the repository. |
| Medium | Incomplete account lifecycle | No account deletion, local wipe, data export, retention configuration, or completed password-reset flow exists. |
| Medium | Client-supplied entity-resolution context | `interpret-capture` trusts the caller's `knownEntities` payload instead of querying RLS-protected candidates server-side. SQL ownership checks prevent foreign-ID commits, but prompt integrity and cost can still be manipulated. |
| Medium | Wildcard CORS and incomplete method enforcement | Functions return `Access-Control-Allow-Origin: *` and do not explicitly reject unsupported HTTP methods. JWT protects data, but the browser invocation surface is broader than necessary. |
| Low/Medium | Raw backend errors may reach auth UI | Unrecognized Supabase Auth messages are returned directly by `readableAuthError`, potentially exposing provider wording or operational details. |
| Low/Medium | No automated security gate | There is no secret scanning, dependency audit job, SAST, RLS regression CI, or migration policy in Git. |

**FACT:** `npm audit --omit=dev` currently reports moderate transitive findings in Expo build tooling. The report does not demonstrate an exploitable mobile runtime path, but it must be tracked rather than ignored.

## Recommendations

1. **RECOMMENDATION:** Move auth tokens to an iOS-appropriate secure-storage adapter and encrypt pending capture content with a key protected by Keychain/Secure Enclave policy where feasible.
2. **RECOMMENDATION:** Define data processing/retention contracts for Supabase, Apple speech, and OpenAI before production user data. Add explicit privacy controls and a local/remote deletion lifecycle.
3. **RECOMMENDATION:** Add server-side rate limits, quotas, timeouts, idempotency keys, payload size enforcement, and auditable provider usage.
4. **RECOMMENDATION:** Narrow direct table grants/write policies around supported repository operations, or explicitly accept owner-direct writes and enforce provenance/invariants with triggers and RPCs.
5. **RECOMMENDATION:** Generate and review the Apple privacy manifest/privacy labels from the actual data inventory.
6. **RECOMMENDATION:** Add automated tenant-isolation tests covering every table and RPC, not only entities and relationships.

# 8. Performance risks

## Verified facts

### Data and search

- `SupabaseRepository.load()` requests all entities and relationships without pagination. The Supabase API config has `max_rows=1000`, so the snapshot can become silently incomplete above that cap.
- Timeline and captures are capped at 200 and 100 respectively, with no pagination UI.
- Client search scans all loaded names, subtitles, summaries, tags, and field values on every query change.
- Interpretation considers only the first 250 loaded entities, ordered by recent update. Ask Kortex considers only 500 entities and 1,500 relationships.
- A single snapshot update is distributed through one context to all consumers.

### Graph

- The visual graph renders at most 600 entities in one React Native SVG tree. There is no viewport culling, level-of-detail geometry batching, spatial index, or off-main-thread layout.
- When more than 600 entities are loaded and a node is selected, sort comparison repeatedly scans the full relationships array for each compared entity. This can approach `O(N log N * E)` behavior.
- Layout, filtering, and edge extraction execute in JavaScript on the application thread. The layout is deterministic but is not a worker/native implementation.
- Selecting/focusing produces a new layout for all rendered nodes; `GraphCanvas` redraws nodes and edges as SVG elements.
- The structured list is virtualized, but the visual graph is not.

### 3D

- Both high and low GLBs are included in the exported application assets (approximately 4.2 MB combined).
- The high LOD is 180,000 triangles. The low LOD is 88,000 triangles. Each has two primitives/materials and no texture cost.
- Non-reduced-motion mode uses `frameloop="always"`, including idle, so rendering continues when visual changes are extremely subtle.
- Antialiasing and `powerPreference="high-performance"` are always requested.
- Material energy is updated per material per frame; there are only two current materials, so this specific loop is small.
- Reduced Motion uses a demand frameloop, but the component does not explicitly invalidate the canvas on state/amplitude changes. State changes may not render consistently after the initial demand frame.
- A development FPS counter exists, but no captured device profile, automated threshold, thermal test, or memory metric is stored in the repository.

### Build/runtime

- iOS export succeeds with approximately 6.7 MB of Hermes bytecode plus assets.
- Native Release build succeeds but emits a large number of warnings from current third-party native modules, including deprecated APIs and experimental/gamma code paths.
- Several unused direct native dependencies increase install/build surface.

## Recommendations

1. **RECOMMENDATION:** Replace whole-snapshot loading with paginated entity search, focused graph neighborhood queries, cursor-based activity, and explicit partial/loading states.
2. **RECOMMENDATION:** Perform entity-resolution candidate retrieval server-side using exact/fuzzy/full-text/vector stages instead of shipping a recent snapshot.
3. **RECOMMENDATION:** Move graph layout off the JS application thread, introduce viewport culling/semantic LOD, and benchmark representative 100/500/2,000-node and 10,000-edge datasets.
4. **RECOMMENDATION:** Make 3D rendering event-driven/adaptive during idle, explicitly invalidate reduced-motion frames, and establish frame-time, memory, thermal, and startup budgets on the minimum supported iPhone.
5. **RECOMMENDATION:** Keep voice capture available independently of 3D loading and test this invariant with cold-start automation.

# 9. Database/Supabase status

## Verified repository schema

**FACT:** One tracked migration exists: `supabase/migrations/202608240001_initial_kortex.sql`.

**FACT:** It enables `pgcrypto` and `vector`, defines five enums, and creates:

- `profiles`
- `captures`
- `entities`
- `contacts`
- `companies`
- `ideas`
- `projects`
- `meetings`
- `documents`
- `relationships`
- `tags`
- `entity_tags`
- `timeline_events`
- `follow_ups`
- `ai_interpretations`

**FACT:** Core rows use UUIDs and timestamps. `entities` has a generated `tsvector`, GIN search index, optional 1,536-dimension vector, and partial HNSW cosine index. Owner/type/time, relationship endpoint, capture time, timeline time, and interpretation indexes exist.

**FACT:** A trigger creates a profile when a new `auth.users` row is inserted. Updated-at triggers exist for profiles, captures, entities, and relationships.

**FACT:** Every user table has RLS enabled with owner-scoped `FOR ALL` policies. The `commit_capture` RPC is granted to `authenticated` and uses the caller identity.

**FACT:** The RPC creates/updates generic and selected subtype rows, relationships, timeline events, follow-ups, interpretation provenance, and capture status in one database transaction.

## Verified linked-project status

Read-only CLI observations on 2026-08-25:

- Local migration `202608240001` matches remote migration `202608240001`.
- Remote schema lint reports no errors for `public` or `extensions`.
- `interpret-capture`, `transcribe-capture`, and `ask-kortex` are `ACTIVE`, version 1.
- No `OPENAI_*` secrets are configured. Supabase-provided URL/key/database/JWKS secrets exist.
- Local CLI 2.72.7 reports that 2.115.0 is available.

## Verified database gaps/risks

- Vector storage and indexes exist, but no embedding generation, backfill, version metadata, or vector search function exists.
- Full-text search exists but is unused by application queries.
- Normalized tags exist but are unused by persistence and reads.
- Subtype data is only partially populated by the RPC and not loaded by the app.
- Contacts/companies/ideas/projects are partially updated; meeting/document subtype rows have create handling but no update branch in the RPC.
- `followUps[].relatedEntityId` is not persisted.
- No uniqueness/entity-resolution key exists beyond IDs; duplicate contacts/companies are expected to be handled by AI/UI, which is not reliable enough for enforcement.
- No idempotency constraint exists for one interpretation/commit per capture.
- No schema-level constraint ties subtype table identity to `entities.entity_type`.
- Relationship direction/symmetry is not normalized.
- No deletion audit/soft delete/history/versioning exists.
- No explicit data retention or partitioning/archival policy exists.

## Test status

**FACT:** `scripts/verify-supabase.ts` intends to verify schema persistence and isolation between two users. It is not part of `npm run check` or CI.

**FACT:** The script assumes a local Supabase instance that immediately returns sessions on email sign-up and assumes exact global counts of two entities/one relationship. Current `config.toml` enables email confirmation, and a non-empty database would invalidate exact counts. The script creates users/data and has no cleanup. It was not run against the linked project during this read-only audit.

## Recommendations

**RECOMMENDATION:** Add new forward-only migrations; do not rewrite the applied initial migration. First migrations should address idempotency/invariants, least-privilege writes, accurate provenance, and query APIs. Then add search/embedding lifecycle and paging functions with measurable query plans.

**RECOMMENDATION:** Generate Supabase TypeScript types and validate JSON fields at repository boundaries. Add local ephemeral database integration tests that run all migrations from zero and test every table/RPC under two authenticated identities.

# 10. Recommended migration path toward the production Kortex architecture

Everything in this section is a **RECOMMENDATION**. It is intentionally evolutionary: preserve the current React Native/Expo, repository/service, unified-entity, relationship, capture provenance, and Supabase foundations.

## Phase 0 — Establish a controlled baseline

1. Create a protected production branch and pull-request workflow from the current foundation branch.
2. Add CI that installs from the lockfile, runs typecheck/lint, verifies Expo, builds the iOS bundle, runs migration/Edge tests, scans secrets, and records dependency findings.
3. Define development, staging, and production Supabase projects and environment ownership. Never test destructive flows against production.
4. Decide and document Expo CNG ownership. Verify clean prebuild diffs and native Release builds in CI.
5. Record architecture decisions for external AI processing, Apple speech, local encryption, and graph rendering.

**Exit criterion:** A clean checkout can deterministically produce the same checked application and a signed-development artifact without local undocumented state.

## Phase 1 — Close security and reliability blockers

1. Complete reset-password, account deletion, export, sign-out local purge, retention, and consent flows.
2. Protect session and pending-capture data with an appropriate secure-storage/encryption design.
3. Add capture idempotency keyed by capture ID and make retries return the previously committed result.
4. Add explicit capture states for abandoned, retryable, restored, committed, and failed work; restore receipts after relaunch.
5. Add server rate limits, timeouts, quotas, payload validation, and provider usage telemetry.
6. Make Edge Functions retrieve entity candidates under the caller's RLS instead of trusting client-provided memory context.
7. Reconcile Apple privacy manifest/App Store labels with the actual Supabase, speech, and AI data flow.

**Exit criterion:** No captured thought is duplicated or silently lost across retry/relaunch, and user/account data has a documented, tested lifecycle.

## Phase 2 — Make persistence authoritative and scalable

1. Generate typed Supabase clients and formalize repository DTO/domain mappings.
2. Select one source of truth for tags and subtype fields; migrate and backfill without dropping provenance.
3. Add paginated entity, activity, capture, review, and focused-neighborhood queries.
4. Add optimistic concurrency/version checks for manual corrections.
5. Add relationship taxonomy/inverse semantics and an explicit duplicate/merge model.
6. Implement exact/fuzzy candidate retrieval, then vector retrieval with embedding model/version metadata and a controlled backfill pipeline.

**Exit criterion:** A user with 2,000 entities and 10,000+ relationships gets complete, bounded, measurable queries without loading the full knowledge base.

## Phase 3 — Harden the AI product boundary

1. Generate one versioned structured contract consumed by client, Edge Functions, tests, and database validation.
2. Validate provider output server-side before returning it and again at the transaction boundary.
3. Store accurate provider/model/prompt/schema versions, latency, token/cost metadata, and safe request IDs without logging personal content.
4. Build deterministic evals for entity extraction, resolution, updates, uncertainty, date handling, relationship formation, and refusal to invent facts.
5. Add human correction/merge feedback as explicit provenance, not silent overwrite.
6. Make Ask Kortex retrieve only relevant memories and expose evidence from stable record identifiers.

**Exit criterion:** AI quality and cost changes are measurable, rollbackable, and never bypass tenant isolation or user confirmation.

## Phase 4 — Scale the graph and 3D signature safely

1. Define graph query and rendering budgets by device class and dataset size.
2. Move layout computation off the application thread and add spatial culling, semantic zoom, stable positions, and bounded neighborhood expansion.
3. Preserve the accessible list as a first-class equivalent with relationship direction/context.
4. Profile the two supplied LODs on real minimum/target devices; adapt idle frame scheduling and state effects to thermal/battery budgets.
5. Add performance regression captures for startup-to-capture readiness, 3D frame time, graph interaction, memory, and bundle size.

**Exit criterion:** Capture remains immediately usable, 3D meets its frame budget, and the graph remains interactive on agreed production-scale fixtures.

## Phase 5 — Production operations and release

1. Add crash/error/performance observability with content-safe redaction and alert ownership.
2. Add E2E tests for account creation, real voice, capture confirmation, relaunch persistence, duplicate resolution, graph focus, offline recovery, and cross-user isolation.
3. Establish database backup/restore drills, migration rehearsal, Edge Function rollout/rollback, and provider outage procedures.
4. Add staged distribution, release versioning, signing ownership, privacy review, accessibility review, and App Store submission checks.
5. Remove verified dead dependencies/assets and resolve or explicitly accept build warnings only after build/test coverage protects the cleanup.

**Exit criterion:** A release can be built, deployed, monitored, rolled back, and supported without relying on one developer's local machine or undocumented Supabase state.

## Suggested priority order

1. AI secret/environment readiness and CI baseline
2. Idempotent/restorable capture lifecycle
3. Complete auth/privacy/account lifecycle
4. Server-side validation, quotas, and least-privilege data writes
5. Paged repository/query APIs and typed database boundary
6. Entity resolution/search/embedding pipeline
7. Graph and 3D measured performance work
8. Full E2E, observability, and release operations

This order addresses data loss, duplication, privacy, isolation, and operational risk before expanding the feature surface.
