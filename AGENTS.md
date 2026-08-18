# AGENTS.md

Huawei Manager Mobile — Expo SDK 54 / React Native 0.81 / TypeScript app for controlling Huawei LTE modems over LAN. Android-first; iOS config exists but only Android is built/released. UI/docs language: Indonesian + English.

## Commands

- `npm run dev` — dev server (LAN + clear cache). Hot reload requires phone and PC on same WiFi; open firewall ports 8081 and 19000-19001 (`sudo ufw allow 8081/tcp`). LAN fails → use `npm run start:tunnel` (no hot reload) or USB (`adb reverse tcp:8081 tcp:8081` then `npm run start:localhost`). Full guide: `docs/DEVELOPMENT.md`.
- `npx tsc --noEmit` — typecheck. **Must stay green after every change.** `tsconfig.json` has `strict: false` but `noUnusedLocals` + `noUnusedParameters` are **enabled** — dead imports/variables fail the build.
- `npm run lint` — ESLint (flat config, `eslint.config.js`, extends `eslint-config-expo` + `eslint-config-prettier`). Currently 0 errors; `react-hooks/exhaustive-deps` is the only advisory category (34 warnings, not enforced). React Compiler-era rules (`refs`, `set-state-in-effect`, `immutability`, `purity`) are configured off, and lazy `require()` is allowed deliberately to break store circular deps — do not re-enable without a reason.
- `npm run format` — Prettier write (`singleQuote`, `semi`, `printWidth 100`, `trailingComma es5`, see `.prettierrc.json`).
- `npm run towers` — regenerate `openCell/towers.min.csv` from the raw OpenCelliD dump `openCell/510.csv` (keeps LTE+UMTS rows, strips unused columns, rounds coords). The compact file is what gets bundled via the metro CSV transformer — commit it whenever the dump is refreshed.
- `npm run android` — builds and installs the dev app on a connected Android device/emulator (`APP_ENV=development`, `npx expo run:android`). Primary local run command.
- `eas build --profile preview --platform android` — APK build; `production` profile = app-bundle (see `eas.json`).
- No test framework — verification is tsc + lint + manual smoke against a real modem.

## Architecture

- File-based routing via expo-router v6: `src/app/_layout.tsx` (root: auth guard, splash, ads init, app startup, global overlays), `src/app/(tabs)/{home,sms,wifi}.tsx`, `src/app/(tabs)/settings/` (stack of settings screens), `src/app/login.tsx`, `src/app/webview.tsx` (modal webview for links/notification routing).
- `src/app/_layout.tsx` is deliberately thin. Cross-cutting logic lives in:
  - `src/hooks/useNotificationRouting.ts` — notification → route/webview routing, FCM foreground bridge, pending-route queue, clear-history-reminder toast.
  - `src/components/GlobalOverlays.tsx` — ThemedAlert + ToastContainer + UpdateAvailableModal + ChangelogModal + SignalBubble, plus the shared `AlertState`/`AlertButton`/`ToastConfig` types.
  - Startup (credential load, session restore, deferred update/changelog/permission checks) and the auth guard remain in `_layout.tsx`; the Android widget lifecycle is wired there too.
- State: Zustand stores in `src/stores/` — `auth.store.ts` (session, keep-alive, relogin), `modem.store.ts` (signal/traffic/status + cache), `theme.store.ts` (mode, accent, language, refresh interval), `debug.store.ts` (log capture), `sms.store.ts`, `wifi.store.ts`, `modem-profile.store.ts` (multi-modem profiles). Stores keep only used state — do not re-add `isLoading`/`error`/`reset` boilerplate that has no consumers.
- Modem communication: HTTP XML API against `http://{modemIP}` (default `192.168.8.1`), cleartext enabled via `expo-build-properties`.
  - `src/services/api.service.ts` — `ModemAPIClient` (axios): session token + cookie, auto-retry once on session expiry, `get`/`getFast` (polling) /`post`. The working login is password_type 4.
  - `src/services/direct-auth.service.ts` — `DirectAuthService` (raw XMLHttpRequest, SCRAM login). Used by the auth store's quiet-restore path.
  - **Session-error codes `125002`/`125003` are centralized** in `src/utils/huawei-error.ts` (`isSessionExpiredError`, `hasSessionExpiredCode`, `parseErrorCode`). Never string-match them inline; import the helpers.
  - Other services: `modem.service.ts` (ModemService — the facade screens/hooks call), `wifi.service.ts`, `sms.service.ts`, `network.service.ts`, `network.settings.service.ts` (APN/DHCP/ethernet), `notification.service.ts`, `ad.service.ts`, `usage-history.service.ts`. They build/parse XML by hand — no shared XML builder yet; be careful with escaping.
