import * as Crypto from "expo-crypto";
import { PermissionsAndroid, Platform } from "react-native";
import { BleManager } from "react-native-ble-plx";
import { check, PERMISSIONS, request, RESULTS } from "react-native-permissions";
import {
  assertDiscoveryAdvertisingAvailable,
  startDiscoveryAdvertising,
  stopDiscoveryAdvertising,
} from "../utils/bleAdvertising";
import {
  broadcastDiscovery,
  resolveObservedToken,
  stopDiscoveryBroadcast,
} from "./user";
import { BleDiscoveryController } from "./bleDiscovery";

let manager: BleManager | null = null;
const getManager = () => {
  try {
    return (manager ??= new BleManager());
  } catch {
    throw new Error(
      "Bluetooth is unavailable in this app build. Use QR or a recipient code.",
    );
  }
};

export const bleDiscovery = new BleDiscoveryController({
  randomUUID: Crypto.randomUUID,
  watchUnavailable(fail) {
    const subscription = getManager().onStateChange((state) => {
      if (state !== "PoweredOn") fail();
    }, false);
    return () => subscription.remove();
  },
  async prepare(mode) {
    if (Platform.OS !== "android" && Platform.OS !== "ios")
      throw new Error(
        "Bluetooth is unavailable here. Use QR or a recipient code.",
      );
    if (Platform.OS === "android") {
      const permissions =
        Number(Platform.Version) >= 31
          ? [
              PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
              ...(mode === "scan"
                ? [
                    PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
                    PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
                    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                  ]
                : [PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE]),
            ]
          : mode === "scan"
            ? [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION]
            : [];
      if (permissions.length) {
        const granted = await PermissionsAndroid.requestMultiple(permissions);
        if (
          Object.values(granted).some(
            (value) => value !== PermissionsAndroid.RESULTS.GRANTED,
          )
        )
          throw new Error(
            "Bluetooth permissions are required. Enable them in Settings or use QR.",
          );
      }
    } else {
      const permission = await check(PERMISSIONS.IOS.BLUETOOTH);
      if (
        permission !== RESULTS.GRANTED &&
        (await request(PERMISSIONS.IOS.BLUETOOTH)) !== RESULTS.GRANTED
      )
        throw new Error(
          "Bluetooth permissions are required. Enable them in Settings or use QR.",
        );
    }
    let state = await getManager().state();
    if (state === "Unknown" || state === "Resetting") {
      const deadline = Date.now() + 3000;
      while (
        (state === "Unknown" || state === "Resetting") &&
        Date.now() < deadline
      ) {
        await new Promise((resolve) => setTimeout(resolve, 150));
        state = await getManager().state();
      }
    }
    if (state !== "PoweredOn")
      throw new Error(
        state === "Unsupported"
          ? "Bluetooth is unsupported. Use QR."
          : "Enable Bluetooth and retry, or use QR.",
      );
    if (mode === "advertise") await assertDiscoveryAdvertisingAvailable();
  },
  startScan(observe, fail) {
    return getManager().startDeviceScan(
      null,
      { allowDuplicates: true },
      (error, device) => {
        if (error) {
          fail(new Error("Bluetooth scan stopped."));
          return;
        }
        if (device?.serviceUUIDs) observe(device.serviceUUIDs, device.rssi);
      },
    );
  },
  stopScan() {
    return manager?.stopDeviceScan().catch(() => {});
  },
  advertise: startDiscoveryAdvertising,
  stopAdvertising: stopDiscoveryAdvertising,
  register: (token, auth) => broadcastDiscovery({ token }, auth),
  revoke: stopDiscoveryBroadcast,
  resolve: resolveObservedToken,
});

bleDiscovery.setEnabled(process.env.EXPO_PUBLIC_BLE_ENABLED !== "false");
