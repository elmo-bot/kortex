# Kortex for iOS

Kortex is an AI-first personal intelligence system. Natural capture becomes structured entities, explicit relationships, provenance, and an explorable knowledge graph.

## Run

Requirements: Node 20+, Xcode, CocoaPods, and an iPhone or iOS simulator.

```bash
npm install
cp .env.example .env.local
npx expo prebuild --platform ios
npm start
```

Open `ios/Kortex.xcworkspace` in Xcode, select the `Kortex` scheme and your iPhone, then Run. Keep Metro (`npm start`) running for a Debug build. Release/TestFlight builds embed the JavaScript bundle and do not need Metro.

This project uses a native development build because voice recognition and the interactive 3D Kortex require native modules. Expo Go is not the supported runtime.

## Supabase mode

The workspace is linked to the existing Kortex Supabase project. The initial migration has been applied non-destructively and the `interpret-capture`, `ask-kortex`, and `transcribe-capture` Edge Functions are deployed.

1. Put only the public Supabase URL and anon/publishable key in `.env.local`.
2. Keep `EXPO_PUBLIC_KORTEX_MODE=supabase` for the real product path.
3. Configure the server-side provider secret with `supabase secrets set OPENAI_API_KEY=...` and optionally `OPENAI_MODEL=gpt-5-mini`.
4. Configure Apple as a Supabase auth provider before setting `EXPO_PUBLIC_APPLE_AUTH_ENABLED=true`.

The mobile client never contains a provider key or Supabase service-role credential. AI proposes a strictly validated receipt; the authenticated `commit_capture` RPC is the controlled persistence boundary. Every user-owned table is protected by Row Level Security.

## Runtime modes

- `supabase` is the normal mode: account, live speech recognition, dynamic interpretation, persistence, graph, activity, and contextual Ask Kortex.
- `demo` is an explicit development-only fixture mode. It is never selected merely because production configuration is missing.

Pending captures are saved locally before network processing and retried without retaining raw voice recordings.

## Verification

```bash
npm run check
npx expo-doctor
npx expo export --platform ios
```

Architecture decisions and the FBX audit are in `docs/`. The untouched source asset is `source/Brain.fbx`; optimized runtime LODs are in `assets/models/`.
