const {
  withDangerousMod,
  withPodfile,
  createRunOncePlugin,
} = require("@expo/config-plugins");
const path = require("path");

/** Run patch script during prebuild so node_modules podspecs are correct. */
function withBleNativeModules(config) {
  config = withDangerousMod(config, [
    "ios",
    async (cfg) => {
      const { execSync } = require("child_process");
      try {
        execSync("node scripts/patch-ble-native.js", {
          cwd: cfg.modRequest.projectRoot,
          stdio: "inherit",
        });
      } catch (e) {
        console.warn("[withBleNativeModules] patch script failed:", e.message);
      }
      return cfg;
    },
  ]);

  return withPodfile(config, (cfg) => {
    let contents = cfg.modResults.contents;
    if (!contents.includes("react-native-ble-advertiser")) {
      contents = contents.replace(
        /use_native_modules!\n/,
        `use_native_modules!\n  pod 'react-native-ble-advertiser', :path => '../node_modules/react-native-ble-advertiser/ios'\n  pod 'react-native-ble-peripheral', :path => '../node_modules/react-native-ble-peripheral'\n`,
      );
    }
    cfg.modResults.contents = contents;
    return cfg;
  });
}

module.exports = createRunOncePlugin(
  withBleNativeModules,
  "with-ble-native-modules",
  "1.0.0",
);
