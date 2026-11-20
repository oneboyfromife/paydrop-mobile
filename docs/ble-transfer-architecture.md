# BLE social transfers

This implements the mobile architecture in `output/pdf/PayDrop-BLE-Social-Transfer-Implementation-Plan.pdf`. Backend code and physical-device behavior have not been verified in this workspace. Do not enable financial submissions for a production cohort until the contracts and ledger requirements below have passed staging validation.

## Runtime

- `services/bleDiscovery.ts` owns every native operation and the account-wide broadcast DELETE. Focused Receive and Nearby screens acquire leases; stale releases cannot stop a newer lease. Foreground state, authentication, and the BLE kill switch constrain those leases.
- Receive requires explicit visibility consent. It registers a fresh opaque UUID, checks server expiry, and waits for native success before showing Discoverable. It stops and revokes on blur, background, logout, native failure, or expiry. Tokens rotate after 120 seconds, earlier when the server lifetime requires it. Failed account-wide revocation blocks replacement registration until cleanup succeeds.
- Nearby resolves only advertised 128-bit service UUIDs. The first observation flushes immediately; subsequent windows are about two seconds, up to 20 candidates and four requests at once. The cache holds at most 200 observations. Invalid tokens have a 60-second negative-cache lifetime; network failures remain retryable. Cards disappear 30 seconds after the last radio callback. RSSI is smoothed for ordering only.
- `react-native-ble-plx` is the sole scanner. `react-native-ble-advertiser` is the selected advertiser on both platforms. The Expo plugin replaces its iOS advertiser with a callback-confirmed implementation and patches Android's service-only payload, capability check, stop iteration, startup permission access, and modern Gradle configuration. Existing alternative BLE dependencies remain installed until device compatibility is demonstrated.
- QR has a separate server-provided lifetime and token. It requires an explicit expiry or TTL, hides expired payloads, refreshes before expiry, and suspends refresh while unfocused or backgrounded. The scanner allows one request at a time, cancels on blur, and routes QR/manual codes through the same typed identity review. Manual codes work even when camera permission is denied.
- Transfers use a typed, in-memory recipient and intent. Decimal NGN is converted to integer kobo using decimal strings; there is no floating-point rounding or invented backend minimum. Every review creates a new UUID idempotency key. Double taps share one mutation. An unresolved intent cannot be replaced by a new transfer.
- Before submission, a minimal account-scoped recovery reference is saved to SecureStore: owner ID, idempotency key, transaction ID when known, and creation time. Recipient details, amount, note, credentials, and approval tokens are not in that reference. Storage failure prevents submission. Logout clears in-memory state and query caches; the encrypted recovery reference is retained for its owner's next login.
- ALLOW only means the transfer can process. Completion requires an explicit COMPLETED status and a transaction ID; submission also requires ALLOW. FLAG requires a server token and expiry followed by explicit approval. BLOCK stops the flow. Missing fields and timeouts remain uncertain. Neither events, HTTP success, a missing verdict, nor route parameters produce a successful receipt.
- Recovery uses GET only, with a 10-second initial grace period and backoff up to 30 seconds. It resumes on foreground/restart. Unknown outcomes never trigger an automatic financial retry. Pending payments remain visible on Home. Events invalidate wallet/history/notification queries and trigger authoritative REST recovery; unordered events cannot overwrite submission or terminal state.
- Credentials migrate from legacy `user-storage` in AsyncStorage into SecureStore before navigation starts. Only the account ID is persisted alongside credentials; profiles are fetched again. On web, secure storage is deliberately memory-only. Auth refresh is shared across concurrent requests, bounded by timeouts, and preserves financial idempotency headers. Old-account responses cannot update a newer account.

## Environment and release gates

Use `.env.example` as a reference; never commit real credentials.

| Setting | Behavior |
| --- | --- |
| `EXPO_PUBLIC_API_URL` | API root, including `/api/v1`; existing backend URL is the fallback. |
| `EXPO_PUBLIC_BLE_ENABLED` | `false` stops new BLE activity. QR/manual entry and transfer recovery continue. The default is enabled for development. A host flag service can call `bleDiscovery.setEnabled(false)` to stop an active lease immediately. No remote flag provider is assumed. |
| `EXPO_PUBLIC_TRANSFER_CONTRACT_CONFIRMED` | Must equal `true` to submit or confirm a payment. Default is disabled. Enable only after verifying server idempotency, approval, expiry, lookup and ledger guarantees. |
| `EXPO_PUBLIC_TRANSFER_STATUS_PATH` | Transaction lookup template, default `/transactions/:id`. Verify this route before release. |
| `EXPO_PUBLIC_TRANSFER_KEY_LOOKUP_PATH` | Lookup template containing `:key`; the agreed route is `/transactions/by-idempotency-key/:key`. No default is compiled in. A relative route containing `:key` is required before new submissions or confirmations can be enabled, so a timeout before an ID is returned remains recoverable. |
| `EXPO_PUBLIC_AUTH_TEST_MODE` | `true` shows a "Test login" panel on Login that lists `/auth/test-accounts` and signs in via `/auth/test-login` (backend `AUTH_TEST_MODE`, fixed OTP, no SMS). Dev/QA builds only. |
| `EXPO_PUBLIC_REALTIME_URL` | Optional authenticated JSON WebSocket endpoint over `wss://`. No `/ws` or Socket.IO protocol is assumed. Omit when the transport contract is unavailable; REST recovery still works. |

