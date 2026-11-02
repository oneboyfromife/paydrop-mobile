require("./register.cjs");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { connectRealtime } = require("../services/realtime.ts");

test("authenticated event transport deduplicates events and ignores messages after cleanup", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const instances = [];
  const invalidations = [];
  global.WebSocket = class {
    constructor(url, protocols, options) {
      this.url = url;
      this.options = options;
      instances.push(this);
    }
    close() {
      this.onclose?.();
    }
  };
  process.env.EXPO_PUBLIC_REALTIME_URL = "wss://staging.invalid/events";
  const stop = connectRealtime("secret", {
    invalidateQueries: ({ queryKey }) => {
      invalidations.push(queryKey);
      return Promise.resolve();
    },
  });
  const socket = instances[0];
  assert.equal(socket.options.headers.Authorization, "Bearer secret");
  socket.onmessage({
    data: JSON.stringify({
      id: "e1",
      type: "transaction.updated",
      status: "COMPLETED",
    }),
  });
  socket.onmessage({
    data: JSON.stringify({ id: "e1", type: "transaction.updated" }),
  });
  socket.onmessage({ data: "malformed" });
  assert.equal(invalidations.length, 3);
  socket.close();
  t.mock.timers.tick(1000);
  assert.equal(instances.length, 2);
  stop();
  instances[1].onmessage({
    data: JSON.stringify({ id: "e2", type: "balance.updated" }),
  });
  t.mock.timers.tick(30000);
  assert.equal(instances.length, 2);
  assert.equal(invalidations.length, 3);
});
