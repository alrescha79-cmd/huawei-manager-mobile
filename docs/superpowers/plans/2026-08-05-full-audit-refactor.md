# Full Audit & Refactoring Implementation Plan

> **Status:** Phases 1-3, 6 (types), 7 (perf/version), 9 (deps/tooling/docs) done as of 2026-08-05. Skipped: modal-scaffold rewrite (P5, cosmetic/risky), formatter/XML merge (P2 scope-cut, behavior-risk). Deferred pending decisions: C5, C7, C8.

> **For agentic workers:** Execute task-by-task. Each task = one focused change, verify with `npx tsc --noEmit`, commit with Conventional Commits. Checkbox (`- [ ]`) tracking.

**Goal:** Transform 33.8k-LOC Expo/RN app into a clean, maintainable, production-grade codebase without changing user-visible behavior.

**Architecture:** The app is layered correctly (ModemAPIClient centralizes session/token/retry) but each service re-implements XML parsing, error sniffing, and formatting. Refactor consolidates shared infra (error codes, XML helpers, formatters), deletes ~1,500 LOC of dead code, splits the 672-line root layout, and adds a lint/type safety net.

**Tech Stack:** Expo SDK 54, RN 0.81, TypeScript, Zustand, expo-router v6, axios. No test framework — verification = `npx tsc --noEmit` + manual smoke against real Huawei modem.

**Verification (every task):** `npx tsc --noEmit` must stay green. No lint/typecheck/test scripts exist yet.

---

## Critical Findings Reference

- **C1** `widget-data.service.ts:46-57` reads AsyncStorage `'modem_credentials'`; real credentials in SecureStore (`storage.ts:17`). Widget always uses default IP.
- **C2** `home.tsx:68-103` calls `useHomeAuth` twice (stub + real) → relogin state diverges, WebViewLogin never blocks retry counter.
- **C3** `notification.service.ts:228-243` `sendLocalNotification` ignores `channelId`; 3 channels (`sms-alerts`, `debug-reminder`, `inactivity-reminder`) never registered.
- **C4** `SpeedTestModal.tsx` (772 lines) no unmount cleanup → interval/fetch leaks; raw `fetch('https://ipinfo.io/json')` bypasses services.
- **C5** `wifi.service.ts:690-692` `toggleParentalControl` no-op stub; `DeviceDetailModal` Unblock button `onUnblock` never wired. **Needs UX decision — defer.**
- **C6** `wifi.service.ts:280-282` `encryptWifiPassword` returns plaintext on failure → PSK posted unencrypted.
- **C7** Debug Mode dead in prod (babel strips console; interceptor captures nothing). **Needs UX decision — defer.**
- **C8** `api.service.ts:154-164` `hexToBase64` encodes ASCII hex chars, never decodes pairs. Verify against live modem before touching.

---

## Execution Phases

### Phase 1 — Critical fixes
- [ ] C1 widget IP: use `getCredentials()` from `@/utils/storage`
- [ ] C2 double `useHomeAuth`: single instance, delete stub
- [ ] C3 notification channels: pass channelId, register channel registry
- [ ] C4 SpeedTestModal: extract `useSpeedTest` hook, unmount cleanup + AbortController, route ipinfo via network.service
- [ ] C6 encryptWifiPassword: throw instead of plaintext fallback
- [ ] C8 verify hexToBase64 with modem (document only)

### Phase 2 — Shared infra
- [ ] `src/utils/huawei-error.ts`: `isSessionExpiredError`, `HuaweiAPIError` (code field), `assertNoError`, `isOkResponse`
- [ ] `src/utils/xml.ts`: `buildRequest`, `parseXMLElements`, `escapeXml`/`unescapeXml`
- [ ] `src/utils/formatters.ts`: single `formatBytes`, `formatSpeed`, `formatDuration`, `formatMacAddress`, `formatBytesValue`
- [ ] Migrate api/sms/wifi/modem/network.settings services + hooks to shared infra

### Phase 3 — Dead code removal (~1,500 LOC)
- [ ] api.service.ts: dead `scramLogin` + SCRAM helpers + `xmlHttpRequest` (~170)
- [ ] AdBlockAlertModal.tsx (339), SMSComposeModal.tsx (189, keep, delete inline copy in sms.tsx)
- [ ] sms.service.ts mock data (128), network.settings PPPoE/DynamicIP (~190)
- [ ] notification.service 5 dead exports, useSystemSettings dead credentials block (78)
- [ ] Dead store API + dead components (SignalCard, NoDataWarningCard, SpinnerLoading, PulseRing)
- [ ] Dead stylesheet keys (home 30, sms 17, wifi 11), constants.ts dead exports
- [ ] Then enable `noUnusedLocals` + `noUnusedParameters`, fix stragglers

### Phase 4 — _layout.tsx split
- [ ] `useAppStartup`, `useNotificationRouting` (also dedups clear-history-toast ×2), `useAppStateLifecycle`, `useAuthGuard`, `<GlobalOverlays/>`

### Phase 5 — Modal scaffold + ad dedup
- [ ] `BottomSheetModal` + `ModalScaffold`, `confirmDiscard`, fold ModalBackground→MeshGradientBackground
- [ ] ad.service `showWithPreload`, AdBanner single NativeAdView, drop custom getTranslation

### Phase 6 — DRY hooks + types
- [ ] `usePolling(fn, ms)` (wifi/sms/home), merge `loadData`/`loadDataSilent`
- [ ] Type consolidation: ParentalProfile, SMSFilterType, BlockedDevice, APN, TabType, icon names
- [ ] Naming: `kickDevice`→`blockDevice`, `setSMSCount`→`setSmsCount`

### Phase 7 — i18n + theme + perf
- [ ] Hardcoded strings → `t()` (12 components + widget)
- [ ] `alpha(color, pct)` helper; fix MeshGradientBackground light `blob2`
- [ ] useSystemSettings 1s poll → local ticker; MonthlyComparisonCard debounce; SpeedGauge dup line

### Phase 8 — A11y
- [ ] accessibilityRole/label on all icon-only touchables, switches, rows

### Phase 9 — Deps + tooling + docs
- [ ] Remove base-64, @types/base-64, react-native-web, react-dom; @types/crypto-js→devDeps
- [ ] ESLint (eslint-config-expo) + Prettier config; `--fix` pass at end
- [ ] Version fallbacks → `Constants.expoConfig?.version`
- [ ] Docs: ARCHITECTURE.md (5 false deps, stale tree), push-notifications.md, USER_GUIDE.md

---

## Deferred (need user decisions)
- C7 debug-mode: instrument via explicit debugLog or hide feature in release
- C5 parental toggle / unblock button: implement or remove dead UI
