# AGENTS.md

Huawei Manager Mobile — Expo SDK 54 / React Native 0.81 / TypeScript app for controlling Huawei LTE modems over LAN. Android-first; iOS config exists but only Android is built/released. UI/docs language: Indonesian + English.

## Commands

- `npm run dev` — dev server (LAN + clear cache). Hot reload requires phone and PC on same WiFi; open firewall ports 8081 and 19000-19001 (`sudo ufw allow 8081/tcp`). LAN fails → use `npm run start:tunnel` (no hot reload) or USB (`adb reverse tcp:8081 tcp:8081` then `npm run start:localhost`). Full guide: `docs/DEVELOPMENT.md`.
- `npx tsc --noEmit` — typecheck. No `lint`/`typecheck`/`test` scripts exist; no Jest/ESLint config in repo. `tsconfig.json` has `strict: false`.
- `npm run android` — builds and installs the dev app on a connected Android device/emulator (`APP_ENV=development`, `npx expo run:android`). Primary local run command.
- `eas build --profile preview --platform android` — APK build; `production` profile = app-bundle (see `eas.json`).

## Architecture

- File-based routing via expo-router v6: `src/app/_layout.tsx` (root: auth guard, ads init, update modal, splash), `src/app/(tabs)/{home,sms,wifi}.tsx`, `src/app/(tabs)/settings/` (stack of settings screens).
- State: Zustand stores in `src/stores/` (auth, modem, theme, debug, sms, wifi, profiles).
- Modem communication: HTTP XML API against `http://{modemIP}` (default `192.168.8.1`), cleartext enabled via `expo-build-properties`. Session auth: token from `/api/webserver/token`, sent as `__RequestVerificationToken` header + session cookie. Two client implementations: `src/services/api.service.ts` (axios, `ModemAPIClient`) and `src/services/direct-auth.service.ts` (raw XMLHttpRequest). No mock/server — testing requires a real Huawei modem.
- Endpoint reference: `docs/API_REFERENCE.md`, `docs/HUAWEI_LTE_API_ENDPOINTS.md`, and Bruno collection `bruno-huawei-lte-api/`.
- i18n: `src/i18n/en.json` + `id.json`, dot-path keys typed via `useTranslation` (nested keys become `home.connectionStatus`). Both files must stay in sync.
- Android widget: `react-native-android-widget`. Entry `index.js` registers `widgetTaskHandler` and the FCM background handler **before** `import 'expo-router/entry'` — order matters.
- `metro.config.js` + `metro.transformer.js`: `.md` files importable as raw-string modules (custom transformer); do not remove unless the codebase stops importing markdown.
- `graphify-out/` is a gitignored local graph cache, not a source of truth.

## Conventions & gotchas

- Import alias `@/*` → `src/*` is wired in **three** places: `tsconfig.json` paths, `babel.config.js` (module-resolver), `metro.config.js` resolver alias. Keep all three in sync.
- `babel.config.js` strips `console.*` only when `NODE_ENV=production`; dev builds keep logs. Debug mode (Settings → Debug Mode) captures console + network logs via `src/utils/debug-logger.ts` — **dev builds only**, because the production bundle strips the console calls the interceptor reads.
- `android/` and `ios/` are gitignored generated dirs. Never edit them by hand — run `npx expo prebuild` to regenerate. CI prebuilds with `--clean`.
- `APP_ENV` changes app identity: `development` → name `HM Mobile [DEV]`, package `com.alrescha79.hmmobile.dev`; production → `com.alrescha79.hmmobile`. Dev and prod install as separate apps.
- Bump release version in **both** `package.json` and `app.config.ts`; `versionCode` comes from `ANDROID_VERSION_CODE` env (CI computes it).
- `app.config.ts` injects `org.gradle.java.home` from `JAVA_HOME` or hardcoded `/usr/lib/jvm/java-21-openjdk-amd64` if present. CI uses JDK 17.
- Reanimated v4: babel plugin `react-native-reanimated/plugin` must stay last in plugin list.
- Commit style: Conventional Commits (`feat:`, `fix:`, `build:`, `chore:`), merged via PRs.

## Secrets & builds

- `.env`, `google-services.json`, and `hm-mobile-1a0d0-...-adminsdk...json` are gitignored but present locally. Never commit them. AdMob unit IDs read from env at build time (see `app.config.ts`).
- Release APKs are built by GitHub Actions (`.github/workflows/build-test.yml`, `build-release.yml`) — expo prebuild `--clean` + `./gradlew assembleRelease`, not EAS. Secrets: `GOOGLE_SERVICES_JSON`, `ADMOB_*`, `RELEASE_KEYSTORE_*`, `FIREBASE_SERVICE_ACCOUNT`, `EXPO_TOKEN`.
- Firebase Messaging: app-updates notifications pushed to `all_users` topic from CI; notification channel id `app-updates`.

## Verification

No automated tests. After a change: `npx tsc --noEmit`, then manual smoke test against a real modem via Expo Go.
