const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { patchAndroid } = require("../plugins/withBleAdvertiser.js");

test("native Android patch removes manufacturer data, fixes stop iteration and is repeatable", () => {
  const source = fs.readFileSync(
    require.resolve("react-native-ble-advertiser/android/src/main/java/com/vitorpamplona/bleadvertiser/BLEAdvertiserModule.java"),
    "utf8",
  );
  const patched = patchAndroid(source);
  assert.ok(
    !patched.includes("dataBuilder.addManufacturerData(companyId, payload)"),
  );
  assert.ok(patched.includes("new java.util.HashSet<String>"));
  assert.equal(patchAndroid(patched), patched);
});
test("Expo native mods install the confirmed iOS adapter and modern Android configuration", async () => {
  const os = require("node:os");
  const path = require("node:path");
  const plugin = require("../plugins/withBleAdvertiser.js");
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "paydrop-plugin-"));
  const installed = path.dirname(
    require.resolve("react-native-ble-advertiser/package.json"),
  );
  const target = path.join(fixture, "node_modules/react-native-ble-advertiser");
  fs.cpSync(path.join(installed, "ios"), path.join(target, "ios"), {
    recursive: true,
  });
  fs.cpSync(path.join(installed, "android"), path.join(target, "android"), {
    recursive: true,
  });
  const config = plugin({ name: "test", slug: "test" });
  for (const platform of ["ios", "android"]) {
    await config.mods[platform].dangerous({
      ...config,
      modResults: {},
      modRequest: { projectRoot: fixture, platform },
    });
  }
  const ios = fs.readFileSync(path.join(target, "ios/BLEAdvertiser.m"), "utf8");
  assert.ok(ios.includes("peripheralManagerDidStartAdvertising"));
  assert.ok(ios.includes("PAYDROP_CONFIRMED_START"));
  assert.ok(!ios.includes("RCTLogInfo"));
  const gradle = fs.readFileSync(
    path.join(target, "android/build.gradle"),
    "utf8",
  );
  assert.ok(gradle.includes('namespace "com.vitorpamplona.bleavertiser"'));
  assert.ok(gradle.includes("rootProject.ext.compileSdkVersion"));
  const java = fs.readFileSync(
    path.join(
      target,
      "android/src/main/java/com/vitorpamplona/bleadvertiser/BLEAdvertiserModule.java",
    ),
    "utf8",
  );
  assert.ok(java.includes("isAdvertisingSupported(Promise promise)"));
  assert.ok(java.includes("PAYDROP_CONFIRMED_START"));
  assert.ok(!java.includes("mObservedState = mBluetoothAdapter.isEnabled();"));
  const manifest = fs.readFileSync(
    path.join(target, "android/src/main/AndroidManifest.xml"),
    "utf8",
  );
  assert.ok(!manifest.includes("package="));
});
