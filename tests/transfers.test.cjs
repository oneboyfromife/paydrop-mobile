const { secure, controls } = require("./register.cjs");
const { test, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { useUserStore } = require("../store/userStore.ts");
const {
  useTransferStore,
  resetTransferMemory,
  hydrateTransferRecovery,
} = require("../store/transferStore.ts");
const { secureStorage } = require("../lib/secureStorage.ts");
const {
  submitTransfer,
  confirmFlaggedTransfer,
  recoverTransfer,
} = require("../services/transfers.ts");
const api = require("../services/api.ts").default;
const deferred = () => {
  let resolve;
  const promise = new Promise((r) => (resolve = r));
  return { promise, resolve };
};
const profile = {
  id: "recipient",
  first_name: "Ada",
  last_name: "Okeke",
  username: "ada",
};
const response = (config, data) => ({
  config,
  data,
  status: 200,
  statusText: "OK",
  headers: {},
});
function review() {
  useTransferStore.getState().selectRecipient(profile);
  useTransferStore.getState().review("sender", 500000, "Lunch");
  return useTransferStore.getState().active;
}
beforeEach(async () => {
  await secureStorage.get("drain");
  secure.clear();
  controls.failSecureWrite = false;
  controls.failSecureRead = false;
  resetTransferMemory();
  useUserStore.setState({
    user: { id: "sender" },
    accessToken: "access",
    refreshToken: "refresh",
    hasHydrated: true,
  });
  useTransferStore.setState({ hydrated: true });
  process.env.EXPO_PUBLIC_TRANSFER_CONTRACT_CONFIRMED = "true";
  process.env.EXPO_PUBLIC_TRANSFER_KEY_LOOKUP_PATH =
    "/transactions/by-key/:key";
  api.defaults.adapter = async (config) =>
    response(config, { verdict: "ALLOW", id: "tx", status: "PENDING" });
});
test("one confirmed intent and double taps cause one POST with the same key", async () => {
  const intent = review();
  const pending = deferred();
  const requests = [];
  api.defaults.adapter = async (config) => {
    requests.push(config);
    return pending.promise;
  };
  const first = submitTransfer();
  const second = submitTransfer();
  assert.equal(first, second);
  await new Promise(setImmediate);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].headers["Idempotency-Key"], intent.idempotencyKey);
  assert.deepEqual(JSON.parse(requests[0].data), {
    recipient_id: "recipient",
    amount: 500000,
    note: "Lunch",
  });
  pending.resolve(
    response(requests[0], { id: "tx", verdict: "ALLOW", status: "PENDING" }),
  );
  await first;
  assert.equal(useTransferStore.getState().active.phase, "processing");
  await assert.rejects(submitTransfer(), /Review/);
});
test("secure recovery write failure prevents the network side effect", async () => {
  review();
  controls.failSecureWrite = true;
  let requests = 0;
  api.defaults.adapter = async (config) => {
    requests++;
    return response(config, {});
  };
  await submitTransfer();
  controls.failSecureWrite = false;
  assert.equal(requests, 0);
  assert.equal(useTransferStore.getState().active.phase, "review");
});
test("timeout retains a minimal recovery reference, restart performs GET instead of another POST", async () => {
  const original = review();
  let posts = 0,
    gets = 0;
  api.defaults.adapter = async (config) => {
    posts++;
    throw Error("timeout after acceptance");
  };
  await submitTransfer();
  assert.equal(useTransferStore.getState().active.phase, "unknown");
  const stored = [...secure.values()]
    .map(JSON.parse)
    .find((x) => x.idempotencyKey);
  assert.deepEqual(Object.keys(stored).sort(), [
    "createdAt",
    "idempotencyKey",
    "ownerId",
  ]);
  assert.equal(stored.idempotencyKey, original.idempotencyKey);
  resetTransferMemory();
  await hydrateTransferRecovery("sender");
  assert.equal(
    useTransferStore.getState().active.idempotencyKey,
    original.idempotencyKey,
  );
  api.defaults.adapter = async (config) => {
    gets++;
    assert.equal(config.method, "get");
    assert.match(config.url, /by-key/);
    return response(config, { id: "tx", status: "COMPLETED" });
  };
  await recoverTransfer();
  assert.equal(posts, 1);
  assert.equal(gets, 1);
  assert.equal(useTransferStore.getState().active.phase, "completed");
});
test("FLAG needs explicit confirmation, expiry is enforced and approval is single-use", async () => {
  review();
  let count = 0;
  api.defaults.adapter = async (config) => {
    count++;
    return response(
      config,
      count === 1
        ? { id: "tx", verdict: "FLAG", confirm_token: "approval", ttl: 60 }
        : { id: "tx", status: "PENDING" },
    );
  };
  await submitTransfer();
  assert.equal(count, 1);
  assert.equal(useTransferStore.getState().active.phase, "flagged");
  const flagged = useTransferStore.getState().active;
  useTransferStore.setState({
    active: {
      ...flagged,
      flag: { ...flagged.flag, expiresAt: Date.now() - 1 },
    },
  });
  await assert.rejects(confirmFlaggedTransfer(), /expired/);
  assert.equal(count, 1);
  useTransferStore.setState({ active: flagged });
  await Promise.all([confirmFlaggedTransfer(), confirmFlaggedTransfer()]);
  assert.equal(count, 2);
  await assert.rejects(confirmFlaggedTransfer());
});
test("BLOCK stops payment while missing verdict remains unknown", async () => {
  review();
  api.defaults.adapter = async (config) =>
    response(config, { id: "tx", verdict: "BLOCK" });
  await submitTransfer();
  assert.equal(useTransferStore.getState().active.phase, "blocked");
  review();
  api.defaults.adapter = async (config) =>
    response(config, { id: "tx", status: "COMPLETED" });
  await submitTransfer();
  assert.equal(useTransferStore.getState().active.phase, "unknown");
});
test("unresolved intents cannot be replaced by a changed amount or recipient", async () => {
  review();
  await submitTransfer();
  assert.throws(
    () => useTransferStore.getState().review("sender", 100, "changed"),
    /pending/,
  );
});
test("another account cannot see, overwrite or complete the previous account intent", async () => {
  const original = review();
  await submitTransfer();
  resetTransferMemory();
  useUserStore.setState({ user: { id: "other" } });
  await hydrateTransferRecovery("other");
  assert.equal(useTransferStore.getState().active, null);
  resetTransferMemory();
  useUserStore.setState({ user: { id: "sender" } });
  await hydrateTransferRecovery("sender");
  assert.equal(
    useTransferStore.getState().active.idempotencyKey,
    original.idempotencyKey,
  );
});
test("a late recovery response cannot overwrite a confirmation already submitting", async () => {
  review();
  api.defaults.adapter = async (config) =>
    response(config, {
      id: "tx",
      verdict: "FLAG",
      confirm_token: "approval",
      ttl: 60,
    });
  await submitTransfer();
  const wait = deferred();
  api.defaults.adapter = async (config) => wait.promise;
  const recovering = recoverTransfer();
  await new Promise(setImmediate);
  useTransferStore.setState({
    active: { ...useTransferStore.getState().active, phase: "submitting" },
  });
  wait.resolve(response({}, { id: "tx", status: "COMPLETED" }));
  await recovering;
  assert.equal(useTransferStore.getState().active.phase, "submitting");
});
test("unverified transfer contracts keep new financial mutations disabled", async () => {
  review();
  process.env.EXPO_PUBLIC_TRANSFER_CONTRACT_CONFIRMED = "false";
  await assert.rejects(submitTransfer(), /temporarily unavailable/);
  assert.equal(useTransferStore.getState().active.phase, "review");
});
test("malformed recovery data blocks new payment review instead of discarding an uncertain intent", async () => {
  review();
  await submitTransfer();
  const key = [...secure.keys()].find((key) =>
    key.startsWith("paydrop.transfer."),
  );
  secure.set(
    key,
    JSON.stringify({ ownerId: "sender", idempotencyKey: "corrupt" }),
  );
  resetTransferMemory();
  await hydrateTransferRecovery("sender");
  assert.equal(useTransferStore.getState().hydrated, false);
  useTransferStore.getState().selectRecipient(profile);
  assert.throws(
    () => useTransferStore.getState().review("sender", 100, "new"),
    /Checking previous/,
  );
});
test("recovery status for a different transaction ID cannot complete the active payment", async () => {
  review();
  await submitTransfer();
  api.defaults.adapter = async (config) =>
    response(config, { id: "different", status: "COMPLETED" });
  await recoverTransfer();
  assert.equal(useTransferStore.getState().active.phase, "processing");
});
test("a completed response with a different amount cannot produce a successful receipt", async () => {
  review();
  api.defaults.adapter = async (config) =>
    response(config, {
      id: "tx",
      verdict: "ALLOW",
      status: "COMPLETED",
      amount: 1,
    });
  await submitTransfer();
  assert.equal(useTransferStore.getState().active.phase, "unknown");
  assert.equal(useTransferStore.getState().active.amount, 500000);
});
test("an approval storage failure leaves the warning available and sends no confirmation", async () => {
  review();
  let requests = 0;
  api.defaults.adapter = async (config) => {
    requests++;
    return response(config, {
      id: "tx",
      verdict: "FLAG",
      confirm_token: "approval",
      ttl: 60,
    });
  };
  await submitTransfer();
  controls.failSecureWrite = true;
  await confirmFlaggedTransfer();
  controls.failSecureWrite = false;
  assert.equal(requests, 1);
  assert.equal(useTransferStore.getState().active.phase, "flagged");
});
const httpError = (config, status, data) =>
  Object.assign(new Error(`HTTP ${status}`), {
    config,
    response: { ...response(config, data), status },
  });
