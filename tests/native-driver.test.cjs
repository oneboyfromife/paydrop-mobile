const { mocked } = require("./register.cjs");
const { test } = require("node:test");
const assert = require("node:assert/strict");
let required = [];
const P = {
  BLUETOOTH_CONNECT: "connect",
  BLUETOOTH_SCAN: "scan",
  BLUETOOTH_ADVERTISE: "advertise",
  ACCESS_COARSE_LOCATION: "coarse",
  ACCESS_FINE_LOCATION: "fine",
};
mocked["react-native"].PermissionsAndroid = {
  PERMISSIONS: P,
  RESULTS: { GRANTED: "granted" },
  requestMultiple: async (permissions) => {
    required = permissions;
    return Object.fromEntries(permissions.map((p) => [p, "granted"]));
  },
};
mocked["react-native"].NativeModules = {
  BLEAdvertiser: {
    PAYDROP_CONFIRMED_START: true,
    isAdvertisingSupported: async () => true,
    stopBroadcast: async () => {},
    broadcast: async () => {},
  },
};
mocked["react-native-ble-plx"] = {
  BleManager: class {
    state = async () => "PoweredOn";
    stopDeviceScan = async () => {};
    onStateChange = () => ({ remove() {} });
  },
};
mocked["react-native-permissions"] = {
  check: async () => "granted",
  request: async () => "granted",
  RESULTS: { GRANTED: "granted" },
  PERMISSIONS: { IOS: { BLUETOOTH: "bluetooth" } },
};
const { bleDiscovery } = require("../services/bleNative.ts");
const driver = bleDiscovery.driver;

test("Android 12+ requests mode-specific Bluetooth permissions without claiming neverForLocation", async () => {
  mocked["react-native"].Platform.OS = "android";
  mocked["react-native"].Platform.Version = 31;
  await driver.prepare("advertise");
  assert.deepEqual(required, ["connect", "advertise"]);
  await driver.prepare("scan");
  assert.deepEqual(required, ["connect", "scan", "coarse", "fine"]);
});
test("older Android scanning requests location while advertising needs no runtime scan permission", async () => {
  mocked["react-native"].Platform.Version = 30;
  await driver.prepare("scan");
  assert.deepEqual(required, ["fine"]);
  required = [];
  await driver.prepare("advertise");
  assert.deepEqual(required, []);
});
test("unavailable advertising capability fails before registration", async () => {
  mocked["react-native"].NativeModules.BLEAdvertiser.isAdvertisingSupported =
    async () => false;
  await assert.rejects(driver.prepare("advertise"), /cannot broadcast/);
});