- Hooks by feature folder: `src/hooks/{home,wifi,sms,settings}/` plus `src/hooks/useLogin.ts` and `useNotificationRouting.ts`. Screens are thin; data loading + polling live in hooks (e.g. `useHomeData` drives 3s/10s polling).
- Components: `src/components/` root (Button, Card, modals, GlobalOverlays, ...) + `src/components/{home,wifi,sms,settings}/` feature folders. Barrel `index.ts` exports per folder; components import each other via direct relative paths, never through the barrel (avoids cycles).
- Android widget: `react-native-android-widget`. Entry `index.js` registers `widgetTaskHandler` and the FCM background handler **before** `import 'expo-router/entry'` — order matters. Widget code (`src/widget/`) fetches modem data itself via `widget-data.service.ts`; widget IP comes from SecureStore credentials (`getCredentials()`), not AsyncStorage.
- i18n: `src/i18n/en.json` + `id.json`, dot-path keys typed via `useTranslation` (nested keys become `home.connectionStatus`). Both files must stay in sync (same keys, 800 each). `useTranslation` accepts `(key, options)` for interpolation. Avoid hardcoded UI strings; widget renders English by design (headless).
- `metro.config.js` + `metro.transformer.js`: `.md` files importable as raw-string modules (custom transformer); `changelog.md` is imported by `ChangelogModal.tsx` — do not remove.
- `graphify-out/` is a gitignored local graph cache, not a source of truth.

## Conventions & gotchas

- Import alias `@/*` → `src/*` is wired in **three** places: `tsconfig.json` paths, `babel.config.js` (module-resolver), `metro.config.js` resolver alias. Keep all three in sync.
- `babel.config.js` strips `console.*` only when `NODE_ENV=production`; dev builds keep logs. Debug mode (Settings → Debug Mode) captures console + network logs via `src/utils/debug-logger.ts` — **dev builds only**, because the production bundle strips the console calls the interceptor reads.
- Shared modem types live in `src/types/modem.types.ts` (ModemCredentials, SignalInfo, TrafficStats, WiFiSettings, ParentalControlProfile, BlockedDevice, ...). Do not re-declare these locally in components/hooks — import them.
- `android/` and `ios/` are gitignored generated dirs. Never edit them by hand — run `npx expo prebuild` to regenerate. Only `build-test.yml` prebuilds with `--clean`; `build-release.yml` skips prebuild if `android/` already exists in the checkout.
- `APP_ENV` changes app identity: `development` → name `HM Mobile [DEV]`, package `com.alrescha79.hmmobile.dev`; production → `com.alrescha79.hmmobile`. Dev and prod install as separate apps.
- Bump release version in **both** `package.json` and `app.config.ts`; `versionCode` comes from `ANDROID_VERSION_CODE` env (CI computes it). Runtime code reads the version via `Constants.expoConfig?.version` — no hardcoded fallback strings.
- `app.config.ts` injects `org.gradle.java.home` from `JAVA_HOME` or hardcoded `/usr/lib/jvm/java-21-openjdk-amd64` if present. CI uses JDK 17.
- Reanimated v4: babel plugin `react-native-reanimated/plugin` must stay last in plugin list.
- Notifications: `sendLocalNotification(title, body, channelId, data)` routes via `trigger: { channelId }`. Channels are registered in `requestNotificationPermissions()` — if you add a new channel, register it there.
- Commit style: Conventional Commits (`feat:`, `fix:`, `refactor:`, `build:`, `chore:`, `perf:`, `docs:`), merged via PRs. Branch names follow the same prefix (`refactor/...`, `fix/...`).
- Mark deliberate shortcuts with a `ponytail:` comment naming the ceiling and upgrade path.

## Secrets & builds

- `.env`, `google-services.json`, and `hm-mobile-1a0d0-...-adminsdk...json` are gitignored but present locally. Never commit them. AdMob unit IDs read from env at build time (see `app.config.ts`); local `.env` has only commented-out names, real values live in CI secrets.
- Release APKs are built by GitHub Actions (`.github/workflows/build-test.yml`, `build-release.yml`) — expo prebuild + `./gradlew assembleRelease`, not EAS. Secrets: `GOOGLE_SERVICES_JSON`, `ADMOB_*`, `RELEASE_KEYSTORE_*`, `FIREBASE_SERVICE_ACCOUNT`, `EXPO_TOKEN`.
- Firebase Messaging: app-updates notifications pushed to `all_users` topic from CI; notification channel id `app-updates`.

## Verification

No automated tests. After any change: `npx tsc --noEmit` (must be clean) and `npm run lint` (must stay at 0 errors). Then manual smoke test against a real modem via Expo Go — no mock server exists.
