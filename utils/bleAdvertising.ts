import { NativeModules, Platform } from "react-native";
import {
  isValidBleServiceUuid,
  normalizeDiscoveryToken,
} from "./discoveryToken";

interface Advertiser {
  setCompanyId(id: number): void;
  broadcast(
    uid: string,
    payload: number[],
    options: Record<string, unknown>,
  ): Promise<string>;
  stopBroadcast(): Promise<unknown>;
  getAdapterState(): Promise<string>;
  isAdvertisingSupported?(): Promise<boolean>;
  getConstants?(): { PAYDROP_CONFIRMED_START?: boolean };
  PAYDROP_CONFIRMED_START?: boolean;
}
const adapter = () => NativeModules.BLEAdvertiser as Advertiser | undefined;

export const assertDiscoveryAdvertisingAvailable = async () => {
  const advertiser = adapter();
  if (!advertiser?.broadcast || !advertiser.stopBroadcast)
    throw new Error(
      "Bluetooth visibility is unavailable in this build. Use QR.",
    );
  if (!(
    advertiser.PAYDROP_CONFIRMED_START ||
    advertiser.getConstants?.().PAYDROP_CONFIRMED_START
  ))
    throw new Error("Bluetooth visibility needs an updated app build. Use QR.");
  if (
    Platform.OS === "android" &&
    (!advertiser.isAdvertisingSupported ||
      !(await advertiser.isAdvertisingSupported()))
  )
    throw new Error(
      "This device cannot broadcast Bluetooth visibility. Use QR.",
    );
};

export const startDiscoveryAdvertising = async (
  rawToken: string,
): Promise<void> => {
  const advertiser = adapter();
  await assertDiscoveryAdvertisingAvailable();
  if (!advertiser)
    throw new Error("Bluetooth visibility is unavailable. Use QR.");
  const token = normalizeDiscoveryToken(rawToken);
  if (!isValidBleServiceUuid(token))
    throw new Error("Invalid Bluetooth session.");
  if (Platform.OS === "ios") {
    advertiser.setCompanyId(0);
    const deadline = Date.now() + 5000;
    while ((await advertiser.getAdapterState()) !== "STATE_ON") {
      if (Date.now() >= deadline)
        throw new Error("Bluetooth is not ready. Enable Bluetooth and retry.");
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  } else {
    // The build plugin removes manufacturer data; advertise one service UUID only.
    advertiser.setCompanyId(1);
  }
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      advertiser.broadcast(token, [], {
        advertiseMode: 2,
        txPowerLevel: 2,
        connectable: false,
        includeDeviceName: false,
      }),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(
          () =>
            reject(
              new Error(
                "Bluetooth visibility could not start. Use QR or retry.",
              ),
            ),
          6000,
        );
      }),
    ]);
  } finally {
    clearTimeout(timeout);
  }
};

export const stopDiscoveryAdvertising = async () => {
  if (adapter()?.stopBroadcast) await adapter()!.stopBroadcast();
};
