const { secure, legacy, controls } = require("./register.cjs");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { hydrateUserSession, useUserStore } = require("../store/userStore.ts");
const { secureStorage } = require("../lib/secureStorage.ts");

test("legacy credentials migrate to secure storage and AsyncStorage credentials are removed", async () => {
  legacy.set(
    "user-storage",
    JSON.stringify({
      state: {
        accessToken: "secret-access",
        refreshToken: "secret-refresh",
        user: { id: "sender", phone: "private" },
      },
    }),
  );
  await hydrateUserSession();
  assert.equal(useUserStore.getState().hasHydrated, true);
  assert.equal(useUserStore.getState().accessToken, "secret-access");
  assert.equal(legacy.has("user-storage"), false);
  const data = JSON.parse(secure.get("paydrop.session.v2"));
  assert.deepEqual(data.user, { id: "sender" });
  useUserStore.getState().setTokens("new-access", "new-refresh");
  useUserStore.getState().logout();
  await secureStorage.get("drain");
  assert.equal(secure.has("paydrop.session.v2"), false);
  assert.equal(legacy.has("user-storage"), false);
});
test("failed secure hydration gates startup until it can retry", async () => {
  controls.failSecureRead = true;
  await hydrateUserSession();
  assert.equal(useUserStore.getState().hasHydrated, false);
  controls.failSecureRead = false;
  await hydrateUserSession();
  assert.equal(useUserStore.getState().hasHydrated, true);
});
