require("./register.cjs");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { BleDiscoveryController } = require("../services/bleDiscovery.ts");
const uuid = (i) => `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`;
const drain = async () => {
  for (let i = 0; i < 30; i++) await Promise.resolve();
};
const deferred = () => {
  let resolve;
  const promise = new Promise((r) => (resolve = r));
  return { promise, resolve };
};
const profile = {
  id: "recipient",
  first_name: "Ada",
  last_name: "O",
  username: "ada",
};
function setup(t, overrides = {}) {
  t.mock.timers.enable({ apis: ["setTimeout", "Date"], now: 100000 });
  const calls = [];
  let observe;
  let seed = 1;
  const driver = {
    randomUUID: () => uuid(seed++),
    prepare: async () => {},
    startScan: (cb) => {
      observe = cb;
      calls.push("scan");
    },
    stopScan: () => {},
    advertise: async (token) => {
      calls.push(`advertise:${token}`);
    },
    stopAdvertising: async () => {
      calls.push("stop");
    },
    register: async (token) => {
      calls.push(`register:${token}`);
      return { expiresAt: Date.now() + 180000 };
    },
    revoke: async () => {
      calls.push("revoke");
    },
    resolve: async () => ({ kind: "resolved", user: profile }),
    ...overrides,
  };
  const controller = new BleDiscoveryController(driver);
  controller.setContext({ accountId: "sender", accessToken: "auth" }, true);
  t.after(async () => {
    controller.setContext(null, false);
    await controller.settled();
  });
  return { controller, calls, observe: (...args) => observe(...args) };
}
test("stale starts are cancelled and old leases cannot stop a newer session", async (t) => {
  const pending = deferred();
  const { controller, calls } = setup(t, { prepare: () => pending.promise });
  const release = controller.acquire("advertise");
  await drain();
  const releaseNew = controller.acquire("scan");
  release();
  pending.resolve();
  await controller.settled();
  assert.equal(
    calls.some((x) => x.startsWith("advertise:")),
    false,
  );
  assert.equal(controller.getSnapshot().isScanning, true);
  releaseNew();
  await controller.settled();
  assert.equal(controller.getSnapshot().isScanning, false);
});
test("registration is revoked after native advertising failure", async (t) => {
  const { controller, calls } = setup(t, {
    advertise: async () => {
      throw Error("native failed");
    },
  });
  controller.acquire("advertise");
  await controller.settled();
  assert.equal(controller.getSnapshot().isAdvertising, false);
  assert.ok(calls.includes("revoke"));
  assert.match(controller.getSnapshot().error, /native failed/);
});
test("advertising awaits native success and rotates to a fresh token after 120s", async (t) => {
  const native = deferred();
  const { controller, calls } = setup(t, { advertise: () => native.promise });
  controller.acquire("advertise");
  await drain();
  assert.equal(controller.getSnapshot().isAdvertising, false);
  native.resolve();
  await controller.settled();
  assert.equal(controller.getSnapshot().isAdvertising, true);
  t.mock.timers.tick(120000);
  await controller.settled();
  assert.deepEqual(
    calls.filter((x) => x.startsWith("register:")),
    [`register:${uuid(1)}`, `register:${uuid(2)}`],
  );
  assert.ok(calls.indexOf("revoke") < calls.indexOf(`register:${uuid(2)}`));
});
test("an unresolved account-wide revoke prevents a newer registration", async (t) => {
  let failed = false;
  const { controller, calls } = setup(t, {
    revoke: async () => {
      failed = true;
      throw Error("offline");
    },
  });
  controller.acquire("advertise");
  await controller.settled();
  controller.acquire("advertise");
  await controller.settled();
  assert.ok(failed);
  assert.equal(calls.filter((x) => x.startsWith("register:")).length, 1);
});
test("late API responses cannot revive a radio observation older than 30s", async (t) => {
  const response = deferred();
  const { controller, observe } = setup(t, { resolve: () => response.promise });
  controller.acquire("scan");
  await controller.settled();
  observe([uuid(55)], -50);
  t.mock.timers.tick(2000);
  await drain();
  t.mock.timers.tick(31000);
  await drain();
  response.resolve({ kind: "resolved", user: profile });
  await drain();
  assert.equal(controller.getSnapshot().nearbyUsers.length, 0);
});
test("radio sightings update lastSeen and RSSI; resolution does not change them", async (t) => {
  const { controller, observe } = setup(t);
  controller.acquire("scan");
  await controller.settled();
  observe([uuid(55)], -60);
  t.mock.timers.tick(2000);
  await drain();
  const first = controller.getSnapshot().nearbyUsers[0];
  assert.ok(first);
  assert.equal(first.lastSeenAt, 100000);
  observe([uuid(55)], -40);
  assert.equal(controller.getSnapshot().nearbyUsers[0].lastSeenAt, 102000);
  assert.equal(controller.getSnapshot().nearbyUsers[0].smoothedRssi, -54);
});
test("resolution caps each window at 20 and uses no more than 4 concurrent requests", async (t) => {
  let active = 0,
    max = 0,
    total = 0;
  const responses = [];
  const { controller, observe } = setup(t, {
    resolve: () => {
      total++;
      active++;
      max = Math.max(max, active);
      const item = deferred();
      responses.push(item);
      return item.promise.finally(() => active--);
    },
  });
  controller.acquire("scan");
  await controller.settled();
  observe(
    Array.from({ length: 30 }, (_, i) => uuid(i + 100)),
    -50,
  );
  t.mock.timers.tick(2000);
  await drain();
  assert.equal(total, 4);
  t.mock.timers.tick(2000);
  await drain();
  assert.equal(total, 4);
  for (let i = 0; i < 5; i++) {
    responses.splice(0).forEach((x) => x.resolve({ kind: "retry" }));
    await drain();
  }
  assert.equal(total, 20);
  assert.equal(max, 4);
});
test("background/logout/kill switch stop discovery and clear cards", async (t) => {
  const { controller } = setup(t);
  controller.acquire("scan");
  await controller.settled();
  controller.setEnabled(false);
  await controller.settled();
  assert.equal(controller.getSnapshot().isScanning, false);
  controller.setEnabled(true);
  await controller.settled();
  assert.equal(controller.getSnapshot().isScanning, true);
  controller.setContext({ accountId: "sender", accessToken: "auth" }, false);
  await controller.settled();
  assert.equal(controller.getSnapshot().isScanning, false);
  controller.setContext(null, true);
  await controller.settled();
  assert.equal(controller.getSnapshot().isScanning, false);
});
test("first radio observation resolves immediately and transient failures are retried", async (t) => {
  let count = 0;
  const { controller, observe } = setup(t, {
    resolve: async () => {
      count++;
      return count === 1
        ? { kind: "retry" }
        : { kind: "resolved", user: profile };
    },
  });
  controller.acquire("scan");
  await controller.settled();
  observe([uuid(1)], -50);
  assert.equal(count, 1);
  await drain();
  assert.equal(controller.getSnapshot().nearbyUsers.length, 0);
  t.mock.timers.tick(2000);
  await drain();
  assert.equal(count, 2);
  assert.equal(controller.getSnapshot().nearbyUsers.length, 1);
});
test("resolution concurrency remains bounded across cancelled sessions", async (t) => {
  const pending = [];
  let active = 0,
    max = 0;
  const { controller, observe } = setup(t, {
    resolve: () => {
      active++;
      max = Math.max(max, active);
      const item = deferred();
      pending.push(item);
      return item.promise.finally(() => active--);
    },
  });
  const release = controller.acquire("scan");
  await controller.settled();
  observe(
    Array.from({ length: 10 }, (_, i) => uuid(i + 1)),
    -50,
  );
  assert.equal(active, 4);
  release();
  controller.acquire("scan");
  await controller.settled();
  observe(
    Array.from({ length: 10 }, (_, i) => uuid(i + 100)),
    -50,
  );
  await drain();
  assert.equal(active, 4);
  pending.splice(0).forEach((item) => item.resolve({ kind: "invalid" }));
  await drain();
  t.mock.timers.tick(2000);
  await drain();
  assert.equal(active, 4);
  assert.equal(max, 4);
  for (let i = 0; i < 4; i++) {
    pending.splice(0).forEach((item) => item.resolve({ kind: "invalid" }));
    await drain();
  }
});
test("late registration cannot restart advertising after server expiry", async (t) => {
  const renewal = deferred();
  let count = 0;
  const { controller, calls } = setup(t, {
    register: async () =>
      ++count === 1 ? { expiresAt: Date.now() + 180000 } : renewal.promise,
  });
  controller.acquire("advertise");
  await controller.settled();
  t.mock.timers.tick(120000);
  await drain();
  t.mock.timers.tick(60000);
  await drain();
  assert.equal(controller.getSnapshot().isAdvertising, false);
  assert.match(controller.getSnapshot().error, /expired/);
  renewal.resolve({ expiresAt: Date.now() + 180000 });
  await drain();
  await controller.settled();
  assert.equal(calls.filter((call) => call.startsWith("advertise:")).length, 1);
});
