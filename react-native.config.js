/** Ensures BLE native modules are autolinked on iOS and Android. */
module.exports = {
  dependencies: {
    "react-native-ble-advertiser": {
      platforms: {
        android: {
          packageImportPath:
            "import com.vitorpamplona.bleadvertiser.BLEAdvertiserPackage;",
          packageInstance: "new BLEAdvertiserPackage()",
        },
        ios: {},
      },
    },
    "react-native-ble-peripheral": {
      platforms: {
        android: {
          packageImportPath: "import com.himelbrand.ble.peripheral.RNBLEPackage;",
          packageInstance: "new RNBLEPackage()",
        },
        ios: {},
      },
    },
  },
};
