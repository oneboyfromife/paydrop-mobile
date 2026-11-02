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
| `EXPO_PUBLIC_TRANSFER_KEY_LOOKUP_PATH` | Backend-agreed lookup template containing `:key`. No default route is invented. A relative route containing `:key` is required before new submissions or confirmations can be enabled, so a timeout before an ID is returned remains recoverable. |
| `EXPO_PUBLIC_REALTIME_URL` | Optional authenticated JSON WebSocket endpoint over `wss://`. No `/ws` or Socket.IO protocol is assumed. Omit when the transport contract is unavailable; REST recovery still works. |

Public Expo settings are embedded at build time and are not secrets. A build-time flag change requires delivery of an updated configuration/bundle; it is not a remote operational kill switch. Connecting a remotely controlled flag service and cohort assignment remains a release integration task.

## Staging contracts to freeze

These are the mobile adapter's expectations, not evidence of deployed backend behavior. Responses may be flat or wrapped in `data`.

| Operation | Expected contract |
| --- | --- |
| Register | `POST /discover/broadcast { token }`; return `expires_at` (ISO timestamp) or positive `ttl` / `expires_in` in seconds. Bind the UUID to the authenticated visible session. |
| Revoke | `DELETE /discover/broadcast`; currently account-wide, therefore strictly serialized. Prefer a server session-scoped API when agreed. |
| Resolve | `POST /discover/resolve { token }`; return `user`, `users`, or `resolved`. Profiles need string `id` and a display name or username. Return 404/410 for invalid/expired tokens. Rate-limit resolution. |
| Social context | Optional `relationship`: `PAID_BEFORE`, `CONTACT_PAID`, `NO_PRIOR_RELATIONSHIP`; optional server `trust_tier`, `trust_score`, `mutual_trust`. Unrecognized/missing insight is unavailable. |
| QR | `GET /discover/qr`; payload in `qr`, `payload`, `code`, `token`, or `discovery_token`, with explicit expiry/TTL. Resolve using `/discover/resolve`. Confirm whether QR issuance replaces any BLE session server-side; it must not silently invalidate a different live session. |
| Submit | `POST /transactions/transfer { recipient_id, amount, note? }`; amount is integer kobo; `Idempotency-Key` header is stable for this intent. No hardcoded bank/NIP code is sent. |
| Submit response | String `id` / `transaction_id`, `verdict` / `fraud_verdict` = ALLOW/FLAG/BLOCK, and independent `status`. Confirm actual terminal statuses; current adapter recognizes COMPLETED, FAILED, REJECTED, CANCELLED. |
| Approval | FLAG returns `confirm_token` and server expiry. `POST /transactions/transfer/confirm { confirm_token }` with key `<intent-key>.confirm`. The server must make approval single-use, expiring, and idempotent. |
| Lookup | GET by transaction ID and by the original idempotency key. A returned transaction ID must match the active ID when known. Return explicit status and, when available, recipient profile and amount for recovery receipts. Missing/404 results never authorize another debit. |
| Events | Native WebSocket authenticates with `Authorization: Bearer ...` upgrade headers. JSON `{ id, type, transaction_id? }`, type is `balance.updated`, `transaction.updated`, or `payment.received`. Events are hints; server status is refetched. This adapter does not implement Socket.IO or OS push notifications. |

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
