/**
 * Patches BLE native packages for Expo SDK 54 / RN 0.81 + New Architecture.
 * Run automatically via postinstall.
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");

function writeIfChanged(filePath, content) {
  const prev = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
  if (prev !== content) {
    fs.writeFileSync(filePath, content);
    console.log("[patch-ble-native] updated", path.relative(root, filePath));
  }
}

// ─── react-native-ble-advertiser podspec (RN 0.71+) ─────────────────────────
const advertiserPodspecPath = path.join(
  root,
  "node_modules/react-native-ble-advertiser/ios/react-native-ble-advertiser.podspec",
);

if (fs.existsSync(advertiserPodspecPath)) {
  writeIfChanged(
    advertiserPodspecPath,
    `require 'json'

package = JSON.parse(File.read(File.join(__dir__, '../package.json')))

Pod::Spec.new do |s|
  s.name         = "react-native-ble-advertiser"
  s.version      = package['version']
  s.summary      = package['description'] || 'BLE advertiser'
  s.homepage     = package['homepage'] || 'https://github.com/vitorpamplona/react-native-ble-advertiser'
  s.license      = package['license'] || 'MIT'
  s.authors      = package['author'] || 'vitorpamplona'

  s.platforms    = { :ios => '13.0' }
  s.source       = { :path => '.' }
  s.source_files = '*.{h,m}'
  s.requires_arc = true

  if respond_to?(:install_modules_dependencies, true)
    install_modules_dependencies(s)
  else
    s.dependency 'React-Core'
  end
end
`,
  );
}

// ─── react-native-ble-advertiser autolinking (enable iOS) ───────────────────
const advertiserConfigPath = path.join(
  root,
  "node_modules/react-native-ble-advertiser/react-native.config.js",
);

writeIfChanged(
  advertiserConfigPath,
  `module.exports = {
  dependency: {
    platforms: {
      android: {
        packageImportPath:
          'import com.vitorpamplona.bleadvertiser.BLEAdvertiserPackage;',
        packageInstance: 'new BLEAdvertiserPackage()',
      },
      ios: {},
    },
  },
};
`,
);

// ─── react-native-ble-peripheral podspec (missing upstream) ───────────────
const peripheralPodspecPath = path.join(
  root,
  "node_modules/react-native-ble-peripheral/react-native-ble-peripheral.podspec",
);

writeIfChanged(
  peripheralPodspecPath,
  `require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))

Pod::Spec.new do |s|
  s.name         = 'react-native-ble-peripheral'
  s.version      = package['version']
  s.summary      = package['description'] || 'BLE peripheral'
  s.license      = package['license'] || 'MIT'
  s.authors      = package['author'] || 'Omri Himelbrand'
  s.homepage     = package['homepage'] || 'https://github.com/himelbrand/react-native-ble-peripheral'

  s.platforms    = { :ios => '13.0' }
  s.source       = { :path => '.' }
  s.source_files = 'ios/**/*.{h,m,swift}'
  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES' }

  if respond_to?(:install_modules_dependencies, true)
    install_modules_dependencies(s)
  else
    s.dependency 'React-Core'
  end
end
`,
);

const peripheralConfigPath = path.join(
  root,
  "node_modules/react-native-ble-peripheral/react-native.config.js",
);

writeIfChanged(
  peripheralConfigPath,
  `module.exports = {
  dependency: {
    platforms: {
      android: {
        packageImportPath: 'import com.himelbrand.ble.peripheral.RNBLEPackage;',
        packageInstance: 'new RNBLEPackage()',
      },
      ios: {},
    },
  },
};
`,
);

console.log("[patch-ble-native] done");
