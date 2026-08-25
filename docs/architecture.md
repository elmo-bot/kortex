# Kortex mobile architecture

## Audit outcome

- The GitHub remote was reachable but had no refs, branches, commits, Supabase files, or application code on 2026-08-24.
- The workspace contained only `brain-hologram.zip`; `source/Brain.fbx` has been extracted and preserved byte-for-byte.
- The established project uses React Native/Expo with generated native iOS projects. It is a native application, not a responsive website. Its Xcode workspace and simulator build are verified locally.
- Supabase was extended non-destructively with the initial Kortex migration. The database was not reset and existing infrastructure was not replaced.

## Boundaries

`feature UI -> KortexStore -> repository / AI protocols -> local demo or Supabase adapters`

- Domain objects are provider-independent and use UUID identifiers.
- AI interpretation is validated with a strict Zod schema before UI or persistence sees it.
- AI can propose changes but cannot write data. The user confirms a receipt, then a controlled `commit_capture` database function applies it under RLS.
- The app uses only the Supabase anon/publishable key. Provider and service-role secrets belong in Edge Function secrets.
- Local demo mode is explicitly opt-in and uses deterministic parsing plus AsyncStorage. Demo records never live in view components and do not overwrite Supabase data.
- Captures preserve provenance. Audio remains in the OS cache and is not persisted by Kortex.
- Voice uses on-device/native speech recognition with live interim results. Recording persistence is disabled. The deployed transcription function remains an isolated server fallback and never writes audio or transcript data.
- Failed or offline captures are written to a local pending queue before remote interpretation. The original thought is removed from that queue only after the controlled commit succeeds.
- Contextual questions use an authenticated read-only Edge Function. It queries only rows visible through the caller's RLS policies and validates every referenced entity ID before returning evidence.

## Data model

`entities` provides stable graph identity and common display/search fields. Queryable domain tables (`contacts`, `companies`, `ideas`, `projects`, `meetings`, `documents`) contain type-specific columns. `relationships` connects any two entity rows. `captures`, `ai_interpretations`, `timeline_events`, `follow_ups`, tags, and entity tags preserve provenance and activity.

## Scale seams

Graph data, layout, viewport state, filters, selection, and SVG rendering are separate modules. The demo layout is deterministic and replaceable by an off-main-thread/Metal layout without changing screens or repositories. Search has an explicit repository method so PostgreSQL full-text and pgvector retrieval can replace local ranking.

## Runtime modes

- `supabase`: normal product path. Auth is required; parsing calls the authenticated `interpret-capture` Edge Function and persistence remains user-confirmed.
- `demo`: explicit local development fixture mode selected only with `EXPO_PUBLIC_KORTEX_MODE=demo`.

Missing production configuration fails visibly instead of silently replacing real input with a scripted demo.
