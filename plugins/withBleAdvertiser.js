const {
  withDangerousMod,
  createRunOncePlugin,
} = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

function patchAndroid(source) {
  if (!source.includes("dataBuilder.addServiceUuid(uuid)"))
    throw new Error(
      "Unexpected BLE advertiser version: service UUID adapter needs review.",
    );
  if (!source.includes("PAYDROP_CONFIRMED_START")) {
    source = source.replace(
      'constants.put("ADVERTISE_MODE_BALANCED",',
      'constants.put("PAYDROP_CONFIRMED_START", true);\n        constants.put("ADVERTISE_MODE_BALANCED",',
    );
    source = source.replace(
      "    @Override\n    public String getName()",
      `    @ReactMethod
    public void isAdvertisingSupported(Promise promise) {
        try {
            promise.resolve(mBluetoothAdapter != null && mBluetoothAdapter.isMultipleAdvertisementSupported() && mBluetoothAdapter.getBluetoothLeAdvertiser() != null);
        } catch (SecurityException error) {
            promise.reject("PAYDROP_PERMISSION", "Bluetooth permission is required");
        }
    }

    @Override
    public String getName()`,
    );
  }
  return source
    .replace(
      "dataBuilder.addManufacturerData(companyId, payload);",
      "// PayDrop advertises only its opaque service UUID.",
    )
    .replace(
      "Set<String> keys = mAdvertiserList.keySet();",
      "Set<String> keys = new java.util.HashSet<String>(mAdvertiserList.keySet());",
    )
    .replace(
      "mObservedState = mBluetoothAdapter.isEnabled();",
      "mObservedState = null; // Runtime permission is requested before adapter operations.",
    )
    .replace(
      "tempAdvertiser.stopAdvertising(tempCallback);\n        } else",
      "tempAdvertiser.stopAdvertising(tempCallback);\n            tempCallback = new BLEAdvertiserModule.SimpleAdvertiseCallback(promise);\n        } else",
    );
}

function withBleAdvertiser(config) {
  config = withDangerousMod(config, [
    "ios",
    async (cfg) => {
      const root = path.join(
        cfg.modRequest.projectRoot,
        "node_modules/react-native-ble-advertiser/ios",
      );
      const podspec = path.join(root, "react-native-ble-advertiser.podspec");
      if (!fs.existsSync(podspec))
        throw new Error("Install react-native-ble-advertiser before prebuild.");
      fs.writeFileSync(
        podspec,
        fs
          .readFileSync(podspec, "utf8")
          .replace("s.dependency 'React'", "s.dependency 'React-Core'"),
      );
      fs.copyFileSync(
        path.join(__dirname, "native/BLEAdvertiser.m"),
        path.join(root, "BLEAdvertiser.m"),
      );
      return cfg;
    },
  ]);
  return withDangerousMod(config, [
    "android",
    async (cfg) => {
      const root = path.join(
        cfg.modRequest.projectRoot,
        "node_modules/react-native-ble-advertiser/android",
      );
      const java = path.join(
        root,
        "src/main/java/com/vitorpamplona/bleadvertiser/BLEAdvertiserModule.java",
      );
      fs.writeFileSync(java, patchAndroid(fs.readFileSync(java, "utf8")));
      const gradle = path.join(root, "build.gradle");
      const source = fs
        .readFileSync(gradle, "utf8")
        .replace(
          "compileSdkVersion 28",
          'namespace "com.vitorpamplona.bleavertiser"\n    compileSdkVersion rootProject.ext.compileSdkVersion',
        )
        .replace('    buildToolsVersion "28.0.3"\n', "")
        .replace(
          "minSdkVersion 21",
          "minSdkVersion rootProject.ext.minSdkVersion",
        )
        .replace(
          "targetSdkVersion 28",
          "targetSdkVersion rootProject.ext.targetSdkVersion",
        );
      fs.writeFileSync(gradle, source);
      const manifest = path.join(root, "src/main/AndroidManifest.xml");
      fs.writeFileSync(
        manifest,
        fs
          .readFileSync(manifest, "utf8")
          .replace(/\s+package="com\.vitorpamplona\.bleavertiser"/, ""),
      );
      return cfg;
    },
  ]);
}

module.exports = createRunOncePlugin(
  withBleAdvertiser,
  "with-ble-advertiser",
  "2.0.0",
);
module.exports.patchAndroid = patchAndroid;
