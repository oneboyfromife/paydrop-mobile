require("./register.cjs");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { parseNairaToKobo } = require("../utils/currency.ts");
const {
  extractDiscoveryToken,
  normalizeDiscoveryToken,
} = require("../utils/discoveryToken.ts");
const { readExpiresAt } = require("../utils/apiPayload.ts");
const { interpretTransferResponse } = require("../utils/transferResponse.ts");
const {
  resolvedProfiles,
  relationshipLabel,
} = require("../utils/discoveryProfile.ts");

test("decimal NGN is converted exactly, rejecting excess precision and unsafe values", () => {
  for (const [input, expected] of [
    ["5000.00", 500000],
    ["0.29", 29],
    ["1.01", 101],
    ["0.01", 1],
    ["1234567.89", 123456789],
    ["1.", 100],
  ])
    assert.equal(parseNairaToKobo(input), expected);
  for (const input of [
    "0",
    "-1",
    "1.001",
    "1e4",
    "NaN",
    "",
    "1,000",
    "90071992547410.00",
    "01",
  ])
    assert.equal(parseNairaToKobo(input), null);
});
test("paydrop deep links are parsed before generic prefixes", () => {
  const uuid = "AABBCCDD11223344556677889900AABB";
  const expected = normalizeDiscoveryToken(uuid);
  assert.equal(
    extractDiscoveryToken(`paydrop://discover?token=${uuid}`),
    expected,
  );
  assert.equal(extractDiscoveryToken(`paydrop:${uuid}`), expected);
  assert.equal(
    extractDiscoveryToken(JSON.stringify({ data: { token: uuid } })),
    expected,
  );
});
test("expiry comes from server timestamps or TTL with no invented lifetime", () => {
  assert.equal(readExpiresAt({}), null);
  assert.equal(readExpiresAt({ data: { ttl: 180 } }, 1000), 181000);
  assert.equal(readExpiresAt({ expires_at: "invalid" }), null);
  assert.equal(
    readExpiresAt({ data: { expires_at: "2026-01-01T00:00:00Z" } }),
    Date.parse("2026-01-01T00:00:00Z"),
  );
});
test("profile parsing selects minimal fields and missing relationship stays unavailable", () => {
  const profile = resolvedProfiles({
    data: { user: { id: "user", first_name: "Ada", bank_account: "private" } },
  })[0];
  assert.equal(profile.id, "user");
  assert.equal(profile.bank_account, undefined);
  assert.equal(
    relationshipLabel(profile),
    "Relationship information unavailable",
  );
});
test("ALLOW, missing verdicts, missing IDs and HTTP success never imply completion", () => {
  assert.equal(
    interpretTransferResponse({ verdict: "ALLOW", id: "tx" }, "submit").phase,
    "processing",
  );
  assert.equal(
    interpretTransferResponse({ id: "tx", status: "COMPLETED" }, "submit")
      .phase,
    "unknown",
  );
  assert.notEqual(
    interpretTransferResponse(
      { verdict: "ALLOW", status: "COMPLETED" },
      "submit",
    ).phase,
    "completed",
  );
  assert.equal(
    interpretTransferResponse({ success: true }, "submit").phase,
    "unknown",
  );
  assert.equal(
    interpretTransferResponse(
      { id: "tx", status: "COMPLETED", verdict: "ALLOW" },
      "submit",
    ).phase,
    "completed",
  );
  assert.equal(
    interpretTransferResponse(
      { data: { id: "tx", status: "COMPLETED" } },
      "status",
    ).phase,
    "completed",
  );
});
test("BLOCK and expired/malformed FLAG cannot be confirmed", () => {
  assert.equal(
    interpretTransferResponse(
      { verdict: "BLOCK", status: "COMPLETED", id: "tx" },
      "submit",
    ).phase,
    "blocked",
  );
  assert.equal(
    interpretTransferResponse(
      {
        verdict: "FLAG",
        confirm_token: "secret",
        expires_at: new Date(999).toISOString(),
      },
      "submit",
      1000,
    ).phase,
    "unknown",
  );
  const result = interpretTransferResponse(
    { verdict: "FLAG", confirm_token: "secret", ttl: 60 },
    "submit",
    1000,
  );
  assert.equal(result.phase, "flagged");
  assert.equal(result.flag.expiresAt, 61000);
});
test("API error envelope exposes status, code and message; network failures get a connection message", () => {
  const { toApiError } = require("../utils/apiPayload.ts");
  assert.deepEqual(
    toApiError({
      response: {
        status: 404,
        data: {
          success: false,
          code: "ACCOUNT_NOT_FOUND",
          message: "No account",
          details: { phone: "+2348000000001" },
        },
      },
    }),
    {
      status: 404,
      code: "ACCOUNT_NOT_FOUND",
      message: "No account",
      details: { phone: "+2348000000001" },
    },
  );
  const offline = toApiError(
    Object.assign(new Error("Network Error"), { isAxiosError: true }),
  );
  assert.equal(offline.status, null);
  assert.match(offline.message, /connection/);
  const slow = toApiError(
    Object.assign(new Error("timeout of 15000ms exceeded"), {
      isAxiosError: true,
      code: "ECONNABORTED",
    }),
  );
  assert.match(slow.message, /taking too long/);
  assert.equal(
    toApiError(new Error("Unlock your device and retry secure sign-in.")).message,
    "Unlock your device and retry secure sign-in.",
  );
});
test("transfer responses follow the Swagger field names inside the success envelope", () => {
  const blocked = interpretTransferResponse(
    { success: true, data: { status: "BLOCKED", verdict: "BLOCK", reason: "Risky" } },
    "submit",
  );
  assert.equal(blocked.phase, "blocked");
  assert.equal(blocked.message, "Risky");
  const allowed = interpretTransferResponse(
    { success: true, data: { transaction_id: "tx", verdict: "ALLOW", status: "COMPLETED" } },
    "submit",
  );
  assert.equal(allowed.phase, "completed");
  assert.equal(allowed.transactionId, "tx");
  const pending = interpretTransferResponse(
    { success: true, data: { id: "tx", status: "PENDING", fraud_verdict: "ALLOW" } },
    "status",
  );
  assert.equal(pending.phase, "processing");
  const flaggedWithoutToken = interpretTransferResponse(
    { data: { transaction_id: "tx", verdict: "FLAG", status: "PENDING_REVIEW" } },
    "submit",
  );
  assert.equal(flaggedWithoutToken.phase, "unknown");
});
test("server-issued session parsing requires both tokens and a user id", () => {
  const { parseSession } = require("../services/auth.ts");
  const session = parseSession({
    success: true,
    data: { accessToken: "a", refreshToken: "r", user: { id: "u" }, wallet: {} },
  });
  assert.equal(session.user.id, "u");
  assert.throws(
    () => parseSession({ data: { accessToken: "a", user: { id: "u" } } }),
    (error) => error.code === "INVALID_SESSION",
  );
});