Public Expo settings are embedded at build time and are not secrets. A build-time flag change requires delivery of an updated configuration/bundle; it is not a remote operational kill switch. Connecting a remotely controlled flag service and cohort assignment remains a release integration task.

## Backend contracts

Source of truth: `https://paydrop-backend.onrender.com/docs` (OpenAPI at `/docs-json`). Success bodies are `{ success, message, data }`; errors are `{ success: false, code, message, details }` and are parsed by `toApiError` in `utils/apiPayload.ts`. Rows marked *verified* were exercised against the live API with the backend's test accounts on 2026-11-20.

| Operation | Contract |
| --- | --- |
| Register | `POST /discover/broadcast` with an empty body; the server issues the UUID and returns `token`, `expires_at`, `ttl` (180 s). The app advertises the returned token and rotates every 120 s. *Verified.* |
| Revoke | `DELETE /discover/broadcast` (204) revokes every token the caller owns, **including the live QR token**, so the Receive QR is re-issued after each revoke (`lib/discoveryEvents.ts`). *Verified.* |
| Resolve | `POST /discover/resolve { token }` returns `data.user` (`id`, names, `username`, `avatar_url`, `relationship`, `trust_score`, `trust_tier`, `mutual_trust`). Accepts BLE and QR tokens. 404 `TOKEN_INVALID`, 410 `TOKEN_EXPIRED`. A `tokens[]` batch form exists but is unused. *Verified.* |
| QR | `GET /discover/qr` returns `qr` (`paydrop://discover?token=…`), `token`, `expires_at` (300 s). Independent of the BLE token. *Verified.* |
| Submit | `POST /transactions/transfer { recipient_id, amount, note? }`, amount in kobo, `Idempotency-Key` header. The server honours the client key: a replay returns 409 `CONFLICT` with the same key in `details`. *Key handling verified.* |
| Submit response | ALLOW: `transaction_id`, `verdict`, `status` (`COMPLETED`/`PENDING_REVIEW`/`BLOCKED`), `fraud_score`, `squad_ref`. BLOCK arrives as **HTTP 422** with `verdict: BLOCK` and `reason`. Other 400/403/422/429 refusals end the attempt as failed; 409, 5xx and timeouts stay uncertain. *Spec only; outcomes not yet exercised (test accounts cannot be funded).* |
| Approval | FLAG returns `confirm_token` and `reason` but no expiry; the documented 15-minute TTL is applied (minus 30 s). `POST /transactions/transfer/confirm { transaction_id, confirm_token }` with key `<intent-key>.confirm`. *Spec only.* |
| Lookup | `GET /transactions/:id` (`TransactionDto`: `PENDING`/`COMPLETED`/`FAILED`) and `GET /transactions/by-idempotency-key/:key` (404 when nothing was created). *Route verified.* |
| Recipient eligibility | A recipient without a Squad virtual account is refused with 400 "Recipient cannot receive transfers yet". Virtual accounts are provisioned at KYC, so Tier 0 users cannot currently receive. *Verified; raised with the backend team.* |
| Events | The backend exposes no WebSocket. `EXPO_PUBLIC_REALTIME_URL` stays unset and REST recovery is authoritative. Push (`/notifications/register-device`, FCM) is not wired in the app yet. |

The backend must bind idempotency keys to sender and payload, reserve/debit available funds atomically, deduplicate settlement across webhooks and reconciliation, verify provider references, enforce authorization, and decide fraud-outage policy. These cannot be implemented or certified from this mobile repository.

## Validation

```sh
npm run typecheck
npm test
CI=1 EXPO_OFFLINE=1 npx expo export --platform ios --platform android --output-dir /tmp/paydrop-mobile-export
npx eas build --profile development-device --platform ios
npx eas build --profile development-device --platform android
```

Native plugin edits require a fresh binary; Expo Go and an OTA update of an old binary cannot add these changes. The existing simulator profile remains available; `development-device` targets physical iOS and Android hardware.

Automated tests cover decimal conversion, token parsing, server expiry, minimal profiles, cancellation, revocation, rotation, stale responses, RSSI timestamps, resolution caps, kill/background behavior, secure migration and hydration failure, idempotency, double taps, uncertain outcomes, restart recovery, approval expiry, blocked transfers, and account isolation. They use native/storage/API fakes and do not establish radio or financial settlement correctness.

Before rollout, record real-device results for iOS -> iOS, iOS -> Android, Android -> iOS, Android -> Android, including a lower-end supported Android phone. Exercise denied permissions, Bluetooth toggles, screen focus, backgrounding, logout, process death, token rotation/expiry/replay and expired QR. Confirm permissions on Android 12+ and legacy supported versions; `neverForLocation` is intentionally not asserted, so scanning requests location permission as well as scan/connect where required.

Use staff sandbox accounts to test insufficient funds, limits, double confirmation, FLAG expiry, BLOCK, missing verdict/status/ID, timeout after acceptance, key lookup, socket loss, auth refresh, restart, concurrent overspend, duplicate/unordered webhooks and reconciliation races. Obtain evidence of no duplicate financial effects and no false completion. Verify remote kill/cohort integration and privacy-safe pilot telemetry before expansion. Discovery latency and battery targets in the plan are rollout targets, not measured results.
