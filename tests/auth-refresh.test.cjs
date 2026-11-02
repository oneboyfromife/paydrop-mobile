require("./register.cjs");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const axios = require("axios");
const api = require("../services/api.ts").default;
const { useUserStore } = require("../store/userStore.ts");
const { secureStorage } = require("../lib/secureStorage.ts");
const response = (config, data) => ({
  config,
  data,
  status: 200,
  statusText: "OK",
  headers: {},
});
function unauthorized(config) {
  return new axios.AxiosError(
    "Unauthorized",
    "ERR_BAD_REQUEST",
    config,
    {},
    { config, data: {}, status: 401, statusText: "Unauthorized", headers: {} },
  );
}

test("concurrent 401s share one refresh and preserve financial idempotency headers", async () => {
  useUserStore.setState({
    user: { id: "sender" },
    accessToken: "old",
    refreshToken: "refresh",
    hasHydrated: true,
  });
  let refreshCount = 0;
  const headers = [];
  axios.defaults.adapter = async (config) => {
    refreshCount++;
    await new Promise(setImmediate);
    return response(config, {
      accessToken: "new",
      refreshToken: "new-refresh",
    });
  };
  api.defaults.adapter = async (config) => {
    if (config.headers.Authorization === "Bearer old")
      throw unauthorized(config);
    headers.push(config.headers["Idempotency-Key"]);
    return response(config, { id: "tx", status: "PENDING" });
  };
  await Promise.all([
    api.post(
      "/transactions/transfer",
      { amount: 100 },
      { headers: { "Idempotency-Key": "intent-one" } },
    ),
    api.get("/wallet/balance"),
  ]);
  assert.equal(refreshCount, 1);
  assert.ok(headers.includes("intent-one"));
  assert.equal(useUserStore.getState().accessToken, "new");
  await secureStorage.get("drain");
});
test("logout during refresh cannot restore credentials or replay a payment", async () => {
  useUserStore.setState({
    user: { id: "sender" },
    accessToken: "old",
    refreshToken: "refresh",
    hasHydrated: true,
  });
  let finish,
    requests = 0;
  axios.defaults.adapter = (config) =>
    new Promise((resolve) => {
      finish = () =>
        resolve(
          response(config, { accessToken: "new", refreshToken: "new-refresh" }),
        );
    });
  api.defaults.adapter = async (config) => {
    requests++;
    throw unauthorized(config);
  };
  const pending = api.post(
    "/transactions/transfer",
    { amount: 100 },
    { headers: { "Idempotency-Key": "original" } },
  );
  await new Promise(setImmediate);
  useUserStore.getState().logout();
  finish();
  await assert.rejects(pending);
  assert.equal(useUserStore.getState().accessToken, null);
  assert.equal(requests, 1);
  await secureStorage.get("drain");
});
test("a financial request without idempotency is never automatically replayed", async () => {
  useUserStore.setState({
    user: { id: "sender" },
    accessToken: "old",
    refreshToken: "refresh",
    hasHydrated: true,
  });
  let requests = 0;
  axios.defaults.adapter = async (config) =>
    response(config, { accessToken: "new", refreshToken: "new-refresh" });
  api.defaults.adapter = async (config) => {
    requests++;
    throw unauthorized(config);
  };
  await assert.rejects(api.post("/transactions/transfer", { amount: 100 }));
  assert.equal(requests, 1);
  await secureStorage.get("drain");
});