test("a 422 BLOCK body ends the payment as blocked with the server reason", async () => {
  review();
  api.defaults.adapter = async (config) => {
    throw httpError(config, 422, {
      success: false,
      code: "TRANSFER_BLOCKED",
      message: "Transfer blocked",
      details: {
        status: "BLOCKED",
        verdict: "BLOCK",
        fraud_score: 95,
        reason: "High fraud risk",
      },
    });
  };
  await submitTransfer();
  const active = useTransferStore.getState().active;
  assert.equal(active.phase, "blocked");
  assert.equal(active.message, "High fraud risk");
});
test("a 400 refusal ends the attempt as failed, while 409 and 5xx stay uncertain", async () => {
  review();
  api.defaults.adapter = async (config) => {
    throw httpError(config, 400, {
      success: false,
      code: "VALIDATION_ERROR",
      message: "Recipient cannot receive transfers yet",
    });
  };
  await submitTransfer();
  assert.equal(useTransferStore.getState().active.phase, "failed");
  assert.equal(
    useTransferStore.getState().active.message,
    "Recipient cannot receive transfers yet",
  );
  for (const status of [409, 500]) {
    review();
    api.defaults.adapter = async (config) => {
      throw httpError(config, status, { success: false, message: "x" });
    };
    await submitTransfer();
    assert.equal(useTransferStore.getState().active.phase, "unknown");
    useTransferStore.setState({
      active: { ...useTransferStore.getState().active, phase: "failed" },
    });
  }
});
test("FLAG without an expiry uses the documented 15 minute confirm TTL and confirm sends transaction_id", async () => {
  review();
  const requests = [];
  api.defaults.adapter = async (config) => {
    requests.push(config);
    return response(
      config,
      requests.length === 1
        ? {
            success: true,
            data: {
              transaction_id: "tx",
              status: "PENDING_REVIEW",
              verdict: "FLAG",
              reason: "Unusual velocity",
              confirm_token: "approval",
              idempotency_key: "server-key",
            },
          }
        : {
            success: true,
            data: { transaction_id: "tx", verdict: "ALLOW", status: "COMPLETED" },
          },
    );
  };
  const before = Date.now();
  await submitTransfer();
  const flagged = useTransferStore.getState().active;
  assert.equal(flagged.phase, "flagged");
  assert.equal(flagged.flag.reason, "Unusual velocity");
  const ttl = flagged.flag.expiresAt - before;
  assert.ok(ttl > 14 * 60 * 1000 && ttl <= 15 * 60 * 1000, String(ttl));
  await confirmFlaggedTransfer();
  assert.deepEqual(JSON.parse(requests[1].data), {
    transaction_id: "tx",
    confirm_token: "approval",
  });
  assert.equal(useTransferStore.getState().active.phase, "completed");
});
test("submissions require a configured lookup by the original idempotency key", async () => {
  review();
  delete process.env.EXPO_PUBLIC_TRANSFER_KEY_LOOKUP_PATH;
  await assert.rejects(submitTransfer(), /temporarily unavailable/);
  assert.equal(useTransferStore.getState().active.phase, "review");
});
